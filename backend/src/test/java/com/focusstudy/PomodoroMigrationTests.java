package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import java.sql.*;
import java.util.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

class PomodoroMigrationTests {
    @Test void upgradesV9ExactlyOnceWithoutChangingAnyExistingRowsOrSeedingFocus()throws Exception {
        String url=Objects.requireNonNull(System.getenv("TEST_DB_URL"),"Run Test-Local.ps1"),user=System.getenv("TEST_DB_USER"),password=System.getenv("TEST_DB_PASSWORD");
        String schema="backend_it_"+UUID.randomUUID().toString().replace("-","");
        UUID owner=UUID.randomUUID(),semester=UUID.randomUUID(),course=UUID.randomUUID(),config=UUID.randomUUID();
        try {
            var old=Flyway.configure().dataSource(url,user,password).defaultSchema(schema).schemas(schema).target("9").load();assertThat(old.migrate().migrationsExecuted).isEqualTo(9);
            try(var db=DriverManager.getConnection(url,user,password);var s=db.createStatement()) {
                s.execute("SET search_path TO "+schema);
                s.execute("INSERT INTO app_users(id,email,password_hash,full_name) VALUES ('"+owner+"','focus-migration@example.test','test-only-hash','Existing account')");
                s.execute("INSERT INTO semesters(id,user_id,term,start_year,note) VALUES ('"+semester+"','"+owner+"',1,2026,'Keep semester')");
                s.execute("INSERT INTO courses(id,user_id,semester_id,code,name,credits,description) VALUES ('"+course+"','"+owner+"','"+semester+"','FOCUS','Existing course',3,'Keep course')");
                s.execute("INSERT INTO grade_configurations(id,user_id,course_id,assessment,version,update_revision) VALUES ('"+config+"','"+owner+"','"+course+"','THEORY',7,4)");
                s.execute("INSERT INTO grade_columns(id,configuration_id,user_id,assessment,column_key,position,name,kind,score) VALUES ('"+UUID.randomUUID()+"','"+config+"','"+owner+"','THEORY','regular',0,'Zero is entered','REGULAR',0),('"+UUID.randomUUID()+"','"+config+"','"+owner+"','THEORY','midterm',1,'Still missing','MIDTERM',NULL)");
            }
            Map<String,String> before=snapshot(url,user,password,schema);
            var current=Flyway.configure().dataSource(url,user,password).defaultSchema(schema).schemas(schema).target("10").load();assertThat(current.migrate().migrationsExecuted).isEqualTo(1);assertThat(current.info().current().getVersion().toString()).isEqualTo("10");assertThat(current.migrate().migrationsExecuted).isZero();current.validate();
            assertThat(snapshot(url,user,password,schema)).isEqualTo(before);
            try(var db=DriverManager.getConnection(url,user,password);var s=db.createStatement()) {
                s.execute("SET search_path TO "+schema);try(var r=s.executeQuery("SELECT count(*) FROM pomodoro_sessions")){r.next();assertThat(r.getInt(1)).isZero();}
                String insert="INSERT INTO pomodoro_sessions(id,user_id,client_request_id,status,started_at,state_changed_at,run_started_at,time_zone,course_id,course_code,course_name,semester_id,semester_term,semester_start_year) VALUES ('%s','"+owner+"','%s','RUNNING','2026-10-28T12:00:00Z','2026-10-28T12:00:00Z','2026-10-28T12:00:00Z','UTC','"+course+"','FOCUS','Existing course','"+semester+"',1,2026)";
                s.execute(insert.formatted(UUID.randomUUID(),UUID.randomUUID()));
                assertThatThrownBy(()->s.execute(insert.formatted(UUID.randomUUID(),UUID.randomUUID()))).isInstanceOf(SQLException.class).satisfies(ex->assertThat(((SQLException)ex).getSQLState()).isEqualTo("23505"));
                assertThatThrownBy(()->s.execute("UPDATE pomodoro_sessions SET elapsed_millis=-1")).isInstanceOf(SQLException.class);
                assertThatThrownBy(()->s.execute("UPDATE pomodoro_sessions SET status='PAUSED'")).isInstanceOf(SQLException.class);
                assertThatThrownBy(()->s.execute("UPDATE pomodoro_sessions SET duration_seconds=0")).isInstanceOf(SQLException.class);
                assertThatThrownBy(()->s.execute("UPDATE pomodoro_sessions SET state_changed_at=started_at-interval '1 second'")).isInstanceOf(SQLException.class);
            }
        } finally {
            if(!schema.matches("backend_it_[a-f0-9]{32}"))throw new IllegalStateException("Unsafe test schema");
            try(var db=DriverManager.getConnection(url,user,password);var s=db.createStatement()){s.execute("DROP SCHEMA IF EXISTS "+schema+" CASCADE");}
        }
    }
    Map<String,String> snapshot(String url,String user,String password,String schema)throws Exception {
        var result=new TreeMap<String,String>();
        try(var db=DriverManager.getConnection(url,user,password);var s=db.createStatement()) {
            s.execute("SET search_path TO "+schema);var tables=new ArrayList<String>();
            try(var p=db.prepareStatement("SELECT table_name FROM information_schema.tables WHERE table_schema=? AND table_type='BASE TABLE' AND table_name NOT IN ('flyway_schema_history','pomodoro_sessions') ORDER BY table_name")){p.setString(1,schema);try(var r=p.executeQuery()){while(r.next())tables.add(r.getString(1));}}
            for(String table:tables){if(!table.matches("[a-z_]+"))throw new IllegalStateException("Unexpected table");try(var r=s.executeQuery("SELECT coalesce(json_agg(t ORDER BY id)::text,'[]') FROM "+table+" t")){r.next();result.put(table,r.getString(1));}}
        }return result;
    }
}
