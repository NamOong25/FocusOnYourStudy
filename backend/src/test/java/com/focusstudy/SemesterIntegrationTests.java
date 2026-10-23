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
import org.junit.jupiter.api.condition.EnabledOnOs;
import org.junit.jupiter.api.condition.OS;
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
class SemesterIntegrationTests {
    private static final String SCHEMA = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
    private static final String URL = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Run Test-Local.ps1");
    private static final String USER = System.getenv("TEST_DB_USER"), PASSWORD = System.getenv("TEST_DB_PASSWORD");
    private static final String SECRET = "SemesterTest123!", PATH = "/api/v1/semesters";
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    private final HttpClient client = HttpClient.newHttpClient();
    record Account(String token, UUID id) { }
    @DynamicPropertySource static void configure(DynamicPropertyRegistry registry) {
        TestJwtResources.configure(registry);
        registry.add("spring.datasource.url", () -> URL + (URL.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA);
        registry.add("spring.datasource.username", () -> USER); registry.add("spring.datasource.password", () -> PASSWORD);
        registry.add("spring.flyway.default-schema", () -> SCHEMA); registry.add("spring.flyway.schemas", () -> SCHEMA);
        for (String route : List.of("login", "register", "refresh", "logout")) registry.add("app.auth.rate-limit." + route + "-per-minute", () -> 1000);
    }
    @AfterAll static void cleanup() throws Exception {
        if (!SCHEMA.matches("backend_it_[a-f0-9]{32}")) throw new IllegalStateException("Unsafe test schema");
        try (var c = DriverManager.getConnection(URL, USER, PASSWORD); var statement = c.createStatement()) { statement.execute("DROP SCHEMA " + SCHEMA + " CASCADE"); }
    }
    HttpResponse<String> send(String method, String path, String token, Object input) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).timeout(Duration.ofSeconds(15));
        if (token != null) request.header("Authorization", "Bearer " + token);
        if (input != null) request.header("Content-Type", "application/json");
        return client.send(request.method(method, input == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(input))).build(), HttpResponse.BodyHandlers.ofString());
    }
    Map<?, ?> body(HttpResponse<String> r) { return json.readValue(r.body(), Map.class); }
    Map<?, ?> data(HttpResponse<String> r) { assertThat(r.statusCode()).isIn(200, 201); return (Map<?, ?>) body(r).get("data"); }
    List<?> list(Account a) throws Exception { var r = send("GET", PATH, a.token, null); assertThat(r.statusCode()).isEqualTo(200); return (List<?>) body(r).get("data"); }
    Account account() throws Exception {
        String email = "semester-" + UUID.randomUUID() + "@example.test";
        var registered = send("POST", "/api/v1/auth/register", null, Map.of("email", email, "fullName", "Kiểm thử học kỳ", "password", SECRET, "confirmPassword", SECRET));
        var pair = data(send("POST", "/api/v1/auth/login", null, Map.of("email", email, "password", SECRET)));
        return new Account(pair.get("accessToken").toString(), UUID.fromString(data(registered).get("id").toString()));
    }
    Map<String, Object> input(int term, int year, String status) { return new HashMap<>(Map.of("term", term, "startYear", year, "status", status)); }
    Map<?, ?> create(Account a, int term, int year, String status) throws Exception { return data(send("POST", PATH, a.token, input(term, year, status))); }
    String item(Map<?, ?> semester) { return PATH + "/" + semester.get("id"); }
    Map<String, Object> update(Map<?, ?> semester, String note) {
        var input = input(((Number) semester.get("term")).intValue(), ((Number) semester.get("startYear")).intValue(), semester.get("status").toString());
        input.put("version", semester.get("version")); input.put("note", note); return input;
    }
    void error(HttpResponse<String> r, int status, String code) {
        assertThat(r.statusCode()).as(r.body()).isEqualTo(status); assertThat(body(r).get("code")).isEqualTo(code);
        assertThat(r.body()).doesNotContain("password_hash", "org.hibernate", "SELECT ", "INSERT ", SECRET);
    }

    @Test void emptyListHasEnvelopeNoStoreAndNoImplicitSummer() throws Exception {
        var a = account(); var r = send("GET", PATH, a.token, null);
        assertThat(body(r).get("data")).isEqualTo(List.of()); assertThat(body(r).get("meta")).isNotNull();
        assertThat(r.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
        create(a, 1, 2026, "CURRENT"); create(a, 2, 2026, "UPCOMING"); assertThat(list(a)).hasSize(2);
    }
    @Test void createPersistsCanonicalFieldsAndCanBeReadThroughFreshRequest() throws Exception {
        var a = account(); var input = input(3, 2026, "UPCOMING"); input.put("note", "  Hè tự chọn  ");
        var r = send("POST", PATH, a.token, input); var s = data(r);
        assertThat(r.statusCode()).isEqualTo(201); assertThat(r.headers().firstValue("Location")).contains(item(s));
        assertThat(s.get("name")).isEqualTo("Học kỳ 3 (Hè)"); assertThat(s.get("academicYear")).isEqualTo("2026 – 2027"); assertThat(s.get("note")).isEqualTo("Hè tự chọn");
        assertThat(s.containsKey("userId")).isFalse(); assertThat(s.get("createdAt")).isNotNull(); assertThat(s.get("updatedAt")).isNotNull();
        assertThat(data(send("GET", item(s), a.token, null))).isEqualTo(s);
        assertThat(jdbc.queryForObject("SELECT note FROM semesters WHERE id=? AND user_id=?", String.class, UUID.fromString(s.get("id").toString()), a.id)).isEqualTo("Hè tự chọn");
    }
    @Test void sortsByYearThenTermDescending() throws Exception {
        var a = account(); create(a, 1, 2026, "CURRENT"); create(a, 3, 2025, "COMPLETED"); create(a, 2, 2026, "UPCOMING");
        assertThat(list(a).stream().map(s -> ((Map<?, ?>) s).get("startYear") + ":" + ((Map<?, ?>) s).get("term")).toList()).containsExactly("2026:2", "2026:1", "2025:3");
    }
    @Test void invalidCreateInputsNeverWrite() throws Exception {
        var a = account();
        for (var values : List.of(input(0, 2026, "CURRENT"), input(4, 2026, "CURRENT"), input(1, 1899, "CURRENT"), input(1, 2100, "CURRENT")))
            error(send("POST", PATH, a.token, values), 400, "VALIDATION_FAILED");
        var missing = input(1, 2026, "CURRENT"); missing.remove("status"); error(send("POST", PATH, a.token, missing), 400, "VALIDATION_FAILED");
        var note = input(1, 2026, "CURRENT"); note.put("note", "x".repeat(2001)); error(send("POST", PATH, a.token, note), 400, "VALIDATION_FAILED");
        var wrongEnum = send("POST", PATH, a.token, input(1, 2026, "WRONG")); assertThat(wrongEnum.statusCode()).isEqualTo(400);
        var fraction = input(1, 2026, "CURRENT"); fraction.put("term", 1.5); assertThat(send("POST", PATH, a.token, fraction).statusCode()).isEqualTo(400);
        assertThat(list(a)).isEmpty();
    }
    @Test void duplicateIsPerAccountAndDoesNotChangeExistingCurrent() throws Exception {
        var a = account(); var b = account(); var old = create(a, 1, 2026, "CURRENT");
        error(send("POST", PATH, a.token, input(1, 2026, "CURRENT")), 409, "SEMESTER_ALREADY_EXISTS");
        create(b, 1, 2026, "CURRENT"); assertThat(list(a)).hasSize(1); assertThat(list(b)).hasSize(1);
        assertThat(data(send("GET", item(old), a.token, null)).get("status")).isEqualTo("CURRENT");
    }
    @Test void creatingNewCurrentCompletesOnlyOwnersPreviousOne() throws Exception {
        var a = account(); var b = account(); var old = create(a, 1, 2026, "CURRENT"); var other = create(b, 1, 2026, "CURRENT");
        var next = create(a, 2, 2026, "CURRENT"); var previous = data(send("GET", item(old), a.token, null));
        assertThat(previous.get("status")).isEqualTo("COMPLETED"); assertThat(((Number) previous.get("version")).longValue()).isGreaterThan(((Number) old.get("version")).longValue());
        assertThat(next.get("status")).isEqualTo("CURRENT"); assertThat(data(send("GET", item(other), b.token, null)).get("status")).isEqualTo("CURRENT");
    }
    @Test void canUpdateFieldsAndPromoteExistingSemesterAtomically() throws Exception {
        var a = account(); var old = create(a, 1, 2026, "CURRENT"); var next = create(a, 2, 2026, "UPCOMING");
        var change = update(next, "  Chặng mới  "); change.put("status", "CURRENT");
        var result = data(send("PUT", item(next), a.token, change));
        assertThat(result.get("note")).isEqualTo("Chặng mới"); assertThat(result.get("status")).isEqualTo("CURRENT");
        assertThat(((Number) result.get("version")).longValue()).isGreaterThan(((Number) next.get("version")).longValue());
        assertThat(data(send("GET", item(old), a.token, null)).get("status")).isEqualTo("COMPLETED");
    }
    @Test void conflictingUpdateRollsBackWithoutDemotingCurrent() throws Exception {
        var a = account(); var one = create(a, 1, 2026, "CURRENT"); var two = create(a, 2, 2026, "UPCOMING");
        var change = update(two, "Should not save"); change.put("term", 1); change.put("status", "CURRENT");
        error(send("PUT", item(two), a.token, change), 409, "SEMESTER_ALREADY_EXISTS");
        assertThat(data(send("GET", item(one), a.token, null)).get("status")).isEqualTo("CURRENT"); assertThat(data(send("GET", item(two), a.token, null))).isEqualTo(two);
    }
    @Test void staleUpdateAndDeleteCannotOverwriteNewerState() throws Exception {
        var a = account(); var old = create(a, 1, 2026, "CURRENT"); var changed = data(send("PUT", item(old), a.token, update(old, "Newer note")));
        error(send("PUT", item(old), a.token, update(old, "Stale note")), 409, "SEMESTER_VERSION_CONFLICT");
        error(send("DELETE", item(old) + "?version=" + old.get("version"), a.token, null), 409, "SEMESTER_VERSION_CONFLICT");
        assertThat(data(send("GET", item(old), a.token, null))).isEqualTo(changed);
    }
    @Test void updateRequiresValidVersionAndFullBody() throws Exception {
        var a = account(); var s = create(a, 1, 2026, "CURRENT"); var missing = update(s, "note"); missing.remove("version");
        error(send("PUT", item(s), a.token, missing), 400, "VALIDATION_FAILED");
        var negative = update(s, "note"); negative.put("version", -1); error(send("PUT", item(s), a.token, negative), 400, "VALIDATION_FAILED");
        var fraction = update(s, "note"); fraction.put("version", 0.5); assertThat(send("PUT", item(s), a.token, fraction).statusCode()).isEqualTo(400);
        assertThat(send("DELETE", item(s), a.token, null).statusCode()).isEqualTo(400);
        assertThat(send("DELETE", item(s) + "?version=-1", a.token, null).statusCode()).isEqualTo(400);
        assertThat(data(send("GET", item(s), a.token, null))).isEqualTo(s);
    }
    @Test void twoAccountsCannotReadUpdateDeleteOrListEachOthersSemesters() throws Exception {
        var a = account(); var b = account(); var s = create(a, 1, 2026, "CURRENT");
        assertThat(list(b)).isEmpty();
        error(send("GET", item(s), b.token, null), 404, "SEMESTER_NOT_FOUND");
        error(send("PUT", item(s), b.token, update(s, "Hijack")), 404, "SEMESTER_NOT_FOUND");
        error(send("DELETE", item(s) + "?version=" + s.get("version"), b.token, null), 404, "SEMESTER_NOT_FOUND");
        error(send("GET", PATH + "/" + UUID.randomUUID(), b.token, null), 404, "SEMESTER_NOT_FOUND");
        assertThat(data(send("GET", item(s), a.token, null))).isEqualTo(s);
    }
    @Test void suppliedOwnerCannotAssignDataToAnotherUser() throws Exception {
        var a = account(); var b = account(); var input = input(1, 2026, "CURRENT"); input.put("userId", b.id.toString());
        var response = send("POST", PATH, a.token, input);
        if (response.statusCode() == 201) {
            assertThat(jdbc.queryForObject("SELECT user_id FROM semesters WHERE id=?", UUID.class, UUID.fromString(data(response).get("id").toString()))).isEqualTo(a.id);
        } else assertThat(response.statusCode()).isEqualTo(400);
        assertThat(list(b)).isEmpty();
    }
    @Test void deletesEmptySemesterWithoutAutoSelectingAnotherCurrent() throws Exception {
        var a = account(); var s = create(a, 1, 2026, "CURRENT"); create(a, 2, 2026, "UPCOMING");
        var r = send("DELETE", item(s) + "?version=" + s.get("version"), a.token, null); assertThat(r.statusCode()).isEqualTo(204); assertThat(r.body()).isEmpty();
        error(send("GET", item(s), a.token, null), 404, "SEMESTER_NOT_FOUND"); assertThat(((Map<?, ?>) list(a).getFirst()).get("status")).isEqualTo("UPCOMING");
    }
    @Test void refusesDeleteWhenCoursesExistAndPreservesCourse() throws Exception {
        var a = account(); var s = create(a, 1, 2026, "CURRENT"); UUID semester = UUID.fromString(s.get("id").toString()), course = UUID.randomUUID();
        jdbc.update("INSERT INTO courses(id,user_id,semester_id,code,name,credits) VALUES (?,?,?,'QA01','Môn kiểm thử',3)", course, a.id, semester);
        error(send("DELETE", item(s) + "?version=" + s.get("version"), a.token, null), 409, "SEMESTER_HAS_COURSES");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM courses WHERE id=?", Integer.class, course)).isEqualTo(1); assertThat(list(a)).hasSize(1);
    }
    @Test void missingAndRevokedTokensCannotAccessSemesterOperations() throws Exception {
        var a = account(); var s = create(a, 1, 2026, "CURRENT");
        for (String method : List.of("GET", "POST", "PUT", "DELETE")) {
            String path = method.equals("PUT") || method.equals("DELETE") ? item(s) + "?version=0" : PATH;
            error(send(method, path, null, method.equals("POST") ? input(2, 2026, "CURRENT") : method.equals("PUT") ? update(s, "x") : null), 401, "AUTHENTICATION_REQUIRED");
        }
        jdbc.update("UPDATE refresh_sessions SET revoked_at=now(),revocation_reason='LOGOUT' WHERE user_id=?", a.id);
        assertThat(send("GET", PATH, a.token, null).statusCode()).isEqualTo(401);
    }
    @Test void bearerBrowserWritesWorkWithoutAuthCookieAndCookieAloneNeverAuthorizes() throws Exception {
        var a = account(); var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + PATH)).header("Origin", "http://localhost:8092")
                .header("Content-Type", "application/json").header("Authorization", "Bearer " + a.token).POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(input(1, 2026, "CURRENT")))).build();
        var r = client.send(request, HttpResponse.BodyHandlers.ofString()); assertThat(r.statusCode()).as(r.body()).isEqualTo(201);
        assertThat(r.headers().firstValue("Access-Control-Allow-Origin")).contains("http://localhost:8092"); assertThat(r.headers().allValues("Set-Cookie")).isEmpty();
        var cookieOnly = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + PATH)).header("Cookie", "FOCUS_REFRESH=not-a-bearer").header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(input(2, 2026, "CURRENT")))).build();
        error(client.send(cookieOnly, HttpResponse.BodyHandlers.ofString()), 401, "AUTHENTICATION_REQUIRED");
    }
    @Test void malformedIdAndClosedAssignmentRoutesRemainProtected() throws Exception {
        var a = account(); assertThat(send("GET", PATH + "/not-a-uuid", a.token, null).statusCode()).isEqualTo(400);
        assertThat(send("GET", "/api/v1/courses", a.token, null).statusCode()).isEqualTo(200);
        assertThat(send("GET", "/api/v1/assignments", a.token, null).statusCode()).isEqualTo(403);
        assertThat(send("PATCH", PATH + "/" + UUID.randomUUID(), a.token, Map.of()).statusCode()).isEqualTo(403);
    }
    @Test void concurrentDuplicateCreatesYieldOneSuccessAndOneConflict() throws Exception {
        var a = account(); var responses = concurrently(() -> send("POST", PATH, a.token, input(1, 2026, "CURRENT")), () -> send("POST", PATH, a.token, input(1, 2026, "CURRENT")));
        assertThat(responses.stream().map(HttpResponse::statusCode).sorted().toList()).containsExactly(201, 409); assertThat(list(a)).hasSize(1);
    }
    @Test void concurrentCurrentCreatesLeaveExactlyOneCurrent() throws Exception {
        var a = account(); var responses = concurrently(() -> send("POST", PATH, a.token, input(1, 2026, "CURRENT")), () -> send("POST", PATH, a.token, input(2, 2026, "CURRENT")));
        assertThat(responses).allSatisfy(r -> assertThat(r.statusCode()).as(r.body()).isEqualTo(201));
        assertThat(list(a).stream().filter(s -> ((Map<?, ?>) s).get("status").equals("CURRENT"))).hasSize(1);
    }
    @Test void concurrentEditsWithSameVersionCannotLoseAnUpdate() throws Exception {
        var a = account(); var s = create(a, 1, 2026, "CURRENT"); var responses = concurrently(() -> send("PUT", item(s), a.token, update(s, "First")), () -> send("PUT", item(s), a.token, update(s, "Second")));
        assertThat(responses.stream().map(HttpResponse::statusCode).sorted().toList()).containsExactly(200, 409);
        assertThat(data(send("GET", item(s), a.token, null)).get("note")).isIn("First", "Second");
    }
    private List<HttpResponse<String>> concurrently(Callable<HttpResponse<String>> first, Callable<HttpResponse<String>> second) throws Exception {
        var gate = new CountDownLatch(1);
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            var a = pool.submit(() -> { gate.await(); return first.call(); }); var b = pool.submit(() -> { gate.await(); return second.call(); }); gate.countDown();
            return List.of(a.get(20, TimeUnit.SECONDS), b.get(20, TimeUnit.SECONDS));
        }
    }
    @Test @EnabledOnOs(OS.WINDOWS)
    void powershell51GuideCanCreateListUpdateAndDeleteWithoutPrintingTokens() throws Exception {
        var a = account(); String email = jdbc.queryForObject("SELECT email FROM app_users WHERE id=?", String.class, a.id);
        String ps = Path.of(System.getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "powershell.exe").toString();
        String id = null; long version = 0;
        for (String mode : List.of("Create", "List", "Update", "Delete")) {
            String script = "[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); function Read-Host { param([string]$Prompt,[switch]$AsSecureString); if ($AsSecureString) { ConvertTo-SecureString $env:SEMESTER_TEST_PASSWORD -AsPlainText -Force } else { $env:SEMESTER_TEST_EMAIL } }; "
                    + "& './scripts/Try-Semesters.ps1' -BaseUrl 'http://127.0.0.1:" + port + "' -Mode " + mode + " -Term 1 -StartYear 2026"
                    + (mode.equals("Update") || mode.equals("Delete") ? " -SemesterId '" + id + "' -Version " + version : "")
                    + (mode.equals("Update") ? " -Note 'Updated from PowerShell'" : "");
            var builder = new ProcessBuilder(ps, "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script).redirectErrorStream(true);
            builder.environment().keySet().removeIf(name -> name.equalsIgnoreCase("PSModulePath"));
            builder.environment().put("PSModulePath", Path.of(System.getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "Modules").toString());
            builder.environment().put("SEMESTER_TEST_EMAIL", email); builder.environment().put("SEMESTER_TEST_PASSWORD", SECRET);
            var process = builder.start();
            try {
                assertThat(process.waitFor(25, TimeUnit.SECONDS)).isTrue();
                String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                assertThat(process.exitValue()).as(output).isZero(); assertThat(output).doesNotContain(SECRET, "accessToken", "refreshToken");
            } finally { if (process.isAlive()) process.destroyForcibly(); }
            if (!mode.equals("Delete")) {
                var current = jdbc.queryForMap("SELECT id,version,note FROM semesters WHERE user_id=?", a.id);
                id = current.get("id").toString(); version = ((Number) current.get("version")).longValue();
                if (mode.equals("Update")) assertThat(current.get("note")).isEqualTo("Updated from PowerShell");
            }
        }
        assertThat(list(a)).isEmpty();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL", Integer.class, a.id)).isEqualTo(1);
    }
}
