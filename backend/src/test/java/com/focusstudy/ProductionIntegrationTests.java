package com.focusstudy;

import static org.assertj.core.api.Assertions.*;

import java.net.URI;
import java.net.http.*;
import java.sql.DriverManager;
import java.util.Map;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.env.Environment;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.ObjectMapper;

@ActiveProfiles("prod")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DirtiesContext
class ProductionIntegrationTests {
    private static final String SCHEMA = "prod_it_" + UUID.randomUUID().toString().replace("-", "");
    private static final String URL = System.getenv("TEST_DB_URL");
    private static final String USER = System.getenv("TEST_DB_USER");
    private static final String PASSWORD = System.getenv("TEST_DB_PASSWORD");
    private static final String ORIGIN = "https://app.example.test";
    @LocalServerPort int port;
    @Autowired Environment environment;
    @Autowired Flyway flyway;
    @Autowired ObjectMapper json;
    private final HttpClient client = HttpClient.newHttpClient();

    @DynamicPropertySource
    static void settings(DynamicPropertyRegistry registry) {
        if (URL == null || USER == null || PASSWORD == null) throw new IllegalStateException("Set TEST_DB_URL, TEST_DB_USER and TEST_DB_PASSWORD");
        TestJwtResources.configure(registry);
        registry.add("app.auth.jwt.issuer", () -> "https://api.example.test");
        registry.add("spring.datasource.url", () -> URL + (URL.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA);
        registry.add("spring.datasource.username", () -> USER);
        registry.add("spring.datasource.password", () -> PASSWORD);
        registry.add("spring.flyway.default-schema", () -> SCHEMA);
        registry.add("spring.flyway.schemas", () -> SCHEMA);
        registry.add("app.cors.allowed-origins", () -> ORIGIN);
        registry.add("app.auth.password-reset.enabled", () -> "false");
        registry.add("server.forward-headers-strategy", () -> "NONE");
    }

    @AfterAll
    static void cleanOwnedSchema() throws Exception {
        if (!SCHEMA.matches("prod_it_[a-f0-9]{32}")) throw new IllegalStateException("Unsafe test schema");
        try (var connection = DriverManager.getConnection(URL, USER, PASSWORD); var sql = connection.createStatement()) {
            sql.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        }
    }

    private HttpRequest.Builder request(String path) {
        return HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).timeout(java.time.Duration.ofSeconds(10));
    }
    private HttpResponse<String> send(HttpRequest request) throws Exception { return client.send(request, HttpResponse.BodyHandlers.ofString()); }

    @Test void productionProfileUsesSecureCookiesAndNonLocalConfiguration() {
        assertThat(environment.getProperty("app.auth.session.cookie-secure", Boolean.class)).isTrue();
        assertThat(environment.getProperty("server.address")).isEqualTo("0.0.0.0");
        assertThat(environment.getProperty("server.forward-headers-strategy")).isEqualTo("NONE");
        assertThat(environment.getProperty("app.auth.jwt.issuer")).isEqualTo("https://api.example.test");
    }

    @Test void freshDatabaseMigratesAndHealthHidesPrivateInformation() throws Exception {
        var health = send(request("/api/v1/health").GET().build());
        assertThat(health.statusCode()).isEqualTo(200);
        assertThat(health.body()).contains("UP").doesNotContain(PASSWORD, SCHEMA);
        assertThat(flyway.info().current().getVersion().toString()).isEqualTo("16");
        assertThat(flyway.migrate().migrationsExecuted).isZero();
        var actuator = send(request("/actuator/health").GET().build());
        assertThat(actuator.body()).doesNotContain("components", "jdbc:", "PostgreSQL");
        assertThat(send(request("/actuator/env").GET().build()).statusCode()).isEqualTo(401);
    }

    @Test void onlyExplicitHttpsOriginCanPreflight() throws Exception {
        for (String origin : new String[]{ORIGIN, "https://other.example.test", "http://localhost:8092"}) {
            var response = send(request("/api/v1/users/me/export").header("Origin", origin)
                    .header("Access-Control-Request-Method", "GET")
                    .header("Access-Control-Request-Headers", "Authorization").method("OPTIONS", HttpRequest.BodyPublishers.noBody()).build());
            if (origin.equals(ORIGIN)) {
                assertThat(response.statusCode()).isEqualTo(200);
                assertThat(response.headers().firstValue("Access-Control-Allow-Origin")).contains(ORIGIN);
            } else {
                assertThat(response.statusCode()).isEqualTo(403);
                assertThat(response.headers().firstValue("Access-Control-Allow-Origin")).isEmpty();
            }
        }
    }

    @Test void webCsrfCookieHasProductionFlags() throws Exception {
        var response = send(request("/api/v1/auth/csrf").header("Origin", ORIGIN).header("X-Auth-Transport", "cookie").GET().build());
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().allValues("Set-Cookie")).anySatisfy(cookie ->
                assertThat(cookie).contains("FOCUS_XSRF=", "Secure", "HttpOnly", "SameSite=Strict", "Path=/api/v1/auth"));
        String password = "ProductionQA-Web-93";
        String registration = json.writeValueAsString(Map.of("email", "web-production@example.test", "password", password,
                "confirmPassword", password, "fullName", "Web production"));
        assertThat(send(request("/api/v1/auth/register").header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(registration)).build()).statusCode()).isEqualTo(201);
        String cookie = response.headers().allValues("Set-Cookie").stream().filter(value -> value.startsWith("FOCUS_XSRF="))
                .findFirst().orElseThrow().split(";", 2)[0];
        String csrf = ((Map<?, ?>) json.readValue(response.body(), Map.class).get("data")).get("token").toString();
        String payload = json.writeValueAsString(Map.of("email", "web-production@example.test", "password", password));
        var login = send(request("/api/v1/auth/login").header("Origin", ORIGIN).header("X-Auth-Transport", "cookie")
                .header("Cookie", cookie).header("X-XSRF-TOKEN", csrf).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload)).build());
        assertThat(login.statusCode()).isEqualTo(200);
        assertThat(login.headers().allValues("Set-Cookie")).anySatisfy(value ->
                assertThat(value).contains("FOCUS_REFRESH=", "Secure", "HttpOnly", "SameSite=Strict", "Path=/api/v1/auth"));
        assertThat(((Map<?, ?>) json.readValue(login.body(), Map.class).get("data")).containsKey("refreshToken")).isFalse();
    }

    @Test void bodyAuthenticationStillWorksForNativeClients() throws Exception {
        String password = "ProductionQA-Only-93";
        String body = json.writeValueAsString(Map.of("email", "production@example.test", "password", password,
                "confirmPassword", password, "fullName", "Kiểm tra production"));
        var registration = send(request("/api/v1/auth/register").header("Content-Type", "application/json")
                .header("X-Auth-Transport", "body").POST(HttpRequest.BodyPublishers.ofString(body)).build());
        assertThat(registration.statusCode()).isEqualTo(201);
        String loginBody = json.writeValueAsString(Map.of("email", "production@example.test", "password", password));
        var login = send(request("/api/v1/auth/login").header("Content-Type", "application/json")
                .header("X-Auth-Transport", "body").POST(HttpRequest.BodyPublishers.ofString(loginBody)).build());
        assertThat(login.statusCode()).isEqualTo(200);
        var data = (Map<?, ?>) json.readValue(login.body(), Map.class).get("data");
        var profile = send(request("/api/v1/users/me").header("Authorization", "Bearer " + data.get("accessToken")).GET().build());
        assertThat(profile.statusCode()).isEqualTo(200);
        assertThat(profile.body()).contains("Kiểm tra production");
    }
}
