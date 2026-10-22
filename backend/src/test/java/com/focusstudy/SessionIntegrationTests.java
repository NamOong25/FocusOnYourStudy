package com.focusstudy;

import static org.assertj.core.api.Assertions.*;

import com.focusstudy.auth.*;
import com.focusstudy.auth.session.*;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.time.*;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DirtiesContext
class SessionIntegrationTests {
    private static final String SCHEMA = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
    private static final String URL = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Run Test-Local.ps1");
    private static final String USER = System.getenv("TEST_DB_USER"), PASSWORD = System.getenv("TEST_DB_PASSWORD");
    private static final String SECRET = "SessionTest123!", ORIGIN = "http://localhost:8092";
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired JwtDecoder decoder;
    @Autowired JwtEncoder encoder;
    @Autowired JwtProperties jwt;
    private final HttpClient client = HttpClient.newHttpClient();

    @DynamicPropertySource static void configure(DynamicPropertyRegistry registry) {
        TestJwtResources.configure(registry);
        registry.add("spring.datasource.url", () -> URL + (URL.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA);
        registry.add("spring.datasource.username", () -> USER);
        registry.add("spring.datasource.password", () -> PASSWORD);
        registry.add("spring.flyway.default-schema", () -> SCHEMA);
        registry.add("spring.flyway.schemas", () -> SCHEMA);
        for (String route : List.of("login", "register", "refresh", "logout")) registry.add("app.auth.rate-limit." + route + "-per-minute", () -> 1000);
    }
    @AfterAll static void cleanupOnlyOwnedSchema() throws Exception {
        if (!SCHEMA.matches("backend_it_[a-f0-9]{32}")) throw new IllegalStateException("Unsafe schema");
        try (var connection = DriverManager.getConnection(URL, USER, PASSWORD); var statement = connection.createStatement()) {
            statement.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        }
    }
    HttpRequest.Builder request(String path) { return HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).timeout(Duration.ofSeconds(10)); }
    HttpResponse<String> send(HttpRequest request) throws Exception { return client.send(request, HttpResponse.BodyHandlers.ofString()); }
    HttpResponse<String> post(String path, Object body) throws Exception {
        return send(request(path).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build());
    }
    Map<?, ?> body(HttpResponse<String> response) { return json.readValue(response.body(), Map.class); }
    Map<?, ?> data(HttpResponse<String> response) { assertThat(response.statusCode()).isEqualTo(200); return (Map<?, ?>) body(response).get("data"); }
    String account() throws Exception {
        String email = "session-" + UUID.randomUUID() + "@example.test";
        assertThat(post("/api/v1/auth/register", Map.of("email", email, "fullName", "Sinh viên phiên thử", "password", SECRET, "confirmPassword", SECRET)).statusCode()).isEqualTo(201);
        return email;
    }
    Map<?, ?> login(String email) throws Exception { return data(post("/api/v1/auth/login", Map.of("email", email, "password", SECRET))); }
    Map<?, ?> login() throws Exception { return login(account()); }
    String access(Map<?, ?> pair) { return pair.get("accessToken").toString(); }
    String refresh(Map<?, ?> pair) { return pair.get("refreshToken").toString(); }
    UUID session(Map<?, ?> pair) { return UUID.fromString(decoder.decode(access(pair)).getClaimAsString("sid")); }
    HttpResponse<String> refresh(String secret) throws Exception { return post("/api/v1/auth/refresh", Map.of("refreshToken", secret)); }
    HttpResponse<String> logout(String secret) throws Exception { return post("/api/v1/auth/logout", Map.of("refreshToken", secret)); }
    HttpResponse<String> me(String token) throws Exception { return send(request("/api/v1/users/me").header("Authorization", "Bearer " + token).GET().build()); }
    void error(HttpResponse<String> response, int status, String code) {
        assertThat(response.statusCode()).isEqualTo(status); assertThat(body(response).get("code")).isEqualTo(code);
    }
    String signed(Map<?, ?> pair, String user, Object sid, Instant expiry) {
        var claims = JwtClaimsSet.builder().issuer(jwt.issuer()).audience(List.of(jwt.audience()))
                .subject(user).issuedAt(Instant.now().minusSeconds(600)).notBefore(Instant.now().minusSeconds(600))
                .expiresAt(expiry).claim("token_use", "access");
        if (sid != null) claims.claim("sid", sid);
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(SignatureAlgorithm.RS256).build(), claims.build())).getTokenValue();
    }

    @Test void refreshTokensAreRandomHashedAndHaveIdleAndAbsoluteExpiries() throws Exception {
        var a = login(); var b = login();
        assertThat(refresh(a)).matches("[A-Za-z0-9_-]{43}").isNotEqualTo(refresh(b));
        assertThat(refresh(a)).doesNotContain(".");
        UUID session = session(a);
        String hash = jdbc.queryForObject("SELECT token_hash FROM refresh_tokens WHERE session_id=?", String.class, session);
        assertThat(hash).isEqualTo(RefreshSecrets.hash(refresh(a))).isNotEqualTo(refresh(a));
        assertThat(jdbc.queryForObject("SELECT transport FROM refresh_sessions WHERE id=?", String.class, session)).isEqualTo("BODY");
        assertThat(Duration.between(Instant.now(), Instant.parse(a.get("refreshExpiresAt").toString())).toDays()).isBetween(6L, 7L);
        assertThat(Duration.between(Instant.now(), Instant.parse(a.get("sessionExpiresAt").toString())).toDays()).isBetween(29L, 30L);
    }

    @Test void expiredAccessCanBeReplacedWithoutPasswordAndWithoutExtendingAbsoluteSession() throws Exception {
        var old = login(); var oldJwt = decoder.decode(access(old));
        String expiredAccess = signed(old, oldJwt.getSubject(), oldJwt.getClaimAsString("sid"), Instant.now().minusSeconds(120));
        assertThat(me(expiredAccess).statusCode()).isEqualTo(401);
        var response = refresh(refresh(old)); var next = data(response);
        assertThat(access(next)).isNotEqualTo(access(old)); assertThat(refresh(next)).isNotEqualTo(refresh(old));
        assertThat(next.get("user")).isEqualTo(old.get("user"));
        assertThat(next.get("sessionExpiresAt")).isEqualTo(old.get("sessionExpiresAt"));
        assertThat(session(next)).isEqualTo(session(old));
        assertThat(me(access(next)).statusCode()).isEqualTo(200);
        assertThat(me(access(old)).statusCode()).isEqualTo(200); // rotation alone doesn't log out the session
        assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
        assertThat(response.headers().allValues("Set-Cookie")).isEmpty();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_tokens WHERE session_id=? AND consumed_at IS NOT NULL", Integer.class, session(old))).isEqualTo(1);
    }

    @Test void replayCommitsRevocationAndRejectsTheWholeFamilyIncludingAccessTokens() throws Exception {
        var old = login(); var next = data(refresh(refresh(old)));
        var replay = refresh(refresh(old)); error(replay, 401, "REFRESH_TOKEN_REUSED");
        assertThat(replay.body()).doesNotContain(refresh(old), refresh(next), access(old), access(next));
        assertThat(jdbc.queryForObject("SELECT revocation_reason FROM refresh_sessions WHERE id=?", String.class, session(old))).isEqualTo("REPLAY");
        error(refresh(refresh(next)), 401, "INVALID_REFRESH_TOKEN");
        error(me(access(old)), 401, "INVALID_ACCESS_TOKEN"); error(me(access(next)), 401, "INVALID_ACCESS_TOKEN");
    }

    @Test void concurrentRefreshHasOneWinnerAndReplayRevokesWinnerToo() throws Exception {
        var pair = login(); String payload = json.writeValueAsString(Map.of("refreshToken", refresh(pair)));
        var request = request("/api/v1/auth/refresh").header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(payload)).build();
        var a = client.sendAsync(request, HttpResponse.BodyHandlers.ofString());
        var b = client.sendAsync(request, HttpResponse.BodyHandlers.ofString());
        CompletableFuture.allOf(a, b).join();
        assertThat(List.of(a.join().statusCode(), b.join().statusCode())).containsExactlyInAnyOrder(200, 401);
        var winner = data(a.join().statusCode() == 200 ? a.join() : b.join());
        assertThat(refresh(refresh(winner)).statusCode()).isEqualTo(401);
        assertThat(me(access(winner)).statusCode()).isEqualTo(401);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_tokens WHERE session_id=?", Integer.class, session(pair))).isEqualTo(2);
    }

    @Test void logoutRevokesOnlyThisSessionAndIsIdempotentEvenWithAnOldRefreshToken() throws Exception {
        String email = account(); var first = login(email); var other = login(email); var next = data(refresh(refresh(first)));
        assertThat(logout(refresh(first)).statusCode()).isEqualTo(204);
        assertThat(logout(refresh(first)).statusCode()).isEqualTo(204);
        assertThat(me(access(first)).statusCode()).isEqualTo(401); assertThat(me(access(next)).statusCode()).isEqualTo(401);
        assertThat(refresh(refresh(next)).statusCode()).isEqualTo(401);
        assertThat(me(access(other)).statusCode()).isEqualTo(200);
        assertThat(refresh(refresh(other)).statusCode()).isEqualTo(200);
    }

    @Test void fakeOrMissingTokensCannotRevokeAnotherSessionAndQueryStringsAreIgnored() throws Exception {
        var pair = login(); String unknown = RefreshSecrets.generate();
        error(refresh(unknown), 401, "INVALID_REFRESH_TOKEN");
        error(post("/api/v1/auth/refresh", Map.of()), 401, "INVALID_REFRESH_TOKEN");
        error(post("/api/v1/auth/refresh?refreshToken=" + refresh(pair), Map.of()), 401, "INVALID_REFRESH_TOKEN");
        assertThat(post("/api/v1/auth/refresh", Map.of("refreshToken", "short")).statusCode()).isEqualTo(400);
        assertThat(logout(unknown).statusCode()).isEqualTo(204);
        assertThat(post("/api/v1/auth/logout", Map.of()).statusCode()).isEqualTo(204);
        assertThat(me(access(pair)).statusCode()).isEqualTo(200);
        assertThat(me(refresh(pair)).statusCode()).isEqualTo(401);
    }

    @Test void refreshTokenExpiryRevokesAccessAndPersistsAnExpiredSession() throws Exception {
        var pair = login();
        jdbc.update("UPDATE refresh_tokens SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE token_hash=?", RefreshSecrets.hash(refresh(pair)));
        error(refresh(refresh(pair)), 401, "SESSION_EXPIRED");
        assertThat(me(access(pair)).statusCode()).isEqualTo(401);
        assertThat(jdbc.queryForObject("SELECT revocation_reason FROM refresh_sessions WHERE id=?", String.class, session(pair))).isEqualTo("EXPIRED");
    }

    @Test void absoluteExpiryRejectsBothTokenTypesAndCannotBeExtended() throws Exception {
        var pair = login();
        jdbc.update("UPDATE refresh_sessions SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE id=?", session(pair));
        assertThat(me(access(pair)).statusCode()).isEqualTo(401);
        error(refresh(refresh(pair)), 401, "SESSION_EXPIRED");
    }

    @Test void databaseRequiresRevocationTimeAndReasonTogether() throws Exception {
        var pair = login(); UUID id = session(pair);
        assertThatThrownBy(() -> jdbc.update("UPDATE refresh_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE id=?", id))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update("UPDATE refresh_sessions SET revocation_reason='LOGOUT' WHERE id=?", id))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThat(me(access(pair)).statusCode()).isEqualTo(200);
    }

    @Test void lastRotationIsCappedAtTheAbsoluteSessionDeadline() throws Exception {
        var pair = login();
        jdbc.update("UPDATE refresh_sessions SET expires_at = CURRENT_TIMESTAMP + INTERVAL '1 hour' WHERE id=?", session(pair));
        var next = data(refresh(refresh(pair)));
        assertThat(next.get("refreshExpiresAt")).isEqualTo(next.get("sessionExpiresAt"));
        assertThat(Duration.between(Instant.now(), Instant.parse(next.get("refreshExpiresAt").toString()))).isLessThan(Duration.ofHours(1));
    }

    @Test void signedAccessMustReferenceItsOwnActiveSessionAndOld2aTokensAreRejected() throws Exception {
        var a = login(); var b = login(); String userA = decoder.decode(access(a)).getSubject();
        for (Object sid : Arrays.asList(session(b).toString(), UUID.randomUUID().toString(), null, "bad-id", 123))
            assertThat(me(signed(a, userA, sid, Instant.now().plusSeconds(900))).statusCode()).as("sid=%s", sid).isEqualTo(401);
        assertThat(me(access(a)).statusCode()).isEqualTo(200);
        assertThat(me(access(b)).statusCode()).isEqualTo(200);
    }

    record BrowserProof(String cookie, String csrf) { }
    BrowserProof browserProof() throws Exception {
        var response = send(request("/api/v1/auth/csrf").header("Origin", ORIGIN).GET().build());
        assertThat(response.headers().firstValue("Access-Control-Allow-Credentials")).contains("true");
        String cookie = response.headers().allValues("Set-Cookie").stream().filter(value -> value.startsWith("FOCUS_XSRF=")).findFirst().orElseThrow();
        assertThat(cookie).contains("HttpOnly", "SameSite=Strict", "Path=/api/v1/auth");
        assertThat(cookie).doesNotContain("Secure");
        return new BrowserProof(cookie.split(";", 2)[0], data(response).get("token").toString());
    }
    HttpResponse<String> browserPost(String path, Object payload, BrowserProof proof, String refreshCookie) throws Exception {
        var request = request(path).header("Origin", ORIGIN).header("X-Auth-Transport", "cookie")
                .header("Content-Type", "application/json").header("X-XSRF-TOKEN", proof.csrf())
                .header("Cookie", proof.cookie() + (refreshCookie == null ? "" : "; " + refreshCookie));
        return send(request.POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload))).build());
    }
    String responseCookie(HttpResponse<String> response) {
        return response.headers().allValues("Set-Cookie").stream().filter(value -> value.startsWith("FOCUS_REFRESH=")).findFirst().orElseThrow();
    }

    @Test void browserUsesHttpOnlyRefreshCookieCsrfAndRotationWithoutLeakingRefreshInJson() throws Exception {
        String email = account(); var proof = browserProof();
        var login = browserPost("/api/v1/auth/login", Map.of("email", email, "password", SECRET), proof, null);
        assertThat(data(login).containsKey("refreshToken")).isFalse();
        String first = responseCookie(login);
        assertThat(first).contains("HttpOnly", "SameSite=Strict", "Path=/api/v1/auth", "Max-Age=");
        assertThat(first).doesNotContain("Domain=", "Secure");
        assertThat(login.body()).doesNotContain(first.split(";", 2)[0].substring("FOCUS_REFRESH=".length()));
        var refreshed = browserPost("/api/v1/auth/refresh", Map.of(), proof, first.split(";", 2)[0]);
        assertThat(data(refreshed).containsKey("refreshToken")).isFalse();
        String next = responseCookie(refreshed); assertThat(next).isNotEqualTo(first);
        var logout = browserPost("/api/v1/auth/logout", Map.of(), proof, next.split(";", 2)[0]);
        assertThat(logout.statusCode()).isEqualTo(204); assertThat(responseCookie(logout)).contains("Max-Age=0", "Path=/api/v1/auth");
        assertThat(me(access(data(refreshed))).statusCode()).isEqualTo(401);
        var invalid = browserPost("/api/v1/auth/refresh", Map.of(), proof, next.split(";", 2)[0]);
        assertThat(invalid.statusCode()).isEqualTo(401); assertThat(responseCookie(invalid)).contains("Max-Age=0");
    }

    @Test void cookieLoginRefreshLogoutRequireCsrfAndValidOriginAndCannotDowngradeToBody() throws Exception {
        String email = account(); var proof = browserProof(); String credentials = json.writeValueAsString(Map.of("email", email, "password", SECRET));
        var noCsrf = send(request("/api/v1/auth/login").header("Origin", ORIGIN).header("X-Auth-Transport", "cookie")
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(credentials)).build());
        error(noCsrf, 403, "CSRF_INVALID");
        var wrongCsrf = send(request("/api/v1/auth/login").header("Origin", ORIGIN).header("X-Auth-Transport", "cookie")
                .header("Cookie", proof.cookie()).header("X-XSRF-TOKEN", "forged-token").header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(credentials)).build());
        error(wrongCsrf, 403, "CSRF_INVALID");
        var bodyMode = send(request("/api/v1/auth/login").header("Origin", ORIGIN).header("X-Auth-Transport", "body")
                .header("Cookie", proof.cookie()).header("X-XSRF-TOKEN", proof.csrf()).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(credentials)).build());
        error(bodyMode, 403, "COOKIE_TRANSPORT_REQUIRED");
        var login = browserPost("/api/v1/auth/login", Map.of("email", email, "password", SECRET), proof, null);
        String cookie = responseCookie(login).split(";", 2)[0];
        for (String path : List.of("/api/v1/auth/refresh", "/api/v1/auth/logout")) {
            error(send(request(path).header("Cookie", cookie).header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString("{}")).build()), 403, "CSRF_INVALID");
            assertThat(send(request(path).header("Origin", "https://untrusted.example").header("X-Auth-Transport", "cookie")
                    .header("Cookie", proof.cookie() + "; " + cookie).header("X-XSRF-TOKEN", proof.csrf()).header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString("{}")).build()).statusCode()).isEqualTo(403);
        }
        assertThat(me(access(data(login))).statusCode()).isEqualTo(200);
        var noOrigin = send(request("/api/v1/auth/refresh").header("X-Auth-Transport", "cookie")
                .header("Cookie", proof.cookie() + "; " + cookie).header("X-XSRF-TOKEN", proof.csrf()).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{}")).build());
        error(noOrigin, 403, "AUTH_ORIGIN_REJECTED");
    }

    @Test void refreshTransportIsBoundToLoginAndMixedCredentialsAreRejected() throws Exception {
        var nativePair = login(); var proof = browserProof();
        String fakeCookie = "FOCUS_REFRESH=" + refresh(nativePair);
        error(browserPost("/api/v1/auth/refresh", Map.of(), proof, fakeCookie), 401, "INVALID_REFRESH_TOKEN");
        assertThat(me(access(nativePair)).statusCode()).isEqualTo(200);
        error(browserPost("/api/v1/auth/refresh", Map.of("refreshToken", refresh(nativePair)), proof, fakeCookie), 400, "AUTH_TRANSPORT_INVALID");
        String email = account();
        var webPair = browserPost("/api/v1/auth/login", Map.of("email", email, "password", SECRET), proof, null);
        String webSecret = responseCookie(webPair).split(";", 2)[0].substring("FOCUS_REFRESH=".length());
        error(refresh(webSecret), 401, "INVALID_REFRESH_TOKEN");
        assertThat(me(access(data(webPair))).statusCode()).isEqualTo(200);
    }

    @Test @EnabledOnOs(OS.WINDOWS)
    void powershell51GuideExercisesRefreshLogoutAndReplayAgainstTheRealApi() throws Exception {
        String email = account();
        String powershell = Path.of(System.getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "powershell.exe").toString();
        for (boolean replay : List.of(false, true)) {
            String script = "[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false); "
                    + "function Read-Host { param([string]$Prompt, [switch]$AsSecureString) "
                    + "if ($AsSecureString) { return (ConvertTo-SecureString $env:SESSION_TEST_PASSWORD -AsPlainText -Force) }; return $env:SESSION_TEST_EMAIL }; "
                    + "& './scripts/Try-Session.ps1' -BaseUrl 'http://127.0.0.1:" + port + "'" + (replay ? " -SimulateReplay" : "");
            var builder = new ProcessBuilder(powershell, "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script).redirectErrorStream(true);
            // Maven/cmd can uppercase environment keys. Remove every casing of PowerShell 7's
            // module path, then give this child only Windows PowerShell's built-in modules.
            builder.environment().keySet().removeIf(name -> name.equalsIgnoreCase("PSModulePath"));
            builder.environment().put("PSModulePath", Path.of(System.getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "Modules").toString());
            builder.environment().put("SESSION_TEST_EMAIL", email); builder.environment().put("SESSION_TEST_PASSWORD", SECRET);
            var process = builder.start();
            try {
                assertThat(process.waitFor(40, TimeUnit.SECONDS)).isTrue();
                String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                assertThat(process.exitValue()).withFailMessage("Script failed: %s", output).isZero();
                assertThat(output).contains("[PASS] 1.", "[PASS] 2.", "[PASS] 3.", "[PASS] 4.").doesNotContain(SECRET, "eyJhbGci");
            } finally { if (process.isAlive()) process.destroyForcibly(); }
        }
    }
}
