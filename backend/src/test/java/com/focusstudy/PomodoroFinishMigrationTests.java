package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import java.sql.*;
import java.util.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

class PomodoroFinishMigrationTests {
    @Test void upgradesV10KeepingRunningAndPausedSessionsAndAddsNoGoalRows()throws Exception {
        String url=Objects.requireNonNull(System.getenv("TEST_DB_URL"),"Run Test-Local.ps1"),user=System.getenv("TEST_DB_USER"),password=System.getenv("TEST_DB_PASSWORD"),schema="backend_it_"+UUID.randomUUID().toString().replace("-","");
        UUID running=UUID.randomUUID(),paused=UUID.randomUUID();
        try {
            var old=Flyway.configure().dataSource(url,user,password).defaultSchema(schema).schemas(schema).target("10").load();assertThat(old.migrate().migrationsExecuted).isEqualTo(10);
            try(var db=DriverManager.getConnection(url,user,password);var s=db.createStatement()) {
                s.execute("SET search_path TO "+schema);
                for(UUID id:List.of(running,paused)){
                    UUID owner=UUID.randomUUID(),semester=UUID.randomUUID(),course=UUID.randomUUID();
                    s.execute("INSERT INTO app_users(id,email,password_hash,full_name) VALUES ('"+owner+"','"+owner+"@example.test','test-only-hash','Migration account')");s.execute("INSERT INTO semesters(id,user_id,term,start_year) VALUES ('"+semester+"','"+owner+"',1,2026)");s.execute("INSERT INTO courses(id,user_id,semester_id,code,name,credits) VALUES ('"+course+"','"+owner+"','"+semester+"','MIG','Keep name',3)");
                    boolean pause=id.equals(paused);
                    s.execute("INSERT INTO pomodoro_sessions(id,user_id,client_request_id,status,started_at,state_changed_at,run_started_at,elapsed_millis,time_zone,course_id,course_code,course_name,semester_id,semester_term,semester_start_year,version) VALUES ('"+id+"','"+owner+"','"+UUID.randomUUID()+"','"+(pause?"PAUSED":"RUNNING")+"','2026-10-28T12:00:00Z','2026-10-28T12:00:01Z',"+(pause?"NULL":"'2026-10-28T12:00:01Z'")+",1000,'Asia/Ho_Chi_Minh','"+course+"','MIG','Keep name','"+semester+"',1,2026,5)");
                }
            }
            var before=snapshot(url,user,password,schema);
            var current=Flyway.configure().dataSource(url,user,password).defaultSchema(schema).schemas(schema).target("11").load();assertThat(current.migrate().migrationsExecuted).isEqualTo(1);assertThat(current.migrate().migrationsExecuted).isZero();current.validate();assertThat(snapshot(url,user,password,schema)).isEqualTo(before);
            try(var db=DriverManager.getConnection(url,user,password);var s=db.createStatement()) {
                s.execute("SET search_path TO "+schema);try(var r=s.executeQuery("SELECT count(*) FROM pomodoro_preferences")){r.next();assertThat(r.getInt(1)).isZero();}
                assertThatThrownBy(()->s.execute("UPDATE pomodoro_sessions SET status='COMPLETED' WHERE id='"+running+"'")).isInstanceOf(SQLException.class);
                s.execute("UPDATE pomodoro_sessions SET status='COMPLETED',elapsed_millis=1500000,run_started_at=NULL,ended_at='2026-10-28T12:25:00Z',finalized_at='2026-10-28T14:00:00Z',state_changed_at='2026-10-28T14:00:00Z',version=6 WHERE id='"+running+"'");
                assertThatThrownBy(()->s.execute("UPDATE pomodoro_sessions SET elapsed_millis=1499999 WHERE id='"+running+"'")).isInstanceOf(SQLException.class);
                assertThatThrownBy(()->s.execute("UPDATE pomodoro_sessions SET finalized_at=ended_at-interval '1 second' WHERE id='"+running+"'")).isInstanceOf(SQLException.class);
                assertThatThrownBy(()->s.execute("INSERT INTO pomodoro_preferences(id,user_id,daily_sessions) SELECT '"+UUID.randomUUID()+"',user_id,0 FROM pomodoro_sessions WHERE id='"+running+"'")).isInstanceOf(SQLException.class);
                s.execute("INSERT INTO pomodoro_preferences(id,user_id,daily_sessions) SELECT '"+UUID.randomUUID()+"',user_id,4 FROM pomodoro_sessions WHERE id='"+running+"'");
                assertThatThrownBy(()->s.execute("INSERT INTO pomodoro_preferences(id,user_id,daily_sessions) SELECT '"+UUID.randomUUID()+"',user_id,6 FROM pomodoro_sessions WHERE id='"+running+"'")).isInstanceOf(SQLException.class);
            }
        } finally {
            if(!schema.matches("backend_it_[a-f0-9]{32}"))throw new IllegalStateException("Unsafe test schema");try(var db=DriverManager.getConnection(url,user,password);var s=db.createStatement()){s.execute("DROP SCHEMA IF EXISTS "+schema+" CASCADE");}
        }
    }
    Map<String,String> snapshot(String url,String user,String password,String schema)throws Exception {
        var values=new TreeMap<String,String>();try(var db=DriverManager.getConnection(url,user,password);var s=db.createStatement()) {
            s.execute("SET search_path TO "+schema);var tables=new ArrayList<String>();try(var p=db.prepareStatement("SELECT table_name FROM information_schema.tables WHERE table_schema=? AND table_type='BASE TABLE' AND table_name NOT IN ('flyway_schema_history','pomodoro_preferences') ORDER BY table_name")){p.setString(1,schema);try(var r=p.executeQuery()){while(r.next())tables.add(r.getString(1));}}
            for(String table:tables){if(!table.matches("[a-z_]+"))throw new IllegalStateException("Unexpected table");String row=table.equals("pomodoro_sessions")?"to_jsonb(t)-'ended_at'-'finalized_at'":"to_jsonb(t)";try(var r=s.executeQuery("SELECT coalesce(jsonb_agg("+row+" ORDER BY id)::text,'[]') FROM "+table+" t")){r.next();values.put(table,r.getString(1));}}
        }return values;
    }
}
