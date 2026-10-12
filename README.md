# CognitiveGuard AI
### DPDP-Compliant Continuous Threat Exposure Management Platform for Agentic AI


> CTEM + Machine Unlearning + Zero-Trust Access Gateway + Live DPDP Compliance Dashboard

---

##  Quick Start (Dashboard Only — No Backend Needed)

```bash
cd services/dashboard
npm install
npm run dev
# → Opens at http://localhost:5173
```

##  Full Stack (Docker Compose)

```bash
# Copy environment file
cp .env.example .env

# Start all services
cd infra
docker-compose up --build

# Services:
#   Dashboard      → http://localhost:3000
#   Unlearning API → http://localhost:8001/docs
#   CTEM Pipeline  → http://localhost:8002/docs
#   Gateway        → http://localhost:8080
#   ChromaDB       → http://localhost:8000
#   PostgreSQL     → localhost:5432

# Seed demo data
cd ../demo
python seed_data.py

# Run attack simulation
python attack_simulator.py
```

---

##  Architecture

```
┌─────────────────────────────────────────────────────┐
│              AI Agents / LLM Applications            │
└───────────────────────┬─────────────────────────────┘
                        │ All requests intercepted
                        ▼
┌─────────────────────────────────────────────────────┐
│      Zero-Trust Gateway (Spring Boot :8080)         │
│  • JIT Access Control (MCP)   • OPA Policy Engine   │
│  • Consent Token Validation   • WebSocket Audit Feed│
└──────┬──────────────────────────────────────────────┘
       │                    │
       ▼                    ▼
┌─────────────┐    ┌────────────────────────────────┐
│    Machine  │    │   CTEM Pipeline (Python :8002) │
│  Unlearning │    │  • PII Detection (Presidio)    │
│  Engine     │    │  • Prompt Injection Blocking   │
│  (FastAPI)  │    │  • Shadow AI Detection         │
│  :8001      │    │  • gRPC Telemetry Streaming    │
└──────┬──────┘    └──────────────────┬─────────────┘
       │                              │
       ▼                              ▼
┌─────────────┐                ┌────────────────┐
│  ChromaDB   │                │   PostgreSQL   │
│  Sharded    │                │   Audit Ledger │
│  Vector DB  │                │   + Triggers   │
└─────────────┘                └────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│      CISO/DPO Dashboard (React + D3.js :3000)       │
│  • Real-time Threat Map        • SISA Unlearning UI  │
│  • Vulnerability Burndown      • DPIA PDF Export     │
│  • Agent Registry + JIT        • Consent Manager     │
│  • Data Lineage Graph          • Remediation Hub     │
└─────────────────────────────────────────────────────┘
```

---

##  Deliverables

### Deliverable 1: Machine Unlearning Engine (`services/unlearning-engine/`)
- **SISA Unlearning**: Sharded, Isolated, Sliced, and Aggregated technique
- **8-Shard ChromaDB** architecture for targeted erasure without full retrain
- **Cryptographic Audit Proofs**: HMAC-SHA256 signed erasure certificates
- **Residual Scan**: Verifies zero footprint across all shards post-erasure
- **DPDP §12 Compliance**: Right to Erasure enforcement with verifiable proof

**API Endpoints:**
```
POST /ingest              → Ingest document with SISA sharding
DELETE /unlearn/{dpid}    → Execute SISA unlearning + generate proof
GET  /verify/{dpid}       → Verify zero residual embedding
GET  /documents/{dpid}    → List all embedded docs for a principal
POST /query               → RAG query with data lineage tracking
GET  /stats               → Aggregate vector store statistics
```

### Deliverable 2: Zero-Trust Gateway (`services/zero-trust-gateway/`)
- **Spring Boot 3.x** interceptor validating every agent API call
- **JIT Token Service**: 5-minute ephemeral tokens scoped to exact resource
- **MCP-Inspired Policy**: Purpose-bound, consent-gated access control
- **OPA Integration**: Declarative Rego policies for agent authorization
- **PostgreSQL Audit Log**: Automated triggers for privilege escalation detection
- **WebSocket Feed**: Real-time audit stream to dashboard

### Deliverable 3: CTEM Pipeline (`services/ctem-pipeline/`)
- **PII Detection**: Aadhaar, PAN, Email, Phone, Passport, Credit Card patterns
- **Prompt Injection Blocking**: 10+ regex patterns + similarity scoring
- **Shadow AI Detection**: Identifies unregistered agents calling known AI APIs
- **Data Lineage Tracking**: Source → Transform → Inference graph
- **WebSocket Streaming**: Real-time event broadcast to dashboard
- **gRPC Proto**: `TelemetryService` for high-throughput event reporting

