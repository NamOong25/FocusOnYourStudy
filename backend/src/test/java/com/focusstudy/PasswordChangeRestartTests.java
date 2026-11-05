package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import java.sql.DriverManager;
import java.util.*;
import org.junit.jupiter.api.Test;

class PasswordChangeRestartTests {
    @Test void changedHashAndRevocationPersistAcrossEntireBackendRestart() throws Exception {
        String schema = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
        String url = Objects.requireNonNull(System.getenv("TEST_DB_URL")), user = System.getenv("TEST_DB_USER"), password = System.getenv("TEST_DB_PASSWORD");
        String email = "password-restart-"+UUID.randomUUID()+"@example.test", oldPassword = "Restart9b1!Old", newPassword = "Restart9b1!New";
        var h = new SessionRestartTests(); String oldAccess, oldRefresh, semesterId;
        try {
            try (var app = h.start(schema)) {
                assertThat(h.post(app,"/api/v1/auth/register",Map.of("email",email,"password",oldPassword,"confirmPassword",oldPassword,"fullName","Giữ dữ liệu")).statusCode()).isEqualTo(201);
                var pair = h.data(app,h.post(app,"/api/v1/auth/login",Map.of("email",email,"password",oldPassword)));
                oldAccess = pair.get("accessToken").toString(); oldRefresh = pair.get("refreshToken").toString();
                var semesterResponse = h.semester(app,"POST","/api/v1/semesters",oldAccess,Map.of("term",1,"startYear",2026,"status","CURRENT"));
                assertThat(semesterResponse.statusCode()).isEqualTo(201);
                semesterId = ((Map<?,?>) app.getBean(tools.jackson.databind.ObjectMapper.class).readValue(semesterResponse.body(),Map.class).get("data")).get("id").toString();
                assertThat(h.semester(app,"PUT","/api/v1/users/me/password",oldAccess,Map.of("currentPassword",oldPassword,"newPassword",newPassword)).statusCode()).isEqualTo(204);
            }
            try (var app = h.start(schema)) {
                assertThat(h.semester(app,"GET","/api/v1/users/me",oldAccess,null).statusCode()).isEqualTo(401);
                assertThat(h.post(app,"/api/v1/auth/refresh",Map.of("refreshToken",oldRefresh)).statusCode()).isEqualTo(401);
                assertThat(h.post(app,"/api/v1/auth/login",Map.of("email",email,"password",oldPassword)).statusCode()).isEqualTo(401);
                var pair = h.data(app,h.post(app,"/api/v1/auth/login",Map.of("email",email,"password",newPassword)));
                assertThat(((Map<?,?>) pair.get("user")).get("fullName")).isEqualTo("Giữ dữ liệu");
                assertThat(h.semester(app,"GET","/api/v1/semesters/"+semesterId,pair.get("accessToken").toString(),null).statusCode()).isEqualTo(200);
            }
        } finally {
            if (!schema.matches("backend_it_[a-f0-9]{32}")) throw new IllegalStateException("Unsafe schema");
            try (var c = DriverManager.getConnection(url,user,password); var s = c.createStatement()) { s.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE"); }
        }
    }
}
