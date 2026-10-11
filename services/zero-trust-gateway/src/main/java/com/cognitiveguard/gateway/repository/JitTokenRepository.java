package com.cognitiveguard.gateway.repository;

import com.cognitiveguard.gateway.model.JitToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JitTokenRepository extends JpaRepository<JitToken, UUID> {

    Optional<JitToken> findByToken(String token);

    List<JitToken> findByAgentIdAndRevokedFalse(String agentId);

    List<JitToken> findByAgentId(String agentId);

    @Modifying
    @Transactional
    @Query("DELETE FROM JitToken t WHERE t.expiresAt < :before")
    int deleteByExpiresAtBefore(Instant before);
}
