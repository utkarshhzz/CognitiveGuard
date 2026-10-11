package com.cognitiveguard.gateway.websocket;

import com.cognitiveguard.gateway.model.AgentAuditLog;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Broadcasts audit events to the CISO dashboard in real-time via STOMP/WebSocket.
 * The dashboard subscribes to /topic/audit to receive a live feed of all agent
 * access events (both GRANTED and DENIED) as they happen.
 */
@Component
@Slf4j
public class AuditBroadcaster {

    private final SimpMessagingTemplate template;
    private final ObjectMapper mapper;

    public AuditBroadcaster(SimpMessagingTemplate template) {
        this.template = template;
        this.mapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    public void broadcast(AgentAuditLog entry) {
        try {
            var payload = Map.of(
                "type",       "AUDIT_EVENT",
                "agentId",    entry.getAgentId(),
                "resource",   entry.getResource(),
                "action",     entry.getAction().name(),
                "reason",     entry.getReason() != null ? entry.getReason() : "",
                "dpid",       entry.getDpid() != null ? entry.getDpid() : "",
                "piiDetected",entry.isPiiDetected(),
                "ipAddress",  entry.getIpAddress() != null ? entry.getIpAddress() : "",
                "latencyMs",  entry.getLatencyMs() != null ? entry.getLatencyMs() : 0,
                "timestamp",  entry.getTimestamp().toString(),
                "severity",   entry.getAction() == AgentAuditLog.Action.DENIED ? "HIGH" : "INFO"
            );
            template.convertAndSend("/topic/audit", payload);
        } catch (Exception e) {
            log.debug("WebSocket broadcast error (dashboard may not be connected): {}", e.getMessage());
        }
    }
}
