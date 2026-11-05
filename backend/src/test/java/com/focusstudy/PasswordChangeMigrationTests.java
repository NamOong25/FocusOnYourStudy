package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import java.sql.*;
import java.util.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

class PasswordChangeMigrationTests {
    @Test void upgradesV13WithoutChangingExistingRowsAndKeepsStrictRevocationConstraint() throws Exception {
        String url = Objects.requireNonNull(System.getenv("TEST_DB_URL")), user = System.getenv("TEST_DB_USER"), password = System.getenv("TEST_DB_PASSWORD");
        String schema = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
        UUID owner = UUID.randomUUID(), semester = UUID.randomUUID(), session = UUID.randomUUID();
        try {
            var old = Flyway.configure().dataSource(url,user,password).defaultSchema(schema).schemas(schema).target("13").load(); assertThat(old.migrate().migrationsExecuted).isEqualTo(13);
            try (var c = DriverManager.getConnection(url,user,password); var s = c.createStatement()) {
                s.execute("SET search_path TO " + schema);
                s.execute("INSERT INTO app_users(id,email,password_hash,full_name,version) VALUES ('"+owner+"','"+owner+"@example.test','test-only-hash','Giữ tên',3)");
                s.execute("INSERT INTO semesters(id,user_id,term,start_year,version) VALUES ('"+semester+"','"+owner+"',1,2026,2)");
                for (String reason : List.of("ACTIVE","LOGOUT","REPLAY","EXPIRED")) {
                    String state = reason.equals("ACTIVE") ? "NULL,NULL" : "now(),'" + reason + "'";
                    s.execute("INSERT INTO refresh_sessions(id,user_id,transport,expires_at,last_used_at,revoked_at,revocation_reason,version) VALUES ('"+(reason.equals("ACTIVE")?session:UUID.randomUUID())+"','"+owner+"','BODY',now()+interval '1 day',now(),"+state+",2)");
                }
                s.execute("INSERT INTO refresh_tokens(id,session_id,token_hash,expires_at,version) VALUES ('"+UUID.randomUUID()+"','"+session+"','"+"a".repeat(64)+"',now()+interval '1 day',1)");
            }
            var snapshot = new NotificationReadMigrationTests(); var before = snapshot.snapshot(url,user,password,schema);
            var latest = Flyway.configure().dataSource(url,user,password).defaultSchema(schema).schemas(schema).target("14").load();
            assertThat(latest.migrate().migrationsExecuted).isEqualTo(1); assertThat(latest.migrate().migrationsExecuted).isZero(); latest.validate();
            assertThat(snapshot.snapshot(url,user,password,schema)).isEqualTo(before);
            try (var c = DriverManager.getConnection(url,user,password); var s = c.createStatement()) {
                s.execute("SET search_path TO " + schema);
                s.execute("UPDATE refresh_sessions SET revoked_at=now(),revocation_reason='PASSWORD_CHANGED' WHERE id='"+session+"'");
                for (String state : List.of("revoked_at=NULL,revocation_reason='PASSWORD_CHANGED'","revoked_at=now(),revocation_reason=NULL","revoked_at=now(),revocation_reason='BAD'"))
                    assertThatThrownBy(() -> s.execute("UPDATE refresh_sessions SET " + state + " WHERE id='"+session+"'")).isInstanceOf(SQLException.class);
            }
        } finally {
            if (!schema.matches("backend_it_[a-f0-9]{32}")) throw new IllegalStateException("Unsafe schema");
            try (var c = DriverManager.getConnection(url,user,password); var s = c.createStatement()) { s.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE"); }
        }
    }
}
