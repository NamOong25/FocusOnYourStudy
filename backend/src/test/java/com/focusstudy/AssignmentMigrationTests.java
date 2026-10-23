package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import java.sql.DriverManager;
import java.util.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

class AssignmentMigrationTests {
    @Test void upgradesExistingV2WithoutLosingAccountsSemestersOrCoursesAndRunsOnlyOnce() throws Exception {
        String url = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Run Test-Local.ps1"), user = System.getenv("TEST_DB_USER"), password = System.getenv("TEST_DB_PASSWORD");
        String schema = "backend_it_" + UUID.randomUUID().toString().replace("-", ""); UUID owner = UUID.randomUUID(), semester = UUID.randomUUID(), course = UUID.randomUUID();
        try {
            var old = Flyway.configure().dataSource(url, user, password).defaultSchema(schema).schemas(schema).target("2").load(); assertThat(old.migrate().migrationsExecuted).isEqualTo(2);
            try (var connection = DriverManager.getConnection(url, user, password); var statement = connection.createStatement()) {
                statement.execute("SET search_path TO " + schema);
                statement.execute("INSERT INTO app_users(id,email,password_hash,full_name) VALUES ('" + owner + "','migration@example.test','test-only-hash','Existing account')");
                statement.execute("INSERT INTO semesters(id,user_id,term,start_year,note) VALUES ('" + semester + "','" + owner + "',1,2026,'Existing semester')");
                statement.execute("INSERT INTO courses(id,user_id,semester_id,code,name,credits,description) VALUES ('" + course + "','" + owner + "','" + semester + "','OLD101','Existing course',3,'Keep me')");
            }
            var current = Flyway.configure().dataSource(url, user, password).defaultSchema(schema).schemas(schema).target("3").load(); assertThat(current.migrate().migrationsExecuted).isEqualTo(1);
            assertThat(current.info().current().getVersion().toString()).isEqualTo("3"); assertThat(current.migrate().migrationsExecuted).isZero(); current.validate();
            try (var connection = DriverManager.getConnection(url, user, password); var statement = connection.createStatement()) {
                statement.execute("SET search_path TO " + schema);
                try (var rows = statement.executeQuery("SELECT u.password_hash,s.note,c.description,c.version FROM app_users u JOIN semesters s ON s.user_id=u.id JOIN courses c ON c.semester_id=s.id WHERE c.id='" + course + "'")) {
                    assertThat(rows.next()).isTrue(); assertThat(rows.getString(1)).isEqualTo("test-only-hash"); assertThat(rows.getString(2)).isEqualTo("Existing semester"); assertThat(rows.getString(3)).isEqualTo("Keep me"); assertThat(rows.getLong(4)).isZero();
                }
                try (var rows = statement.executeQuery("SELECT count(*) FROM assignments")) { rows.next(); assertThat(rows.getInt(1)).isZero(); }
            }
        } finally {
            if (!schema.matches("backend_it_[a-f0-9]{32}")) throw new IllegalStateException("Unsafe test schema");
            try (var connection = DriverManager.getConnection(url, user, password); var statement = connection.createStatement()) { statement.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE"); }
        }
    }
}
