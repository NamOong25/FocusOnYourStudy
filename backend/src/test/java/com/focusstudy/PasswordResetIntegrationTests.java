package com.focusstudy;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;

import com.focusstudy.auth.session.RefreshSecrets;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.DriverManager;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DirtiesContext
class PasswordResetIntegrationTests {
    static final String SCHEMA = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
    static final String DB = Objects.requireNonNull(System.getenv("TEST_DB_URL"));
    static final String DB_USER = System.getenv("TEST_DB_USER");
    static final String DB_PASSWORD = System.getenv("TEST_DB_PASSWORD");
    static final String ROOT = "/api/v1/auth/password-reset";
    static final String LINK = "https://focus.example.test/account/";
    static final String OLD = "Old9C1!Password";
    static final String NEW = "  Mật khẩu mới 9C!  ";
    static final Pattern TOKEN_LINK = Pattern.compile(Pattern.quote(LINK) + "#reset-token=([A-Za-z0-9_-]{43})(?=\\s|$)");

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @MockitoBean(enforceOverride = true) JavaMailSender sender;
    final HttpClient client = HttpClient.newHttpClient();
    final LinkedBlockingQueue<SimpleMailMessage> inbox = new LinkedBlockingQueue<>();

    record Account(UUID id, String email) { }

    @DynamicPropertySource static void configure(DynamicPropertyRegistry registry) {
        TestJwtResources.configure(registry);
        registry.add("spring.datasource.url", () -> DB + (DB.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA);
        registry.add("spring.datasource.username", () -> DB_USER);
        registry.add("spring.datasource.password", () -> DB_PASSWORD);
        registry.add("spring.flyway.default-schema", () -> SCHEMA);
        registry.add("spring.flyway.schemas", () -> SCHEMA);
        registry.add("spring.mail.host", () -> "localhost");
        registry.add("app.auth.password-reset.enabled", () -> true);
        registry.add("app.auth.password-reset.url", () -> LINK);
        registry.add("app.auth.password-reset.from", () -> "qa@example.test");
        for (String route : List.of("login", "register", "refresh", "logout", "password-reset-request", "password-reset-confirm")) {
            registry.add("app.auth.rate-limit." + route + "-per-minute", () -> 1000);
        }
    }

    @BeforeEach void captureMail() {
        doAnswer(invocation -> {
            inbox.add(new SimpleMailMessage(invocation.getArgument(0, SimpleMailMessage.class)));
            return null;
        }).when(sender).send(any(SimpleMailMessage.class));
    }

    @AfterAll static void cleanup() throws Exception {
        if (!SCHEMA.matches("backend_it_[a-f0-9]{32}")) throw new IllegalStateException("Unexpected test schema");
        try (var connection = DriverManager.getConnection(DB, DB_USER, DB_PASSWORD); var statement = connection.createStatement()) {
            statement.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        }
    }

    @Test void acceptsKnownAndUnknownEmailUniformlyAndStoresOnlyHash() throws Exception {
        var account = account();
        var session = login(account, OLD);
        var known = post(ROOT + "/request", Map.of("email", " " + account.email().toUpperCase(java.util.Locale.ROOT) + " "),
                Map.of("X-Forwarded-Host", "untrusted.example.test"));
        var unknown = post(ROOT + "/request", Map.of("email", "unknown@example.test"));
        assertThat(known.statusCode()).isEqualTo(202);
        assertThat(unknown.statusCode()).isEqualTo(202);
        assertThat(data(known)).isEqualTo(data(unknown));
        assertThat(known.headers().firstValue("Cache-Control")).contains("no-store");
        String token = token(receive(account));
        assertThat(known.body()).doesNotContain(token, account.email());
        assertThat(jdbc.queryForObject("SELECT token_hash FROM password_reset_tokens WHERE owner_id=?", String.class, account.id()))
                .isEqualTo(RefreshSecrets.hash(token)).isNotEqualTo(token);
        assertThat(jdbc.queryForObject("SELECT extract(epoch FROM expires_at-issued_at)::int FROM password_reset_tokens WHERE owner_id=?", Integer.class, account.id()))
                .isEqualTo(1800);
        assertThat(inbox.poll(250, TimeUnit.MILLISECONDS)).isNull();
        assertThat(get("/api/v1/users/me", access(session)).statusCode()).isEqualTo(200);
        assertThat(login(account, OLD).get("accessToken")).isNotNull();
    }

    @Test void resetRevokesOldAccessAndRefreshPreservesDataAndNotifiesOnlyOwner() throws Exception {
        var account = account();
        var other = account();
        var first = login(account, OLD);
        var second = login(account, OLD);
        var otherSession = login(other, OLD);
        var semester = data(post("/api/v1/semesters", Map.of("term", 1, "startYear", 2026, "status", "CURRENT"),
                Map.of("Authorization", "Bearer " + access(first))));
        String token = issue(account);

        var result = confirm(token, NEW);
        assertThat(result.statusCode()).isEqualTo(204);
        assertThat(result.body()).isEmpty();
        assertThat(result.headers().firstValue("Set-Cookie")).isEmpty();
        assertThat(receive(account).getText()).contains("đã được đặt lại").doesNotContain(token, NEW, OLD);
        problem(confirm(token, NEW), 400, "PASSWORD_RESET_LINK_INVALID");
        for (var session : List.of(first, second)) {
            problem(get("/api/v1/users/me", access(session)), 401, "INVALID_ACCESS_TOKEN");
            problem(post("/api/v1/auth/refresh", Map.of("refreshToken", session.get("refreshToken"))), 401, "INVALID_REFRESH_TOKEN");
        }
        problem(post("/api/v1/auth/login", loginBody(account, OLD)), 401, "INVALID_CREDENTIALS");
        problem(post("/api/v1/auth/login", loginBody(account, NEW.strip())), 401, "INVALID_CREDENTIALS");
        var fresh = login(account, NEW);
        assertThat(get("/api/v1/semesters/" + semester.get("id"), access(fresh)).statusCode()).isEqualTo(200);
        assertThat(get("/api/v1/users/me", access(otherSession)).statusCode()).isEqualTo(200);
        assertThat(login(other, OLD).get("accessToken")).isNotNull();
    }

    @Test void invalidInputsAndExpiredLinksCannotChangeCredentials() throws Exception {
        var account = account();
        String token = issue(account);
        problem(post(ROOT + "/request", Map.of("email", "broken")), 400, "VALIDATION_FAILED");
        problem(confirm("invalid", NEW), 400, "PASSWORD_RESET_LINK_INVALID");
        problem(confirm("A".repeat(43), NEW), 400, "PASSWORD_RESET_LINK_INVALID");
        problem(confirm(token, "short"), 400, "VALIDATION_FAILED");
        problem(post(ROOT + "/confirm", Map.of("token", token, "newPassword", NEW, "confirmPassword", OLD)),
                400, "PASSWORD_CONFIRMATION_MISMATCH");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM password_reset_tokens WHERE owner_id=?", Integer.class, account.id())).isEqualTo(1);
        jdbc.update("UPDATE password_reset_tokens SET issued_at=now()-interval '31 minutes', expires_at=now()-interval '1 minute' WHERE owner_id=?", account.id());
        var expired = confirm(token, NEW);
        problem(expired, 400, "PASSWORD_RESET_LINK_INVALID");
        assertThat(expired.body()).doesNotContain(token, NEW);
        assertThat(login(account, OLD).get("accessToken")).isNotNull();
    }

    @Test void coolsDownRepeatedRequestsAndReplacesOldLinkAfterCooldown() throws Exception {
        var account = account();
        String old = issue(account);
        assertThat(post(ROOT + "/request", Map.of("email", account.email())).statusCode()).isEqualTo(202);
        assertThat(inbox.poll(300, TimeUnit.MILLISECONDS)).isNull();
        jdbc.update("UPDATE password_reset_tokens SET issued_at=now()-interval '2 minutes' WHERE owner_id=?", account.id());
        String latest = issue(account);
        assertThat(latest).isNotEqualTo(old);
        problem(confirm(old, NEW), 400, "PASSWORD_RESET_LINK_INVALID");
        assertThat(confirm(latest, NEW).statusCode()).isEqualTo(204);
        receive(account);
    }

    @Test void simultaneousConfirmationsCanConsumeOneLinkOnlyOnce() throws Exception {
        var account = account();
        String token = issue(account);
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> { start.await(); return confirm(token, NEW); });
            var second = executor.submit(() -> { start.await(); return confirm(token, NEW); });
            start.countDown();
            assertThat(List.of(first.get(15, TimeUnit.SECONDS).statusCode(), second.get(15, TimeUnit.SECONDS).statusCode()))
                    .containsExactlyInAnyOrder(204, 400);
        }
        receive(account);
        assertThat(login(account, NEW).get("accessToken")).isNotNull();
    }

    @Test void changingPasswordAlsoInvalidatesOutstandingRecoveryLink() throws Exception {
        var account = account();
        var session = login(account, OLD);
        String token = issue(account);
        var change = send("PUT", "/api/v1/users/me/password", Map.of("currentPassword", OLD, "newPassword", NEW),
                Map.of("Authorization", "Bearer " + access(session)));
        assertThat(change.statusCode()).isEqualTo(204);
        problem(confirm(token, OLD), 400, "PASSWORD_RESET_LINK_INVALID");
        assertThat(login(account, NEW).get("accessToken")).isNotNull();
    }

    @Test void revocationFailureRollsBackPasswordAndTokenConsumption() throws Exception {
        var account = account();
        var session = login(account, OLD);
        String token = issue(account);
        jdbc.execute("ALTER TABLE refresh_sessions ADD CONSTRAINT reset_qa_block_revoke CHECK (user_id <> '"
                + account.id() + "' OR revocation_reason IS DISTINCT FROM 'PASSWORD_CHANGED') NOT VALID");
        try {
            problem(confirm(token, NEW), 409, "DATA_CONFLICT");
            assertThat(get("/api/v1/users/me", access(session)).statusCode()).isEqualTo(200);
            assertThat(login(account, OLD).get("accessToken")).isNotNull();
            assertThat(jdbc.queryForObject("SELECT token_hash FROM password_reset_tokens WHERE owner_id=?", String.class, account.id()))
                    .isEqualTo(RefreshSecrets.hash(token));
        } finally {
            jdbc.execute("ALTER TABLE refresh_sessions DROP CONSTRAINT reset_qa_block_revoke");
        }
        assertThat(confirm(token, NEW).statusCode()).isEqualTo(204);
        receive(account);
    }

    @Test void browserRequestsUseExistingCsrfProtectionWithoutRequiringLogin() throws Exception {
        var account = account();
        String origin = "http://localhost:8092";
        var headers = Map.of("Origin", origin);
        problem(post(ROOT + "/request", Map.of("email", account.email()), headers), 403, "CSRF_INVALID");
        problem(post(ROOT + "/confirm", resetBody("A".repeat(43), NEW), headers), 403, "CSRF_INVALID");
        var proof = send("GET", "/api/v1/auth/csrf", null, headers);
        String cookie = proof.headers().allValues("Set-Cookie").stream()
                .filter(value -> value.startsWith("FOCUS_XSRF=")).findFirst().orElseThrow().split(";", 2)[0];
        var browser = Map.of("Origin", origin, "Cookie", cookie, "X-XSRF-TOKEN", data(proof).get("token").toString());
        assertThat(post(ROOT + "/request", Map.of("email", account.email()), browser).statusCode()).isEqualTo(202);
        assertThat(post(ROOT + "/confirm", resetBody(token(receive(account)), NEW), browser).statusCode()).isEqualTo(204);
        receive(account);
    }

    private Account account() throws Exception {
        String email = "reset-" + UUID.randomUUID() + "@example.test";
        var registered = post("/api/v1/auth/register", Map.of("email", email, "password", OLD,
                "confirmPassword", OLD, "fullName", "Tài khoản thử"));
        assertThat(registered.statusCode()).isEqualTo(201);
        return new Account(UUID.fromString(data(registered).get("id").toString()), email);
    }

    private String issue(Account account) throws Exception {
        assertThat(post(ROOT + "/request", Map.of("email", account.email())).statusCode()).isEqualTo(202);
        return token(receive(account));
    }

    private SimpleMailMessage receive(Account account) throws InterruptedException {
        var mail = inbox.poll(10, TimeUnit.SECONDS);
        assertThat(mail).as("mail received by test inbox").isNotNull();
        assertThat(mail.getTo()).containsExactly(account.email());
        return mail;
    }

    private String token(SimpleMailMessage mail) {
        var match = TOKEN_LINK.matcher(mail.getText());
        assertThat(match.find()).as("message contains a token on the configured link").isTrue();
        return match.group(1);
    }

    private Map<?, ?> login(Account account, String password) throws Exception {
        var response = post("/api/v1/auth/login", loginBody(account, password));
        assertThat(response.statusCode()).isEqualTo(200);
        return data(response);
    }

    private Map<String, String> loginBody(Account account, String password) {
        return Map.of("email", account.email(), "password", password);
    }

    private String access(Map<?, ?> session) { return session.get("accessToken").toString(); }

    private Map<String, String> resetBody(String token, String password) {
        return Map.of("token", token, "newPassword", password, "confirmPassword", password);
    }

    private HttpResponse<String> confirm(String token, String password) throws Exception {
        return post(ROOT + "/confirm", resetBody(token, password));
    }

    private HttpResponse<String> get(String path, String token) throws Exception {
        return send("GET", path, null, Map.of("Authorization", "Bearer " + token));
    }

    private HttpResponse<String> post(String path, Object body) throws Exception { return post(path, body, Map.of()); }

    private HttpResponse<String> post(String path, Object body, Map<String, String> headers) throws Exception {
        return send("POST", path, body, headers);
    }

    private HttpResponse<String> send(String method, String path, Object body, Map<String, String> headers) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).timeout(Duration.ofSeconds(20));
        headers.forEach(request::header);
        if (body != null) request.header("Content-Type", "application/json");
        return client.send(request.method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(), HttpResponse.BodyHandlers.ofString());
    }

    private Map<?, ?> data(HttpResponse<String> response) { return (Map<?, ?>) json.readValue(response.body(), Map.class).get("data"); }

    private void problem(HttpResponse<String> response, int status, String code) {
        assertThat(response.statusCode()).isEqualTo(status);
        assertThat(json.readValue(response.body(), Map.class).get("code")).isEqualTo(code);
    }
}
