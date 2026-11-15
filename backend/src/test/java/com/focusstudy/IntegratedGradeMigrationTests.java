package com.focusstudy;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.util.Objects;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class IntegratedGradeMigrationTests {
    @TempDir Path previousMigrations;

    @Test void fillsMissingV17AfterV19AndPreservesExistingGrades() throws Exception {
        String url = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Run Test-Local.ps1");
        String user = System.getenv("TEST_DB_USER");
        String password = System.getenv("TEST_DB_PASSWORD");
        String schema = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
        Path bundledMigrations = Path.of("src/main/resources/db/migration");
        try (var files = Files.list(bundledMigrations)) {
            for (Path file : files.filter(path -> path.toString().endsWith(".sql"))
                    .filter(path -> !path.getFileName().toString().startsWith("V17__"))
                    .filter(path -> !path.getFileName().toString().startsWith("V20__")).toList()) {
                Files.copy(file, previousMigrations.resolve(file.getFileName()));
            }
        }

        UUID owner = UUID.randomUUID();
        UUID semester = UUID.randomUUID();
        UUID course = UUID.randomUUID();
        UUID configuration = UUID.randomUUID();
        UUID column = UUID.randomUUID();
        try (var connection = DriverManager.getConnection(url, user, password);
             var sql = connection.createStatement()) {
            var previous = Flyway.configure().dataSource(url, user, password).schemas(schema)
                    .locations("filesystem:" + previousMigrations.toAbsolutePath()).target("19").load();
            previous.migrate();
            assertThat(previous.info().current().getVersion().getVersion()).isEqualTo("19");

            sql.execute("SET search_path TO " + schema);
            sql.execute("INSERT INTO app_users(id,email,password_hash,full_name) VALUES ('%s','migration-v17@example.test','test-hash','Existing user')".formatted(owner));
            sql.execute("INSERT INTO semesters(id,user_id,term,start_year) VALUES ('%s','%s',1,2026)".formatted(semester, owner));
            sql.execute("INSERT INTO courses(id,user_id,semester_id,code,name,credits) VALUES ('%s','%s','%s','TEST','Existing course',3)".formatted(course, owner, semester));
            sql.execute("INSERT INTO grade_configurations(id,user_id,course_id,assessment) VALUES ('%s','%s','%s','THEORY')".formatted(configuration, owner, course));
            sql.execute("""
                    INSERT INTO grade_columns(id,configuration_id,user_id,assessment,column_key,position,name,kind,score)
                    VALUES ('%s','%s','%s','THEORY','gk',0,'Existing midterm','MIDTERM',8.5)
                    """.formatted(column, configuration, owner));
            sql.execute("INSERT INTO pomodoro_breaks(user_id,kind,state,remaining_ms,version) VALUES ('%s','SHORT','PAUSED',120000,1)".formatted(owner));
            sql.execute("""
                    INSERT INTO class_schedules(id,user_id,course_id,weekday_mask,starts_on,ends_on,start_time,end_time,time_zone,lesson_type,meeting_platform,meeting_id)
                    VALUES ('%s','%s','%s',1,'2026-08-03','2026-09-07','08:00','09:00','Asia/Ho_Chi_Minh','PRACTICE','TEAMS','existing-class')
                    """.formatted(UUID.randomUUID(), owner, course));

            var recovery = Flyway.configure().dataSource(url, user, password).schemas(schema).target("19").outOfOrder(true).load();
            assertThat(recovery.migrate().migrationsExecuted).isEqualTo(1);

            var normal = Flyway.configure().dataSource(url, user, password).schemas(schema).load();
            assertThat(normal.migrate().migrationsExecuted).isEqualTo(1);
            normal.validate();
            assertThat(normal.info().current().getVersion().getVersion()).isEqualTo("20");
            try (var rows = sql.executeQuery("""
                    SELECT c.score, c.theory_midterm_slot, g.theory_credits, g.practice_credits, p.remaining_ms,
                           s.lesson_type, s.meeting_platform, s.meeting_id, u.full_name, co.counts_toward_gpa
                    FROM grade_columns c
                    JOIN grade_configurations g ON g.id = c.configuration_id
                    JOIN courses co ON co.id = g.course_id
                    JOIN pomodoro_breaks p ON p.user_id = g.user_id
                    JOIN class_schedules s ON s.course_id = g.course_id
                    JOIN app_users u ON u.id = g.user_id
                    WHERE c.id = '%s'
                    """.formatted(column))) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getBigDecimal("score")).isEqualByComparingTo("8.5");
                assertThat(rows.getInt("theory_midterm_slot")).isEqualTo(1);
                assertThat(rows.getObject("theory_credits")).isNull();
                assertThat(rows.getObject("practice_credits")).isNull();
                assertThat(rows.getInt("remaining_ms")).isEqualTo(120000);
                assertThat(rows.getString("lesson_type")).isEqualTo("PRACTICE");
                assertThat(rows.getString("meeting_platform")).isEqualTo("TEAMS");
                assertThat(rows.getString("meeting_id")).isEqualTo("existing-class");
                assertThat(rows.getString("full_name")).isEqualTo("Existing user");
                assertThat(rows.getBoolean("counts_toward_gpa")).isTrue();
            }
        } finally {
            try (var connection = DriverManager.getConnection(url, user, password);
                 var sql = connection.createStatement()) {
                sql.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
            }
        }
    }
}
