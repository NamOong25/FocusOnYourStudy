CREATE TABLE notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    assignments BOOLEAN NOT NULL,
    classes BOOLEAN NOT NULL,
    exams BOOLEAN NOT NULL,
    reminder_minutes SMALLINT NOT NULL CHECK (reminder_minutes IN (5, 15, 30, 60)),
    quiet BOOLEAN NOT NULL,
    quiet_start TIME(0) NOT NULL,
    quiet_end TIME(0) NOT NULL,
    version BIGINT NOT NULL CHECK (version BETWEEN 1 AND 9007199254740991),
    CONSTRAINT ck_notification_preferences_quiet_window CHECK (NOT quiet OR quiet_start <> quiet_end),
    CONSTRAINT ck_notification_preferences_clock_minutes CHECK (
        quiet_start < TIME '24:00:00' AND quiet_end < TIME '24:00:00'
        AND EXTRACT(SECOND FROM quiet_start) = 0 AND EXTRACT(SECOND FROM quiet_end) = 0
    )
);
