#!/usr/bin/env python3
"""
CognitiveGuard AI — Demo Data Seeder
Populates ChromaDB with realistic PII-containing documents for demonstration.
"""
import requests, json, time, random

UNLEARNING_URL = "http://localhost:8001"

DEMO_PRINCIPALS = [
    {
        "dpid": "dp-user-001",
        "name": "Priya Sharma",
        "docs": [
            "Customer Priya Sharma, email priya.sharma@email.com, Aadhaar: 1234 5678 9012, Mumbai",
            "CRM notes: Priya Sharma called on 2026-09-15, interested in premium analytics tier",
            "Subscription data: Plan=Enterprise, MRR=₹12,000, Since 2024-01-15",
            "Support ticket #4521: Data export request, resolved by agent agt-crm-sync-01",
            "Behavioral: 47 sessions, avg 23min, primary device: iOS, location: Mumbai",
        ]
    },
    {
        "dpid": "dp-user-007",
        "name": "Ananya Iyer",
        "docs": [
            "Employee record: Ananya Iyer, PAN: ABCDE1234F, DOJ: 2023-03-01, Dept: Engineering",
            "HR note: Ananya Iyer, salary band L4, performance rating: Exceptional FY2026",
            "Contact: ananya.iyer@corp.com, +91 9876543210, Bangalore, Karnataka",
            "Benefits enrollment: Health=Family, PF: 12% of ₹85,000, NPS opted-in",
            "Project assignment: CognitiveGuard AI platform, role: Lead ML Engineer",
            "Training completion: DPDP Awareness Q3 2026, Data Ethics certification",
            "Attendance pattern: WFH Tuesdays, office Mon/Wed/Thu/Fri",
            "System access: AWS prod readonly, GitHub admin, Jira, Confluence",
        ]
    },
    {
        "dpid": "dp-user-002",
        "name": "Rahul Mehta",
        "docs": [
            "Marketing profile: Rahul Mehta, DOB: 15/03/1988, Preference: B2B SaaS",
            "Email campaign response: Opened 8/10, clicked 3/10, converted 1 upsell",
            "Account: rahul.mehta@company.co, phone: +91 8765432109",
        ]
    },
    {
        "dpid": "dp-user-042",
        "name": "Vikram Nair",
        "docs": [
            "CRM: Vikram Nair, Company: TechVentures Ltd, Role: CTO, Deal size: ₹45L ARR",
            "Passport: P1234567, Nationality: Indian, Expiry: 2030-01-01",
        ]
    },
    {
        "dpid": "dp-user-099",
        "name": "Kavitha Reddy",
        "docs": [
            "HR: Kavitha Reddy, Employee ID: EMP-8821, DOJ: 2021-06-01, Chennai",
            "Analytics: Session data for user reddy_k, 234 logins since Jan 2026",
            "Marketing: Kavitha Reddy, loyalty tier: Gold, CLV: ₹2.4L",
            "CRM: Account exec Kavitha Reddy, owns 12 enterprise accounts",
            "Training data label: Expert annotator, 1,420 labeled samples",
            "Biometric access: Building C, badge ID: BG-44221",
            "Medical declaration: No known conditions (for insurance)",
            "Bank details: Salary credit HDFC xxxxxx1234 (last 4 digits)",
            "Emergency contact: Suresh Reddy, +91 9988776655",
            "Vehicle registration: TN09AB1234 (parking pass)",
            "Reference check: MIT Manipal, 2019, Computer Science",
        ]
    },
]

def seed():
    print("🌱 Seeding CognitiveGuard demo data into ChromaDB...")
    print(f"   Target: {UNLEARNING_URL}")
    print()

    # Health check
    try:
        r = requests.get(f"{UNLEARNING_URL}/health", timeout=5)
        print(f"✅ Unlearning engine healthy: {r.json()}")
    except Exception as e:
        print(f"❌ Cannot reach unlearning engine: {e}")
        print("   Make sure to run: cd services/unlearning-engine && uvicorn main:app --port 8001")
        return

    total = 0
    for principal in DEMO_PRINCIPALS:
        dpid = principal["dpid"]
        name = principal["name"]
        print(f"\n📥 Ingesting data for {name} ({dpid})...")
        for i, doc in enumerate(principal["docs"]):
            try:
                r = requests.post(f"{UNLEARNING_URL}/ingest", json={
                    "dpid": dpid,
                    "text": doc,
                    "metadata": {"source": "demo_seed", "category": random.choice(["CRM","HR","ANALYTICS","MARKETING"])}
                }, timeout=10)
                if r.ok:
                    data = r.json()
                    print(f"   ✓ Doc {i+1}/{len(principal['docs'])} → shard {data['shard_id']} [{data['doc_id'][:8]}...]")
                    total += 1
                else:
                    print(f"   ✗ Failed: {r.status_code}")
            except Exception as e:
                print(f"   ✗ Error: {e}")
            time.sleep(0.1)

    print(f"\n🎉 Seeding complete! {total} documents ingested across {len(DEMO_PRINCIPALS)} data principals.")
    print("\n📊 Verify stats:")
    try:
        r = requests.get(f"{UNLEARNING_URL}/stats", timeout=5)
        stats = r.json()
        print(f"   Total docs: {stats['total_docs']}")
        print(f"   Total DPIDs: {stats['total_dpids']}")
        print(f"   Shards: {stats['total_shards']}")
    except:
        print("   (Could not fetch stats)")

if __name__ == "__main__":
    seed()
