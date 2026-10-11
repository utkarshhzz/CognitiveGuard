package com.cognitiveguard.gateway.filter;

import com.cognitiveguard.gateway.model.AgentAuditLog;
import com.cognitiveguard.gateway.repository.AuditLogRepository;
import com.cognitiveguard.gateway.service.JitTokenService;
import com.cognitiveguard.gateway.websocket.AuditBroadcaster;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;

/**
 * Core Zero-Trust interceptor.
 * Every inbound agent request MUST carry:
 *   X-Agent-ID       — unique agent identifier
 *   X-Consent-Token  — JIT token proving valid consent
 *   X-Resource       — the exact data resource being requested
 *
 * Requests missing any header, or presenting an invalid/expired JIT token,
 * are denied with HTTP 403 and logged to the immutable audit ledger.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AgentAuthFilter extends OncePerRequestFilter {

    private final AuditLogRepository auditRepo;
    private final JitTokenService jitService;
    private final AuditBroadcaster broadcaster;

    // Paths that bypass agent auth (internal/infra)
    private static final String[] BYPASS_PATHS = {
        "/actuator", "/health", "/api/jit/request", "/api/agents/register"
    };

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        for (String bypass : BYPASS_PATHS) {
            if (path.startsWith(bypass)) return true;
        }
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        long startMs = System.currentTimeMillis();
        String agentId      = request.getHeader("X-Agent-ID");
        String consentToken = request.getHeader("X-Consent-Token");
        String resource     = request.getHeader("X-Resource");
        String clientIp     = getClientIp(request);

        // 1. Validate required headers
        if (agentId == null || consentToken == null || resource == null) {
            deny(response, agentId, resource, "MISSING_HEADERS",
                 "Required headers: X-Agent-ID, X-Consent-Token, X-Resource",
                 clientIp, startMs);
            return;
        }

        // 2. Validate JIT token
        var validation = jitService.validate(consentToken, agentId, resource);
        if (!validation.isValid()) {
            deny(response, agentId, resource, validation.getReason(),
                 validation.getDetail(), clientIp, startMs);
            return;
        }

        // 3. Log successful grant
        var entry = AgentAuditLog.builder()
            .agentId(agentId)
            .resource(resource)
            .action(AgentAuditLog.Action.GRANTED)
            .dpid(request.getHeader("X-DPID"))
            .ipAddress(clientIp)
            .latencyMs((int)(System.currentTimeMillis() - startMs))
            .timestamp(Instant.now())
            .build();
        auditRepo.save(entry);
        broadcaster.broadcast(entry);

        log.debug("✅ GRANTED: agent={} resource={}", agentId, resource);
        chain.doFilter(request, response);
    }

    private void deny(HttpServletResponse response, String agentId, String resource,
                      String reason, String detail, String ip, long startMs)
            throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.getWriter().write(String.format(
            "{\"error\":\"ACCESS_DENIED\",\"reason\":\"%s\",\"detail\":\"%s\",\"agent\":\"%s\"}",
            reason, detail, agentId != null ? agentId : "unknown"
        ));

        var entry = AgentAuditLog.builder()
            .agentId(agentId != null ? agentId : "unknown")
            .resource(resource != null ? resource : "unknown")
            .action(AgentAuditLog.Action.DENIED)
            .reason(reason + ": " + detail)
            .ipAddress(ip)
            .latencyMs((int)(System.currentTimeMillis() - startMs))
            .timestamp(Instant.now())
            .build();
        try { auditRepo.save(entry); broadcaster.broadcast(entry); } catch (Exception ignored) {}
        log.warn("🚫 DENIED: agent={} resource={} reason={}", agentId, resource, reason);
    }

    private String getClientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        return (xff != null && !xff.isBlank()) ? xff.split(",")[0].trim() : req.getRemoteAddr();
    }
}
