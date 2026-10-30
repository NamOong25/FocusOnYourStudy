-- Additive: receipts only, not a notification queue or a copy of academic data.
ALTER TABLE exams ADD CONSTRAINT uq_exam_owner UNIQUE (id, user_id);
CREATE TABLE notification_read_states (
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    kind VARCHAR(12) NOT NULL,
    source_id UUID NOT NULL,
    occurrence_date DATE NOT NULL,
    assignment_id UUID,
    exam_id UUID,
    schedule_id UUID,
    revision VARCHAR(64) NOT NULL,
    read_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_id, kind, source_id, occurrence_date),
    CONSTRAINT fk_notification_assignment_owner FOREIGN KEY (assignment_id, user_id) REFERENCES assignments(id, user_id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_exam_owner FOREIGN KEY (exam_id, user_id) REFERENCES exams(id, user_id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_class_owner FOREIGN KEY (schedule_id, user_id) REFERENCES class_schedules(id, user_id) ON DELETE CASCADE,
    CONSTRAINT ck_notification_source CHECK (
        (kind = 'ASSIGNMENT' AND assignment_id IS NOT NULL AND assignment_id = source_id AND exam_id IS NULL AND schedule_id IS NULL AND occurrence_date = DATE '1970-01-01') OR
        (kind = 'EXAM' AND exam_id IS NOT NULL AND exam_id = source_id AND assignment_id IS NULL AND schedule_id IS NULL AND occurrence_date = DATE '1970-01-01') OR
        (kind = 'CLASS' AND schedule_id IS NOT NULL AND schedule_id = source_id AND assignment_id IS NULL AND exam_id IS NULL AND occurrence_date BETWEEN DATE '1900-01-01' AND DATE '2099-12-31')
    ),
    CONSTRAINT ck_notification_revision CHECK (revision ~ '^[0-9a-f]{64}$')
);
-- PostgreSQL does not automatically index referencing FK columns.
CREATE INDEX ix_notification_assignment ON notification_read_states(assignment_id, user_id) WHERE assignment_id IS NOT NULL;
CREATE INDEX ix_notification_exam ON notification_read_states(exam_id, user_id) WHERE exam_id IS NOT NULL;
CREATE INDEX ix_notification_class ON notification_read_states(schedule_id, user_id) WHERE schedule_id IS NOT NULL;
