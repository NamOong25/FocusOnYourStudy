package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import java.sql.*;
import java.util.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

class NotificationReadMigrationTests {
    @Test void upgradesV11PreservesAllExistingTablesAndCreatesNoReceipts()throws Exception {
        String url=Objects.requireNonNull(System.getenv("TEST_DB_URL")),user=System.getenv("TEST_DB_USER"),password=System.getenv("TEST_DB_PASSWORD"),schema="backend_it_"+UUID.randomUUID().toString().replace("-","");
        UUID owner=UUID.randomUUID(),semester=UUID.randomUUID(),course=UUID.randomUUID(),task=UUID.randomUUID(),exam=UUID.randomUUID();
        try {
            var old=Flyway.configure().dataSource(url,user,password).defaultSchema(schema).schemas(schema).target("11").load();assertThat(old.migrate().migrationsExecuted).isEqualTo(11);
            try(var c=DriverManager.getConnection(url,user,password);var s=c.createStatement()) {
                s.execute("SET search_path TO "+schema);
                s.execute("INSERT INTO app_users(id,email,password_hash,full_name) VALUES ('"+owner+"','"+owner+"@example.test','test-only-hash','Giữ tên')");
                s.execute("INSERT INTO semesters(id,user_id,term,start_year) VALUES ('"+semester+"','"+owner+"',1,2026)");
                s.execute("INSERT INTO courses(id,user_id,semester_id,code,name,credits) VALUES ('"+course+"','"+owner+"','"+semester+"','JAVA','Giữ môn',3)");
                s.execute("INSERT INTO assignments(id,user_id,course_id,title,due_at,version) VALUES ('"+task+"','"+owner+"','"+course+"','Giữ bài','2026-11-01T00:00:00Z',4)");
                s.execute("INSERT INTO exams(id,user_id,course_id,kind,format,starts_at,ends_at,time_zone,version) VALUES ('"+exam+"','"+owner+"','"+course+"','FINAL','ONLINE','2026-11-01T01:00:00Z','2026-11-01T03:00:00Z','Asia/Ho_Chi_Minh',7)");
            }
            var before=snapshot(url,user,password,schema);
            var current=Flyway.configure().dataSource(url,user,password).defaultSchema(schema).schemas(schema).target("12").load();
            assertThat(current.migrate().migrationsExecuted).isEqualTo(1);assertThat(current.migrate().migrationsExecuted).isZero();current.validate();assertThat(snapshot(url,user,password,schema)).isEqualTo(before);
            try(var c=DriverManager.getConnection(url,user,password);var s=c.createStatement()) {
                s.execute("SET search_path TO "+schema);
                try(var r=s.executeQuery("SELECT count(*) FROM notification_read_states")){r.next();assertThat(r.getLong(1)).isZero();}
                String base="INSERT INTO notification_read_states(user_id,kind,source_id,occurrence_date,assignment_id,revision,read_at) VALUES ('"+owner+"','ASSIGNMENT','"+task+"','1970-01-01','"+task+"','"+"f".repeat(64)+"','2026-10-30T00:00:00Z')";
                s.execute(base);assertThatThrownBy(()->s.execute(base)).isInstanceOf(SQLException.class);
                assertThatThrownBy(()->s.execute("UPDATE notification_read_states SET revision='bad'")).isInstanceOf(SQLException.class);
                assertThatThrownBy(()->s.execute("UPDATE notification_read_states SET occurrence_date='2026-10-30'")).isInstanceOf(SQLException.class);
                s.execute("DELETE FROM assignments WHERE id='"+task+"'");try(var r=s.executeQuery("SELECT count(*) FROM notification_read_states")){r.next();assertThat(r.getLong(1)).isZero();}
            }
        } finally {
            if(!schema.matches("backend_it_[a-f0-9]{32}"))throw new IllegalStateException("Unsafe schema");
            try(var c=DriverManager.getConnection(url,user,password);var s=c.createStatement()){s.execute("DROP SCHEMA IF EXISTS "+schema+" CASCADE");}
        }
    }
    Map<String,String> snapshot(String url,String user,String password,String schema)throws Exception {
        var result=new TreeMap<String,String>();
        try(var c=DriverManager.getConnection(url,user,password);var s=c.createStatement()) {
            s.execute("SET search_path TO "+schema);var tables=new ArrayList<String>();
            try(var p=c.prepareStatement("SELECT table_name FROM information_schema.tables WHERE table_schema=? AND table_type='BASE TABLE' AND table_name NOT IN ('flyway_schema_history','notification_read_states') ORDER BY table_name")){p.setString(1,schema);try(var r=p.executeQuery()){while(r.next())tables.add(r.getString(1));}}
            for(var table:tables){if(!table.matches("[a-z_]+"))throw new IllegalStateException("Unexpected table");try(var r=s.executeQuery("SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'[]') FROM "+table+" t")){r.next();result.put(table,r.getString(1));}}
        }
        return result;
    }
}
