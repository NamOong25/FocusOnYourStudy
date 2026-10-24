-- A recurring rule, not a row per lesson. Existing academic data is preserved.
CREATE TABLE class_schedules (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    course_id UUID NOT NULL,
    weekday_mask INTEGER NOT NULL,
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    time_zone VARCHAR(100) NOT NULL,
    room VARCHAR(100) NOT NULL DEFAULT '',
    teacher VARCHAR(200) NOT NULL DEFAULT '',
    reminder_minutes INTEGER NOT NULL DEFAULT 15,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_class_course_owner FOREIGN KEY (course_id, user_id) REFERENCES courses(id, user_id),
    CONSTRAINT uq_class_owner UNIQUE (id, user_id),
    CONSTRAINT ck_class_weekdays CHECK (weekday_mask BETWEEN 1 AND 127),
    CONSTRAINT ck_class_date_range CHECK (starts_on >= DATE '1900-01-01' AND ends_on <= DATE '2099-12-31' AND ends_on - starts_on BETWEEN 0 AND 365),
    CONSTRAINT ck_class_time_range CHECK (end_time > start_time AND end_time < TIME '24:00' AND extract(second FROM start_time) = 0 AND extract(second FROM end_time) = 0),
    CONSTRAINT ck_class_zone CHECK (length(btrim(time_zone)) > 0),
    CONSTRAINT ck_class_reminder CHECK (reminder_minutes BETWEEN 0 AND 10080),
    CONSTRAINT ck_class_notes CHECK (length(notes) <= 5000),
    CONSTRAINT ck_class_version CHECK (version >= 0)
);
CREATE INDEX ix_class_owner_date ON class_schedules(user_id, starts_on, ends_on, id);
CREATE INDEX ix_class_owner_course ON class_schedules(user_id, course_id);
