package com.cognitiveguard.gateway.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "agent_audit_log", indexes = {
    @Index(name = "idx_audit_agent_id", columnList = "agent_id"),
    @Index(name = "idx_audit_timestamp", columnList = "timestamp")
})
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AgentAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "agent_id", nullable = false)
    private String agentId;

    @Column(nullable = false)
    private String resource;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Action action;

    private String reason;
    private String dpid;

    @Column(name = "pii_detected")
    private boolean piiDetected;

    @Column(name = "payload_hash")
    private String payloadHash;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "latency_ms")
    private Integer latencyMs;

    @Column(nullable = false)
    private Instant timestamp;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) timestamp = Instant.now();
    }

    public enum Action {
        GRANTED, DENIED, REVOKED, JIT_ISSUED, JIT_EXPIRED
    }
}
