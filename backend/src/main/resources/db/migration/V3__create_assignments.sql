CREATE TABLE assignments (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    course_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    due_at TIMESTAMPTZ NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(20) NOT NULL DEFAULT 'TODO',
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_assignment_course_owner FOREIGN KEY (course_id, user_id) REFERENCES courses(id, user_id),
    CONSTRAINT uq_assignment_owner UNIQUE (id, user_id),
    CONSTRAINT ck_assignment_title CHECK (length(btrim(title)) > 0),
    CONSTRAINT ck_assignment_due CHECK (due_at >= TIMESTAMPTZ '1900-01-01 00:00:00+00' AND due_at < TIMESTAMPTZ '2100-01-01 00:00:00+00'),
    CONSTRAINT ck_assignment_priority CHECK (priority IN ('MEDIUM', 'HIGH')),
    CONSTRAINT ck_assignment_status CHECK (status IN ('TODO', 'IN_PROGRESS', 'COMPLETED')),
    CONSTRAINT ck_assignment_notes CHECK (length(notes) <= 5000),
    CONSTRAINT ck_assignment_version CHECK (version >= 0)
);
CREATE INDEX ix_assignment_owner_due ON assignments(user_id, due_at, id);
CREATE INDEX ix_assignment_owner_course ON assignments(user_id, course_id);
