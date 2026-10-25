package com.focusstudy;

import static org.assertj.core.api.Assertions.*;

import java.net.URI;
import java.net.http.*;
import java.sql.DriverManager;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DirtiesContext
class FoundationIntegrationTests {
    private static final String SCHEMA = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
    private static final String URL = required("TEST_DB_URL");
    private static final String USER = required("TEST_DB_USER");
    private static final String PASSWORD = required("TEST_DB_PASSWORD");
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired Flyway flyway;
    @Autowired TransactionTemplate transactions;
    @Autowired ObjectMapper json;
    private final HttpClient client = HttpClient.newHttpClient();

    private static String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) throw new IllegalStateException("Run scripts/Test-Local.ps1 or set " + name);
        return value;
    }

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        TestJwtResources.configure(registry);
        registry.add("spring.datasource.url", () -> URL + (URL.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA);
        registry.add("spring.datasource.username", () -> USER);
        registry.add("spring.datasource.password", () -> PASSWORD);
        registry.add("spring.flyway.default-schema", () -> SCHEMA);
        registry.add("spring.flyway.schemas", () -> SCHEMA);
        registry.add("app.cors.allowed-origins", () -> "http://localhost:8092");
    }

    @AfterAll
    static void removeOnlyOwnedTestSchema() throws Exception {
        if (!SCHEMA.matches("backend_it_[a-f0-9]{32}")) throw new IllegalStateException("Unsafe test schema");
        try (var connection = DriverManager.getConnection(URL, USER, PASSWORD); var statement = connection.createStatement()) {
            statement.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        }
    }

    private HttpRequest.Builder request(String path) {
        return HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).timeout(java.time.Duration.ofSeconds(10));
    }
    private HttpResponse<String> send(HttpRequest request) throws Exception {
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }
    private Map<?, ?> body(HttpResponse<String> response) { return json.readValue(response.body(), Map.class); }
    private UUID user(String email) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO app_users(id,email,password_hash,full_name) VALUES (?,?,?,?)", id, email, "test-hash-only", "Sinh viên thử");
        return id;
    }
    private UUID semester(UUID owner, int term, String status) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO semesters(id,user_id,term,start_year,status) VALUES (?,?,?,2026,?)", id, owner, term, status);
        return id;
    }
    private void course(UUID owner, UUID semester, String code, int credits) {
        jdbc.update("INSERT INTO courses(id,user_id,semester_id,code,name,credits) VALUES (?,?,?,?,?,?)",
                UUID.randomUUID(), owner, semester, code, "Môn kiểm thử", credits);
    }

    @Test void runsOnRealPostgresAndAppliesMigrationExactlyOnce() {
        assertThat(jdbc.queryForObject("SELECT version()", String.class)).contains("PostgreSQL");
        assertThat(flyway.info().current().getVersion().toString()).isEqualTo("7");
        assertThat(flyway.migrate().migrationsExecuted).isZero();
        flyway.validate();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM information_schema.tables WHERE table_schema=? AND table_name IN ('app_users','semesters','courses','assignments','study_sessions')", Integer.class, SCHEMA)).isEqualTo(5);
    }

    @Test void healthIncludesDatabaseRequestIdAndUtcTimestamp() throws Exception {
        var response = send(request("/api/v1/health").header("X-Request-ID", "review-health-1").GET().build());
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(body(response).get("data")).isEqualTo(Map.of("status", "UP", "database", "UP"));
        Map<?, ?> meta = (Map<?, ?>) body(response).get("meta");
        assertThat(meta.get("requestId")).isEqualTo("review-health-1");
        assertThat(Instant.parse(meta.get("timestamp").toString())).isBeforeOrEqualTo(Instant.now());
        assertThat(response.headers().firstValue("X-Request-ID")).contains("review-health-1");
    }

    @Test void sanitizesUntrustedRequestIds() throws Exception {
        var response = send(request("/api/v1/health").header("X-Request-ID", "bad value with spaces").GET().build());
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue("X-Request-ID").orElseThrow()).matches("[a-f0-9-]{36}");
    }

    @Test void healthWrongMethodUsesProblemDetailsAndAllowHeader() throws Exception {
        var response = send(request("/api/v1/health").POST(HttpRequest.BodyPublishers.noBody()).build());
        assertThat(response.statusCode()).isEqualTo(405);
        assertThat(response.headers().firstValue("Content-Type").orElseThrow()).contains("application/problem+json");
        assertThat(response.headers().firstValue("Allow").orElseThrow()).contains("GET");
        assertThat(body(response).get("code")).isEqualTo("METHOD_NOT_ALLOWED");
        assertThat(body(response).get("requestId")).isEqualTo(response.headers().firstValue("X-Request-ID").orElseThrow());
    }

    @Test void businessRoutesAreClosedAndDoNotCreateSessionsBeforeAuthExists() throws Exception {
        var response = send(request("/api/v1/semesters").GET().build());
        assertThat(response.statusCode()).isEqualTo(401);
        assertThat(body(response).get("code")).isEqualTo("AUTHENTICATION_REQUIRED");
        assertThat(response.headers().allValues("Set-Cookie")).isEmpty();
    }

    @Test void actuatorDoesNotExposeDatabaseDetailsOrOtherManagementEndpoints() throws Exception {
        var health = send(request("/actuator/health").GET().build());
        assertThat(health.statusCode()).isEqualTo(200);
        assertThat(body(health).get("status")).isEqualTo("UP");
        assertThat(body(health).containsKey("components")).isFalse();
        assertThat(send(request("/actuator/env").GET().build()).statusCode()).isEqualTo(401);
    }

    @Test void onlyConfiguredBrowserOriginsReceiveCorsAccess() throws Exception {
        var allowed = send(request("/api/v1/health").method("OPTIONS", HttpRequest.BodyPublishers.noBody())
                .header("Origin", "http://localhost:8092").header("Access-Control-Request-Method", "GET").build());
        assertThat(allowed.statusCode()).isEqualTo(200);
        assertThat(allowed.headers().firstValue("Access-Control-Allow-Origin")).contains("http://localhost:8092");
        var denied = send(request("/api/v1/health").header("Origin", "https://untrusted.example").GET().build());
        assertThat(denied.statusCode()).isEqualTo(403);
        assertThat(denied.headers().firstValue("Access-Control-Allow-Origin")).isEmpty();
    }

    @Test void blocksDuplicateNormalizedEmail() {
        assertThatThrownBy(() -> transactions.executeWithoutResult(tx -> {
            user("same@example.test"); user("same@example.test");
        })).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test void limitsTermToThreeAndPreventsDuplicateSemester() {
        assertThatThrownBy(() -> transactions.executeWithoutResult(tx -> {
            UUID owner = user("bad-term@example.test"); semester(owner, 4, "UPCOMING");
        })).isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> transactions.executeWithoutResult(tx -> {
            UUID owner = user("duplicate-term@example.test"); semester(owner, 1, "UPCOMING"); semester(owner, 1, "UPCOMING");
        })).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test void permitsOnlyOneCurrentSemesterPerAccount() {
        assertThatThrownBy(() -> transactions.executeWithoutResult(tx -> {
            UUID owner = user("current@example.test"); semester(owner, 1, "CURRENT"); semester(owner, 2, "CURRENT");
        })).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test void rejectsCrossAccountCourseAndInvalidCredits() {
        assertThatThrownBy(() -> transactions.executeWithoutResult(tx -> {
            UUID a = user("owner-a@example.test"), b = user("owner-b@example.test");
            course(b, semester(a, 1, "UPCOMING"), "TEST01", 3);
        })).isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> transactions.executeWithoutResult(tx -> {
            UUID owner = user("credits@example.test"); course(owner, semester(owner, 1, "UPCOMING"), "TEST01", 0);
        })).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test void sameCodeCanAppearInDifferentSemestersButNotTwiceInOne() {
        transactions.executeWithoutResult(tx -> {
            UUID owner = user("retake@example.test"), a = semester(owner, 1, "UPCOMING"), b = semester(owner, 2, "UPCOMING");
            course(owner, a, "TEST01", 3); course(owner, b, "TEST01", 3); tx.setRollbackOnly();
        });
        assertThatThrownBy(() -> transactions.executeWithoutResult(tx -> {
            UUID owner = user("duplicate-course@example.test"), term = semester(owner, 1, "UPCOMING");
            course(owner, term, "TEST01", 3); course(owner, term, "TEST01", 3);
        })).isInstanceOf(DataIntegrityViolationException.class);
    }
}
