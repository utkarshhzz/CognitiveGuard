package com.cognitiveguard.gateway.controller;

import com.cognitiveguard.gateway.model.JitToken;
import com.cognitiveguard.gateway.repository.AuditLogRepository;
import com.cognitiveguard.gateway.service.JitTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class GatewayController {

    private final JitTokenService jitService;
    private final AuditLogRepository auditRepo;

    /** Health check */
    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of(
            "status",  "UP",
            "service", "zero-trust-gateway",
            "time",    Instant.now()
        ));
    }

    /** Issue a JIT token for agent+resource+purpose */
    @PostMapping("/jit/request")
    public ResponseEntity<?> requestJit(@RequestBody Map<String, String> body) {
        String agentId  = body.get("agentId");
        String resource = body.get("resource");
        String purpose  = body.get("purpose");
        String dpid     = body.get("dpid");

        if (agentId == null || resource == null || purpose == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "agentId, resource, purpose are required"));
        }

        JitToken token = jitService.issue(agentId, resource, purpose, dpid);
        return ResponseEntity.ok(Map.of(
            "token",     token.getToken(),
            "agentId",   token.getAgentId(),
            "resource",  token.getResource(),
            "purpose",   token.getPurpose(),
            "expiresAt", token.getExpiresAt(),
            "ttlSeconds", 300
        ));
    }

    /** Revoke all JIT tokens for an agent */
    @PostMapping("/agents/{agentId}/revoke")
    public ResponseEntity<?> revokeAgent(@PathVariable String agentId,
                                          @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.getOrDefault("reason", "Manual revocation") : "Manual revocation";
        int revoked = jitService.revokeAllForAgent(agentId, reason);
        return ResponseEntity.ok(Map.of(
            "agentId", agentId,
            "tokensRevoked", revoked,
            "reason", reason
        ));
    }

    /** Get recent audit log entries */
    @GetMapping("/audit/recent")
    public ResponseEntity<?> recentAudit() {
        return ResponseEntity.ok(auditRepo.findTop50ByOrderByTimestampDesc());
    }

    /** Get audit log for a specific agent */
    @GetMapping("/audit/agent/{agentId}")
    public ResponseEntity<?> agentAudit(@PathVariable String agentId) {
        return ResponseEntity.ok(auditRepo.findByAgentIdOrderByTimestampDesc(agentId));
    }
}
