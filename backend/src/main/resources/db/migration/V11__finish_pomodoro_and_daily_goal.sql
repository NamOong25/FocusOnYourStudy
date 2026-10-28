-- Preserve active V10 sessions. Terminal times are populated only by versioned commands.
ALTER TABLE pomodoro_sessions ADD COLUMN ended_at TIMESTAMPTZ, ADD COLUMN finalized_at TIMESTAMPTZ;
ALTER TABLE pomodoro_sessions DROP CONSTRAINT ck_pomodoro_status, DROP CONSTRAINT ck_pomodoro_running;
ALTER TABLE pomodoro_sessions
    ADD CONSTRAINT ck_pomodoro_status CHECK (status IN ('RUNNING','PAUSED','COMPLETED','CANCELLED')),
    ADD CONSTRAINT ck_pomodoro_running CHECK (
        (status = 'RUNNING' AND run_started_at IS NOT NULL AND run_started_at = state_changed_at)
        OR (status = 'PAUSED' AND run_started_at IS NULL AND elapsed_millis < duration_seconds * 1000)
        OR (status IN ('COMPLETED','CANCELLED') AND run_started_at IS NULL)),
    ADD CONSTRAINT ck_pomodoro_terminal CHECK (
        (status IN ('RUNNING','PAUSED') AND ended_at IS NULL AND finalized_at IS NULL)
        OR (status IN ('COMPLETED','CANCELLED') AND ended_at IS NOT NULL AND finalized_at IS NOT NULL
            AND ended_at >= started_at AND ended_at <= finalized_at AND state_changed_at = finalized_at
            AND ((status = 'COMPLETED' AND elapsed_millis = duration_seconds * 1000)
                OR (status = 'CANCELLED' AND elapsed_millis < duration_seconds * 1000 AND ended_at = finalized_at))));
CREATE INDEX ix_pomodoro_owner_history ON pomodoro_sessions(user_id, ended_at DESC, id DESC)
    WHERE status IN ('COMPLETED','CANCELLED');

CREATE TABLE pomodoro_preferences (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES app_users(id),
    daily_sessions SMALLINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_pomodoro_daily_goal CHECK (daily_sessions BETWEEN 1 AND 12),
    CONSTRAINT ck_pomodoro_preference_version CHECK (version >= 0)
);
-- No seed: GET uses the default goal of four without creating a preference row.
