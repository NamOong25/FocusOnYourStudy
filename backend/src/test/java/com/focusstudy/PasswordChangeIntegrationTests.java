package com.focusstudy;

import static org.assertj.core.api.Assertions.*;

import com.focusstudy.users.ChangePasswordRequest;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DirtiesContext
class PasswordChangeIntegrationTests {
    static final String SCHEMA = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
    static final String URL = Objects.requireNonNull(System.getenv("TEST_DB_URL")), USER = System.getenv("TEST_DB_USER"), PASSWORD = System.getenv("TEST_DB_PASSWORD");
    static final String OLD = "Password9b1!Old", NEW = "Mật khẩu mới 9B!", ROOT = "/api/v1/users/me/password";
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired PasswordEncoder encoder;
    final HttpClient client = HttpClient.newHttpClient();
    record Account(UUID id, String email, String token, String refresh) { }

    @DynamicPropertySource static void configure(DynamicPropertyRegistry r) {
        TestJwtResources.configure(r);
        r.add("spring.datasource.url", () -> URL + (URL.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA);
        r.add("spring.datasource.username", () -> USER); r.add("spring.datasource.password", () -> PASSWORD);
        r.add("spring.flyway.default-schema", () -> SCHEMA); r.add("spring.flyway.schemas", () -> SCHEMA);
        for (String route : List.of("login", "register", "refresh", "logout")) r.add("app.auth.rate-limit." + route + "-per-minute", () -> 1000);
    }
    @AfterAll static void cleanup() throws Exception {
        if (!SCHEMA.matches("backend_it_[a-f0-9]{32}")) throw new IllegalStateException("Not own schema");
        try (var c = DriverManager.getConnection(URL, USER, PASSWORD); var s = c.createStatement()) { s.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE"); }
    }
    HttpRequest.Builder request(String path) { return HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).timeout(Duration.ofSeconds(30)); }
    HttpResponse<String> send(String method, String path, String token, Object body) throws Exception {
        var b = request(path); if (token != null) b.header("Authorization", "Bearer " + token);
        if (body != null) b.header("Content-Type", "application/json");
        return client.send(b.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(), HttpResponse.BodyHandlers.ofString());
    }
    Map<?, ?> data(HttpResponse<String> r) { assertThat(r.statusCode()).as(r.body()).isIn(200, 201); return (Map<?, ?>) json.readValue(r.body(), Map.class).get("data"); }
    void error(HttpResponse<String> r, int status, String code) {
        assertThat(r.statusCode()).as(r.body()).isEqualTo(status); assertThat(json.readValue(r.body(), Map.class).get("code")).isEqualTo(code);
        assertThat(r.body()).doesNotContain(OLD, NEW, "password_hash", "passwordHash", "org.hibernate", "accessToken", "refreshToken");
    }
    Map<?, ?> login(String email, String password) throws Exception { return data(send("POST", "/api/v1/auth/login", null, Map.of("email", email, "password", password))); }
    Account account() throws Exception { return account(OLD); }
    Account account(String password) throws Exception {
        String email = "password9b1-" + UUID.randomUUID() + "@example.test";
        var user = data(send("POST", "/api/v1/auth/register", null, Map.of("email", email, "password", password, "confirmPassword", password, "fullName", "Sinh viên thử", "school", "IUH", "major", "CNTT")));
        var pair = login(email, password);
        return new Account(UUID.fromString(user.get("id").toString()), email, pair.get("accessToken").toString(), pair.get("refreshToken").toString());
    }
    Map<String, Object> input() { return new HashMap<>(Map.of("currentPassword", OLD, "newPassword", NEW)); }
    HttpResponse<String> change(Account a, Object body) throws Exception { return send("PUT", ROOT, a.token, body); }
    String hash(Account a) { return jdbc.queryForObject("SELECT password_hash FROM app_users WHERE id=?", String.class, a.id); }
    int active(Account a) { return jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL", Integer.class, a.id); }
    void unchanged(Account a, String hash, int count) { assertThat(hash(a)).isEqualTo(hash); assertThat(active(a)).isEqualTo(count); }

    @Test void changesHashAndRevokesAllBodyAndCookieSessionsWhileKeepingAcademicDataAndOtherOwner() throws Exception {
        var a = account(); var b = account(); var second = login(a.email, OLD); var cookie = browserPair(a);
        var profile = jdbc.queryForMap("SELECT email,full_name,school,major,time_zone,created_at,version FROM app_users WHERE id=?", a.id);
        var semester = data(send("POST", "/api/v1/semesters", a.token, Map.of("term", 1, "startYear", 2026, "status", "CURRENT")));
        var before = hash(a); int sessions = active(a);
        var changed = change(a, input());
        assertThat(changed.statusCode()).as(changed.body()).isEqualTo(204); assertThat(changed.body()).isEmpty();
        assertThat(changed.headers().firstValue("Cache-Control").orElse("")).contains("no-store"); assertThat(changed.headers().firstValue("X-Request-ID")).isPresent();
        assertThat(hash(a)).isNotEqualTo(before).isNotEqualTo(NEW); assertThat(encoder.matches(NEW, hash(a))).isTrue(); assertThat(encoder.matches(OLD, hash(a))).isFalse();
        assertThat(active(a)).isZero(); assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revocation_reason='PASSWORD_CHANGED'", Integer.class, a.id)).isEqualTo(sessions);
        for (String token : List.of(a.token, second.get("accessToken").toString(), cookie.get("accessToken").toString())) error(send("GET", "/api/v1/users/me", token, null), 401, "INVALID_ACCESS_TOKEN");
        for (String token : List.of(a.refresh, second.get("refreshToken").toString())) error(send("POST", "/api/v1/auth/refresh", null, Map.of("refreshToken", token)), 401, "INVALID_REFRESH_TOKEN");
        error(send("POST", "/api/v1/auth/login", null, Map.of("email", a.email, "password", OLD)), 401, "INVALID_CREDENTIALS");
        var fresh = login(a.email, NEW); var p = (Map<?, ?>) fresh.get("user");
        for (String field : List.of("email", "full_name", "school", "major", "time_zone", "created_at")) assertThat(jdbc.queryForMap("SELECT " + field + " FROM app_users WHERE id=?", a.id).get(field)).isEqualTo(profile.get(field));
        assertThat(((Number) p.get("version")).longValue()).isEqualTo(((Number) profile.get("version")).longValue() + 1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM semesters WHERE id=?", Integer.class, UUID.fromString(semester.get("id").toString()))).isEqualTo(1);
        assertThat(send("GET", "/api/v1/users/me", b.token, null).statusCode()).isEqualTo(200); assertThat(encoder.matches(OLD, hash(b))).isTrue();
    }
    @Test void incorrectCurrentPasswordDoesNotChangeHashOrRevokeAnySession() throws Exception {
        var a = account(); var before = hash(a); var body = input(); body.put("currentPassword", "Wrong-password");
        error(change(a, body), 400, "CURRENT_PASSWORD_INCORRECT"); unchanged(a, before, 1); login(a.email, OLD);
    }
    @Test void unchangedPasswordIsRejectedWithoutRevokingSessions() throws Exception {
        var a = account(); var before = hash(a);
        error(change(a, Map.of("currentPassword", OLD, "newPassword", OLD)), 400, "PASSWORD_UNCHANGED"); unchanged(a, before, 1);
    }
    @Test void missingNullBlankShortAndOverlongFieldsAreRejectedWithoutSideEffects() throws Exception {
        var a = account(); var before = hash(a);
        for (String field : List.of("currentPassword", "newPassword")) {
            for (Object v : Arrays.asList(null, "", " \t\n ", "x".repeat(129))) { var body = input(); body.put(field, v); var r = change(a, body); error(r, 400, "VALIDATION_FAILED"); assertThat(r.body()).contains(field); }
            var body = input(); body.remove(field); error(change(a, body), 400, "VALIDATION_FAILED");
        }
        var body = input(); body.put("newPassword", "x".repeat(7)); error(change(a, body), 400, "VALIDATION_FAILED"); unchanged(a, before, 1);
    }
    @Test void exactEightAnd128CharacterBoundariesWork() throws Exception {
        for (String password : List.of("A".repeat(8), "Z".repeat(128))) { var a = account(); assertThat(change(a, Map.of("currentPassword", OLD, "newPassword", password)).statusCode()).isEqualTo(204); login(a.email, password); }
    }
    @Test void passwordsKeepSpacesAndUnicodeWithoutNormalization() throws Exception {
        var original = "  Mật khẩu cũ  "; var replacement = "  Mật khẩu mới  "; var a = account(original);
        error(change(a, Map.of("currentPassword", original.strip(), "newPassword", replacement)), 400, "CURRENT_PASSWORD_INCORRECT");
        assertThat(change(a, Map.of("currentPassword", original, "newPassword", replacement)).statusCode()).isEqualTo(204);
        login(a.email, replacement); error(send("POST", "/api/v1/auth/login", null, Map.of("email", a.email, "password", replacement.strip())), 401, "INVALID_CREDENTIALS");
    }
    @Test void bearerIsRequiredAndUnsupportedRoutesCannotChangePasswords() throws Exception {
        var a = account(); var before = hash(a);
        error(send("PUT", ROOT, null, input()), 401, "AUTHENTICATION_REQUIRED"); error(send("PUT", ROOT, "broken", input()), 401, "INVALID_ACCESS_TOKEN");
        for (String method : List.of("GET", "POST", "PATCH", "DELETE")) error(send(method, ROOT, a.token, input()), 403, "ACCESS_DENIED");
        error(send("PUT", "/api/v1/users/" + a.id + "/password", a.token, input()), 403, "ACCESS_DENIED"); unchanged(a, before, 1);
    }
    @Test void ownerComesFromBearerAndExtraFieldsCannotChangeProtectedData() throws Exception {
        var a = account(); var b = account(); var bHash = hash(b); var body = input();
        body.put("userId", b.id); body.put("id", b.id); body.put("email", b.email); body.put("passwordHash", "BAD"); body.put("timeZone", "UTC"); body.put("fullName", "Injected"); body.put("version", -1);
        assertThat(send("PUT", ROOT + "?userId=" + b.id, a.token, body).statusCode()).isEqualTo(204);
        unchanged(b, bHash, 1); assertThat(jdbc.queryForObject("SELECT full_name FROM app_users WHERE id=?", String.class, a.id)).isEqualTo("Sinh viên thử");
        assertThat(jdbc.queryForObject("SELECT email FROM app_users WHERE id=?", String.class, a.id)).isEqualTo(a.email); login(a.email, NEW);
    }
    Map<?, ?> browserPair(Account a) throws Exception {
        var proofResponse = client.send(request("/api/v1/auth/csrf").header("Origin", "http://localhost:8092").GET().build(), HttpResponse.BodyHandlers.ofString());
        var proof = data(proofResponse); String csrf = proofResponse.headers().allValues("Set-Cookie").stream().filter(v -> v.startsWith("FOCUS_XSRF=")).findFirst().orElseThrow().split(";", 2)[0];
        var login = client.send(request("/api/v1/auth/login").header("Origin", "http://localhost:8092").header("X-Auth-Transport", "cookie").header("Cookie", csrf)
                .header("X-XSRF-TOKEN", proof.get("token").toString()).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(Map.of("email", a.email, "password", OLD)))).build(), HttpResponse.BodyHandlers.ofString());
        var result = new HashMap<String, Object>(); data(login).forEach((k,v) -> result.put(k.toString(),v));
        result.put("cookie", login.headers().allValues("Set-Cookie").stream().filter(v -> v.startsWith("FOCUS_REFRESH=")).findFirst().orElseThrow().split(";",2)[0]); return result;
    }
    @Test void cookieAloneCannotAuthenticateAndForeignCookieCannotOverrideBearer() throws Exception {
        var a = account(); var b = account(); var cookie = browserPair(b); var bHash = hash(b);
        var base = request(ROOT).header("Cookie", cookie.get("cookie").toString()).header("Content-Type", "application/json");
        error(client.send(base.PUT(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(input()))).build(), HttpResponse.BodyHandlers.ofString()), 401, "AUTHENTICATION_REQUIRED");
        assertThat(client.send(base.header("Authorization", "Bearer " + a.token).PUT(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(input()))).build(), HttpResponse.BodyHandlers.ofString()).statusCode()).isEqualTo(204);
        unchanged(b, bHash, 2); assertThat(send("GET", "/api/v1/users/me", cookie.get("accessToken").toString(), null).statusCode()).isEqualTo(200);
    }
    @Test void malformedBodyAndContentTypeNeverWrite() throws Exception {
        var a = account(); var before = hash(a);
        for (String raw : List.of("{", "[]", "null", "")) {
            var r = client.send(request(ROOT).header("Authorization", "Bearer " + a.token).header("Content-Type", "application/json").PUT(HttpRequest.BodyPublishers.ofString(raw)).build(), HttpResponse.BodyHandlers.ofString()); error(r, 400, "INVALID_REQUEST");
        }
        var r = client.send(request(ROOT).header("Authorization", "Bearer " + a.token).header("Content-Type", "text/plain").PUT(HttpRequest.BodyPublishers.ofString("hello")).build(), HttpResponse.BodyHandlers.ofString()); error(r, 415, "UNSUPPORTED_MEDIA_TYPE"); unchanged(a, before, 1);
    }
    @Test void replayOfSuccessfulChangeFailsWithRevokedTokenWithoutSecondHashWrite() throws Exception {
        var a = account(); assertThat(change(a, input()).statusCode()).isEqualTo(204); var committed = hash(a);
        error(change(a, input()), 401, "INVALID_ACCESS_TOKEN"); assertThat(hash(a)).isEqualTo(committed); login(a.email, NEW);
    }
    @Test void failureDuringRevocationRollsBackPasswordAndAllSessions() throws Exception {
        var a = account(); login(a.email, OLD); var before = hash(a); var version = jdbc.queryForObject("SELECT version FROM app_users WHERE id=?", Long.class, a.id);
        jdbc.execute("ALTER TABLE refresh_sessions ADD CONSTRAINT qa_password_rollback CHECK (user_id <> '" + a.id + "'::uuid OR revocation_reason IS DISTINCT FROM 'PASSWORD_CHANGED') NOT VALID");
        try { error(change(a, input()), 409, "DATA_CONFLICT"); unchanged(a, before, 2); assertThat(jdbc.queryForObject("SELECT version FROM app_users WHERE id=?", Long.class, a.id)).isEqualTo(version); }
        finally { jdbc.execute("ALTER TABLE refresh_sessions DROP CONSTRAINT qa_password_rollback"); }
        assertThat(send("GET", "/api/v1/users/me", a.token, null).statusCode()).isEqualTo(200); login(a.email, OLD);
    }
    @Test void concurrentChangesHaveOneWinnerAndCannotOverwriteUsingAnAlreadyRevokedSession() throws Exception {
        var a = account(); var second = login(a.email, OLD); var gate = new CountDownLatch(1);
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            var left = pool.submit(() -> { gate.await(); return change(a, input()); });
            var right = pool.submit(() -> { gate.await(); return send("PUT", ROOT, second.get("accessToken").toString(), Map.of("currentPassword", OLD, "newPassword", "OtherPassword!9")); }); gate.countDown();
            assertThat(List.of(left.get(30, TimeUnit.SECONDS).statusCode(), right.get(30, TimeUnit.SECONDS).statusCode())).containsExactlyInAnyOrder(204, 401);
            assertThat(active(a)).isZero(); assertThat(encoder.matches(NEW, hash(a)) || encoder.matches("OtherPassword!9", hash(a))).isTrue();
        }
    }
    @Test void waitingOldPasswordLoginChecksCommittedHashAfterTheOwnerLock() throws Exception {
        var a = account();
        try (var c = DriverManager.getConnection(URL, USER, PASSWORD)) {
            c.setAutoCommit(false); int holder;
            try (var s = c.createStatement(); var r = s.executeQuery("SELECT pg_backend_pid()")) { r.next(); holder = r.getInt(1); }
            try (var s = c.prepareStatement("SELECT id FROM " + SCHEMA + ".app_users WHERE id=? FOR UPDATE")) { s.setObject(1,a.id); s.executeQuery().close(); }
            try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
                var login = pool.submit(() -> send("POST", "/api/v1/auth/login", null, Map.of("email", a.email, "password", OLD)));
                waitForLock(holder);
                try (var s = c.prepareStatement("UPDATE " + SCHEMA + ".app_users SET password_hash=?,version=version+1 WHERE id=?")) { s.setString(1,encoder.encode(NEW)); s.setObject(2,a.id); s.executeUpdate(); }
                c.commit(); error(login.get(30, TimeUnit.SECONDS), 401, "INVALID_CREDENTIALS"); assertThat(active(a)).isEqualTo(1);
            } finally { c.rollback(); }
        }
        login(a.email, NEW);
    }
    @Test void waitingChangeRechecksSessionRevocationAfterTheOwnerLock() throws Exception {
        var a = account(); var before = hash(a);
        try (var c = DriverManager.getConnection(URL, USER, PASSWORD)) {
            c.setAutoCommit(false); int holder;
            try (var s = c.createStatement(); var r = s.executeQuery("SELECT pg_backend_pid()")) { r.next(); holder = r.getInt(1); }
            try (var s = c.prepareStatement("SELECT id FROM " + SCHEMA + ".app_users WHERE id=? FOR UPDATE")) { s.setObject(1,a.id); s.executeQuery().close(); }
            try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
                var change = pool.submit(() -> change(a, input())); waitForLock(holder);
                try (var s = c.prepareStatement("UPDATE " + SCHEMA + ".refresh_sessions SET revoked_at=now(),revocation_reason='LOGOUT',version=version+1 WHERE user_id=?")) { s.setObject(1,a.id); s.executeUpdate(); }
                c.commit(); error(change.get(30, TimeUnit.SECONDS), 401, "INVALID_ACCESS_TOKEN"); assertThat(hash(a)).isEqualTo(before);
            } finally { c.rollback(); }
        }
    }
    void waitForLock(int holder) throws Exception {
        long until = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
        while (System.nanoTime() < until) { if (jdbc.queryForObject("SELECT count(*) FROM pg_stat_activity WHERE ?=ANY(pg_blocking_pids(pid))", Integer.class, holder) > 0) return; Thread.sleep(20); }
        fail("Request did not wait on owner lock");
    }
    @Test void refreshRacingWithChangeCannotKeepAnActivePreChangeSession() throws Exception {
        var a = account(); var gate = new CountDownLatch(1);
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            var refresh = pool.submit(() -> { gate.await(); return send("POST", "/api/v1/auth/refresh", null, Map.of("refreshToken", a.refresh)); });
            var change = pool.submit(() -> { gate.await(); return change(a,input()); }); gate.countDown();
            assertThat(change.get(30, TimeUnit.SECONDS).statusCode()).isEqualTo(204); var r = refresh.get(30, TimeUnit.SECONDS);
            if (r.statusCode() == 200) { var pair = data(r); error(send("GET", "/api/v1/users/me", pair.get("accessToken").toString(), null),401,"INVALID_ACCESS_TOKEN"); error(send("POST", "/api/v1/auth/refresh",null,Map.of("refreshToken",pair.get("refreshToken"))),401,"INVALID_REFRESH_TOKEN"); }
            else error(r,401,"INVALID_REFRESH_TOKEN"); assertThat(active(a)).isZero();
        }
    }
    @Test void requestDiagnosticTextRedactsBothPasswords() { assertThat(new ChangePasswordRequest(OLD,NEW).toString()).doesNotContain(OLD,NEW); }

    @Test @EnabledOnOs(OS.WINDOWS) void powershell51ChangesPasswordWithoutLeakingSecrets() throws Exception {
        var a = account();
        String command = "[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); function Read-Host { param([string]$Prompt,[switch]$AsSecureString); if(!$AsSecureString){$env:PASSWORD_QA_EMAIL}elseif($Prompt -like '*hiện tại*'){ConvertTo-SecureString $env:PASSWORD_QA_OLD -AsPlainText -Force}else{ConvertTo-SecureString $env:PASSWORD_QA_NEW -AsPlainText -Force} }; & './scripts/Try-PasswordChange.ps1' -BaseUrl 'http://127.0.0.1:" + port + "'";
        var b = new ProcessBuilder(Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","powershell.exe").toString(),"-NoProfile","-Command",command).redirectErrorStream(true);
        b.environment().keySet().removeIf(n -> n.equalsIgnoreCase("PSModulePath")); b.environment().put("PSModulePath",Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","Modules").toString());
        b.environment().put("PASSWORD_QA_EMAIL",a.email); b.environment().put("PASSWORD_QA_OLD",OLD); b.environment().put("PASSWORD_QA_NEW",NEW); var process = b.start();
        try { assertThat(process.waitFor(40,TimeUnit.SECONDS)).isTrue(); String output = new String(process.getInputStream().readAllBytes(),StandardCharsets.UTF_8); assertThat(process.exitValue()).as(output).isZero(); assertThat(output).contains("Đã đổi mật khẩu").doesNotContain(OLD,NEW,"accessToken","refreshToken"); }
        finally { if(process.isAlive()) process.destroyForcibly(); }
        assertThat(active(a)).isZero(); login(a.email,NEW);
    }
}
