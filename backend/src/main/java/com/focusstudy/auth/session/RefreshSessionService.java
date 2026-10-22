package com.focusstudy.auth.session;

import com.focusstudy.auth.*;
import com.focusstudy.auth.dto.LoginResponse;
import com.focusstudy.users.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefreshSessionService {
    private final RefreshSessionRepository sessions;
    private final RefreshTokenRepository refreshTokens;
    private final UserRepository users;
    private final AccessTokenService accessTokens;
    private final SessionProperties properties;
    private final Clock clock;

    public RefreshSessionService(RefreshSessionRepository sessions, RefreshTokenRepository refreshTokens,
            UserRepository users, AccessTokenService accessTokens, SessionProperties properties, Clock clock) {
        this.sessions = sessions; this.refreshTokens = refreshTokens; this.users = users;
        this.accessTokens = accessTokens; this.properties = properties; this.clock = clock;
    }

    @Transactional
    public LoginResponse start(UUID userId, SessionTransport transport) {
        var user = users.findById(userId).orElseThrow(AuthApiException::invalidCredentials);
        Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
        var session = sessions.saveAndFlush(RefreshSessionEntity.start(userId, transport, now, now.plus(properties.absoluteTtl())));
        return issue(session, user, now);
    }

    // Revocation must commit even when the response is 401 (replay/expired family).
    // Database or signing failures still roll back the whole rotation.
    @Transactional(noRollbackFor = AuthApiException.class)
    public LoginResponse refresh(String raw, SessionTransport transport) {
        var session = lockSession(raw, transport);
        Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
        if (session.isRevoked()) throw AuthApiException.invalidRefresh();
        if (!session.getExpiresAt().isAfter(now)) throw expire(session, now);
        var old = refreshTokens.findByTokenHash(RefreshSecrets.hash(raw)).orElseThrow(AuthApiException::invalidRefresh);
        if (old.isConsumed()) {
            session.revoke(now, "REPLAY");
            throw AuthApiException.refreshReused();
        }
        if (!old.getExpiresAt().isAfter(now)) throw expire(session, now);
        var user = users.findById(session.getUserId()).orElseThrow(AuthApiException::invalidRefresh);
        old.consume(now); session.touch(now);
        return issue(session, user, now);
    }

    @Transactional
    public void logout(String raw, SessionTransport transport) {
        if (!RefreshSecrets.valid(raw)) return;
        var sessionId = refreshTokens.findSessionId(RefreshSecrets.hash(raw));
        if (sessionId.isEmpty()) return;
        sessions.lockById(sessionId.get()).filter(session -> session.getTransport() == transport)
                .ifPresent(session -> session.revoke(clock.instant(), "LOGOUT"));
    }

    private RefreshSessionEntity lockSession(String raw, SessionTransport transport) {
        if (!RefreshSecrets.valid(raw)) throw AuthApiException.invalidRefresh();
        UUID id = refreshTokens.findSessionId(RefreshSecrets.hash(raw)).orElseThrow(AuthApiException::invalidRefresh);
        var session = sessions.lockById(id).orElseThrow(AuthApiException::invalidRefresh);
        if (session.getTransport() != transport) throw AuthApiException.invalidRefresh();
        return session;
    }

    private AuthApiException expire(RefreshSessionEntity session, Instant now) {
        session.revoke(now, "EXPIRED"); return AuthApiException.sessionExpired();
    }

    private LoginResponse issue(RefreshSessionEntity session, UserEntity user, Instant now) {
        String raw = RefreshSecrets.generate();
        Instant expiry = now.plus(properties.refreshTtl());
        if (expiry.isAfter(session.getExpiresAt())) expiry = session.getExpiresAt();
        refreshTokens.saveAndFlush(RefreshTokenEntity.issue(session.getId(), RefreshSecrets.hash(raw), expiry));
        return new LoginResponse(accessTokens.issue(user.getId(), session.getId()), "Bearer", accessTokens.expiresIn(),
                UserProfile.from(user), raw, expiry, session.getExpiresAt());
    }
}
