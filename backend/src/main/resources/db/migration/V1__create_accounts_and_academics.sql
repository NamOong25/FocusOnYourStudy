CREATE TABLE app_users (
    id UUID PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    school VARCHAR(200) NOT NULL DEFAULT '',
    major VARCHAR(200) NOT NULL DEFAULT '',
    time_zone VARCHAR(60) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_user_email UNIQUE (email),
    CONSTRAINT ck_user_email_normalized CHECK (email = lower(btrim(email)) AND length(email) > 3),
    CONSTRAINT ck_user_name CHECK (length(btrim(full_name)) > 0),
    CONSTRAINT ck_user_password_hash CHECK (length(password_hash) > 0)
);

CREATE TABLE semesters (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_users(id),
    term SMALLINT NOT NULL,
    start_year INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'UPCOMING',
    note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_semester_owner UNIQUE (id, user_id),
    CONSTRAINT uq_semester_year_term UNIQUE (user_id, start_year, term),
    CONSTRAINT ck_semester_term CHECK (term BETWEEN 1 AND 3),
    CONSTRAINT ck_semester_year CHECK (start_year BETWEEN 1900 AND 2099),
    CONSTRAINT ck_semester_status CHECK (status IN ('CURRENT', 'UPCOMING', 'COMPLETED'))
);
CREATE UNIQUE INDEX uq_one_current_semester ON semesters(user_id) WHERE status = 'CURRENT';

CREATE TABLE courses (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    semester_id UUID NOT NULL,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(200) NOT NULL,
    credits INTEGER NOT NULL,
    teacher VARCHAR(200) NOT NULL DEFAULT '',
    room VARCHAR(100) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'STUDYING',
    color VARCHAR(20) NOT NULL DEFAULT 'lavender',
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_course_semester_owner FOREIGN KEY (semester_id, user_id) REFERENCES semesters(id, user_id),
    CONSTRAINT uq_course_owner UNIQUE (id, user_id),
    CONSTRAINT uq_course_code_per_semester UNIQUE (semester_id, code),
    CONSTRAINT ck_course_code CHECK (code = upper(btrim(code)) AND length(code) > 0),
    CONSTRAINT ck_course_name CHECK (length(btrim(name)) > 0),
    CONSTRAINT ck_course_credits CHECK (credits BETWEEN 1 AND 30),
    CONSTRAINT ck_course_status CHECK (status IN ('STUDYING', 'COMPLETED', 'PLANNED')),
    CONSTRAINT ck_course_color CHECK (color IN ('lavender', 'mint', 'peach', 'blue'))
);
CREATE INDEX ix_course_user_semester ON courses(user_id, semester_id);
