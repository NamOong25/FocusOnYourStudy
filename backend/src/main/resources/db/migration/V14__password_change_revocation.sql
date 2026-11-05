-- Extend the reason vocabulary without changing any existing user/session rows.
ALTER TABLE refresh_sessions DROP CONSTRAINT ck_session_revocation;
ALTER TABLE refresh_sessions ADD CONSTRAINT ck_session_revocation CHECK (
    (revoked_at IS NULL AND revocation_reason IS NULL) OR
    (revoked_at IS NOT NULL AND revocation_reason IS NOT NULL
        AND revocation_reason IN ('LOGOUT', 'REPLAY', 'EXPIRED', 'PASSWORD_CHANGED'))
);
