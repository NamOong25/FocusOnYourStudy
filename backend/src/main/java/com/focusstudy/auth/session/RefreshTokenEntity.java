package com.focusstudy.auth.session;

import com.focusstudy.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "refresh_tokens")
public class RefreshTokenEntity extends BaseEntity {
    @Column(name = "session_id", nullable = false) private UUID sessionId;
    @Column(name = "token_hash", nullable = false, length = 64) private String tokenHash;
    @Column(name = "expires_at", nullable = false) private Instant expiresAt;
    @Column(name = "consumed_at") private Instant consumedAt;

    protected RefreshTokenEntity() { }
    public static RefreshTokenEntity issue(UUID sessionId, String hash, Instant expiry) {
        var token = new RefreshTokenEntity();
        token.sessionId = sessionId; token.tokenHash = hash; token.expiresAt = expiry;
        return token;
    }
    public Instant getExpiresAt() { return expiresAt; }
    public boolean isConsumed() { return consumedAt != null; }
    public void consume(Instant now) { consumedAt = now; }
}
