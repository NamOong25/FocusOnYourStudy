CREATE TABLE pomodoro_breaks (
    user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    kind varchar(5) NOT NULL CHECK (kind IN ('SHORT', 'LONG')),
    state varchar(7) NOT NULL CHECK (state IN ('IDLE', 'RUNNING', 'PAUSED')),
    remaining_ms integer NOT NULL CHECK (remaining_ms BETWEEN 0 AND 900000),
    ends_at timestamptz,
    version bigint NOT NULL CHECK (version > 0),
    CHECK ((state = 'RUNNING') = (ends_at IS NOT NULL))
);
