package com.cognitiveguard.gateway.repository;

import com.cognitiveguard.gateway.model.AgentAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AgentAuditLog, UUID> {

    List<AgentAuditLog> findByAgentIdOrderByTimestampDesc(String agentId);

    @Query("SELECT COUNT(a) FROM AgentAuditLog a WHERE a.agentId = :agentId AND a.timestamp > :since")
    long countRecentRequests(String agentId, Instant since);

    @Query("SELECT COUNT(a) FROM AgentAuditLog a WHERE a.agentId = :agentId AND a.action = 'DENIED' AND a.timestamp > :since")
    long countRecentDenials(String agentId, Instant since);

    List<AgentAuditLog> findTop50ByOrderByTimestampDesc();
}
