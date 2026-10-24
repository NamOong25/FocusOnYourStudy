-- Existing rules and learning data are preserved. A revision on the parent
-- prevents stale writes after an exception is restored and created again.
ALTER TABLE class_schedules ADD COLUMN exception_revision BIGINT NOT NULL DEFAULT 0;
ALTER TABLE class_schedules ADD CONSTRAINT ck_class_exception_revision CHECK (exception_revision >= 0);

CREATE TABLE class_exceptions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    schedule_id UUID NOT NULL,
    occurrence_date DATE NOT NULL,
    kind VARCHAR(20) NOT NULL,
    start_time TIME,
    end_time TIME,
    room VARCHAR(100),
    teacher VARCHAR(200),
    reason VARCHAR(1000) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_exception_schedule_owner FOREIGN KEY (schedule_id, user_id) REFERENCES class_schedules(id, user_id) ON DELETE CASCADE,
    CONSTRAINT uq_exception_schedule_date UNIQUE (schedule_id, occurrence_date),
    CONSTRAINT ck_exception_date CHECK (occurrence_date BETWEEN DATE '1900-01-01' AND DATE '2099-12-31'),
    CONSTRAINT ck_exception_kind CHECK (kind IN ('CANCELLED', 'CHANGED')),
    CONSTRAINT ck_exception_cancelled CHECK (kind <> 'CANCELLED' OR (start_time IS NULL AND end_time IS NULL AND room IS NULL AND teacher IS NULL)),
    CONSTRAINT ck_exception_changed CHECK (kind <> 'CHANGED' OR start_time IS NOT NULL OR end_time IS NOT NULL OR room IS NOT NULL OR teacher IS NOT NULL),
    CONSTRAINT ck_exception_start CHECK (start_time IS NULL OR (start_time < TIME '24:00' AND extract(second FROM start_time) = 0)),
    CONSTRAINT ck_exception_end CHECK (end_time IS NULL OR (end_time < TIME '24:00' AND extract(second FROM end_time) = 0)),
    CONSTRAINT ck_exception_order CHECK (start_time IS NULL OR end_time IS NULL OR end_time > start_time),
    CONSTRAINT ck_exception_version CHECK (version >= 0)
);
CREATE INDEX ix_exception_owner_date ON class_exceptions(user_id, occurrence_date, schedule_id);
