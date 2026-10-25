package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import java.sql.DriverManager;
import java.util.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

class GradeConfigurationMigrationTests {
    @Test void upgradesV7PreservingAllLearningDataAndRunsOnce() throws Exception {
        String url = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Run Test-Local.ps1"), user = System.getenv("TEST_DB_USER"), password = System.getenv("TEST_DB_PASSWORD");
        String schema = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
        UUID owner = UUID.randomUUID(), semester = UUID.randomUUID(), course = UUID.randomUUID(), assignment = UUID.randomUUID(), study = UUID.randomUUID(), session = UUID.randomUUID(), schedule = UUID.randomUUID();
        try {
            var old = Flyway.configure().dataSource(url, user, password).defaultSchema(schema).schemas(schema).target("7").load(); assertThat(old.migrate().migrationsExecuted).isEqualTo(7);
            try (var c = DriverManager.getConnection(url, user, password); var s = c.createStatement()) {
                s.execute("SET search_path TO " + schema);
                s.execute("INSERT INTO app_users(id,email,password_hash,full_name) VALUES ('" + owner + "','migration-class@example.test','test-only-hash','Existing account')");
                s.execute("INSERT INTO semesters(id,user_id,term,start_year,note) VALUES ('" + semester + "','" + owner + "',1,2026,'Keep semester')");
                s.execute("INSERT INTO courses(id,user_id,semester_id,code,name,credits,description) VALUES ('" + course + "','" + owner + "','" + semester + "','OLD101','Existing course',3,'Keep course')");
                s.execute("INSERT INTO assignments(id,user_id,course_id,title,due_at,notes,version) VALUES ('" + assignment + "','" + owner + "','" + course + "','Existing assignment','2026-10-30T23:59:00+07','Keep assignment',5)");
                s.execute("INSERT INTO study_sessions(id,user_id,course_id,assignment_id,title,starts_at,ends_at,time_zone,duration_minutes,notes,version) VALUES ('" + study + "','" + owner + "','" + course + "','" + assignment + "','Existing plan','2026-10-30T19:00:00+07','2026-10-30T19:45:00+07','Asia/Ho_Chi_Minh',45,'Keep plan',7)");
                s.execute("INSERT INTO refresh_sessions(id,user_id,transport,expires_at,last_used_at) VALUES ('" + session + "','" + owner + "','BODY',now()+interval '7 days',now())");
                s.execute("INSERT INTO class_schedules(id,user_id,course_id,weekday_mask,starts_on,ends_on,start_time,end_time,time_zone,notes,version) VALUES ('" + schedule + "','" + owner + "','" + course + "',5,'2026-10-26','2026-11-08','07:00','09:00','Asia/Ho_Chi_Minh','Keep schedule',9)");
            }
            try (var c = DriverManager.getConnection(url, user, password); var s = c.createStatement()) {
                s.execute("SET search_path TO " + schema);
                s.execute("INSERT INTO class_exceptions(id,user_id,schedule_id,occurrence_date,kind,reason) VALUES ('" + UUID.randomUUID() + "','" + owner + "','" + schedule + "','2026-10-26','CANCELLED','Keep exception')");
                s.execute("INSERT INTO exams(id,user_id,course_id,kind,format,starts_at,ends_at,time_zone,notes,version) VALUES ('" + UUID.randomUUID() + "','" + owner + "','" + course + "','FINAL','ONLINE','2026-11-12T08:00:00+07','2026-11-12T10:00:00+07','Asia/Ho_Chi_Minh','Keep exam',11)");
            }
            var current = Flyway.configure().dataSource(url, user, password).defaultSchema(schema).schemas(schema).target("8").load(); assertThat(current.migrate().migrationsExecuted).isEqualTo(1);
            assertThat(current.info().current().getVersion().toString()).isEqualTo("8"); assertThat(current.migrate().migrationsExecuted).isZero(); current.validate();
            try (var c = DriverManager.getConnection(url, user, password); var s = c.createStatement()) {
                s.execute("SET search_path TO " + schema);
                try (var r = s.executeQuery("SELECT u.password_hash,s.note,c.description,a.notes,a.version,p.notes,p.version,p.assignment_id FROM app_users u JOIN semesters s ON s.user_id=u.id JOIN courses c ON c.semester_id=s.id JOIN assignments a ON a.course_id=c.id JOIN study_sessions p ON p.assignment_id=a.id WHERE p.id='" + study + "'")) {
                    assertThat(r.next()).isTrue(); assertThat(r.getString(1)).isEqualTo("test-only-hash"); assertThat(r.getString(2)).isEqualTo("Keep semester"); assertThat(r.getString(3)).isEqualTo("Keep course"); assertThat(r.getString(4)).isEqualTo("Keep assignment"); assertThat(r.getLong(5)).isEqualTo(5); assertThat(r.getString(6)).isEqualTo("Keep plan"); assertThat(r.getLong(7)).isEqualTo(7); assertThat(r.getObject(8)).isEqualTo(assignment);
                }
                try (var r = s.executeQuery("SELECT count(*) FROM refresh_sessions WHERE id='" + session + "'")) { r.next(); assertThat(r.getInt(1)).isEqualTo(1); }
                try (var r = s.executeQuery("SELECT notes,version,exception_revision,start_time::text FROM class_schedules WHERE id='" + schedule + "'")) { assertThat(r.next()).isTrue(); assertThat(r.getString(1)).isEqualTo("Keep schedule"); assertThat(r.getLong(2)).isEqualTo(9); assertThat(r.getLong(3)).isZero(); assertThat(r.getString(4)).isEqualTo("07:00:00"); }
                try (var r = s.executeQuery("SELECT count(*) FROM class_exceptions")) { r.next(); assertThat(r.getInt(1)).isEqualTo(1); }
                try (var r = s.executeQuery("SELECT reason FROM class_exceptions")) { r.next(); assertThat(r.getString(1)).isEqualTo("Keep exception"); }
                try (var r = s.executeQuery("SELECT notes,version FROM exams")) { assertThat(r.next()).isTrue(); assertThat(r.getString(1)).isEqualTo("Keep exam"); assertThat(r.getInt(2)).isEqualTo(11); }
                for (String table : List.of("grade_configurations", "grade_columns")) try (var r = s.executeQuery("SELECT count(*) FROM " + table)) { r.next(); assertThat(r.getInt(1)).isZero(); }
                s.execute("INSERT INTO exams(id,user_id,course_id,kind,format,starts_at,ends_at,time_zone,notes) VALUES ('" + UUID.randomUUID() + "','" + owner + "','" + course + "','MIDTERM','WRITTEN','2026-11-10T08:00:00+07','2026-11-10T10:00:00+07','Asia/Ho_Chi_Minh','New exam')");
                try (var r = s.executeQuery("SELECT reminder_minutes FROM exams")) { assertThat(r.next()).isTrue(); assertThat((Integer[]) r.getArray(1).getArray()).containsExactly(1440, 180); }
                try (var r = s.executeQuery("SELECT count(*) FROM study_sessions")) { r.next(); assertThat(r.getInt(1)).isEqualTo(1); }
            }
        } finally {
            if (!schema.matches("backend_it_[a-f0-9]{32}")) throw new IllegalStateException("Unsafe test schema");
            try (var c = DriverManager.getConnection(url, user, password); var s = c.createStatement()) { s.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE"); }
        }
    }
}
