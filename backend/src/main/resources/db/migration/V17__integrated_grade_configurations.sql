ALTER TABLE grade_configurations
    ADD COLUMN theory_credits INTEGER,
    ADD COLUMN practice_credits INTEGER,
    DROP CONSTRAINT ck_grade_config_assessment,
    ADD CONSTRAINT ck_grade_config_assessment CHECK (
        (assessment IN ('THEORY', 'PRACTICAL') AND theory_credits IS NULL AND practice_credits IS NULL) OR
        (assessment = 'INTEGRATED' AND theory_credits IS NOT NULL AND practice_credits IS NOT NULL
            AND theory_credits > 0 AND practice_credits > 0 AND theory_credits + practice_credits <= 30)
    );

ALTER TABLE grade_columns
    DROP CONSTRAINT ck_grade_column_kind,
    ADD CONSTRAINT ck_grade_column_kind CHECK (
        (assessment = 'THEORY' AND kind IN ('REGULAR','REGULAR_TEST','MIDTERM','FINAL','PROJECT')) OR
        (assessment = 'PRACTICAL' AND kind IN ('PRACTICE_REGULAR','PRACTICE_TEST','MIDTERM','FINAL','PROJECT')) OR
        (assessment = 'INTEGRATED' AND kind IN ('REGULAR','REGULAR_TEST','PRACTICE_REGULAR','PRACTICE_TEST','MIDTERM','FINAL','PROJECT'))
    ),
    DROP CONSTRAINT ck_grade_column_project,
    ADD CONSTRAINT ck_grade_column_project CHECK (
        (kind <> 'PROJECT' AND project_target IS NULL AND project_share IS NULL) OR
        (kind = 'PROJECT' AND project_target IS NOT NULL AND project_share IS NOT NULL
            AND project_share > 0 AND project_share <= 100
            AND (project_target = 'FINAL' OR
                (project_target = 'PRACTICE' AND assessment IN ('PRACTICAL','INTEGRATED') AND project_share = 100)))
    ),
    DROP CONSTRAINT uq_grade_column_theory_midterm,
    DROP COLUMN theory_midterm_slot;

ALTER TABLE grade_columns
    ADD COLUMN theory_midterm_slot INTEGER GENERATED ALWAYS AS
        (CASE WHEN assessment IN ('THEORY','INTEGRATED') AND kind = 'MIDTERM' THEN 1 END) STORED,
    ADD CONSTRAINT uq_grade_column_theory_midterm UNIQUE (configuration_id, theory_midterm_slot) DEFERRABLE INITIALLY DEFERRED;
