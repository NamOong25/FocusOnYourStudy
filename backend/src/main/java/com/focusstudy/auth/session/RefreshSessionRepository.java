package com.focusstudy.auth.session;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface RefreshSessionRepository extends JpaRepository<RefreshSessionEntity, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from RefreshSessionEntity s where s.id = :id")
    Optional<RefreshSessionEntity> lockById(@Param("id") UUID id);

    boolean existsByIdAndUserIdAndRevokedAtIsNullAndExpiresAtAfter(UUID id, UUID userId, Instant now);
}
