-- Existing accounts, semesters, courses and assignments are preserved.
ALTER TABLE assignments ADD CONSTRAINT uq_assignment_owner_course UNIQUE (id, user_id, course_id);

CREATE TABLE study_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    course_id UUID NOT NULL,
    assignment_id UUID,
    title VARCHAR(200) NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    time_zone VARCHAR(100) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_study_course_owner FOREIGN KEY (course_id, user_id) REFERENCES courses(id, user_id),
    CONSTRAINT fk_study_assignment_course_owner FOREIGN KEY (assignment_id, user_id, course_id) REFERENCES assignments(id, user_id, course_id),
    CONSTRAINT uq_study_owner UNIQUE (id, user_id),
    CONSTRAINT ck_study_title CHECK (length(btrim(title)) > 0),
    CONSTRAINT ck_study_zone CHECK (length(btrim(time_zone)) > 0),
    CONSTRAINT ck_study_duration CHECK (duration_minutes BETWEEN 1 AND 240),
    CONSTRAINT ck_study_range CHECK (starts_at >= TIMESTAMPTZ '1900-01-01 00:00:00+00' AND ends_at < TIMESTAMPTZ '2100-01-01 00:00:00+00'),
    CONSTRAINT ck_study_end CHECK (ends_at = starts_at + duration_minutes * INTERVAL '1 minute'),
    CONSTRAINT ck_study_day CHECK ((starts_at AT TIME ZONE time_zone)::date = (ends_at AT TIME ZONE time_zone)::date),
    CONSTRAINT ck_study_minute CHECK (date_trunc('minute', starts_at AT TIME ZONE time_zone) = (starts_at AT TIME ZONE time_zone)),
    CONSTRAINT ck_study_status CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED')),
    CONSTRAINT ck_study_notes CHECK (length(notes) <= 5000),
    CONSTRAINT ck_study_version CHECK (version >= 0)
);
CREATE INDEX ix_study_owner_time ON study_sessions(user_id, starts_at, ends_at, id);
CREATE INDEX ix_study_owner_course ON study_sessions(user_id, course_id);
CREATE INDEX ix_study_owner_assignment ON study_sessions(user_id, assignment_id);
