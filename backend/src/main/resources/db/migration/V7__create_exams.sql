-- Exam data is additive. V1-V6 and existing learning/session data stay intact.
CREATE FUNCTION exam_reminders_valid(values_to_check INTEGER[]) RETURNS BOOLEAN
LANGUAGE SQL IMMUTABLE STRICT PARALLEL SAFE AS $$
    SELECT coalesce(array_ndims(values_to_check), 1) = 1
       AND coalesce(array_lower(values_to_check, 1), 1) = 1
       AND cardinality(values_to_check) <= 10
       AND NOT EXISTS (SELECT 1 FROM unnest(values_to_check) AS t(value) WHERE value IS NULL OR value < 0 OR value > 10080)
       AND (SELECT count(*) = count(DISTINCT value) FROM unnest(values_to_check) AS t(value))
$$;

CREATE TABLE exams (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    course_id UUID NOT NULL,
    kind VARCHAR(20) NOT NULL,
    format VARCHAR(24) NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    time_zone VARCHAR(100) NOT NULL,
    room VARCHAR(100) NOT NULL DEFAULT '',
    reminder BOOLEAN NOT NULL DEFAULT TRUE,
    reminder_minutes INTEGER[] NOT NULL DEFAULT ARRAY[1440, 180],
    notes TEXT NOT NULL DEFAULT '',
    update_revision BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_exam_course_owner FOREIGN KEY (course_id, user_id) REFERENCES courses(id, user_id),
    CONSTRAINT ck_exam_kind CHECK (kind IN ('MIDTERM', 'FINAL', 'OTHER')),
    CONSTRAINT ck_exam_format CHECK (format IN ('WRITTEN', 'MULTIPLE_CHOICE', 'PRACTICAL', 'ORAL', 'ONLINE')),
    CONSTRAINT ck_exam_zone CHECK (length(btrim(time_zone)) > 0),
    CONSTRAINT ck_exam_range CHECK (starts_at >= TIMESTAMPTZ '1900-01-01 00:00:00+00' AND ends_at < TIMESTAMPTZ '2100-01-01 00:00:00+00' AND ends_at > starts_at),
    CONSTRAINT ck_exam_local_year CHECK (extract(year FROM starts_at AT TIME ZONE time_zone) BETWEEN 1900 AND 2099),
    CONSTRAINT ck_exam_same_day CHECK ((starts_at AT TIME ZONE time_zone)::date = (ends_at AT TIME ZONE time_zone)::date),
    CONSTRAINT ck_exam_minute CHECK (extract(second FROM starts_at AT TIME ZONE time_zone) = 0 AND extract(second FROM ends_at AT TIME ZONE time_zone) = 0),
    CONSTRAINT ck_exam_reminders CHECK (exam_reminders_valid(reminder_minutes) AND ((reminder AND cardinality(reminder_minutes) > 0) OR (NOT reminder AND cardinality(reminder_minutes) = 0))),
    CONSTRAINT ck_exam_notes CHECK (length(notes) <= 5000),
    CONSTRAINT ck_exam_version CHECK (version >= 0 AND update_revision >= 0)
);
CREATE INDEX ix_exam_owner_time ON exams(user_id, starts_at, ends_at, id);
CREATE INDEX ix_exam_owner_course ON exams(user_id, course_id);
