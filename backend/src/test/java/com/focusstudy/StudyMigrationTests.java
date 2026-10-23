package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import java.sql.DriverManager;
import java.time.Instant;
import java.util.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

class StudyMigrationTests {
    @Test void upgradesV3PreservingAccountSessionSemesterCourseAndAssignmentAndRunsOnce() throws Exception {
        String url = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Run Test-Local.ps1"), user = System.getenv("TEST_DB_USER"), password = System.getenv("TEST_DB_PASSWORD");
        String schema = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
        UUID owner = UUID.randomUUID(), semester = UUID.randomUUID(), course = UUID.randomUUID(), assignment = UUID.randomUUID(), session = UUID.randomUUID(), token = UUID.randomUUID();
        try {
            var old = Flyway.configure().dataSource(url, user, password).defaultSchema(schema).schemas(schema).target("3").load(); assertThat(old.migrate().migrationsExecuted).isEqualTo(3);
            try (var connection = DriverManager.getConnection(url, user, password); var statement = connection.createStatement()) {
                statement.execute("SET search_path TO " + schema);
                statement.execute("INSERT INTO app_users(id,email,password_hash,full_name) VALUES ('" + owner + "','migration-study@example.test','test-only-hash','Existing account')");
                statement.execute("INSERT INTO semesters(id,user_id,term,start_year,note) VALUES ('" + semester + "','" + owner + "',1,2026,'Existing semester')");
                statement.execute("INSERT INTO courses(id,user_id,semester_id,code,name,credits,description) VALUES ('" + course + "','" + owner + "','" + semester + "','OLD101','Existing course',3,'Keep course')");
                statement.execute("INSERT INTO assignments(id,user_id,course_id,title,due_at,notes,version) VALUES ('" + assignment + "','" + owner + "','" + course + "','Existing assignment','2026-10-30T23:59:00+07','Keep assignment',5)");
                statement.execute("INSERT INTO refresh_sessions(id,user_id,transport,expires_at,last_used_at) VALUES ('" + session + "','" + owner + "','BODY',now()+interval '7 days',now())");
                statement.execute("INSERT INTO refresh_tokens(id,session_id,token_hash,expires_at) VALUES ('" + token + "','" + session + "','" + "a".repeat(64) + "',now()+interval '7 days')");
            }
            var current = Flyway.configure().dataSource(url, user, password).defaultSchema(schema).schemas(schema).load(); assertThat(current.migrate().migrationsExecuted).isEqualTo(1);
            assertThat(current.info().current().getVersion().toString()).isEqualTo("4"); assertThat(current.migrate().migrationsExecuted).isZero(); current.validate();
            try (var connection = DriverManager.getConnection(url, user, password); var statement = connection.createStatement()) {
                statement.execute("SET search_path TO " + schema);
                try (var rows = statement.executeQuery("SELECT u.password_hash,s.note,c.description,a.notes,a.version,a.due_at FROM app_users u JOIN semesters s ON s.user_id=u.id JOIN courses c ON c.semester_id=s.id JOIN assignments a ON a.course_id=c.id WHERE a.id='" + assignment + "'")) {
                    assertThat(rows.next()).isTrue(); assertThat(rows.getString(1)).isEqualTo("test-only-hash"); assertThat(rows.getString(2)).isEqualTo("Existing semester"); assertThat(rows.getString(3)).isEqualTo("Keep course"); assertThat(rows.getString(4)).isEqualTo("Keep assignment"); assertThat(rows.getLong(5)).isEqualTo(5); assertThat(rows.getTimestamp(6).toInstant()).isEqualTo(Instant.parse("2026-10-30T16:59:00Z"));
                }
                try (var rows = statement.executeQuery("SELECT token_hash FROM refresh_tokens WHERE id='" + token + "'")) { assertThat(rows.next()).isTrue(); assertThat(rows.getString(1)).isEqualTo("a".repeat(64)); }
                try (var rows = statement.executeQuery("SELECT count(*) FROM study_sessions")) { rows.next(); assertThat(rows.getInt(1)).isZero(); }
                statement.execute("INSERT INTO study_sessions(id,user_id,course_id,assignment_id,title,starts_at,ends_at,time_zone,duration_minutes) VALUES ('" + UUID.randomUUID() + "','" + owner + "','" + course + "','" + assignment + "','New plan','2026-10-30T19:00:00+07','2026-10-30T19:45:00+07','Asia/Ho_Chi_Minh',45)");
                try (var rows = statement.executeQuery("SELECT count(*) FROM assignments")) { rows.next(); assertThat(rows.getInt(1)).isEqualTo(1); }
            }
        } finally {
            if (!schema.matches("backend_it_[a-f0-9]{32}")) throw new IllegalStateException("Unsafe test schema");
            try (var c = DriverManager.getConnection(url, user, password); var s = c.createStatement()) { s.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE"); }
        }
    }
}
