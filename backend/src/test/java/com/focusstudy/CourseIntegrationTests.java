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
class CourseIntegrationTests {
    private static final String SCHEMA = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
    private static final String URL = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Run Test-Local.ps1");
    private static final String USER = System.getenv("TEST_DB_USER"), PASSWORD = System.getenv("TEST_DB_PASSWORD");
    private static final String SECRET = "CourseTest123!", PATH = "/api/v1/courses", SEMESTERS = "/api/v1/semesters";
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
    Map<?, ?> data(HttpResponse<String> r) { assertThat(r.statusCode()).as(r.body()).isIn(200, 201); return (Map<?, ?>) body(r).get("data"); }
    List<?> list(Account a, String suffix) throws Exception { var r = send("GET", PATH + suffix, a.token, null); assertThat(r.statusCode()).as(r.body()).isEqualTo(200); return (List<?>) body(r).get("data"); }
    Account account() throws Exception {
        String email = "course-" + UUID.randomUUID() + "@example.test";
        var registered = data(send("POST", "/api/v1/auth/register", null, Map.of("email", email, "fullName", "Kiểm thử môn học", "password", SECRET, "confirmPassword", SECRET)));
        var pair = data(send("POST", "/api/v1/auth/login", null, Map.of("email", email, "password", SECRET)));
        return new Account(pair.get("accessToken").toString(), UUID.fromString(registered.get("id").toString()));
    }
    Map<?, ?> semester(Account a, int term) throws Exception { return data(send("POST", SEMESTERS, a.token, Map.of("term", term, "startYear", 2026, "status", "UPCOMING"))); }
    Map<String, Object> input(Map<?, ?> semester, String code) { return new HashMap<>(Map.of("semesterId", semester.get("id"), "code", code, "name", "Môn kiểm thử", "credits", 3)); }
    Map<?, ?> create(Account a, Map<?, ?> semester, String code) throws Exception { return data(send("POST", PATH, a.token, input(semester, code))); }
    Map<String, Object> update(Map<?, ?> course) {
        var result = new HashMap<String, Object>();
        for (String key : List.of("semesterId", "code", "name", "credits", "teacher", "room", "status", "color", "description", "version")) result.put(key, course.get(key));
        return result;
    }
    String item(Map<?, ?> course) { return PATH + "/" + course.get("id"); }
    void error(HttpResponse<String> r, int status, String code) {
        assertThat(r.statusCode()).as(r.body()).isEqualTo(status); assertThat(body(r).get("code")).isEqualTo(code);
        assertThat(r.body()).doesNotContain("password_hash", "org.hibernate", "SELECT ", "INSERT ", SECRET);
    }
    @Test void emptyListAndOwnedEmptySemesterReturnEmptyEnvelopes() throws Exception {
        var a = account(); var s = semester(a, 1); assertThat(list(a, "")).isEmpty(); assertThat(list(a, "?semesterId=" + s.get("id"))).isEmpty();
        var r = send("GET", PATH, a.token, null); assertThat(body(r).get("meta")).isNotNull(); assertThat(r.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
    }
    @Test void createNormalizesFieldsAndPersistsToPostgres() throws Exception {
        var a = account(); var s = semester(a, 1); var input = input(s, "  web101  "); input.put("name", "  Lập trình Web  "); input.put("teacher", "  Giảng viên A  "); input.put("room", "  A101  "); input.put("description", "  Mục tiêu học  ");
        var r = send("POST", PATH, a.token, input); var c = data(r); assertThat(r.statusCode()).isEqualTo(201); assertThat(r.headers().firstValue("Location")).contains(item(c));
        assertThat(c.get("code")).isEqualTo("WEB101"); assertThat(c.get("name")).isEqualTo("Lập trình Web"); assertThat(c.get("teacher")).isEqualTo("Giảng viên A");
        assertThat(c.get("room")).isEqualTo("A101"); assertThat(c.get("description")).isEqualTo("Mục tiêu học"); assertThat(c.get("status")).isEqualTo("STUDYING"); assertThat(c.get("color")).isEqualTo("lavender");
        assertThat(c.containsKey("userId")).isFalse(); assertThat(c.get("createdAt")).isNotNull(); assertThat(data(send("GET", item(c), a.token, null))).isEqualTo(c);
        assertThat(jdbc.queryForObject("SELECT code FROM courses WHERE id=? AND user_id=?", String.class, UUID.fromString(c.get("id").toString()), a.id)).isEqualTo("WEB101");
    }
    @Test void listFiltersOwnedSemesterAndSortsByCode() throws Exception {
        var a = account(); var s = semester(a, 1); var t = semester(a, 2); create(a, s, "Z02"); create(a, s, "A01"); create(a, t, "B01");
        assertThat(list(a, "").stream().map(c -> ((Map<?, ?>) c).get("code").toString()).toList()).containsExactly("A01", "B01", "Z02");
        assertThat(list(a, "?semesterId=" + s.get("id")).stream().map(c -> ((Map<?, ?>) c).get("code").toString()).toList()).containsExactly("A01", "Z02");
    }
    @Test void normalizedDuplicateIsRejectedButRetakeInAnotherSemesterIsAllowed() throws Exception {
        var a = account(); var s = semester(a, 1); var t = semester(a, 2); var first = create(a, s, "Web101");
        error(send("POST", PATH, a.token, input(s, "  web101  ")), 409, "COURSE_ALREADY_EXISTS");
        var second = create(a, t, "web101"); assertThat(second.get("id")).isNotEqualTo(first.get("id")); assertThat(list(a, "")).hasSize(2);
        var b = account(); create(b, semester(b, 1), "WEB101"); assertThat(list(b, "")).hasSize(1); assertThat(list(a, "")).hasSize(2);
    }
    @Test void missingBlankOversizedAndFractionalInputsNeverWrite() throws Exception {
        var a = account(); var s = semester(a, 1);
        for (String field : List.of("semesterId", "code", "name", "credits")) { var values = input(s, "QA"); values.remove(field); error(send("POST", PATH, a.token, values), 400, "VALIDATION_FAILED"); }
        for (var entry : Map.<String, Object>of("code", " ", "name", " ", "credits", 0, "teacher", "x".repeat(201), "room", "x".repeat(101), "description", "x".repeat(5001)).entrySet()) {
            var values = input(s, "QA"); values.put(entry.getKey(), entry.getValue()); error(send("POST", PATH, a.token, values), 400, "VALIDATION_FAILED");
        }
        for (var entry : Map.<String, Object>of("code", "x".repeat(65), "name", "x".repeat(201), "credits", 31, "color", "red").entrySet()) {
            var values = input(s, "QA"); values.put(entry.getKey(), entry.getValue()); error(send("POST", PATH, a.token, values), 400, "VALIDATION_FAILED");
        }
        var fractional = input(s, "QA"); fractional.put("credits", 3.5); assertThat(send("POST", PATH, a.token, fractional).statusCode()).isEqualTo(400);
        var invalidStatus = input(s, "QA"); invalidStatus.put("status", "WRONG"); assertThat(send("POST", PATH, a.token, invalidStatus).statusCode()).isEqualTo(400);
        assertThat(list(a, "")).isEmpty();
    }
    @Test void updateCanEditAllFieldsAndMoveOnlyWithinOwnedSemesters() throws Exception {
        var a = account(); var s = semester(a, 1); var t = semester(a, 2); var c = create(a, s, "QA1"); var change = update(c);
        change.putAll(Map.of("semesterId", t.get("id"), "code", " qa2 ", "name", " Môn mới ", "credits", 4, "teacher", " GV mới ", "room", " B202 ", "status", "COMPLETED", "color", "mint", "description", " Đã sửa "));
        var newer = data(send("PUT", item(c), a.token, change)); assertThat(newer.get("id")).isEqualTo(c.get("id")); assertThat(newer.get("semesterId")).isEqualTo(t.get("id"));
        assertThat(newer.get("code")).isEqualTo("QA2"); assertThat(newer.get("credits")).isEqualTo(4); assertThat(newer.get("teacher")).isEqualTo("GV mới");
        assertThat(newer.get("room")).isEqualTo("B202"); assertThat(newer.get("color")).isEqualTo("mint"); assertThat(newer.get("status")).isEqualTo("COMPLETED");
        assertThat(((Number) newer.get("version")).longValue()).isGreaterThan(((Number) c.get("version")).longValue()); assertThat(list(a, "?semesterId=" + s.get("id"))).isEmpty();
    }
    @Test void duplicateUpdateOrMoveRollsBackWithoutChangingOriginal() throws Exception {
        var a = account(); var s = semester(a, 1); var t = semester(a, 2); var c = create(a, s, "QA"); create(a, t, "QA"); var change = update(c); change.put("semesterId", t.get("id"));
        error(send("PUT", item(c), a.token, change), 409, "COURSE_ALREADY_EXISTS"); assertThat(data(send("GET", item(c), a.token, null))).isEqualTo(c);
        create(a, s, "OTHER"); change = update(c); change.put("code", " other "); error(send("PUT", item(c), a.token, change), 409, "COURSE_ALREADY_EXISTS");
    }
    @Test void staleUpdateAndDeletePreserveNewerState() throws Exception {
        var a = account(); var c = create(a, semester(a, 1), "QA"); var change = update(c); change.put("name", "Newer"); var newer = data(send("PUT", item(c), a.token, change));
        error(send("PUT", item(c), a.token, update(c)), 409, "COURSE_VERSION_CONFLICT"); error(send("DELETE", item(c) + "?version=" + c.get("version"), a.token, null), 409, "COURSE_VERSION_CONFLICT");
        assertThat(data(send("GET", item(c), a.token, null))).isEqualTo(newer);
    }
    @Test void invalidVersionAndMalformedIdentifiersCannotMutate() throws Exception {
        var a = account(); var c = create(a, semester(a, 1), "QA"); var change = update(c); change.remove("version"); error(send("PUT", item(c), a.token, change), 400, "VALIDATION_FAILED");
        change = update(c); change.put("version", -1); error(send("PUT", item(c), a.token, change), 400, "VALIDATION_FAILED");
        change.put("version", 0.5); assertThat(send("PUT", item(c), a.token, change).statusCode()).isEqualTo(400);
        assertThat(send("DELETE", item(c), a.token, null).statusCode()).isEqualTo(400); assertThat(send("DELETE", item(c) + "?version=-1", a.token, null).statusCode()).isEqualTo(400);
        assertThat(send("GET", PATH + "/not-a-uuid", a.token, null).statusCode()).isEqualTo(400); assertThat(send("GET", PATH + "?semesterId=bad", a.token, null).statusCode()).isEqualTo(400);
        assertThat(data(send("GET", item(c), a.token, null))).isEqualTo(c);
    }
    @Test void otherAccountCannotListReadUpdateDeleteOrUseForeignSemesterFilter() throws Exception {
        var a = account(); var b = account(); var s = semester(a, 1); var c = create(a, s, "QA"); assertThat(list(b, "")).isEmpty();
        error(send("GET", PATH + "?semesterId=" + s.get("id"), b.token, null), 404, "SEMESTER_NOT_FOUND");
        error(send("GET", item(c), b.token, null), 404, "COURSE_NOT_FOUND"); error(send("PUT", item(c), b.token, update(c)), 404, "COURSE_NOT_FOUND");
        error(send("DELETE", item(c) + "?version=0", b.token, null), 404, "COURSE_NOT_FOUND"); error(send("GET", PATH + "/" + UUID.randomUUID(), b.token, null), 404, "COURSE_NOT_FOUND");
        assertThat(data(send("GET", item(c), a.token, null))).isEqualTo(c);
    }
    @Test void cannotCreateOrMoveIntoAnotherAccountsSemester() throws Exception {
        var a = account(); var b = account(); var foreign = semester(b, 1); var c = create(a, semester(a, 1), "QA");
        error(send("POST", PATH, a.token, input(foreign, "HACK")), 404, "SEMESTER_NOT_FOUND");
        var change = update(c); change.put("semesterId", foreign.get("id")); error(send("PUT", item(c), a.token, change), 404, "SEMESTER_NOT_FOUND");
        change.put("semesterId", UUID.randomUUID().toString()); error(send("PUT", item(c), a.token, change), 404, "SEMESTER_NOT_FOUND"); assertThat(data(send("GET", item(c), a.token, null))).isEqualTo(c);
    }
    @Test void suppliedOwnerDoesNotChangeAuthenticatedOwnership() throws Exception {
        var a = account(); var b = account(); var values = input(semester(a, 1), "QA"); values.put("userId", b.id.toString()); var r = send("POST", PATH, a.token, values);
        if (r.statusCode() == 201) assertThat(jdbc.queryForObject("SELECT user_id FROM courses WHERE id=?", UUID.class, UUID.fromString(data(r).get("id").toString()))).isEqualTo(a.id);
        else assertThat(r.statusCode()).isEqualTo(400); assertThat(list(b, "")).isEmpty();
    }
    @Test void deletingCourseLeavesParentAndOtherCoursesAndUnblocksEmptySemester() throws Exception {
        var a = account(); var s = semester(a, 1); var c = create(a, s, "QA"); var other = create(a, s, "QB");
        error(send("DELETE", SEMESTERS + "/" + s.get("id") + "?version=0", a.token, null), 409, "SEMESTER_HAS_COURSES");
        var deleted = send("DELETE", item(c) + "?version=0", a.token, null); assertThat(deleted.statusCode()).isEqualTo(204); assertThat(deleted.body()).isEmpty();
        error(send("GET", item(c), a.token, null), 404, "COURSE_NOT_FOUND"); assertThat(data(send("GET", item(other), a.token, null))).isEqualTo(other);
        send("DELETE", item(other) + "?version=0", a.token, null); assertThat(send("DELETE", SEMESTERS + "/" + s.get("id") + "?version=0", a.token, null).statusCode()).isEqualTo(204);
    }
    @Test void missingAndRevokedTokensBlockAllMethodsAndUnopenedRoutesStayClosed() throws Exception {
        var a = account(); var c = create(a, semester(a, 1), "QA");
        for (String method : List.of("GET", "POST", "PUT", "DELETE")) error(send(method, method.equals("PUT") || method.equals("DELETE") ? item(c) + "?version=0" : PATH, null, method.equals("POST") || method.equals("PUT") ? update(c) : null), 401, "AUTHENTICATION_REQUIRED");
        assertThat(send("PATCH", item(c), a.token, Map.of()).statusCode()).isEqualTo(403); assertThat(send("GET", "/api/v1/assignments", a.token, null).statusCode()).isEqualTo(403);
        jdbc.update("UPDATE refresh_sessions SET revoked_at=now(),revocation_reason='LOGOUT' WHERE user_id=?", a.id); assertThat(send("GET", PATH, a.token, null).statusCode()).isEqualTo(401);
    }
    @Test void browserBearerWorksButCookieAloneAndUntrustedOriginDoNot() throws Exception {
        var a = account(); var s = semester(a, 1); String payload = json.writeValueAsString(input(s, "QA"));
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + PATH)).header("Origin", "http://localhost:8092").header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + a.token).POST(HttpRequest.BodyPublishers.ofString(payload)).build();
        var r = client.send(request, HttpResponse.BodyHandlers.ofString()); assertThat(r.statusCode()).as(r.body()).isEqualTo(201); assertThat(r.headers().allValues("Set-Cookie")).isEmpty();
        var cookie = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + PATH)).header("Cookie", "FOCUS_REFRESH=not-a-bearer").GET().build();
        error(client.send(cookie, HttpResponse.BodyHandlers.ofString()), 401, "AUTHENTICATION_REQUIRED");
        var foreign = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + PATH)).header("Origin", "https://untrusted.example").header("Authorization", "Bearer " + a.token).GET().build();
        assertThat(client.send(foreign, HttpResponse.BodyHandlers.ofString()).statusCode()).isEqualTo(403);
    }
    @Test void concurrentDuplicateCreatesProduceOneConflict() throws Exception {
        var a = account(); var s = semester(a, 1); var results = concurrent(() -> send("POST", PATH, a.token, input(s, "qa")), () -> send("POST", PATH, a.token, input(s, " QA ")));
        assertThat(results.stream().map(HttpResponse::statusCode).sorted().toList()).containsExactly(201, 409); assertThat(list(a, "")).hasSize(1);
    }
    @Test void concurrentEditsCannotLoseChanges() throws Exception {
        var a = account(); var c = create(a, semester(a, 1), "QA"); var first = update(c); first.put("name", "First"); var second = update(c); second.put("name", "Second");
        var results = concurrent(() -> send("PUT", item(c), a.token, first), () -> send("PUT", item(c), a.token, second)); assertThat(results.stream().map(HttpResponse::statusCode).sorted().toList()).containsExactly(200, 409);
    }
    @Test void concurrentSemesterDeleteAndCourseCreateNeverLeaveOrphans() throws Exception {
        var a = account(); var s = semester(a, 1);
        var results = concurrent(() -> send("DELETE", SEMESTERS + "/" + s.get("id") + "?version=0", a.token, null), () -> send("POST", PATH, a.token, input(s, "QA")));
        assertThat(results.getFirst().statusCode()).isIn(204, 409);
        if (results.getFirst().statusCode() == 204) { error(results.getLast(), 404, "SEMESTER_NOT_FOUND"); assertThat(list(a, "")).isEmpty(); }
        else { assertThat(results.getLast().statusCode()).isEqualTo(201); assertThat(list(a, "")).hasSize(1); }
    }
    @Test void concurrentMoveAndTargetSemesterDeleteStayConsistent() throws Exception {
        var a = account(); var s = semester(a, 1); var target = semester(a, 2); var c = create(a, s, "QA"); var change = update(c); change.put("semesterId", target.get("id"));
        var results = concurrent(() -> send("DELETE", SEMESTERS + "/" + target.get("id") + "?version=0", a.token, null), () -> send("PUT", item(c), a.token, change));
        if (results.getFirst().statusCode() == 204) { error(results.getLast(), 404, "SEMESTER_NOT_FOUND"); assertThat(data(send("GET", item(c), a.token, null)).get("semesterId")).isEqualTo(s.get("id")); }
        else { error(results.getFirst(), 409, "SEMESTER_HAS_COURSES"); assertThat(results.getLast().statusCode()).isEqualTo(200); }
    }
    private List<HttpResponse<String>> concurrent(Callable<HttpResponse<String>> first, Callable<HttpResponse<String>> second) throws Exception {
        var gate = new CountDownLatch(1);
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            var a = pool.submit(() -> { gate.await(); return first.call(); }); var b = pool.submit(() -> { gate.await(); return second.call(); }); gate.countDown();
            return List.of(a.get(20, TimeUnit.SECONDS), b.get(20, TimeUnit.SECONDS));
        }
    }
    @Test @EnabledOnOs(OS.WINDOWS)
    void powershell51GuideCreatesReadsFiltersUpdatesDeletesAndClosesOnlyItsOwnSessions() throws Exception {
        var a = account(); var s = semester(a, 1); String email = jdbc.queryForObject("SELECT email FROM app_users WHERE id=?", String.class, a.id);
        String ps = Path.of(System.getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "powershell.exe").toString(); String id = null; long version = 0;
        for (String mode : List.of("Create", "List", "Get", "Update", "Delete")) {
            String script = "[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); function Read-Host { param([string]$Prompt,[switch]$AsSecureString); if ($AsSecureString) { ConvertTo-SecureString $env:COURSE_TEST_PASSWORD -AsPlainText -Force } else { $env:COURSE_TEST_EMAIL } }; "
                    + "& './scripts/Try-Courses.ps1' -BaseUrl 'http://127.0.0.1:" + port + "' -Mode " + mode + " -SemesterId '" + s.get("id") + "' -Code 'qa' -Name 'Course guide'"
                    + (mode.equals("Get") || mode.equals("Update") || mode.equals("Delete") ? " -CourseId '" + id + "' -Version " + version : "")
                    + (mode.equals("Update") ? " -Description 'Updated from PowerShell'" : "");
            var builder = new ProcessBuilder(ps, "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script).redirectErrorStream(true);
            builder.environment().keySet().removeIf(name -> name.equalsIgnoreCase("PSModulePath"));
            builder.environment().put("PSModulePath", Path.of(System.getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "Modules").toString());
            builder.environment().put("COURSE_TEST_EMAIL", email); builder.environment().put("COURSE_TEST_PASSWORD", SECRET);
            var process = builder.start();
            try {
                assertThat(process.waitFor(30, TimeUnit.SECONDS)).isTrue(); String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                assertThat(process.exitValue()).as(output).isZero(); assertThat(output).doesNotContain(SECRET, "accessToken", "refreshToken");
                if (!mode.equals("Delete")) {
                    var current = jdbc.queryForMap("SELECT id,version,description FROM courses WHERE user_id=?", a.id); id = current.get("id").toString(); version = ((Number) current.get("version")).longValue();
                    if (mode.equals("Update")) assertThat(current.get("description")).isEqualTo("Updated from PowerShell");
                }
            } finally { if (process.isAlive()) process.destroyForcibly(); }
        }
        assertThat(list(a, "")).isEmpty(); assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL", Integer.class, a.id)).isEqualTo(1);
    }
}
