-- Configuration only: no numeric scores, grade results or GPA are seeded/stored here.
CREATE TABLE grade_configurations (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    course_id UUID NOT NULL UNIQUE,
    assessment VARCHAR(12) NOT NULL,
    update_revision BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_grade_config_owner UNIQUE (id, user_id),
    CONSTRAINT uq_grade_config_assessment UNIQUE (id, assessment),
    CONSTRAINT fk_grade_config_course_owner FOREIGN KEY (course_id, user_id) REFERENCES courses(id, user_id),
    CONSTRAINT ck_grade_config_assessment CHECK (assessment IN ('THEORY', 'PRACTICAL')),
    CONSTRAINT ck_grade_config_version CHECK (version >= 0 AND update_revision >= 0)
);
CREATE INDEX ix_grade_config_owner ON grade_configurations(user_id, course_id);

CREATE TABLE grade_columns (
    id UUID PRIMARY KEY,
    configuration_id UUID NOT NULL,
    user_id UUID NOT NULL,
    assessment VARCHAR(12) NOT NULL,
    column_key VARCHAR(80) NOT NULL,
    position INTEGER NOT NULL,
    name VARCHAR(200) NOT NULL,
    kind VARCHAR(24) NOT NULL,
    project_target VARCHAR(12),
    project_share NUMERIC(7,4),
    final_slot INTEGER GENERATED ALWAYS AS
        (CASE WHEN kind = 'FINAL' OR (kind = 'PROJECT' AND project_target = 'FINAL') THEN 1 END) STORED,
    theory_midterm_slot INTEGER GENERATED ALWAYS AS
        (CASE WHEN assessment = 'THEORY' AND kind = 'MIDTERM' THEN 1 END) STORED,
    CONSTRAINT fk_grade_column_owner FOREIGN KEY (configuration_id, user_id)
        REFERENCES grade_configurations(id, user_id) ON DELETE CASCADE,
    -- A change of assessment updates the header and its columns in one transaction.
    CONSTRAINT fk_grade_column_assessment FOREIGN KEY (configuration_id, assessment)
        REFERENCES grade_configurations(id, assessment) DEFERRABLE INITIALLY DEFERRED,
    -- Deferred constraints allow swapping positions or replacing the final column
    -- atomically, regardless of Hibernate's insert/update/delete ordering.
    CONSTRAINT uq_grade_column_key UNIQUE (configuration_id, column_key) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT uq_grade_column_position UNIQUE (configuration_id, position) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT uq_grade_column_final UNIQUE (configuration_id, final_slot) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT uq_grade_column_theory_midterm UNIQUE (configuration_id, theory_midterm_slot) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT ck_grade_column_key CHECK (column_key ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$'),
    CONSTRAINT ck_grade_column_position CHECK (position BETWEEN 0 AND 9),
    CONSTRAINT ck_grade_column_name CHECK (length(btrim(name)) > 0),
    CONSTRAINT ck_grade_column_kind CHECK (
        (assessment = 'THEORY' AND kind IN ('REGULAR','REGULAR_TEST','MIDTERM','FINAL','PROJECT')) OR
        (assessment = 'PRACTICAL' AND kind IN ('PRACTICE_REGULAR','PRACTICE_TEST','MIDTERM','FINAL','PROJECT'))),
    CONSTRAINT ck_grade_column_project CHECK (
        (kind <> 'PROJECT' AND project_target IS NULL AND project_share IS NULL) OR
        (kind = 'PROJECT' AND project_target IS NOT NULL AND project_share IS NOT NULL
          AND project_share > 0 AND project_share <= 100
          AND (project_target = 'FINAL' OR
               (project_target = 'PRACTICE' AND assessment = 'PRACTICAL' AND project_share = 100))))
);
