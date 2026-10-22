CREATE TABLE refresh_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    transport VARCHAR(10) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    revocation_reason VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_session_transport CHECK (transport IN ('BODY', 'COOKIE')),
    CONSTRAINT ck_session_revocation CHECK (
        (revoked_at IS NULL AND revocation_reason IS NULL) OR
        (revoked_at IS NOT NULL AND revocation_reason IS NOT NULL AND revocation_reason IN ('LOGOUT', 'REPLAY', 'EXPIRED'))
    )
);
CREATE INDEX ix_refresh_session_user ON refresh_sessions(user_id);
CREATE INDEX ix_refresh_session_expiry ON refresh_sessions(expires_at);

-- Retain consumed hashes until the session is removed so replays revoke the family.
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES refresh_sessions(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_refresh_token_hash UNIQUE (token_hash),
    CONSTRAINT ck_refresh_token_hash CHECK (token_hash ~ '^[0-9a-f]{64}$')
);
CREATE INDEX ix_refresh_token_session ON refresh_tokens(session_id);
