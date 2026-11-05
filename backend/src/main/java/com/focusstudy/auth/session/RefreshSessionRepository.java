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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from RefreshSessionEntity s where s.userId = :userId and s.revokedAt is null order by s.id")
    List<RefreshSessionEntity> lockUnrevokedByUserId(@Param("userId") UUID userId);
}
