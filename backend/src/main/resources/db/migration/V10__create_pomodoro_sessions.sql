-- Actual focus time is separate from planned study_sessions. No existing data is rewritten.
CREATE TABLE pomodoro_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_users(id),
    client_request_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 1500,
    started_at TIMESTAMPTZ NOT NULL,
    state_changed_at TIMESTAMPTZ NOT NULL,
    run_started_at TIMESTAMPTZ,
    elapsed_millis BIGINT NOT NULL DEFAULT 0,
    paused_millis BIGINT NOT NULL DEFAULT 0,
    time_zone VARCHAR(100) NOT NULL,
    -- Immutable context snapshots, validated against the owner at creation. Deliberately
    -- no academic FKs: later rename/move/delete must not rewrite actual focus history.
    course_id UUID NOT NULL,
    course_code VARCHAR(64) NOT NULL,
    course_name VARCHAR(200) NOT NULL,
    semester_id UUID NOT NULL,
    semester_term SMALLINT NOT NULL,
    semester_start_year INTEGER NOT NULL,
    assignment_id UUID,
    assignment_title VARCHAR(200),
    study_session_id UUID,
    study_title VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_pomodoro_start_request UNIQUE (user_id, client_request_id),
    CONSTRAINT ck_pomodoro_status CHECK (status IN ('RUNNING', 'PAUSED')),
    CONSTRAINT ck_pomodoro_duration CHECK (duration_seconds = 1500),
    CONSTRAINT ck_pomodoro_elapsed CHECK (elapsed_millis BETWEEN 0 AND duration_seconds * 1000),
    CONSTRAINT ck_pomodoro_paused CHECK (paused_millis >= 0),
    CONSTRAINT ck_pomodoro_transition CHECK (state_changed_at >= started_at),
    CONSTRAINT ck_pomodoro_running CHECK (
        (status = 'RUNNING' AND run_started_at IS NOT NULL AND run_started_at = state_changed_at)
        OR (status = 'PAUSED' AND run_started_at IS NULL AND elapsed_millis < duration_seconds * 1000)),
    CONSTRAINT ck_pomodoro_context CHECK (length(btrim(course_code)) > 0 AND length(btrim(course_name)) > 0
        AND semester_term BETWEEN 1 AND 3 AND semester_start_year BETWEEN 1900 AND 2099),
    CONSTRAINT ck_pomodoro_assignment CHECK ((assignment_id IS NULL AND assignment_title IS NULL)
        OR (assignment_id IS NOT NULL AND assignment_title IS NOT NULL AND length(btrim(assignment_title)) > 0)),
    CONSTRAINT ck_pomodoro_study CHECK ((study_session_id IS NULL AND study_title IS NULL)
        OR (study_session_id IS NOT NULL AND study_title IS NOT NULL AND length(btrim(study_title)) > 0)),
    CONSTRAINT ck_pomodoro_zone CHECK (length(btrim(time_zone)) > 0),
    CONSTRAINT ck_pomodoro_version CHECK (version >= 0)
);
-- Both running and paused reserve the account's single active session, even after time is up.
CREATE UNIQUE INDEX uq_pomodoro_one_active ON pomodoro_sessions(user_id) WHERE status IN ('RUNNING', 'PAUSED');
