package com.focusstudy.auth.session;

import com.focusstudy.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "refresh_sessions")
public class RefreshSessionEntity extends BaseEntity {
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 10) private SessionTransport transport;
    @Column(name = "expires_at", nullable = false) private Instant expiresAt;
    @Column(name = "last_used_at", nullable = false) private Instant lastUsedAt;
    @Column(name = "revoked_at") private Instant revokedAt;
    @Column(name = "revocation_reason", length = 20) private String revocationReason;

    protected RefreshSessionEntity() { }
    public static RefreshSessionEntity start(UUID userId, SessionTransport transport, Instant now, Instant expiry) {
        var session = new RefreshSessionEntity();
        session.userId = userId; session.transport = transport; session.lastUsedAt = now; session.expiresAt = expiry;
        return session;
    }
    public UUID getUserId() { return userId; }
    public SessionTransport getTransport() { return transport; }
    public Instant getExpiresAt() { return expiresAt; }
    public boolean isRevoked() { return revokedAt != null; }
    public void touch(Instant now) { lastUsedAt = now; }
    public void revoke(Instant now, String reason) {
        if (revokedAt == null) { revokedAt = now; revocationReason = reason; }
    }
}
