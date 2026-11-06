package com.focusstudy;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.DriverManager;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DirtiesContext
class NotificationPreferencesIntegrationTests {
    private static final String SCHEMA = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
    private static final String DB_URL = Objects.requireNonNull(System.getenv("TEST_DB_URL"));
    private static final String DB_USER = System.getenv("TEST_DB_USER");
    private static final String DB_PASSWORD = System.getenv("TEST_DB_PASSWORD");
    private static final String ROOT = "/api/v1/notification-preferences";
    private static final String PASSWORD = "ReminderPreferences!QA";
    private static final Map<String, Object> DEFAULTS = Map.of(
            "assignments", true, "classes", true, "exams", true, "reminderMinutes", 15,
            "quiet", true, "quietStart", "22:00", "quietEnd", "07:00", "version", 0);

    @LocalServerPort int port;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    private final HttpClient client = HttpClient.newHttpClient();

    private record Account(String email, UUID id, String token, String refreshToken) { }

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        TestJwtResources.configure(registry);
        registry.add("spring.datasource.url", () -> DB_URL + (DB_URL.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA);
        registry.add("spring.datasource.username", () -> DB_USER);
        registry.add("spring.datasource.password", () -> DB_PASSWORD);
        registry.add("spring.flyway.default-schema", () -> SCHEMA);
        registry.add("spring.flyway.schemas", () -> SCHEMA);
        for (String route : List.of("login", "register", "logout")) {
            registry.add("app.auth.rate-limit." + route + "-per-minute", () -> 1000);
        }
    }

    @AfterAll
    static void dropOwnSchema() throws Exception {
        if (!SCHEMA.matches("backend_it_[a-f0-9]{32}")) throw new IllegalStateException("Unexpected test schema");
        try (var connection = DriverManager.getConnection(DB_URL, DB_USER, DB_PASSWORD);
             var statement = connection.createStatement()) {
            statement.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        }
    }

    @Test void readsDefaultsWithoutCreatingPreferences() throws Exception {
        var account = register();
        var response = send("GET", ROOT, account.token(), null);
        assertThat(response.headers().firstValue("Cache-Control")).hasValue("no-store");
        assertThat(data(response)).isEqualTo(json.valueToTree(DEFAULTS));
        assertThat(countRows(account)).isZero();
    }

    @Test void savesOvernightPreferencesAndReadsThemAfterLogoutAndLogin() throws Exception {
        var account = register();
        var original = data(send("GET", "/api/v1/users/me", account.token(), null));
        var input = draft(0, 30);
        input.put("assignments", false);
        input.put("classes", false);
        input.put("exams", false);
        input.put("quietStart", "23:59");
        input.put("quietEnd", "00:00");
        var saved = data(put(account, input));
        input.put("version", 1);
        assertThat(saved).isEqualTo(json.valueToTree(input));
        assertThat(countRows(account)).isEqualTo(1);
        assertThat(send("POST", "/api/v1/auth/logout", null, Map.of("refreshToken", account.refreshToken())).statusCode()).isEqualTo(204);
        problem(send("GET", ROOT, account.token(), null), 401, "INVALID_ACCESS_TOKEN");
        var again = login(account.email(), account.id());
        assertThat(data(send("GET", ROOT, again.token(), null))).isEqualTo(saved);
        assertThat(data(send("GET", "/api/v1/users/me", again.token(), null))).isEqualTo(original);

        input.put("quiet", false);
        input.put("quietEnd", "23:59");
        var paused = data(put(again, input));
        input.put("version", 2);
        assertThat(paused).isEqualTo(json.valueToTree(input));
    }

    @Test void rejectsAnonymousAndInvalidTokensAndDerivesOwnerFromBearer() throws Exception {
        var alice = register();
        var bob = register();
        var body = draft(0, 60);
        problem(send("GET", ROOT, null, null), 401, "AUTHENTICATION_REQUIRED");
        problem(send("PUT", ROOT, null, body), 401, "AUTHENTICATION_REQUIRED");
        problem(send("PUT", ROOT, "invalid", body), 401, "INVALID_ACCESS_TOKEN");
        body.put("userId", bob.id().toString());
        body.put("ownerId", bob.id().toString());
        var saved = data(send("PUT", ROOT + "?userId=" + bob.id(), alice.token(), body));
        assertThat(saved.path("reminderMinutes").intValue()).isEqualTo(60);
        assertThat(data(send("GET", ROOT, bob.token(), null))).isEqualTo(json.valueToTree(DEFAULTS));
        assertThat(countRows(alice)).isEqualTo(1);
        assertThat(countRows(bob)).isZero();
    }

