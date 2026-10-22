package com.focusstudy;

import static org.assertj.core.api.Assertions.*;

import com.focusstudy.auth.JwtProperties;
import java.net.URI;
import java.net.http.*;
import java.sql.DriverManager;
import java.time.*;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DirtiesContext
class AuthIntegrationTests {
    private static final String SCHEMA = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
    private static final String URL = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Run Test-Local.ps1");
    private static final String USER = System.getenv("TEST_DB_USER"), PASSWORD = System.getenv("TEST_DB_PASSWORD");
    private static final String TEST_PASSWORD = "OnlyForTest123!";
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired PasswordEncoder passwords;
    @Autowired JwtDecoder decoder;
    @Autowired JwtEncoder encoder;
    @Autowired JwtProperties jwtProperties;
    private final HttpClient client = HttpClient.newHttpClient();

    @DynamicPropertySource static void configure(DynamicPropertyRegistry registry) {
        TestJwtResources.configure(registry);
        registry.add("spring.datasource.url", () -> URL + (URL.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA);
        registry.add("spring.datasource.username", () -> USER);
        registry.add("spring.datasource.password", () -> PASSWORD);
        registry.add("spring.flyway.default-schema", () -> SCHEMA);
        registry.add("spring.flyway.schemas", () -> SCHEMA);
        registry.add("app.auth.rate-limit.login-per-minute", () -> 1000);
        registry.add("app.auth.rate-limit.register-per-minute", () -> 1000);
    }
    @AfterAll static void cleanupOnlyOwnedTestSchema() throws Exception {
        if (!SCHEMA.matches("backend_it_[a-f0-9]{32}")) throw new IllegalStateException("Unsafe schema");
        try (var connection = DriverManager.getConnection(URL, USER, PASSWORD); var statement = connection.createStatement()) {
            statement.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        }
    }
    String email() { return "account-" + UUID.randomUUID() + "@example.test"; }
    HttpRequest.Builder request(String path) {
        return HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).timeout(Duration.ofSeconds(20));
    }
    HttpResponse<String> send(HttpRequest request) throws Exception { return client.send(request, HttpResponse.BodyHandlers.ofString()); }
    HttpResponse<String> post(String path, Object payload) throws Exception {
        return send(request(path).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload))).build());
    }
    Map<?, ?> body(HttpResponse<String> response) { return json.readValue(response.body(), Map.class); }
    Map<?, ?> data(HttpResponse<String> response) { return (Map<?, ?>) body(response).get("data"); }
    Map<String, String> signup(String email, String password) {
        return Map.of("email", email, "password", password, "confirmPassword", password, "fullName", "Sinh viên kiểm thử");
    }
    HttpResponse<String> register(String email) throws Exception { return post("/api/v1/auth/register", signup(email, TEST_PASSWORD)); }
    HttpResponse<String> login(String email, String password) throws Exception {
        return post("/api/v1/auth/login", Map.of("email", email, "password", password));
    }
    String token(String email) throws Exception {
        var response = login(email, TEST_PASSWORD); assertThat(response.statusCode()).isEqualTo(200);
        return data(response).get("accessToken").toString();
    }
    HttpResponse<String> me(String token) throws Exception {
        return send(request("/api/v1/users/me").header("Authorization", "Bearer " + token).GET().build());
    }

    @Test void registrationNormalizesAndPersistsOnlySaltedHashes() throws Exception {
        String first = email(), second = email();
        var response = post("/api/v1/auth/register", signup("  " + first.toUpperCase(Locale.ROOT) + "  ", TEST_PASSWORD));
        assertThat(response.statusCode()).isEqualTo(201);
        assertThat(data(response).get("email")).isEqualTo(first);
        assertThat(data(response).containsKey("accessToken")).isFalse();
        assertThat(response.body()).doesNotContain(TEST_PASSWORD, "passwordHash", "password_hash");
        assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
        assertThat(response.headers().allValues("Set-Cookie")).isEmpty();
        assertThat(register(second).statusCode()).isEqualTo(201);
        String hash1 = jdbc.queryForObject("SELECT password_hash FROM app_users WHERE email=?", String.class, first);
        String hash2 = jdbc.queryForObject("SELECT password_hash FROM app_users WHERE email=?", String.class, second);
        assertThat(hash1).isNotEqualTo(TEST_PASSWORD).isNotEqualTo(hash2);
        assertThat(passwords.matches(TEST_PASSWORD, hash1)).isTrue();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM app_users WHERE email=?", Integer.class, first)).isEqualTo(1);
    }

    @Test void duplicateEmailIsCaseInsensitiveAndDoesNotOverwriteAnAccount() throws Exception {
        String email = email(); var original = register(email);
        var duplicate = post("/api/v1/auth/register", signup(" " + email.toUpperCase(Locale.ROOT) + " ", "DifferentPass123"));
        assertThat(duplicate.statusCode()).isEqualTo(409);
        assertThat(body(duplicate).get("code")).isEqualTo("EMAIL_ALREADY_EXISTS");
        assertThat(data(me(token(email))).get("id")).isEqualTo(data(original).get("id"));
    }

    @Test void simultaneousRegistrationHasOneWinnerAndOne409() throws Exception {
        String email = email(), payload = json.writeValueAsString(signup(email, TEST_PASSWORD));
        var first = request("/api/v1/auth/register").header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(payload)).build();
        var second = request("/api/v1/auth/register").header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(payload)).build();
        var a = client.sendAsync(first, HttpResponse.BodyHandlers.ofString());
        var b = client.sendAsync(second, HttpResponse.BodyHandlers.ofString());
        CompletableFuture.allOf(a, b).join();
        assertThat(List.of(a.join().statusCode(), b.join().statusCode())).containsExactlyInAnyOrder(201, 409);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM app_users WHERE email=?", Integer.class, email)).isEqualTo(1);
    }

    @Test void confirmationFailureIsAFieldErrorAndDoesNotCreateUser() throws Exception {
        String email = email(); var payload = new HashMap<>(signup(email, TEST_PASSWORD)); payload.put("confirmPassword", "NotMatching123");
        var response = post("/api/v1/auth/register", payload);
        assertThat(response.statusCode()).isEqualTo(400);
        assertThat(body(response).get("code")).isEqualTo("VALIDATION_FAILED");
        assertThat(response.body()).contains("confirmPassword").doesNotContain(TEST_PASSWORD, "NotMatching123");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM app_users WHERE email=?", Integer.class, email)).isZero();
    }

    @Test void invalidInputAndMissingCredentialsAreRejectedWithoutEchoingSecrets() throws Exception {
        for (String invalidEmail : List.of("", "not-an-email", "user@example", "a b@example.test")) {
            var response = post("/api/v1/auth/register", signup(invalidEmail, TEST_PASSWORD));
            assertThat(response.statusCode()).isEqualTo(400); assertThat(response.body()).doesNotContain(TEST_PASSWORD);
        }
        for (String password : List.of("short", " ".repeat(8), "x".repeat(129)))
            assertThat(post("/api/v1/auth/register", signup(email(), password)).statusCode()).isEqualTo(400);
        assertThat(post("/api/v1/auth/login", Map.of()).statusCode()).isEqualTo(400);
        assertThat(post("/api/v1/auth/register", Map.of()).statusCode()).isEqualTo(400);
        var payload = new HashMap<>(signup(email(), TEST_PASSWORD)); payload.put("fullName", "   ");
        assertThat(post("/api/v1/auth/register", payload).statusCode()).isEqualTo(400);
    }

    @Test void loginIssuesVerifiedShortLivedTokenAndNoCookie() throws Exception {
        String email = email(); String id = data(register(email)).get("id").toString();
        var response = login("  " + email.toUpperCase(Locale.ROOT) + "  ", TEST_PASSWORD);
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(data(response).get("tokenType")).isEqualTo("Bearer");
        assertThat(((Number) data(response).get("expiresIn")).longValue()).isEqualTo(900);
        assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
        assertThat(response.headers().allValues("Set-Cookie")).isEmpty();
        var jwt = decoder.decode(data(response).get("accessToken").toString());
        assertThat(jwt.getSubject()).isEqualTo(id);
        assertThat(Duration.between(jwt.getIssuedAt(), jwt.getExpiresAt())).isEqualTo(Duration.ofMinutes(15));
        assertThat(jwt.getClaims()).doesNotContainKeys("email", "password", "passwordHash");
        assertThat(jwt.getClaimAsString("token_use")).isEqualTo("access");
    }

    @Test void wrongPasswordAndUnknownEmailHaveIdenticalCredentialErrors() throws Exception {
        String email = email(); register(email);
        var wrong = login(email, "WrongPassword123"); var missing = login(email(), "WrongPassword123");
        assertThat(wrong.statusCode()).isEqualTo(401); assertThat(missing.statusCode()).isEqualTo(401);
        assertThat(body(wrong).get("code")).isEqualTo("INVALID_CREDENTIALS");
        assertThat(body(wrong).get("detail")).isEqualTo(body(missing).get("detail"));
        assertThat(body(wrong).get("code")).isEqualTo(body(missing).get("code"));
        assertThat(wrong.body()).doesNotContain(email, TEST_PASSWORD, "WrongPassword123");
    }

    @Test void meRequiresBearerAndDoesNotAcceptTokenInQueryString() throws Exception {
        assertThat(send(request("/api/v1/users/me").GET().build()).statusCode()).isEqualTo(401);
        String email = email(); register(email);
        var response = send(request("/api/v1/users/me?access_token=" + token(email)).GET().build());
        assertThat(response.statusCode()).isEqualTo(401);
        assertThat(response.body()).doesNotContain("access_token=");
        assertThat(response.headers().firstValue("WWW-Authenticate")).contains("Bearer");
    }

    @Test void eachAccountOnlyGetsItsOwnProfileAndCannotChooseAnotherUser() throws Exception {
        String a = email(), b = email(); register(a); var other = register(b); String tokenA = token(a), tokenB = token(b);
        assertThat(data(me(tokenA)).get("email")).isEqualTo(a);
        assertThat(data(me(tokenB)).get("email")).isEqualTo(b);
        var selected = send(request("/api/v1/users/me?userId=" + data(other).get("id")).header("Authorization", "Bearer " + tokenA).GET().build());
        assertThat(data(selected).get("email")).isEqualTo(a);
        assertThat(send(request("/api/v1/users/" + data(other).get("id")).header("Authorization", "Bearer " + tokenA).GET().build()).statusCode()).isEqualTo(403);
        assertThat(send(request("/api/v1/semesters").header("Authorization", "Bearer " + tokenA).GET().build()).statusCode()).isEqualTo(403);
        assertThat(selected.body()).doesNotContain("passwordHash", "password_hash", TEST_PASSWORD);
    }

    @Test void tamperedOrUnsignedJwtIsRejected() throws Exception {
        String email = email(); register(email); String valid = token(email); String[] parts = valid.split("\\.");
        parts[2] = (parts[2].charAt(0) == 'A' ? "B" : "A") + parts[2].substring(1);
        var tampered = me(String.join(".", parts));
        assertThat(tampered.statusCode()).isEqualTo(401); assertThat(body(tampered).get("code")).isEqualTo("INVALID_ACCESS_TOKEN");
        assertThat(me("eyJhbGciOiJub25lIn0.eyJzdWIiOiJmYWtlIn0.").statusCode()).isEqualTo(401);
    }

    @Test void validSignatureDoesNotBypassIssuerAudienceExpiryOrTokenType() throws Exception {
        String email = email(); String id = data(register(email)).get("id").toString();
        String sessionId = decoder.decode(token(email)).getClaimAsString("sid");
        for (String fault : List.of("issuer", "audience", "expired", "no-expiry", "refresh", "subject")) {
            var now = Instant.now();
            var claims = JwtClaimsSet.builder().issuer(fault.equals("issuer") ? "urn:untrusted" : jwtProperties.issuer())
                    .audience(List.of(fault.equals("audience") ? "wrong-api" : jwtProperties.audience()))
                    .subject(fault.equals("subject") ? "not-a-uuid" : id).issuedAt(now.minusSeconds(600))
                    .notBefore(now.minusSeconds(600)).claim("token_use", fault.equals("refresh") ? "refresh" : "access")
                    .claim("sid", sessionId);
            if (!fault.equals("no-expiry")) claims.expiresAt(fault.equals("expired") ? now.minusSeconds(120) : now.plusSeconds(900));
            String token = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(SignatureAlgorithm.RS256).build(), claims.build())).getTokenValue();
            assertThat(me(token).statusCode()).as(fault).isEqualTo(401);
        }
    }

    @Test void longUnicodePasswordIsNotTruncatedAndWhitespaceIsSignificant() throws Exception {
        String email = email(), longPassword = "a".repeat(120) + "Mật12345";
        assertThat(longPassword.length()).isEqualTo(128);
        assertThat(post("/api/v1/auth/register", signup(email, longPassword)).statusCode()).isEqualTo(201);
        assertThat(login(email, longPassword).statusCode()).isEqualTo(200);
        assertThat(login(email, longPassword.substring(0, 127) + "6").statusCode()).isEqualTo(401);
        String spacedEmail = email(), spaced = "  Secret123  ";
        assertThat(post("/api/v1/auth/register", signup(spacedEmail, spaced)).statusCode()).isEqualTo(201);
        assertThat(login(spacedEmail, spaced).statusCode()).isEqualTo(200);
        assertThat(login(spacedEmail, spaced.strip()).statusCode()).isEqualTo(401);
    }

    @Test void removedAccountCannotUsePreviouslyIssuedToken() throws Exception {
        String email = email(); register(email); String token = token(email);
        jdbc.update("DELETE FROM app_users WHERE email=?", email);
        var response = me(token);
        assertThat(response.statusCode()).isEqualTo(401); assertThat(body(response).get("code")).isEqualTo("INVALID_ACCESS_TOKEN");
    }
}
