-- CognitiveGuard AI — PostgreSQL Schema
-- DPDP-Compliant Agentic AI Security Platform

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- AGENTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE agents (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id        VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    owner_team      VARCHAR(255),
    risk_level      VARCHAR(20) DEFAULT 'LOW' CHECK (risk_level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    status          VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','REVOKED')),
    allowed_scopes  TEXT[],
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- AGENT AUDIT LOG
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE agent_audit_log (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id        VARCHAR(255) NOT NULL,
    resource        TEXT NOT NULL,
    action          VARCHAR(50) NOT NULL CHECK (action IN ('GRANTED','DENIED','REVOKED','JIT_ISSUED','JIT_EXPIRED')),
    reason          TEXT,
    dpid            VARCHAR(255),
    pii_detected    BOOLEAN DEFAULT FALSE,
    payload_hash    VARCHAR(64),
    ip_address      INET,
    latency_ms      INTEGER,
    timestamp       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_agent_id ON agent_audit_log(agent_id);
CREATE INDEX idx_audit_timestamp ON agent_audit_log(timestamp DESC);
CREATE INDEX idx_audit_dpid ON agent_audit_log(dpid);

-- ─────────────────────────────────────────────────────────────────────────────
-- JIT ACCESS TOKENS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE jit_tokens (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token           VARCHAR(512) UNIQUE NOT NULL,
    agent_id        VARCHAR(255) NOT NULL,
    resource        TEXT NOT NULL,
    purpose         TEXT NOT NULL,
    dpid            VARCHAR(255),
    issued_at       TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked         BOOLEAN DEFAULT FALSE,
    revoked_at      TIMESTAMPTZ,
    revoked_reason  TEXT
);

CREATE INDEX idx_jit_token ON jit_tokens(token);
CREATE INDEX idx_jit_expires ON jit_tokens(expires_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECURITY ALERTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE security_alerts (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id        VARCHAR(255),
    alert_type      VARCHAR(100) NOT NULL,
    severity        VARCHAR(20) NOT NULL CHECK (severity IN ('INFO','LOW','MEDIUM','HIGH','CRITICAL')),
    title           TEXT NOT NULL,
    description     TEXT,
    source_ip       INET,
    affected_dpids  TEXT[],
    evidence        JSONB,
    resolved        BOOLEAN DEFAULT FALSE,
    resolved_by     VARCHAR(255),
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_severity ON security_alerts(severity);
CREATE INDEX idx_alerts_created ON security_alerts(created_at DESC);
CREATE INDEX idx_alerts_resolved ON security_alerts(resolved);

-- ─────────────────────────────────────────────────────────────────────────────
-- ERASURE PROOFS (SISA MACHINE UNLEARNING)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE erasure_proofs (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dpid                VARCHAR(255) NOT NULL,
    deleted_doc_count   INTEGER NOT NULL,
    deleted_doc_ids     TEXT[],
    shards_affected     INTEGER[],
    shard_hash_before   VARCHAR(64) NOT NULL,
    shard_hash_after    VARCHAR(64) NOT NULL,
    hmac_signature      VARCHAR(128) NOT NULL,
    erasure_verified    BOOLEAN DEFAULT TRUE,
    requested_by        VARCHAR(255),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_erasure_dpid ON erasure_proofs(dpid);

-- ─────────────────────────────────────────────────────────────────────────────
-- CONSENT RECORDS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE consent_records (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dpid            VARCHAR(255) NOT NULL,
    purpose         VARCHAR(255) NOT NULL,
    granted         BOOLEAN NOT NULL,
    granted_at      TIMESTAMPTZ,
    revoked_at      TIMESTAMPTZ,
    expiry          TIMESTAMPTZ,
    consent_version VARCHAR(20) DEFAULT 'v1.0',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consent_dpid ON consent_records(dpid);

-- ─────────────────────────────────────────────────────────────────────────────
-- TELEMETRY EVENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE telemetry_events (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_app      VARCHAR(255),
    dest_endpoint   TEXT,
    agent_id        VARCHAR(255),
    event_type      VARCHAR(100),
    pii_detected    BOOLEAN DEFAULT FALSE,
    pii_types       TEXT[],
    payload_hash    VARCHAR(64),
    bytes_sent      INTEGER,
    latency_ms      INTEGER,
    blocked         BOOLEAN DEFAULT FALSE,
    block_reason    TEXT,
    timestamp       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_telemetry_timestamp ON telemetry_events(timestamp DESC);
CREATE INDEX idx_telemetry_pii ON telemetry_events(pii_detected);

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

-- Auto-flag privilege escalation (>10 requests in 60s from same agent)
CREATE OR REPLACE FUNCTION flag_privilege_escalation()
RETURNS TRIGGER AS $$
DECLARE
    req_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO req_count
    FROM agent_audit_log
    WHERE agent_id = NEW.agent_id
      AND timestamp > NOW() - INTERVAL '60 seconds';

    IF req_count > 10 THEN
        INSERT INTO security_alerts(agent_id, alert_type, severity, title, description)
        VALUES (
            NEW.agent_id,
            'PRIVILEGE_ESCALATION',
            'CRITICAL',
            'Privilege Escalation Detected',
            format('Agent %s made %s requests in 60 seconds', NEW.agent_id, req_count)
        )
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER escalation_check
AFTER INSERT ON agent_audit_log
FOR EACH ROW EXECUTE FUNCTION flag_privilege_escalation();

-- Auto-update agent risk level based on audit activity
CREATE OR REPLACE FUNCTION update_agent_risk()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE agents
    SET risk_level = CASE
        WHEN (SELECT COUNT(*) FROM security_alerts
              WHERE agent_id = NEW.agent_id
              AND severity IN ('HIGH','CRITICAL')
              AND created_at > NOW() - INTERVAL '24 hours') > 0 THEN 'CRITICAL'
        WHEN (SELECT COUNT(*) FROM agent_audit_log
              WHERE agent_id = NEW.agent_id
              AND action = 'DENIED'
              AND timestamp > NOW() - INTERVAL '1 hour') > 5 THEN 'HIGH'
        ELSE risk_level
    END,
    updated_at = NOW()
    WHERE agent_id = NEW.agent_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_risk_update
AFTER INSERT ON security_alerts
FOR EACH ROW EXECUTE FUNCTION update_agent_risk();

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DATA
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO agents (agent_id, name, description, owner_team, risk_level, status, allowed_scopes) VALUES
('agt-crm-sync-01', 'CRM Sync Agent', 'Syncs customer PII from Salesforce to data lake', 'Sales Engineering', 'MEDIUM', 'ACTIVE', ARRAY['crm:read','datastore:write']),
('agt-analytics-02', 'Analytics Inference Agent', 'Runs ML inference on user behavioral data', 'Data Science', 'HIGH', 'ACTIVE', ARRAY['analytics:read','model:inference']),
('agt-hr-proc-03', 'HR Processing Agent', 'Processes employee PII for payroll and compliance', 'HR Tech', 'LOW', 'ACTIVE', ARRAY['hr:read','hr:write']),
('agt-shadow-04', 'Unregistered API Client', 'Detected unauthorized AI endpoint calls', 'UNKNOWN', 'CRITICAL', 'SUSPENDED', ARRAY[]),
('agt-report-05', 'Regulatory Reporting Agent', 'Generates DPDP compliance reports', 'Legal & Compliance', 'LOW', 'ACTIVE', ARRAY['audit:read','report:generate']);

INSERT INTO consent_records (dpid, purpose, granted, granted_at, expiry) VALUES
('dp-user-001', 'ANALYTICS', TRUE, NOW() - INTERVAL '30 days', NOW() + INTERVAL '335 days'),
('dp-user-002', 'MARKETING', TRUE, NOW() - INTERVAL '60 days', NOW() + INTERVAL '305 days'),
('dp-user-003', 'ANALYTICS', FALSE, NULL, NULL),
('dp-user-007', 'ANALYTICS', TRUE, NOW() - INTERVAL '15 days', NOW() + INTERVAL '350 days'),
('dp-user-007', 'MARKETING', FALSE, NULL, NULL);
