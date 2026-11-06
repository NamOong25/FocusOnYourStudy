package com.focusstudy.auth.reset;

import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PasswordResetTokens {
    private static final Duration LIFETIME = Duration.ofMinutes(30);
    private static final Duration COOLDOWN = Duration.ofMinutes(1);
    private final JdbcTemplate jdbc;

    public PasswordResetTokens(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    boolean issue(UUID owner, String hash, Instant now) {
        return jdbc.update("""
                INSERT INTO password_reset_tokens(owner_id, token_hash, issued_at, expires_at) VALUES (?, ?, ?, ?)
                ON CONFLICT (owner_id) DO UPDATE SET token_hash = EXCLUDED.token_hash,
                    issued_at = EXCLUDED.issued_at, expires_at = EXCLUDED.expires_at
                WHERE password_reset_tokens.issued_at <= ?
                """, owner, hash, utc(now), utc(now.plus(LIFETIME)), utc(now.minus(COOLDOWN))) == 1;
    }

    Optional<UUID> ownerOf(String hash, Instant now) {
        return jdbc.query("SELECT owner_id FROM password_reset_tokens WHERE token_hash = ? AND expires_at > ?",
                (row, index) -> row.getObject("owner_id", UUID.class), hash, utc(now)).stream().findFirst();
    }

    public void invalidate(UUID owner) {
        jdbc.update("DELETE FROM password_reset_tokens WHERE owner_id = ?", owner);
    }

    private static OffsetDateTime utc(Instant value) { return value.atOffset(ZoneOffset.UTC); }
}
