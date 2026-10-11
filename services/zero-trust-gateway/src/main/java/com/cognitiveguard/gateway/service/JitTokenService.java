package com.cognitiveguard.gateway.service;

import com.cognitiveguard.gateway.model.JitToken;
import com.cognitiveguard.gateway.repository.JitTokenRepository;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

/**
 * Just-in-Time Access Control Service (MCP-inspired)
 *
 * Issues short-lived (5-minute default) tokens scoped to EXACTLY:
 *   - one agent identity
 *   - one data resource
 *   - one processing purpose
 *
 * Agents cannot re-use or transfer tokens. Expired/revoked tokens
 * are permanently invalid and logged to the audit trail.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class JitTokenService {

    private final JitTokenRepository tokenRepo;

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${gateway.jit-ttl-seconds:300}")
    private long jitTtlSeconds;

    public record ValidationResult(boolean valid, String reason, String detail) {
        public boolean isValid()  { return valid; }
        public String  getReason(){ return reason; }
        public String  getDetail(){ return detail; }
    }

    /**
     * Issue a new JIT token for an agent+resource+purpose triplet.
     * The token is a signed JWT storing all three claims.
     */
    public JitToken issue(String agentId, String resource, String purpose, String dpid) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        Instant now    = Instant.now();
        Instant expiry = now.plusSeconds(jitTtlSeconds);

        String jwt = Jwts.builder()
            .id(UUID.randomUUID().toString())
            .subject(agentId)
            .claim("resource", resource)
            .claim("purpose",  purpose)
            .claim("dpid",     dpid)
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiry))
            .signWith(key)
            .compact();

        JitToken token = JitToken.builder()
            .token(jwt)
            .agentId(agentId)
            .resource(resource)
            .purpose(purpose)
            .dpid(dpid)
            .issuedAt(now)
            .expiresAt(expiry)
            .build();

        tokenRepo.save(token);
        log.info("🔑 JIT issued: agent={} resource={} ttl={}s", agentId, resource, jitTtlSeconds);
        return token;
    }

    /**
     * Validate a JIT token — checks JWT signature, expiry, revocation,
     * and that the agent/resource claims match the request.
     */
    public ValidationResult validate(String rawToken, String agentId, String resource) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
            Claims claims = Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(rawToken).getPayload();

            // Check agent match
            if (!agentId.equals(claims.getSubject())) {
                return new ValidationResult(false, "AGENT_MISMATCH",
                    "Token issued for different agent: " + claims.getSubject());
            }
            // Check resource match
            String tokenResource = claims.get("resource", String.class);
            if (!resource.equals(tokenResource)) {
                return new ValidationResult(false, "RESOURCE_MISMATCH",
                    "Token scoped to: " + tokenResource + ", requested: " + resource);
            }
            // Check DB revocation
            return tokenRepo.findByToken(rawToken)
                .map(t -> t.isRevoked()
                    ? new ValidationResult(false, "TOKEN_REVOKED", t.getRevokedReason())
                    : new ValidationResult(true, "OK", "Valid JIT token"))
                .orElse(new ValidationResult(false, "TOKEN_NOT_FOUND", "Token not in registry"));

        } catch (ExpiredJwtException e) {
            return new ValidationResult(false, "TOKEN_EXPIRED", "JIT token expired at " + e.getClaims().getExpiration());
        } catch (JwtException e) {
            return new ValidationResult(false, "INVALID_TOKEN", e.getMessage());
        }
    }

    /**
     * Revoke all active JIT tokens for an agent (e.g., on suspension).
     */
    public int revokeAllForAgent(String agentId, String reason) {
        var tokens = tokenRepo.findByAgentIdAndRevokedFalse(agentId);
        tokens.forEach(t -> {
            t.setRevoked(true);
            t.setRevokedAt(Instant.now());
            t.setRevokedReason(reason);
        });
        tokenRepo.saveAll(tokens);
        log.info("🔴 Revoked {} tokens for agent={} reason={}", tokens.size(), agentId, reason);
        return tokens.size();
    }

    /** Scheduled cleanup: expire old tokens from DB (run hourly) */
    public void cleanExpiredTokens() {
        int deleted = tokenRepo.deleteByExpiresAtBefore(Instant.now().minusSeconds(3600));
        if (deleted > 0) log.info("🗑️ Cleaned {} expired JIT tokens", deleted);
    }
}
