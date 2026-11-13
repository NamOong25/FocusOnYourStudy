ALTER TABLE class_schedules
    ADD COLUMN lesson_type varchar(16) NOT NULL DEFAULT 'THEORY',
    ADD COLUMN meeting_platform varchar(16) NOT NULL DEFAULT 'NONE',
    ADD COLUMN meeting_id varchar(100) NOT NULL DEFAULT '',
    ADD COLUMN meeting_passcode varchar(100) NOT NULL DEFAULT '',
    ADD CONSTRAINT ck_class_lesson_type CHECK (lesson_type IN ('THEORY', 'PRACTICE')),
    ADD CONSTRAINT ck_class_meeting CHECK (
        (meeting_platform = 'NONE' AND meeting_id = '' AND meeting_passcode = '')
        OR (meeting_platform = 'ZOOM' AND meeting_id <> '' AND meeting_passcode <> '')
        OR (meeting_platform = 'TEAMS' AND meeting_id <> '' AND meeting_passcode = '')
    );
