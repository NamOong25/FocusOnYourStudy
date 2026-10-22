package com.focusstudy.auth.session;

import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenRepository extends JpaRepository<RefreshTokenEntity, UUID> {
    // Projection only: don't cache a token entity before acquiring the session lock.
    @Query("select t.sessionId from RefreshTokenEntity t where t.tokenHash = :hash")
    Optional<UUID> findSessionId(@Param("hash") String hash);

    Optional<RefreshTokenEntity> findByTokenHash(String hash);
}