    @Test void rejectsInvalidFieldsWithoutOverwritingSavedPreferences() throws Exception {
        var account = register();
        var saved = data(put(account, draft(0, 5)));
        var missing = draft(1, 15);
        missing.remove("exams");
        assertThat(problem(put(account, missing), 400, "VALIDATION_FAILED").path("errors").get(0).path("field").asString())
                .isEqualTo("exams");
        var invalidClock = draft(1, 15);
        invalidClock.put("quietStart", "24:00");
        invalidClock.put("quietEnd", "07:00:00");
        problem(put(account, invalidClock), 400, "VALIDATION_FAILED");
        problem(put(account, draft(1, 20)), 400, "INVALID_REMINDER_MINUTES");
        problem(put(account, draft(-1, 30)), 400, "VALIDATION_FAILED");
        var sameHours = draft(1, 30);
        sameHours.put("quietEnd", sameHours.get("quietStart"));
        problem(put(account, sameHours), 400, "INVALID_QUIET_HOURS");
        assertThat(data(send("GET", ROOT, account.token(), null))).isEqualTo(saved);
    }

    @Test void concurrentFirstSavesAndEditsKeepOneWinnerForEachVersion() throws Exception {
        var account = register();
        for (int version : List.of(0, 1)) {
            var start = new CountDownLatch(1);
            try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
                var first = pool.submit(() -> { start.await(); return put(account, draft(version, 5)); });
                var second = pool.submit(() -> { start.await(); return put(account, draft(version, 60)); });
                start.countDown();
                var a = first.get();
                var b = second.get();
                assertThat(List.of(a.statusCode(), b.statusCode())).containsExactlyInAnyOrder(200, 409);
                var saved = data(a.statusCode() == 200 ? a : b);
                problem(a.statusCode() == 409 ? a : b, 409, "NOTIFICATION_PREFERENCES_VERSION_CONFLICT");
                assertThat(saved.path("version").intValue()).isEqualTo(version + 1);
                assertThat(data(send("GET", ROOT, account.token(), null))).isEqualTo(saved);
            }
        }
        assertThat(countRows(account)).isEqualTo(1);
    }

    private Account register() throws Exception {
        String email = "reminder-" + UUID.randomUUID() + "@example.test";
        var user = data(send("POST", "/api/v1/auth/register", null,
                Map.of("email", email, "password", PASSWORD, "confirmPassword", PASSWORD, "fullName", "Reminder QA")));
        return login(email, UUID.fromString(user.path("id").asString()));
    }

    private Account login(String email, UUID id) throws Exception {
        var session = data(send("POST", "/api/v1/auth/login", null, Map.of("email", email, "password", PASSWORD)));
        return new Account(email, id, session.path("accessToken").asString(), session.path("refreshToken").asString());
    }

    private Map<String, Object> draft(int version, int minutes) {
        var draft = new HashMap<>(DEFAULTS);
        draft.put("version", version);
        draft.put("reminderMinutes", minutes);
        return draft;
    }

    private int countRows(Account account) {
        return jdbc.queryForObject("SELECT count(*) FROM notification_preferences WHERE user_id = ?", Integer.class, account.id());
    }

    private HttpResponse<String> put(Account account, Object input) throws Exception {
        return send("PUT", ROOT, account.token(), input);
    }

    private HttpResponse<String> send(String method, String path, String token, Object input) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).timeout(Duration.ofSeconds(15));
        if (token != null) request.header("Authorization", "Bearer " + token);
        if (input != null) request.header("Content-Type", "application/json");
        request.method(method, input == null ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(input)));
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private JsonNode data(HttpResponse<String> response) {
        assertThat(response.statusCode()).as(response.body()).isIn(200, 201);
        return json.readTree(response.body()).path("data");
    }

    private JsonNode problem(HttpResponse<String> response, int status, String code) {
        assertThat(response.statusCode()).as(response.body()).isEqualTo(status);
        var payload = json.readTree(response.body());
        assertThat(payload.path("code").asString()).isEqualTo(code);
        return payload;
    }
}
