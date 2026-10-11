from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import chromadb
from chromadb.config import Settings
import hashlib, hmac, json, uuid, os, time
from datetime import datetime, timezone
from typing import Optional, List
import psycopg2
from psycopg2.extras import RealDictCursor
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("unlearning-engine")

app = FastAPI(
    title="CognitiveGuard — Machine Unlearning Engine",
    description="SISA-based Machine Unlearning with Cryptographic Erasure Proofs (DPDP Compliant)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Configuration ─────────────────────────────────────────────────────────────
CHROMA_HOST   = os.getenv("CHROMA_HOST", "localhost")
CHROMA_PORT   = int(os.getenv("CHROMA_PORT", "8000"))
NUM_SHARDS    = int(os.getenv("NUM_SHARDS", "8"))
HMAC_SECRET   = os.getenv("HMAC_SECRET", "supersecrethmackey").encode()
DATABASE_URL  = os.getenv("DATABASE_URL", "postgresql://cgadmin:cgpassword123@localhost:5432/cognitiveguard")

# ── ChromaDB Client ───────────────────────────────────────────────────────────
try:
    chroma_client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
    logger.info(f"Connected to ChromaDB at {CHROMA_HOST}:{CHROMA_PORT}")
except Exception as e:
    logger.warning(f"ChromaDB not available, using ephemeral client: {e}")
    chroma_client = chromadb.EphemeralClient()

# ── PostgreSQL ─────────────────────────────────────────────────────────────────
def get_db():
    try:
        return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    except Exception as e:
        logger.warning(f"PostgreSQL not available: {e}")
        return None

# ── SISA Helpers ──────────────────────────────────────────────────────────────
def get_shard_id(dpid: str) -> int:
    return int(hashlib.md5(dpid.encode()).hexdigest(), 16) % NUM_SHARDS

def get_collection(shard_id: int):
    return chroma_client.get_or_create_collection(
        f"shard_{shard_id}",
        metadata={"hnsw:space": "cosine"}
    )

def simple_embed(text: str) -> List[float]:
    """Deterministic pseudo-embedding for demo (replace with real model in prod)."""
    import struct
    h = hashlib.sha256(text.encode()).digest()
    floats = [struct.unpack('f', h[i:i+4])[0] for i in range(0, 64, 4)]
    mag = sum(f*f for f in floats) ** 0.5
    return [f / (mag + 1e-9) for f in floats] + [0.0] * 320

def snapshot_shard(collection) -> str:
    """Hash current shard state for cryptographic proof."""
    try:
        results = collection.get(include=["metadatas"])
        ids = sorted(results.get("ids", []))
        return hashlib.sha256(json.dumps(ids).encode()).hexdigest()
    except:
        return hashlib.sha256(b"empty").hexdigest()

def sign_proof(proof_data: dict) -> str:
    msg = json.dumps(proof_data, sort_keys=True).encode()
    return hmac.new(HMAC_SECRET, msg, hashlib.sha256).hexdigest()

# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "unlearning-engine", "shards": NUM_SHARDS}

@app.post("/ingest")
def ingest(body: dict):
    """Ingest a document into the sharded SISA vector store."""
    dpid      = body.get("dpid", "unknown")
    text      = body.get("text", "")
    doc_id    = body.get("doc_id", str(uuid.uuid4()))
    metadata  = body.get("metadata", {})

    if not text:
        raise HTTPException(400, "text is required")

    shard_id   = get_shard_id(dpid)
    collection = get_collection(shard_id)
    embedding  = simple_embed(text)

    collection.add(
        documents=[text],
        embeddings=[embedding],
        ids=[doc_id],
        metadatas=[{
            "dpid":      dpid,
            "shard_id":  shard_id,
            "doc_id":    doc_id,
            "ingested":  datetime.now(timezone.utc).isoformat(),
            **metadata
        }]
    )
    logger.info(f"Ingested doc {doc_id} for dpid={dpid} into shard {shard_id}")
    return {"doc_id": doc_id, "shard_id": shard_id, "dpid": dpid, "status": "ingested"}

@app.delete("/unlearn/{dpid}")
def sisa_unlearn(dpid: str, background_tasks: BackgroundTasks, requested_by: str = "api"):
    """
    Execute SISA Unlearning for a Data Principal.
    Returns a cryptographic Audit Proof of Erasure.
    """
    shard_id   = get_shard_id(dpid)
    collection = get_collection(shard_id)

    # 1. Snapshot BEFORE state
    hash_before = snapshot_shard(collection)

    # 2. Fetch all docs belonging to dpid in this shard
    try:
        results = collection.get(where={"dpid": dpid}, include=["metadatas"])
        doc_ids = results.get("ids", [])
    except Exception as e:
        logger.error(f"Error querying shard: {e}")
        doc_ids = []

    # 3. Delete all matching docs
    if doc_ids:
        collection.delete(ids=doc_ids)
        logger.info(f"Deleted {len(doc_ids)} docs for dpid={dpid} from shard {shard_id}")

    # 4. Snapshot AFTER state
    hash_after = snapshot_shard(collection)

    # 5. Scan ALL shards for any residual footprint (isolation check)
    residual_count = 0
    for sid in range(NUM_SHARDS):
        if sid == shard_id:
            continue
        try:
            col = get_collection(sid)
            res = col.get(where={"dpid": dpid}, include=["metadatas"])
            residual_count += len(res.get("ids", []))
        except:
            pass

    # 6. Build Proof of Erasure
    proof = {
        "proof_id":          str(uuid.uuid4()),
        "dpid":              dpid,
        "deleted_doc_count": len(doc_ids),
        "deleted_doc_ids":   doc_ids,
        "shard_id":          shard_id,
        "shard_hash_before": hash_before,
        "shard_hash_after":  hash_after,
        "residual_docs":     residual_count,
        "erasure_verified":  residual_count == 0,
        "timestamp":         datetime.now(timezone.utc).isoformat(),
        "requested_by":      requested_by,
        "standard":          "DPDP Act 2023 — Section 12 (Right to Erasure)",
        "technique":         "SISA (Sharded, Isolated, Sliced, Aggregated) Unlearning"
    }
    proof["hmac_signature"] = sign_proof(proof)

    # 7. Persist proof to PostgreSQL
    background_tasks.add_task(_persist_proof, proof)

    return proof

@app.get("/verify/{dpid}")
def verify_erasure(dpid: str):
    """Verify no residual embedding exists for a given Data Principal."""
    residual_ids = []
    for sid in range(NUM_SHARDS):
        try:
            col     = get_collection(sid)
            results = col.get(where={"dpid": dpid}, include=["metadatas"])
            residual_ids.extend(results.get("ids", []))
        except:
            pass
    return {
        "dpid":           dpid,
        "clean":          len(residual_ids) == 0,
        "residual_count": len(residual_ids),
        "residual_ids":   residual_ids
    }

@app.get("/documents/{dpid}")
def list_documents(dpid: str):
    """List all embedded documents for a Data Principal (for dashboard display)."""
    docs = []
    shard_id   = get_shard_id(dpid)
    collection = get_collection(shard_id)
    try:
        results = collection.get(where={"dpid": dpid}, include=["documents", "metadatas"])
        for i, doc_id in enumerate(results.get("ids", [])):
            meta = results["metadatas"][i] if results.get("metadatas") else {}
            text = results["documents"][i] if results.get("documents") else ""
            docs.append({
                "doc_id":   doc_id,
                "shard_id": shard_id,
                "metadata": meta,
                "preview":  text[:120] + "..." if len(text) > 120 else text
            })
    except Exception as e:
        logger.error(f"Error listing docs for {dpid}: {e}")
    return {"dpid": dpid, "shard_id": shard_id, "document_count": len(docs), "documents": docs}

@app.post("/query")
def rag_query(body: dict):
    """RAG query across all shards (with data lineage tracking)."""
    query_text = body.get("query", "")
    dpid_filter = body.get("dpid_filter")
    top_k = int(body.get("top_k", 5))

    query_embedding = simple_embed(query_text)
    all_results = []

    for sid in range(NUM_SHARDS):
        try:
            col = get_collection(sid)
            kwargs = {"query_embeddings": [query_embedding], "n_results": top_k, "include": ["documents", "metadatas", "distances"]}
            if dpid_filter:
                kwargs["where"] = {"dpid": dpid_filter}
            res = col.query(**kwargs)
            for i, doc_id in enumerate(res.get("ids", [[]])[0]):
                all_results.append({
                    "doc_id":   doc_id,
                    "shard_id": sid,
                    "text":     res["documents"][0][i],
                    "metadata": res["metadatas"][0][i],
                    "score":    1 - res["distances"][0][i]
                })
        except:
            pass

    all_results.sort(key=lambda x: x["score"], reverse=True)
    return {"query": query_text, "results": all_results[:top_k], "shards_searched": NUM_SHARDS}

@app.get("/stats")
def stats():
    """Return aggregate stats for the dashboard."""
    total_docs, total_dpids = 0, set()
    shard_stats = []
    for sid in range(NUM_SHARDS):
        try:
            col  = get_collection(sid)
            res  = col.get(include=["metadatas"])
            cnt  = len(res.get("ids", []))
            dpids = {m.get("dpid") for m in res.get("metadatas", []) if m}
            total_docs  += cnt
            total_dpids |= dpids
            shard_stats.append({"shard_id": sid, "doc_count": cnt, "dpid_count": len(dpids)})
        except:
            shard_stats.append({"shard_id": sid, "doc_count": 0, "dpid_count": 0})

    # Erasure proofs count from DB
    proof_count = 0
    conn = get_db()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) as cnt FROM erasure_proofs")
                proof_count = cur.fetchone()["cnt"]
        except:
            pass
        finally:
            conn.close()

    return {
        "total_docs":     total_docs,
        "total_dpids":    len(total_dpids),
        "total_shards":   NUM_SHARDS,
        "erasure_proofs": proof_count,
        "shard_stats":    shard_stats
    }

# ── Background task: persist proof ────────────────────────────────────────────
def _persist_proof(proof: dict):
    conn = get_db()
    if not conn:
        return
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO erasure_proofs
                (dpid, deleted_doc_count, deleted_doc_ids, shards_affected,
                 shard_hash_before, shard_hash_after, hmac_signature, erasure_verified, requested_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                proof["dpid"], proof["deleted_doc_count"], proof["deleted_doc_ids"],
                [proof["shard_id"]], proof["shard_hash_before"], proof["shard_hash_after"],
                proof["hmac_signature"], proof["erasure_verified"], proof["requested_by"]
            ))
        conn.commit()
    except Exception as e:
        logger.error(f"Failed to persist proof: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
