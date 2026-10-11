package com.cognitiveguard.gateway.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "jit_tokens", indexes = {
    @Index(name = "idx_jit_token", columnList = "token"),
    @Index(name = "idx_jit_expires", columnList = "expires_at")
})
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class JitToken {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false, unique = true, length = 512)
    private String token;

    @Column(name = "agent_id", nullable = false)
    private String agentId;

    @Column(nullable = false)
    private String resource;

    @Column(nullable = false)
    private String purpose;

    private String dpid;

    @Column(name = "issued_at")
    private Instant issuedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Builder.Default
    private boolean revoked = false;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "revoked_reason")
    private String revokedReason;

    @PrePersist
    protected void onCreate() {
        if (issuedAt == null) issuedAt = Instant.now();
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public boolean isValid() {
        return !revoked && !isExpired();
    }
}