### Deliverable 4: CISO/DPO Dashboard (`services/dashboard/`)
- **Live Threat Overview**: Metrics, burndown chart, risk gauge, alert feed
- **Agent Registry**: JIT token management, risk classification, audit drill-down
- **Data Lineage Map**: D3.js force-directed graph with animated PII flow particles
- **SISA Unlearning Console**: Step-by-step animated progress + proof viewer + download
- **Consent Manager**: Interactive purpose matrix with auto-SISA-trigger on revocation
- **DPIA Reports**: Dynamic §-by-§ DPDP scoring with one-click PDF export (DPBI format)
- **Remediation Hub**: 8 one-click playbooks (eBPF, differential privacy, JIT, suspension)

---

##  Extra Features (Beyond Scope)

| Feature | Description |
|---------|-------------|
| **Consent-Unlearning Automation** | Revoking consent auto-triggers SISA erasure |
| **Model Inversion Attack Detection** | Detects reconstruction attempts via query pattern analysis |
| **Attack Simulator** | `demo/attack_simulator.py` — 4-vector realistic attack demo |
| **Regulatory Mapping Panel** | Every alert maps to specific DPDP Act section |
| **Multi-Purpose Consent Matrix** | 6 processing purposes per data principal |
| **DPBI-Format PDF Export** | Legally formatted DPIA PDFs for regulatory submission |
| **eBPF Network Filter Playbook** | Kernel-level shadow AI endpoint blocking |
| **Differential Privacy Tuning** | One-click ε parameter adjustment playbook |

---

##  Tech Stack

| Component | Technology |
|-----------|-----------|
| Unlearning Engine | Python 3.11 + FastAPI + ChromaDB |
| Zero-Trust Gateway | Java 21 + Spring Boot 3.x + PostgreSQL |
| CTEM Pipeline | Python 3.11 + FastAPI WebSocket + gRPC |
| Dashboard | React 18 + Vite + D3.js + Recharts |
| PDF Export | jsPDF |
| PII Detection | Microsoft Presidio patterns |
| Policy Engine | OPA (Open Policy Agent) |
| Orchestration | Docker Compose |
| Message Bus | Apache Kafka |

---

##  DPDP Act Compliance Coverage

| Section | Topic | Coverage |
|---------|-------|----------|
| §7 | Consent | ✅ Purpose-limited consent manager |
| §8 | Notice | ✅ Privacy notices on all ingestion |
| §9 | Data Minimization | ✅ Scope-limited JIT access |
| §12 | Right to Erasure | ✅ SISA + cryptographic proof |
| §16 | Data Localization | ✅ Shadow AI endpoint blocking |
| §24 | Security Safeguards | ✅ Zero-Trust + ZTA gateway |
| §27 | SDF Obligations | ✅ Continuous DPIA + audit |
| §30 | Audit & Accountability | ✅ Immutable PostgreSQL ledger |

---

##  Demo Script (5 Minutes)

1. **[0:00–0:45]** Open dashboard → Show live risk gauge (67/100), burndown chart, alert feed
2. **[0:45–1:30]** Run `demo/attack_simulator.py` → Watch CRITICAL alerts fire in real-time
3. **[1:30–2:00]** Navigate to Agents → Show shadow agent suspended, privilege escalation flagged
4. **[2:00–3:15]** Navigate to Unlearning → Search "Ananya Iyer" → Execute SISA → Watch animated steps → Download Proof of Erasure JSON
5. **[3:15–3:45]** Navigate to Consent Manager → Revoke a consent → See auto-SISA trigger notification
6. **[3:45–4:15]** Navigate to Lineage → Show red PII-tainted paths, animated flow particles
7. **[4:15–5:00]** Navigate to DPIA → Show §-by-§ scoring → Export PDF → Done ✅

---

##  Project Structure

```
cognitiveguard/
├── services/
│   ├── unlearning-engine/     # Python FastAPI (D1)
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   ├── zero-trust-gateway/    # Spring Boot (D2)
│   ├── ctem-pipeline/         # Python + gRPC (D3)
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   └── dashboard/             # React + Vite (D4)
│       ├── src/
│       │   ├── App.jsx
│       │   ├── index.css
│       │   ├── data/store.js
│       │   └── pages/
│       │       ├── Dashboard.jsx
│       │       ├── Agents.jsx
│       │       ├── Unlearn.jsx
│       │       ├── Lineage.jsx
│       │       ├── ConsentManager.jsx
│       │       ├── DPIA.jsx
│       │       └── Playbooks.jsx
│       └── index.html
├── infra/
│   ├── docker-compose.yml
│   └── postgres/init.sql
└── demo/
    ├── seed_data.py
    └── attack_simulator.py
```

---


