CREATE TABLE password_reset_tokens (
    owner_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    issued_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_reset_token_hash CHECK (token_hash ~ '^[a-f0-9]{64}$'),
    CONSTRAINT ck_reset_token_expiry CHECK (expires_at > issued_at)
);
