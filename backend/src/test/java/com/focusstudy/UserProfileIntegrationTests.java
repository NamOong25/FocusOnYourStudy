package com.focusstudy;

import static org.assertj.core.api.Assertions.*;

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
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DirtiesContext
class UserProfileIntegrationTests {
    static final String SCHEMA = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
    static final String URL = Objects.requireNonNull(System.getenv("TEST_DB_URL")), USER = System.getenv("TEST_DB_USER"), PASSWORD = System.getenv("TEST_DB_PASSWORD");
    static final String SECRET = "Profile9a1!Test", ROOT = "/api/v1/users/me", ORIGIN = "http://localhost:8092";
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
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
    HttpRequest.Builder request(String path) { return HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).timeout(Duration.ofSeconds(15)); }
    HttpResponse<String> send(String method, String path, String token, Object body) throws Exception {
        var b = request(path); if (token != null) b.header("Authorization", "Bearer " + token);
        if (body != null) b.header("Content-Type", "application/json");
        return client.send(b.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(), HttpResponse.BodyHandlers.ofString());
    }
    Map<?, ?> data(HttpResponse<String> r) { assertThat(r.statusCode()).as(r.body()).isIn(200, 201); return (Map<?, ?>) json.readValue(r.body(), Map.class).get("data"); }
    void error(HttpResponse<String> r, int status, String code) {
        assertThat(r.statusCode()).as(r.body()).isEqualTo(status); assertThat(json.readValue(r.body(), Map.class).get("code")).isEqualTo(code);
        assertThat(r.body()).doesNotContain(SECRET, "password_hash", "org.hibernate", "UPDATE app_users", "accessToken", "refreshToken");
    }
    Account account() throws Exception {
        String email = "profile9a1-" + UUID.randomUUID() + "@example.test";
        var user = data(send("POST", "/api/v1/auth/register", null, Map.of("email", email, "password", SECRET, "confirmPassword", SECRET, "fullName", "Tên ban đầu", "school", "Trường cũ", "major", "Ngành cũ")));
        var pair = data(send("POST", "/api/v1/auth/login", null, Map.of("email", email, "password", SECRET)));
        return new Account(UUID.fromString(user.get("id").toString()), email, pair.get("accessToken").toString(), pair.get("refreshToken").toString());
    }
    Map<?, ?> profile(Account a) throws Exception { return data(send("GET", ROOT, a.token, null)); }
    long version(Map<?, ?> profile) { return ((Number) profile.get("version")).longValue(); }
    Map<String, Object> input(Account a) throws Exception { return new HashMap<>(Map.of("fullName", "Nguyễn Nhật Nam", "school", "Đại học Công nghiệp TP.HCM", "major", "Kỹ thuật phần mềm", "version", version(profile(a)))); }
    HttpResponse<String> put(Account a, Object body) throws Exception { return send("PUT", ROOT, a.token, body); }

    @Test void updatesUnicodeTrimmedFieldsAndReturnsCommittedVersionWithoutSecrets() throws Exception {
        var a = account(); var before = profile(a); var body = input(a); body.put("fullName", "  Nguyễn Nhật Nam  "); body.put("school", "  Đại học Công nghiệp TP.HCM  ");
        var response = put(a, body); var result = data(response);
        assertThat(response.headers().firstValue("Cache-Control").orElse("")).contains("no-store");
        assertThat(response.headers().firstValue("X-Request-ID")).isPresent();
        assertThat(result.get("fullName")).isEqualTo("Nguyễn Nhật Nam"); assertThat(result.get("school")).isEqualTo("Đại học Công nghiệp TP.HCM");
        assertThat(result.get("major")).isEqualTo("Kỹ thuật phần mềm"); assertThat(version(result)).isEqualTo(version(before) + 1);
        assertThat(result.keySet().stream().map(Object::toString)).containsExactlyInAnyOrder("id", "email", "fullName", "school", "major", "timeZone", "version");
        assertThat(profile(a)).isEqualTo(result);
        assertThat(jdbc.queryForObject("SELECT full_name FROM app_users WHERE id=?", String.class, a.id)).isEqualTo("Nguyễn Nhật Nam");
        assertThat(response.body()).doesNotContain(SECRET, "passwordHash", "password_hash", "accessToken", "refreshToken");
    }
    @Test void ownerAlwaysComesFromBearerEvenWithForeignIdsInBodyOrQuery() throws Exception {
        var a = account(); var b = account(); var other = profile(b); var body = input(a);
        body.put("id", b.id.toString()); body.put("userId", b.id.toString());
        var result = data(send("PUT", ROOT + "?userId=" + b.id, a.token, body));
        assertThat(result.get("id")).isEqualTo(a.id.toString()); assertThat(profile(b)).isEqualTo(other);
        error(send("PUT", "/api/v1/users/" + b.id, a.token, body), 403, "ACCESS_DENIED");
    }
    @Test void extraIdentityPasswordTimezoneAndVersionFieldsCannotMutateProtectedColumns() throws Exception {
        var a = account(); var old = jdbc.queryForMap("SELECT email,password_hash,time_zone,created_at FROM app_users WHERE id=?", a.id); var body = input(a);
        body.put("email", "changed@example.test"); body.put("password", "DoNotUse!123"); body.put("passwordHash", "BAD"); body.put("timeZone", "UTC"); body.put("createdAt", "1900-01-01T00:00:00Z");
        data(put(a, body)); var after = jdbc.queryForMap("SELECT email,password_hash,time_zone,created_at FROM app_users WHERE id=?", a.id);
        assertThat(old.equals(after)).isTrue(); assertThat(profile(a).get("email")).isEqualTo(a.email);
        assertThat(data(send("POST", "/api/v1/auth/login", null, Map.of("email", a.email, "password", SECRET))).get("user")).isEqualTo(profile(a));
    }
    @Test void missingOrInvalidBearerCannotWrite() throws Exception {
        var a = account(); var before = profile(a); var body = input(a);
        error(send("PUT", ROOT, null, body), 401, "AUTHENTICATION_REQUIRED"); error(send("PUT", ROOT, "broken", body), 401, "INVALID_ACCESS_TOKEN");
        assertThat(profile(a)).isEqualTo(before);
    }
    String browserCookie(Account a) throws Exception {
        var proofResponse = client.send(request("/api/v1/auth/csrf").header("Origin", ORIGIN).GET().build(), HttpResponse.BodyHandlers.ofString());
        var proof = data(proofResponse); String cookie = proofResponse.headers().allValues("Set-Cookie").stream().filter(v -> v.startsWith("FOCUS_XSRF=")).findFirst().orElseThrow().split(";", 2)[0];
        var login = client.send(request("/api/v1/auth/login").header("Origin", ORIGIN).header("X-Auth-Transport", "cookie").header("Cookie", cookie)
                .header("X-XSRF-TOKEN", proof.get("token").toString()).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(Map.of("email", a.email, "password", SECRET)))).build(), HttpResponse.BodyHandlers.ofString());
        data(login); return login.headers().allValues("Set-Cookie").stream().filter(v -> v.startsWith("FOCUS_REFRESH=")).findFirst().orElseThrow().split(";", 2)[0];
    }
    @Test void aRealBrowserRefreshCookieDoesNotAuthenticateProfileWrites() throws Exception {
        var a = account(); var before = profile(a);
        var response = client.send(request(ROOT).header("Cookie", browserCookie(a)).header("Content-Type", "application/json")
                .PUT(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(input(a)))).build(), HttpResponse.BodyHandlers.ofString());
        error(response, 401, "AUTHENTICATION_REQUIRED"); assertThat(profile(a)).isEqualTo(before);
    }
    @Test void foreignBrowserCookieCannotOverrideExplicitBearerOwner() throws Exception {
        var a = account(); var b = account(); var before = profile(b);
        var response = client.send(request(ROOT).header("Cookie", browserCookie(b)).header("Authorization", "Bearer " + a.token).header("Content-Type", "application/json")
                .PUT(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(input(a)))).build(), HttpResponse.BodyHandlers.ofString());
        assertThat(data(response).get("id")).isEqualTo(a.id.toString()); assertThat(profile(b)).isEqualTo(before);
    }
    @Test void blankMissingNullAndOverlongNamesReturnFieldErrorsWithoutChangingAnyField() throws Exception {
        var a = account(); var before = profile(a);
        for (Object name : Arrays.asList(null, "", " \t\n ", "N".repeat(61))) {
            var body = input(a); body.put("fullName", name); var r = put(a, body); error(r, 400, "VALIDATION_FAILED");
            assertThat(r.body()).contains("fullName"); assertThat(profile(a)).isEqualTo(before);
        }
        var missing = input(a); missing.remove("fullName"); error(put(a, missing), 400, "VALIDATION_FAILED");
    }
    @Test void optionalFieldLengthsAreValidatedBeforeAnyWrite() throws Exception {
        var a = account(); var before = profile(a);
        for (String field : List.of("school", "major")) { var body = input(a); body.put(field, "x".repeat(101)); var r = put(a, body); error(r, 400, "VALIDATION_FAILED"); assertThat(r.body()).contains(field); }
        assertThat(profile(a)).isEqualTo(before);
    }
    @Test void nullOrOmittedOptionalFieldsClearThemInACompleteReplacement() throws Exception {
        var a = account(); var body = input(a); body.put("school", null); body.remove("major"); var p = data(put(a, body));
        assertThat(p.get("school")).isEqualTo(""); assertThat(p.get("major")).isEqualTo(""); assertThat(profile(a)).isEqualTo(p);
    }
    @Test void exactBoundariesAfterTrimmingAreAcceptedAndUnchangedDataDoesNotBumpVersion() throws Exception {
        var a = account(); var body = input(a); body.put("fullName", "  " + "N".repeat(60) + "  "); body.put("school", "S".repeat(100)); body.put("major", "M".repeat(100));
        var p = data(put(a, body)); body.put("version", version(p)); assertThat(data(put(a, body))).isEqualTo(p);
    }
    @Test void versionIsRequiredNonnegativeAndBoundedWithoutLosingCurrentData() throws Exception {
        var a = account(); var before = profile(a);
        for (Object v : Arrays.asList(null, -1, 9007199254740992L)) { var body = input(a); body.put("version", v); error(put(a, body), 400, "VALIDATION_FAILED"); }
        var missing = input(a); missing.remove("version"); error(put(a, missing), 400, "VALIDATION_FAILED");
        for (Object v : List.of(0.5, "not-a-version")) { var body = input(a); body.put("version", v); error(put(a, body), 400, "INVALID_REQUEST"); }
        assertThat(profile(a)).isEqualTo(before);
    }
    @Test void staleVersionAndRepeatAfterCommitCannotOverwriteTheConfirmedProfile() throws Exception {
        var a = account(); var old = input(a); var p = data(put(a, old));
        error(put(a, old), 409, "PROFILE_VERSION_CONFLICT"); old.put("fullName", "Nội dung cũ ghi đè"); error(put(a, old), 409, "PROFILE_VERSION_CONFLICT"); assertThat(profile(a)).isEqualTo(p);
    }
    @Test void concurrentEditsWithOneVersionProduceOneWinnerAndOneConflict() throws Exception {
        var a = account(); var first = input(a); var second = input(a); first.put("fullName", "Bản A"); second.put("fullName", "Bản B");
        var gate = new CountDownLatch(1);
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            var left = pool.submit(() -> { gate.await(); return put(a, first); }); var right = pool.submit(() -> { gate.await(); return put(a, second); }); gate.countDown();
            var responses = List.of(left.get(20, TimeUnit.SECONDS), right.get(20, TimeUnit.SECONDS)); assertThat(responses.stream().map(HttpResponse::statusCode)).containsExactlyInAnyOrder(200, 409);
            var winner = data(responses.stream().filter(r -> r.statusCode() == 200).findFirst().orElseThrow()); assertThat(profile(a)).isEqualTo(winner); assertThat(version(winner)).isEqualTo(1);
        }
    }
    @Test void latestVersionIsReadAfterWaitingOnTheSharedOwnerLock() throws Exception {
        var a = account(); var body = input(a);
        try (var c = DriverManager.getConnection(URL, USER, PASSWORD)) {
            c.setAutoCommit(false);
            int holder;
            try (var s = c.createStatement(); var r = s.executeQuery("SELECT pg_backend_pid()")) { r.next(); holder = r.getInt(1); }
            try (var lock = c.prepareStatement("SELECT id FROM " + SCHEMA + ".app_users WHERE id=? FOR UPDATE")) { lock.setObject(1, a.id); lock.executeQuery().close(); }
            try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
                var waiting = pool.submit(() -> put(a, body));
                long until = System.nanoTime() + TimeUnit.SECONDS.toNanos(5); boolean blocked = false;
                while (System.nanoTime() < until) { if (jdbc.queryForObject("SELECT count(*) FROM pg_stat_activity WHERE ?=ANY(pg_blocking_pids(pid))", Integer.class, holder) > 0) { blocked = true; break; } Thread.sleep(20); }
                assertThat(blocked).isTrue();
                try (var change = c.prepareStatement("UPDATE " + SCHEMA + ".app_users SET full_name='New committed profile',version=version+1 WHERE id=?")) { change.setObject(1, a.id); change.executeUpdate(); }
                c.commit(); error(waiting.get(15, TimeUnit.SECONDS), 409, "PROFILE_VERSION_CONFLICT");
                assertThat(profile(a).get("fullName")).isEqualTo("New committed profile");
            } finally { c.rollback(); }
        }
    }
    @Test void loginRefreshAndExistingAccessReadTheUpdatedProfileWithoutInvalidatingSessions() throws Exception {
        var a = account(); var p = data(put(a, input(a)));
        var login = data(send("POST", "/api/v1/auth/login", null, Map.of("email", a.email, "password", SECRET))); assertThat(login.get("user")).isEqualTo(p);
        var refresh = data(send("POST", "/api/v1/auth/refresh", null, Map.of("refreshToken", a.refresh))); assertThat(refresh.get("user")).isEqualTo(p); assertThat(profile(a)).isEqualTo(p);
    }
    @Test void revokedSessionsAndUnsupportedRoutesOrMethodsCannotWrite() throws Exception {
        var a = account(); var before = profile(a); var body = input(a);
        for (String method : List.of("PATCH", "POST", "DELETE")) error(send(method, ROOT, a.token, body), 403, "ACCESS_DENIED");
        assertThat(send("POST", "/api/v1/auth/logout", null, Map.of("refreshToken", a.refresh)).statusCode()).isEqualTo(204);
        error(put(a, body), 401, "INVALID_ACCESS_TOKEN"); assertThat(jdbc.queryForObject("SELECT full_name FROM app_users WHERE id=?", String.class, a.id)).isEqualTo(before.get("fullName"));
    }
    @Test void malformedBodiesAndWrongContentTypeLeaveTheProfileUntouched() throws Exception {
        var a = account(); var before = profile(a);
        for (String text : List.of("{", "[]", "null", "")) {
            var r = client.send(request(ROOT).header("Authorization", "Bearer " + a.token).header("Content-Type", "application/json").PUT(HttpRequest.BodyPublishers.ofString(text)).build(), HttpResponse.BodyHandlers.ofString()); error(r, 400, "INVALID_REQUEST");
        }
        var badType = client.send(request(ROOT).header("Authorization", "Bearer " + a.token).header("Content-Type", "text/plain").PUT(HttpRequest.BodyPublishers.ofString("hello")).build(), HttpResponse.BodyHandlers.ofString());
        error(badType, 415, "UNSUPPORTED_MEDIA_TYPE"); assertThat(profile(a)).isEqualTo(before);
    }
    String runScript(Account a, String args, int expected) throws Exception {
        String command = "[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); function Read-Host { param([string]$Prompt,[switch]$AsSecureString); if($AsSecureString){ConvertTo-SecureString $env:PROFILE_QA_PASSWORD -AsPlainText -Force}else{$env:PROFILE_QA_EMAIL} }; & './scripts/Try-Profile.ps1' -BaseUrl 'http://127.0.0.1:" + port + "' " + args;
        var b = new ProcessBuilder(Path.of(System.getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "powershell.exe").toString(), "-NoProfile", "-Command", command).redirectErrorStream(true);
        b.environment().keySet().removeIf(n -> n.equalsIgnoreCase("PSModulePath")); b.environment().put("PSModulePath", Path.of(System.getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "Modules").toString());
        b.environment().put("PROFILE_QA_EMAIL", a.email); b.environment().put("PROFILE_QA_PASSWORD", SECRET); var process = b.start();
        try { assertThat(process.waitFor(30, TimeUnit.SECONDS)).isTrue(); String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8); assertThat(process.exitValue()).as(output).isEqualTo(expected); assertThat(output).doesNotContain(SECRET, "accessToken", "refreshToken"); return output; }
        finally { if (process.isAlive()) process.destroyForcibly(); }
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershell51ReadsWritesUnicodeAndClosesOnlyItsOwnSession() throws Exception {
        var a = account(); assertThat(runScript(a, "-Mode Get", 0)).contains("Tên ban đầu");
        assertThat(runScript(a, "-Mode Update -Version 0 -FullName 'Nguyễn Nhật Nam' -School 'Đại học Công nghiệp TP.HCM' -Major 'Kỹ thuật phần mềm'", 0)).contains("Nguyễn Nhật Nam", "Đại học Công nghiệp TP.HCM", "Kỹ thuật phần mềm");
        assertThat(runScript(a, "-Mode Get", 0)).contains("Nguyễn Nhật Nam"); assertThat(profile(a).get("major")).isEqualTo("Kỹ thuật phần mềm");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL", Integer.class, a.id)).isEqualTo(1);
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershellConflictReportsFailureWithoutOverwritingOrRevokingTheOriginalSession() throws Exception {
        var a = account(); var p = data(put(a, input(a)));
        assertThat(runScript(a, "-Mode Update -Version 0 -FullName 'Do not overwrite'", 1)).contains("PROFILE_VERSION_CONFLICT"); assertThat(profile(a)).isEqualTo(p);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL", Integer.class, a.id)).isEqualTo(1);
    }
}
