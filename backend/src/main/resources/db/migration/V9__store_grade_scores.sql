-- Existing columns remain unentered (NULL), never implicit zero.
ALTER TABLE grade_columns
    ADD COLUMN score NUMERIC(6,4),
    ADD COLUMN remainder_score NUMERIC(6,4),
    ADD CONSTRAINT ck_grade_score_range CHECK (score IS NULL OR score BETWEEN 0 AND 10),
    ADD CONSTRAINT ck_grade_remainder_range CHECK (remainder_score IS NULL OR remainder_score BETWEEN 0 AND 10),
    ADD CONSTRAINT ck_grade_remainder_role CHECK (remainder_score IS NULL OR
        (kind = 'PROJECT' AND project_target = 'FINAL' AND project_share < 100));
