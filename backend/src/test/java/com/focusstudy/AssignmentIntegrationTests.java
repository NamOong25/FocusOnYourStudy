package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.time.*;
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
class AssignmentIntegrationTests {
    private static final String SCHEMA = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
    private static final String URL = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Run Test-Local.ps1");
    private static final String USER = System.getenv("TEST_DB_USER"), PASSWORD = System.getenv("TEST_DB_PASSWORD");
    private static final String SECRET = "AssignmentTest123!", PATH = "/api/v1/assignments", COURSES = "/api/v1/courses";
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
        String email = "assignment-" + UUID.randomUUID() + "@example.test";
        var registered = data(send("POST", "/api/v1/auth/register", null, Map.of("email", email, "fullName", "Kiểm thử bài tập", "password", SECRET, "confirmPassword", SECRET)));
        var pair = data(send("POST", "/api/v1/auth/login", null, Map.of("email", email, "password", SECRET)));
        return new Account(pair.get("accessToken").toString(), UUID.fromString(registered.get("id").toString()));
    }
    Map<?, ?> semester(Account a, int term) throws Exception { return data(send("POST", "/api/v1/semesters", a.token, Map.of("term", term, "startYear", 2026, "status", "UPCOMING"))); }
    Map<?, ?> course(Account a, Map<?, ?> semester, String code) throws Exception { return data(send("POST", COURSES, a.token, Map.of("semesterId", semester.get("id"), "code", code, "name", "Môn kiểm thử", "credits", 3))); }
    Map<String, Object> input(Map<?, ?> course) { return new HashMap<>(Map.of("courseId", course.get("id"), "title", "Bài kiểm thử", "dueAt", "2026-10-30T23:59:00+07:00")); }
    Map<?, ?> create(Account a, Map<?, ?> course) throws Exception { return data(send("POST", PATH, a.token, input(course))); }
    Map<String, Object> update(Map<?, ?> assignment) {
        var result = new HashMap<String, Object>();
        for (String key : List.of("courseId", "title", "dueAt", "priority", "status", "notes", "version")) result.put(key, assignment.get(key)); return result;
    }
    Map<String, Object> courseUpdate(Map<?, ?> course) {
        var result = new HashMap<String, Object>();
        for (String key : List.of("semesterId", "code", "name", "credits", "teacher", "room", "status", "color", "description", "version")) result.put(key, course.get(key)); return result;
    }
    String item(Map<?, ?> assignment) { return PATH + "/" + assignment.get("id"); }
    void error(HttpResponse<String> r, int status, String code) {
        assertThat(r.statusCode()).as(r.body()).isEqualTo(status); assertThat(body(r).get("code")).isEqualTo(code);
        assertThat(r.body()).doesNotContain("password_hash", "org.hibernate", "SELECT ", "INSERT ", SECRET);
    }
    @Test void emptyCatalogueAndOwnedEmptyFiltersReturnEnvelopes() throws Exception {
        var a = account(); var s = semester(a, 1); var c = course(a, s, "QA");
        assertThat(list(a, "")).isEmpty(); assertThat(list(a, "?courseId=" + c.get("id"))).isEmpty(); assertThat(list(a, "?semesterId=" + s.get("id") + "&status=TODO")).isEmpty();
        var r = send("GET", PATH, a.token, null); assertThat(body(r).get("meta")).isNotNull(); assertThat(r.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
    }
    @Test void createNormalizesTextDefaultsEnumsAndPersistsExactUtcDeadline() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var values = input(c); values.put("title", "  Báo cáo Web  "); values.put("notes", "  Yêu cầu\nDòng tiếp theo  ");
        var r = send("POST", PATH, a.token, values); var assignment = data(r);
        assertThat(r.statusCode()).isEqualTo(201); assertThat(r.headers().firstValue("Location")).contains(item(assignment));
        assertThat(assignment.get("title")).isEqualTo("Báo cáo Web"); assertThat(assignment.get("notes")).isEqualTo("Yêu cầu\nDòng tiếp theo");
        assertThat(assignment.get("priority")).isEqualTo("MEDIUM"); assertThat(assignment.get("status")).isEqualTo("TODO");
        assertThat(assignment.get("dueAt")).isEqualTo("2026-10-30T16:59:00Z");
        for (String field : List.of("userId", "passwordHash", "course")) assertThat(assignment.containsKey(field)).isFalse();
        assertThat(data(send("GET", item(assignment), a.token, null))).isEqualTo(assignment);
        assertThat(jdbc.queryForObject("SELECT due_at FROM assignments WHERE id=? AND user_id=?", OffsetDateTime.class, UUID.fromString(assignment.get("id").toString()), a.id).toInstant()).isEqualTo(Instant.parse("2026-10-30T16:59:00Z"));
    }
    @Test void offsetEquivalencePrecisionAndPastDeadlinesDoNotChangeTaskStatus() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA");
        for (String due : List.of("2026-10-30T23:59:00+07:00", "2026-10-30T16:59:00Z", "2026-10-30T12:59:00-04:00")) {
            var values = input(c); values.put("dueAt", due); assertThat(data(send("POST", PATH, a.token, values)).get("dueAt")).isEqualTo("2026-10-30T16:59:00Z");
        }
        var values = input(c); values.put("dueAt", "2000-01-01T00:00:00.123456789Z"); var task = data(send("POST", PATH, a.token, values));
        assertThat(task.get("dueAt")).isEqualTo("2000-01-01T00:00:00.123456Z"); assertThat(data(send("GET", item(task), a.token, null))).isEqualTo(task); assertThat(task.get("status")).isEqualTo("TODO");
    }
    @Test void invalidMissingAndOversizedFieldsNeverWrite() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA");
        for (String field : List.of("courseId", "title", "dueAt")) { var values = input(c); values.remove(field); error(send("POST", PATH, a.token, values), 400, "VALIDATION_FAILED"); }
        for (var entry : Map.of("title", " ", "notes", "x".repeat(5001)).entrySet()) { var values = input(c); values.put(entry.getKey(), entry.getValue()); error(send("POST", PATH, a.token, values), 400, "VALIDATION_FAILED"); }
        var values = input(c); values.put("title", "x".repeat(201)); error(send("POST", PATH, a.token, values), 400, "VALIDATION_FAILED");
        assertThat(list(a, "")).isEmpty();
    }
    @Test void ambiguousInvalidCalendarAndOutOfRangeDeadlinesAreRejected() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA");
        for (Object due : List.of("", "2026-10-30", "2026-10-30T23:59:00", "2026-02-30T12:00:00+07:00", "2026-10-30T24:30:00Z", "1899-12-31T23:59:59Z", "2100-01-01T00:00:00Z", "infinity", 1793379540)) {
            var values = input(c); values.put("dueAt", due); assertThat(send("POST", PATH, a.token, values).statusCode()).as(due.toString()).isEqualTo(400);
        } assertThat(list(a, "")).isEmpty();
    }
    @Test void invalidEnumsIdentifiersAndVersionsReturn400() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA");
        for (String field : List.of("priority", "status")) { var values = input(c); values.put(field, "WRONG"); assertThat(send("POST", PATH, a.token, values).statusCode()).isEqualTo(400); }
        var task = create(a, c); var change = update(task); change.remove("version"); error(send("PUT", item(task), a.token, change), 400, "VALIDATION_FAILED");
        change = update(task); change.put("version", -1); error(send("PUT", item(task), a.token, change), 400, "VALIDATION_FAILED");
        change.put("version", 0.5); assertThat(send("PUT", item(task), a.token, change).statusCode()).isEqualTo(400);
        for (String suffix : List.of("?courseId=bad", "?semesterId=bad", "?status=bad", "/not-a-uuid")) assertThat(send("GET", PATH + suffix, a.token, null).statusCode()).isEqualTo(400);
        assertThat(send("DELETE", item(task), a.token, null).statusCode()).isEqualTo(400); assertThat(send("DELETE", item(task) + "?version=-1", a.token, null).statusCode()).isEqualTo(400);
        assertThat(data(send("GET", item(task), a.token, null))).isEqualTo(task);
    }
    @Test void duplicateTitlesAreIndependentAssignmentsAndDatesSortStably() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var first = create(a, c); var second = create(a, c);
        assertThat(second.get("id")).isNotEqualTo(first.get("id")); var values = input(c); values.put("dueAt", "2026-10-29T01:00:00Z"); var early = data(send("POST", PATH, a.token, values));
        var rows = list(a, ""); assertThat(((Map<?, ?>) rows.getFirst()).get("id")).isEqualTo(early.get("id"));
        assertThat(rows.subList(1, 3).stream().map(v -> ((Map<?, ?>) v).get("id").toString()).toList()).containsExactlyElementsOf(List.of(first.get("id").toString(), second.get("id").toString()).stream().sorted().toList());
    }
    @Test void listCombinesCourseSemesterAndStatusWithinOwner() throws Exception {
        var a = account(); var s = semester(a, 1); var t = semester(a, 2); var c = course(a, s, "QA"); var d = course(a, t, "QB"); create(a, c);
        var values = input(d); values.put("status", "IN_PROGRESS"); var working = data(send("POST", PATH, a.token, values));
        assertThat(list(a, "?semesterId=" + t.get("id") + "&courseId=" + d.get("id") + "&status=IN_PROGRESS")).hasSize(1);
        assertThat(list(a, "?semesterId=" + s.get("id") + "&courseId=" + d.get("id"))).isEmpty(); assertThat(list(a, "?status=COMPLETED")).isEmpty();
        assertThat(((Map<?, ?>) list(a, "?status=IN_PROGRESS").getFirst()).get("id")).isEqualTo(working.get("id"));
    }
    @Test void updateEditsEveryFieldAndCanReassignOnlyToOwnedCourse() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var d = course(a, semester(a, 2), "QB"); var task = create(a, c); var change = update(task);
        change.putAll(Map.of("courseId", d.get("id"), "title", "  Bài mới  ", "dueAt", "2026-11-01T10:30:00+07:00", "priority", "HIGH", "status", "COMPLETED", "notes", "  Đã hoàn thành  "));
        var newer = data(send("PUT", item(task), a.token, change)); assertThat(newer.get("id")).isEqualTo(task.get("id")); assertThat(newer.get("courseId")).isEqualTo(d.get("id"));
        assertThat(newer.get("title")).isEqualTo("Bài mới"); assertThat(newer.get("notes")).isEqualTo("Đã hoàn thành"); assertThat(newer.get("dueAt")).isEqualTo("2026-11-01T03:30:00Z");
        assertThat(newer.get("priority")).isEqualTo("HIGH"); assertThat(newer.get("status")).isEqualTo("COMPLETED"); assertThat(newer.get("createdAt")).isEqualTo(task.get("createdAt"));
        assertThat(((Number) newer.get("version")).longValue()).isGreaterThan(((Number) task.get("version")).longValue()); assertThat(list(a, "?courseId=" + c.get("id"))).isEmpty();
    }
    @Test void staleUpdateAndDeleteNeverOverwriteNewerTask() throws Exception {
        var a = account(); var task = create(a, course(a, semester(a, 1), "QA")); var change = update(task); change.put("title", "Newer"); var newer = data(send("PUT", item(task), a.token, change));
        error(send("PUT", item(task), a.token, update(task)), 409, "ASSIGNMENT_VERSION_CONFLICT"); error(send("DELETE", item(task) + "?version=" + task.get("version"), a.token, null), 409, "ASSIGNMENT_VERSION_CONFLICT");
        assertThat(data(send("GET", item(task), a.token, null))).isEqualTo(newer);
    }
    @Test void otherAccountCannotReadWriteDeleteFilterOrTakeOwnership() throws Exception {
        var a = account(); var b = account(); var s = semester(a, 1); var c = course(a, s, "QA"); var task = create(a, c); assertThat(list(b, "")).isEmpty();
        error(send("GET", item(task), b.token, null), 404, "ASSIGNMENT_NOT_FOUND"); error(send("PUT", item(task), b.token, update(task)), 404, "ASSIGNMENT_NOT_FOUND");
        error(send("DELETE", item(task) + "?version=0", b.token, null), 404, "ASSIGNMENT_NOT_FOUND"); error(send("GET", PATH + "/" + UUID.randomUUID(), b.token, null), 404, "ASSIGNMENT_NOT_FOUND");
        error(send("GET", PATH + "?courseId=" + c.get("id"), b.token, null), 404, "COURSE_NOT_FOUND"); error(send("GET", PATH + "?semesterId=" + s.get("id"), b.token, null), 404, "SEMESTER_NOT_FOUND");
        assertThat(data(send("GET", item(task), a.token, null))).isEqualTo(task);
    }
    @Test void cannotCreateOrReassignIntoForeignOrMissingCourse() throws Exception {
        var a = account(); var b = account(); var foreign = course(b, semester(b, 1), "FOREIGN"); var task = create(a, course(a, semester(a, 1), "QA"));
        for (String target : List.of(foreign.get("id").toString(), UUID.randomUUID().toString())) {
            var values = update(task); values.put("courseId", target); error(send("PUT", item(task), a.token, values), 404, "COURSE_NOT_FOUND");
            values.remove("version"); error(send("POST", PATH, a.token, values), 404, "COURSE_NOT_FOUND");
        } assertThat(data(send("GET", item(task), a.token, null))).isEqualTo(task);
    }
    @Test void submittedOwnerAndFilterNeverOverrideAuthenticatedOwner() throws Exception {
        var a = account(); var b = account(); var values = input(course(a, semester(a, 1), "QA")); values.put("userId", b.id.toString()); var r = send("POST", PATH, a.token, values);
        if (r.statusCode() == 201) assertThat(jdbc.queryForObject("SELECT user_id FROM assignments WHERE id=?", UUID.class, UUID.fromString(data(r).get("id").toString()))).isEqualTo(a.id);
        else assertThat(r.statusCode()).isEqualTo(400); assertThat(list(b, "?userId=" + a.id)).isEmpty();
    }
    @Test void deletionPreservesCourseSemesterAndOtherAssignments() throws Exception {
        var a = account(); var s = semester(a, 1); var c = course(a, s, "QA"); var first = create(a, c); var other = create(a, c);
        var r = send("DELETE", item(first) + "?version=0", a.token, null); assertThat(r.statusCode()).isEqualTo(204); assertThat(r.body()).isEmpty();
        error(send("GET", item(first), a.token, null), 404, "ASSIGNMENT_NOT_FOUND"); assertThat(data(send("GET", item(other), a.token, null))).isEqualTo(other);
        assertThat(send("GET", COURSES + "/" + c.get("id"), a.token, null).statusCode()).isEqualTo(200); assertThat(send("GET", "/api/v1/semesters/" + s.get("id"), a.token, null).statusCode()).isEqualTo(200);
    }
    @Test void assignmentsBlockCourseDeletionAndSemesterTransferButNotOrdinaryEdits() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var target = semester(a, 2); var task = create(a, c);
        error(send("DELETE", COURSES + "/" + c.get("id") + "?version=0", a.token, null), 409, "COURSE_HAS_ASSIGNMENTS");
        var move = courseUpdate(c); move.put("semesterId", target.get("id")); error(send("PUT", COURSES + "/" + c.get("id"), a.token, move), 409, "COURSE_HAS_ASSIGNMENTS");
        var edit = courseUpdate(c); edit.put("name", "Tên mới"); var updatedCourse = data(send("PUT", COURSES + "/" + c.get("id"), a.token, edit));
        assertThat(data(send("GET", item(task), a.token, null))).isEqualTo(task);
        send("DELETE", item(task) + "?version=0", a.token, null); move = courseUpdate(updatedCourse); move.put("semesterId", target.get("id"));
        var moved = data(send("PUT", COURSES + "/" + c.get("id"), a.token, move)); assertThat(send("DELETE", COURSES + "/" + c.get("id") + "?version=" + moved.get("version"), a.token, null).statusCode()).isEqualTo(204);
    }
    @Test void completedAssignmentStillProtectsParentAndReassignmentUnblocksOldCourse() throws Exception {
        var a = account(); var s = semester(a, 1); var c = course(a, s, "QA"); var d = course(a, s, "QB"); var task = create(a, c); var change = update(task); change.put("status", "COMPLETED");
        var done = data(send("PUT", item(task), a.token, change)); error(send("DELETE", COURSES + "/" + c.get("id") + "?version=0", a.token, null), 409, "COURSE_HAS_ASSIGNMENTS");
        change = update(done); change.put("courseId", d.get("id")); data(send("PUT", item(task), a.token, change)); assertThat(send("DELETE", COURSES + "/" + c.get("id") + "?version=0", a.token, null).statusCode()).isEqualTo(204);
    }
    @Test void missingRevokedTokensAndUnopenedRoutesStayProtected() throws Exception {
        var a = account(); var task = create(a, course(a, semester(a, 1), "QA"));
        for (String method : List.of("GET", "POST", "PUT", "DELETE")) error(send(method, method.equals("PUT") || method.equals("DELETE") ? item(task) + "?version=0" : PATH, null, method.equals("POST") || method.equals("PUT") ? update(task) : null), 401, "AUTHENTICATION_REQUIRED");
        assertThat(send("PATCH", item(task), a.token, Map.of()).statusCode()).isEqualTo(403); assertThat(send("GET", "/api/v1/grades", a.token, null).statusCode()).isEqualTo(403);
        jdbc.update("UPDATE refresh_sessions SET revoked_at=now(),revocation_reason='LOGOUT' WHERE user_id=?", a.id); assertThat(send("GET", PATH, a.token, null).statusCode()).isEqualTo(401);
    }
    @Test void browserBearerAllowsRequestsButCookieAndUntrustedOriginDoNot() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA");
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + PATH)).header("Origin", "http://localhost:8092").header("Content-Type", "application/json").header("Authorization", "Bearer " + a.token)
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(input(c)))).build();
        var r = client.send(request, HttpResponse.BodyHandlers.ofString()); assertThat(r.statusCode()).as(r.body()).isEqualTo(201); assertThat(r.headers().allValues("Set-Cookie")).isEmpty();
        var cookie = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + PATH)).header("Cookie", "FOCUS_REFRESH=not-bearer").GET().build(); error(client.send(cookie, HttpResponse.BodyHandlers.ofString()), 401, "AUTHENTICATION_REQUIRED");
        var foreign = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + PATH)).header("Origin", "https://untrusted.example").header("Authorization", "Bearer " + a.token).GET().build(); assertThat(client.send(foreign, HttpResponse.BodyHandlers.ofString()).statusCode()).isEqualTo(403);
    }
    @Test void databaseCompositeForeignKeyAndChecksProtectDirectWrites() throws Exception {
        var a = account(); var b = account(); var c = course(a, semester(a, 1), "QA"); var task = create(a, c); var id = UUID.fromString(task.get("id").toString());
        assertThatThrownBy(() -> jdbc.update("UPDATE assignments SET user_id=? WHERE id=?", b.id, id)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update("UPDATE assignments SET status='UNKNOWN' WHERE id=?", id)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update("UPDATE assignments SET title=' ' WHERE id=?", id)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update("UPDATE assignments SET due_at='infinity' WHERE id=?", id)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update("DELETE FROM courses WHERE id=?", UUID.fromString(c.get("id").toString()))).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThat(data(send("GET", item(task), a.token, null))).isEqualTo(task);
    }
    @Test void concurrentEditsProduceOneVersionConflict() throws Exception {
        var a = account(); var task = create(a, course(a, semester(a, 1), "QA")); var first = update(task); first.put("title", "First"); var second = update(task); second.put("title", "Second");
        var results = concurrent(() -> send("PUT", item(task), a.token, first), () -> send("PUT", item(task), a.token, second)); assertThat(results.stream().map(HttpResponse::statusCode).sorted().toList()).containsExactly(200, 409);
    }
    @Test void concurrentDeleteAndEditCannotResurrectOrOverwrite() throws Exception {
        var a = account(); var task = create(a, course(a, semester(a, 1), "QA")); var change = update(task); change.put("title", "Changed");
        var results = concurrent(() -> send("DELETE", item(task) + "?version=0", a.token, null), () -> send("PUT", item(task), a.token, change));
        if (results.getFirst().statusCode() == 204) { error(results.getLast(), 404, "ASSIGNMENT_NOT_FOUND"); assertThat(list(a, "")).isEmpty(); }
        else { error(results.getFirst(), 409, "ASSIGNMENT_VERSION_CONFLICT"); assertThat(results.getLast().statusCode()).isEqualTo(200); assertThat(list(a, "")).hasSize(1); }
    }
    @Test void concurrentCourseDeleteAndAssignmentCreateNeverLeaveOrphans() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var results = concurrent(() -> send("DELETE", COURSES + "/" + c.get("id") + "?version=0", a.token, null), () -> send("POST", PATH, a.token, input(c)));
        if (results.getFirst().statusCode() == 204) { error(results.getLast(), 404, "COURSE_NOT_FOUND"); assertThat(list(a, "")).isEmpty(); }
        else { error(results.getFirst(), 409, "COURSE_HAS_ASSIGNMENTS"); assertThat(results.getLast().statusCode()).isEqualTo(201); assertThat(list(a, "")).hasSize(1); }
    }
    @Test void concurrentCourseMoveAndAssignmentCreateRespectCommitOrder() throws Exception {
        var a = account(); var s = semester(a, 1); var target = semester(a, 2); var c = course(a, s, "QA"); var move = courseUpdate(c); move.put("semesterId", target.get("id"));
        var results = concurrent(() -> send("PUT", COURSES + "/" + c.get("id"), a.token, move), () -> send("POST", PATH, a.token, input(c))); assertThat(results.getLast().statusCode()).isEqualTo(201);
        if (results.getFirst().statusCode() == 200) assertThat(list(a, "?semesterId=" + target.get("id"))).hasSize(1);
        else { error(results.getFirst(), 409, "COURSE_HAS_ASSIGNMENTS"); assertThat(list(a, "?semesterId=" + s.get("id"))).hasSize(1); }
    }
    @Test void concurrentReassignmentAndTargetCourseDeleteStayConsistent() throws Exception {
        var a = account(); var s = semester(a, 1); var c = course(a, s, "QA"); var target = course(a, s, "QB"); var task = create(a, c); var change = update(task); change.put("courseId", target.get("id"));
        var results = concurrent(() -> send("DELETE", COURSES + "/" + target.get("id") + "?version=0", a.token, null), () -> send("PUT", item(task), a.token, change));
        if (results.getFirst().statusCode() == 204) { error(results.getLast(), 404, "COURSE_NOT_FOUND"); assertThat(data(send("GET", item(task), a.token, null)).get("courseId")).isEqualTo(c.get("id")); }
        else { error(results.getFirst(), 409, "COURSE_HAS_ASSIGNMENTS"); assertThat(results.getLast().statusCode()).isEqualTo(200); }
    }
    private List<HttpResponse<String>> concurrent(Callable<HttpResponse<String>> first, Callable<HttpResponse<String>> second) throws Exception {
        var gate = new CountDownLatch(1);
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            var a = pool.submit(() -> { gate.await(); return first.call(); }); var b = pool.submit(() -> { gate.await(); return second.call(); }); gate.countDown();
            return List.of(a.get(20, TimeUnit.SECONDS), b.get(20, TimeUnit.SECONDS));
        }
    }
    @Test @EnabledOnOs(OS.WINDOWS)
    void powershell51GuideCreatesFiltersReadsUpdatesDeletesAndClosesOwnSessions() throws Exception {
        var a = account(); var s = semester(a, 1); var c = course(a, s, "QA"); String email = jdbc.queryForObject("SELECT email FROM app_users WHERE id=?", String.class, a.id);
        String ps = Path.of(System.getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "powershell.exe").toString(); String id = null; long version = 0;
        for (String mode : List.of("Create", "List", "Get", "Update", "Delete")) {
            String script = "[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); function Read-Host { param([string]$Prompt,[switch]$AsSecureString); if ($AsSecureString) { ConvertTo-SecureString $env:ASSIGNMENT_TEST_PASSWORD -AsPlainText -Force } else { $env:ASSIGNMENT_TEST_EMAIL } }; "
                    + "& './scripts/Try-Assignments.ps1' -BaseUrl 'http://127.0.0.1:" + port + "' -Mode " + mode + " -CourseId '" + c.get("id") + "' -Title 'Assignment guide' -DueAt '2026-10-30T23:59:00+07:00'"
                    + (mode.equals("Get") || mode.equals("Update") || mode.equals("Delete") ? " -AssignmentId '" + id + "' -Version " + version : "")
                    + (mode.equals("List") ? " -SemesterId '" + s.get("id") + "' -FilterStatus TODO" : "")
                    + (mode.equals("Update") ? " -Notes 'Updated from PowerShell' -Status IN_PROGRESS -Priority HIGH" : "");
            var builder = new ProcessBuilder(ps, "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script).redirectErrorStream(true);
            builder.environment().keySet().removeIf(name -> name.equalsIgnoreCase("PSModulePath"));
            builder.environment().put("PSModulePath", Path.of(System.getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "Modules").toString());
            builder.environment().put("ASSIGNMENT_TEST_EMAIL", email); builder.environment().put("ASSIGNMENT_TEST_PASSWORD", SECRET);
            var process = builder.start();
            try {
                assertThat(process.waitFor(30, TimeUnit.SECONDS)).isTrue(); String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                assertThat(process.exitValue()).as(output).isZero(); assertThat(output).doesNotContain(SECRET, "accessToken", "refreshToken");
                if (!mode.equals("Delete")) {
                    var current = jdbc.queryForMap("SELECT id,version,notes,due_at,status FROM assignments WHERE user_id=?", a.id); id = current.get("id").toString(); version = ((Number) current.get("version")).longValue();
                    assertThat(((java.sql.Timestamp) current.get("due_at")).toInstant()).isEqualTo(Instant.parse("2026-10-30T16:59:00Z"));
                    if (mode.equals("Update")) { assertThat(current.get("notes")).isEqualTo("Updated from PowerShell"); assertThat(current.get("status")).isEqualTo("IN_PROGRESS"); }
                }
            } finally { if (process.isAlive()) process.destroyForcibly(); }
        }
        assertThat(list(a, "")).isEmpty(); assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL", Integer.class, a.id)).isEqualTo(1);
    }
}
