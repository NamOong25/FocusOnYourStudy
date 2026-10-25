package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import java.net.*;
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
import org.springframework.test.context.*;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DirtiesContext
class StudyIntegrationTests {
    private static final String SCHEMA = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
    private static final String URL = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Run Test-Local.ps1");
    private static final String USER = System.getenv("TEST_DB_USER"), PASSWORD = System.getenv("TEST_DB_PASSWORD");
    private static final String SECRET = "StudyTest123!", PATH = "/api/v1/study-sessions", TASKS = "/api/v1/assignments", COURSES = "/api/v1/courses";
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    private final HttpClient client = HttpClient.newHttpClient();
    record Account(String token, UUID id) { }
    @DynamicPropertySource static void configure(DynamicPropertyRegistry r) {
        TestJwtResources.configure(r);
        r.add("spring.datasource.url", () -> URL + (URL.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA);
        r.add("spring.datasource.username", () -> USER); r.add("spring.datasource.password", () -> PASSWORD);
        r.add("spring.flyway.default-schema", () -> SCHEMA); r.add("spring.flyway.schemas", () -> SCHEMA);
        for (String route : List.of("login", "register", "refresh", "logout")) r.add("app.auth.rate-limit." + route + "-per-minute", () -> 1000);
    }
    @AfterAll static void cleanup() throws Exception {
        if (!SCHEMA.matches("backend_it_[a-f0-9]{32}")) throw new IllegalStateException("Unsafe test schema");
        try (var c = DriverManager.getConnection(URL, USER, PASSWORD); var statement = c.createStatement()) { statement.execute("DROP SCHEMA " + SCHEMA + " CASCADE"); }
    }
    HttpResponse<String> send(String method, String path, String token, Object input) throws Exception {
        var r = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).timeout(Duration.ofSeconds(15));
        if (token != null) r.header("Authorization", "Bearer " + token);
        if (input != null) r.header("Content-Type", "application/json");
        return client.send(r.method(method, input == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(input))).build(), HttpResponse.BodyHandlers.ofString());
    }
    Map<?, ?> body(HttpResponse<String> r) { return json.readValue(r.body(), Map.class); }
    Map<?, ?> data(HttpResponse<String> r) { assertThat(r.statusCode()).as(r.body()).isIn(200, 201); return (Map<?, ?>) body(r).get("data"); }
    List<?> list(Account a, String query) throws Exception { var r = send("GET", PATH + query, a.token, null); assertThat(r.statusCode()).as(r.body()).isEqualTo(200); return (List<?>) body(r).get("data"); }
    Account account() throws Exception {
        String email = "study-" + UUID.randomUUID() + "@example.test";
        var user = data(send("POST", "/api/v1/auth/register", null, Map.of("email", email, "fullName", "Kiểm thử tự học", "password", SECRET, "confirmPassword", SECRET)));
        var pair = data(send("POST", "/api/v1/auth/login", null, Map.of("email", email, "password", SECRET)));
        return new Account(pair.get("accessToken").toString(), UUID.fromString(user.get("id").toString()));
    }
    Map<?, ?> semester(Account a, int term) throws Exception { return data(send("POST", "/api/v1/semesters", a.token, Map.of("term", term, "startYear", 2026, "status", "UPCOMING"))); }
    Map<?, ?> course(Account a, Map<?, ?> s, String code) throws Exception { return data(send("POST", COURSES, a.token, Map.of("semesterId", s.get("id"), "code", code, "name", "Môn tự học", "credits", 3))); }
    Map<?, ?> assignment(Account a, Map<?, ?> c) throws Exception { return data(send("POST", TASKS, a.token, Map.of("courseId", c.get("id"), "title", "Bài liên kết", "dueAt", "2026-10-30T23:59:00+07:00"))); }
    Map<String, Object> input(Map<?, ?> c) { return new HashMap<>(Map.of("courseId", c.get("id"), "title", "Buổi tự học", "startsAt", "2026-10-30T19:00:00+07:00", "timeZone", "Asia/Ho_Chi_Minh", "durationMinutes", 45)); }
    Map<?, ?> create(Account a, Map<?, ?> c) throws Exception { return data(send("POST", PATH, a.token, input(c))); }
    Map<String, Object> fields(Map<?, ?> row, String... keys) { var result = new HashMap<String, Object>(); for (String k : keys) result.put(k, row.get(k)); return result; }
    Map<String, Object> update(Map<?, ?> s) { return fields(s, "courseId", "assignmentId", "title", "startsAt", "timeZone", "durationMinutes", "status", "notes", "version"); }
    Map<String, Object> assignmentUpdate(Map<?, ?> t) { return fields(t, "courseId", "title", "dueAt", "priority", "status", "notes", "version"); }
    Map<String, Object> courseUpdate(Map<?, ?> c) { return fields(c, "semesterId", "code", "name", "credits", "teacher", "room", "status", "color", "description", "version"); }
    String item(Map<?, ?> s) { return PATH + "/" + s.get("id"); }
    String enc(String s) { return URLEncoder.encode(s, StandardCharsets.UTF_8); }
    void error(HttpResponse<String> r, int status, String code) {
        assertThat(r.statusCode()).as(r.body()).isEqualTo(status); assertThat(body(r).get("code")).isEqualTo(code);
        assertThat(r.body()).doesNotContain("password_hash", "org.hibernate", "SELECT ", "INSERT ", SECRET);
    }
    @Test void emptyListAndOwnedFiltersUseEnvelopeAndNoStore() throws Exception {
        var a = account(); var s = semester(a, 1); var c = course(a, s, "QA"); var t = assignment(a, c);
        assertThat(list(a, "")).isEmpty(); assertThat(list(a, "?courseId=" + c.get("id") + "&semesterId=" + s.get("id") + "&assignmentId=" + t.get("id") + "&status=PLANNED")).isEmpty();
        var r = send("GET", PATH, a.token, null); assertThat(body(r).get("meta")).isNotNull(); assertThat(r.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
    }
    @Test void independentCreationTrimsDefaultsAndComputesUtcEnd() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var values = input(c); values.put("title", "  Đọc tài liệu  "); values.put("notes", "  Ghi chú\nDòng hai  ");
        var r = send("POST", PATH, a.token, values); var s = data(r);
        assertThat(r.statusCode()).isEqualTo(201); assertThat(r.headers().firstValue("Location")).contains(item(s));
        assertThat(s.get("title")).isEqualTo("Đọc tài liệu"); assertThat(s.get("notes")).isEqualTo("Ghi chú\nDòng hai"); assertThat(s.get("status")).isEqualTo("PLANNED"); assertThat(s.get("assignmentId")).isNull();
        assertThat(s.get("startsAt")).isEqualTo("2026-10-30T12:00:00Z"); assertThat(s.get("endsAt")).isEqualTo("2026-10-30T12:45:00Z"); assertThat(s.get("timeZone")).isEqualTo("Asia/Ho_Chi_Minh");
        assertThat(data(send("GET", item(s), a.token, null))).isEqualTo(s);
        for (String key : List.of("userId", "focusedSeconds", "passwordHash")) assertThat(s.containsKey(key)).isFalse();
        assertThat(jdbc.queryForObject("SELECT starts_at FROM study_sessions WHERE id=?", OffsetDateTime.class, UUID.fromString(s.get("id").toString())).toInstant()).isEqualTo(Instant.parse("2026-10-30T12:00:00Z"));
    }
    @Test void multipleLinkedSessionsDoNotChangeAssignmentStatusOrDeadline() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var t = assignment(a, c);
        for (String start : List.of("19:00", "20:00")) { var v = input(c); v.put("startsAt", "2026-10-30T" + start + ":00+07:00"); v.put("assignmentId", t.get("id")); v.put("status", "COMPLETED"); assertThat(data(send("POST", PATH, a.token, v)).get("assignmentId")).isEqualTo(t.get("id")); }
        assertThat(list(a, "?assignmentId=" + t.get("id"))).hasSize(2); assertThat(data(send("GET", TASKS + "/" + t.get("id"), a.token, null))).isEqualTo(t);
    }
    @Test void missingOversizedInvalidEnumAndNonIntegerFieldsNeverWrite() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA");
        for (String field : List.of("courseId", "title", "startsAt", "timeZone", "durationMinutes")) { var v = input(c); v.remove(field); error(send("POST", PATH, a.token, v), 400, "VALIDATION_FAILED"); }
        for (var e : Map.<String, Object>of("title", "x".repeat(201), "notes", "x".repeat(5001), "durationMinutes", 0).entrySet()) { var v = input(c); v.put(e.getKey(), e.getValue()); error(send("POST", PATH, a.token, v), 400, "VALIDATION_FAILED"); }
        for (Object value : List.of(-1, 241, 2.5, "bad")) { var v = input(c); v.put("durationMinutes", value); assertThat(send("POST", PATH, a.token, v).statusCode()).isEqualTo(400); }
        var v = input(c); v.put("status", "UNKNOWN"); assertThat(send("POST", PATH, a.token, v).statusCode()).isEqualTo(400);
        v = input(c); v.put("title", " "); error(send("POST", PATH, a.token, v), 400, "VALIDATION_FAILED"); assertThat(list(a, "")).isEmpty();
    }
    @Test void invalidDatesOffsetsZonesAndSecondsProduceFieldErrors() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA");
        for (String start : List.of("2026-10-30", "2026-10-30T19:00:00", "2026-02-30T19:00:00+07:00", "2026-10-30T24:00:00Z", "2026-10-30T19:00:01+07:00", "2026-10-30T19:00:00.001+07:00", "1899-12-30T12:00:00Z", "2100-01-01T00:00:00Z", "infinity")) {
            var v = input(c); v.put("startsAt", start); var r = send("POST", PATH, a.token, v); error(r, 400, "VALIDATION_FAILED"); assertThat(r.body()).contains("startsAt");
        }
        var v = input(c); v.put("timeZone", "Fake/Zone"); var r = send("POST", PATH, a.token, v); error(r, 400, "VALIDATION_FAILED"); assertThat(r.body()).contains("timeZone"); assertThat(list(a, "")).isEmpty();
    }
    @Test void minuteAndMidnightBoundariesFollowStoredTimeZone() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var v = input(c); v.put("startsAt", "2026-10-30T23:59:00+07:00"); v.put("durationMinutes", 1);
        error(send("POST", PATH, a.token, v), 400, "VALIDATION_FAILED"); v.put("startsAt", "2026-10-30T23:58:00+07:00"); assertThat(data(send("POST", PATH, a.token, v)).get("endsAt")).isEqualTo("2026-10-30T16:59:00Z");
        v = input(c); v.put("startsAt", "2026-10-30T20:00:00+07:00"); v.put("durationMinutes", 240); error(send("POST", PATH, a.token, v), 400, "VALIDATION_FAILED");
        v.put("startsAt", "2026-10-29T19:59:00+07:00"); assertThat(data(send("POST", PATH, a.token, v)).get("durationMinutes")).isEqualTo(240);
    }
    @Test void utcEquivalentOffsetsOverlapAndDifferentAccountsCanUseSameTime() throws Exception {
        var a = account(); var b = account(); var c = course(a, semester(a, 1), "QA"); var d = course(b, semester(b, 1), "QB"); var first = create(a, c);
        var v = input(c); v.put("startsAt", "2026-10-30T12:00:00Z"); error(send("POST", PATH, a.token, v), 409, "STUDY_TIME_CONFLICT");
        v.put("courseId", d.get("id")); v.put("startsAt", "2026-10-30T08:00:00-04:00"); assertThat(data(send("POST", PATH, b.token, v)).get("startsAt")).isEqualTo(first.get("startsAt"));
    }
    @Test void dstSpringForwardUsesElapsedDurationAndFallbackInstantsRemainDistinct() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var v = input(c); v.put("timeZone", "America/New_York"); v.put("durationMinutes", 60); v.put("startsAt", "2026-03-08T01:30:00-05:00");
        assertThat(data(send("POST", PATH, a.token, v)).get("endsAt")).isEqualTo("2026-03-08T07:30:00Z");
        v.put("durationMinutes", 30); v.put("startsAt", "2026-11-01T01:30:00-04:00"); assertThat(data(send("POST", PATH, a.token, v)).get("endsAt")).isEqualTo("2026-11-01T06:00:00Z");
        v.put("startsAt", "2026-11-01T01:30:00-05:00"); assertThat(data(send("POST", PATH, a.token, v)).get("startsAt")).isEqualTo("2026-11-01T06:30:00Z");
    }
    @Test void adjacentSessionsAllowedOverlapsAcrossCoursesAndCompletedRowsRejected() throws Exception {
        var a = account(); var sem = semester(a, 1); var c = course(a, sem, "QA"); var d = course(a, sem, "QB"); var first = create(a, c);
        var v = input(d); v.put("startsAt", "2026-10-30T19:45:00+07:00"); data(send("POST", PATH, a.token, v));
        v.put("startsAt", "2026-10-30T18:15:00+07:00"); data(send("POST", PATH, a.token, v));
        for (String start : List.of("18:59", "19:00", "19:44")) { v.put("startsAt", "2026-10-30T" + start + ":00+07:00"); error(send("POST", PATH, a.token, v), 409, "STUDY_TIME_CONFLICT"); }
        var edit = update(first); edit.put("status", "COMPLETED"); data(send("PUT", item(first), a.token, edit)); error(send("POST", PATH, a.token, input(c)), 409, "STUDY_TIME_CONFLICT");
    }
    @Test void filtersCombineCourseSemesterAssignmentStatusAndIntersectingTimeRange() throws Exception {
        var a = account(); var s = semester(a, 1); var otherSem = semester(a, 2); var c = course(a, s, "QA"); var d = course(a, otherSem, "QB"); var t = assignment(a, c);
        var v = input(c); v.put("assignmentId", t.get("id")); var first = data(send("POST", PATH, a.token, v)); v = input(d); v.put("startsAt", "2026-10-30T20:00:00+07:00"); v.put("status", "COMPLETED"); data(send("POST", PATH, a.token, v));
        assertThat(list(a, "")).hasSize(2); assertThat(((Map<?, ?>) list(a, "").getFirst()).get("id")).isEqualTo(first.get("id"));
        String query = "?courseId=" + c.get("id") + "&semesterId=" + s.get("id") + "&assignmentId=" + t.get("id") + "&status=PLANNED&from=" + enc("2026-10-30T19:15:00+07:00") + "&to=" + enc("2026-10-30T19:30:00+07:00");
        assertThat(list(a, query)).hasSize(1); assertThat(list(a, query.replace("status=PLANNED", "status=COMPLETED"))).isEmpty();
        assertThat(list(a, "?to=" + enc("2026-10-30T19:00:00+07:00"))).isEmpty(); assertThat(list(a, "?from=" + enc("2026-10-30T19:45:00+07:00") + "&to=" + enc("2026-10-30T20:00:00+07:00"))).isEmpty();
        assertThat(list(a, "?to=" + enc("2100-01-01T00:00:00Z"))).hasSize(2);
    }
    @Test void invalidQueriesAndIdentifiersReturn400WithoutMutation() throws Exception {
        var a = account();
        for (String query : List.of("?from=2026-10-30", "?from=bad", "?to=infinity", "?from=2026-10-30T19:00:00Z&to=2026-10-30T19:00:00Z", "?from=2026-10-31T00:00:00Z&to=2026-10-30T00:00:00Z")) error(send("GET", PATH + query, a.token, null), 400, "INVALID_STUDY_RANGE");
        for (String query : List.of("?courseId=bad", "?semesterId=bad", "?assignmentId=bad", "?status=unknown")) assertThat(send("GET", PATH + query, a.token, null).statusCode()).isEqualTo(400);
        assertThat(send("GET", PATH + "/bad", a.token, null).statusCode()).isEqualTo(400);
    }
    @Test void fullUpdateCanChangeCourseUnlinkAndRetainIdentity() throws Exception {
        var a = account(); var sem = semester(a, 1); var c = course(a, sem, "QA"); var d = course(a, sem, "QB"); var t = assignment(a, c); var v = input(c); v.put("assignmentId", t.get("id")); var first = data(send("POST", PATH, a.token, v));
        v = update(first); v.put("courseId", d.get("id")); v.put("assignmentId", null); v.put("title", "Đổi môn"); v.put("startsAt", "2026-10-30T20:00:00+07:00"); v.put("durationMinutes", 60); v.put("status", "IN_PROGRESS"); v.put("notes", "Đã lưu");
        var changed = data(send("PUT", item(first), a.token, v)); assertThat(changed.get("id")).isEqualTo(first.get("id")); assertThat(changed.get("assignmentId")).isNull(); assertThat(changed.get("courseId")).isEqualTo(d.get("id")); assertThat(changed.get("endsAt")).isEqualTo("2026-10-30T14:00:00Z"); assertThat(changed.get("notes")).isEqualTo("Đã lưu"); assertThat(((Number) changed.get("version")).longValue()).isEqualTo(1);
        assertThat(data(send("GET", TASKS + "/" + t.get("id"), a.token, null))).isEqualTo(t);
    }
    @Test void staleMissingNegativeAndFractionalVersionsCannotWriteOrDelete() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var first = create(a, c); var changed = data(send("PUT", item(first), a.token, update(first)));
        // An unchanged PUT may not increment Hibernate's version. Force one real change.
        var edit = update(changed); edit.put("notes", "Changed"); changed = data(send("PUT", item(first), a.token, edit));
        error(send("PUT", item(first), a.token, update(first)), 409, "STUDY_SESSION_VERSION_CONFLICT"); error(send("DELETE", item(first) + "?version=0", a.token, null), 409, "STUDY_SESSION_VERSION_CONFLICT");
        for (Object version : List.of(-1, 0.5, "bad")) { edit = update(changed); edit.put("version", version); assertThat(send("PUT", item(first), a.token, edit).statusCode()).isEqualTo(400); }
        edit = update(changed); edit.remove("version"); error(send("PUT", item(first), a.token, edit), 400, "VALIDATION_FAILED");
        for (String suffix : List.of("", "?version=-1", "?version=0.5", "?version=9223372036854775808")) assertThat(send("DELETE", item(first) + suffix, a.token, null).statusCode()).isEqualTo(400);
        assertThat(data(send("GET", item(first), a.token, null))).isEqualTo(changed);
    }
    @Test void overlappingEditDoesNotAlterExistingSession() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var first = create(a, c); var v = input(c); v.put("startsAt", "2026-10-30T20:00:00+07:00"); var second = data(send("POST", PATH, a.token, v));
        v = update(second); v.put("startsAt", "2026-10-30T19:15:00+07:00"); error(send("PUT", item(second), a.token, v), 409, "STUDY_TIME_CONFLICT"); assertThat(data(send("GET", item(second), a.token, null))).isEqualTo(second); assertThat(data(send("GET", item(first), a.token, null))).isEqualTo(first);
    }
    @Test void linkedCourseMustMatchAndEndMayEqualButNotExceedDeadline() throws Exception {
        var a = account(); var sem = semester(a, 1); var c = course(a, sem, "QA"); var d = course(a, sem, "QB"); var t = assignment(a, c); var v = input(d); v.put("assignmentId", t.get("id")); error(send("POST", PATH, a.token, v), 409, "STUDY_ASSIGNMENT_COURSE_MISMATCH");
        v = input(c); v.put("assignmentId", t.get("id")); v.put("startsAt", "2026-10-30T23:30:00+07:00"); v.put("durationMinutes", 29); data(send("POST", PATH, a.token, v));
        v.put("startsAt", "2026-10-31T19:00:00+07:00"); error(send("POST", PATH, a.token, v), 409, "STUDY_AFTER_DEADLINE");
    }
    @Test void assignmentEditGuardsDeadlineAndCourseButAllowsStatusAndLaterDeadline() throws Exception {
        var a = account(); var sem = semester(a, 1); var c = course(a, sem, "QA"); var d = course(a, sem, "QB"); var t = assignment(a, c); var v = input(c); v.put("assignmentId", t.get("id")); var s = data(send("POST", PATH, a.token, v));
        var edit = assignmentUpdate(t); edit.put("dueAt", "2026-10-30T19:44:59+07:00"); error(send("PUT", TASKS + "/" + t.get("id"), a.token, edit), 409, "ASSIGNMENT_DEADLINE_CONFLICT");
        edit = assignmentUpdate(t); edit.put("courseId", d.get("id")); error(send("PUT", TASKS + "/" + t.get("id"), a.token, edit), 409, "ASSIGNMENT_HAS_STUDY_SESSIONS");
        edit = assignmentUpdate(t); edit.put("dueAt", "2026-10-30T19:45:00+07:00"); edit.put("status", "COMPLETED"); var done = data(send("PUT", TASKS + "/" + t.get("id"), a.token, edit)); assertThat(done.get("status")).isEqualTo("COMPLETED"); assertThat(data(send("GET", item(s), a.token, null))).isEqualTo(s);
        edit = assignmentUpdate(done); edit.put("dueAt", "2026-10-31T23:59:00+07:00"); data(send("PUT", TASKS + "/" + t.get("id"), a.token, edit));
    }
    @Test void assignmentDeletionKeepsPlansDetachesEveryLinkAndIncrementsStudyVersion() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var t = assignment(a, c); var v = input(c); v.put("assignmentId", t.get("id")); var first = data(send("POST", PATH, a.token, v));
        v.put("startsAt", "2026-10-30T20:00:00+07:00"); v.put("status", "COMPLETED"); var second = data(send("POST", PATH, a.token, v));
        assertThat(send("DELETE", TASKS + "/" + t.get("id") + "?version=0", a.token, null).statusCode()).isEqualTo(204);
        for (var old : List.of(first, second)) { var next = data(send("GET", item(old), a.token, null)); assertThat(next.get("assignmentId")).isNull(); assertThat(next.get("startsAt")).isEqualTo(old.get("startsAt")); assertThat(next.get("status")).isEqualTo(old.get("status")); assertThat(((Number) next.get("version")).longValue()).isEqualTo(1); }
        error(send("PUT", item(first), a.token, update(first)), 409, "STUDY_SESSION_VERSION_CONFLICT"); assertThat(list(a, "")).hasSize(2);
    }
    @Test void failedStaleAssignmentDeletionDoesNotDetachLinks() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var t = assignment(a, c); var v = input(c); v.put("assignmentId", t.get("id")); var s = data(send("POST", PATH, a.token, v)); var edit = assignmentUpdate(t); edit.put("notes", "Changed"); data(send("PUT", TASKS + "/" + t.get("id"), a.token, edit));
        error(send("DELETE", TASKS + "/" + t.get("id") + "?version=0", a.token, null), 409, "ASSIGNMENT_VERSION_CONFLICT"); assertThat(data(send("GET", item(s), a.token, null))).isEqualTo(s);
    }
    @Test void independentAndCompletedStudyProtectCourseMoveAndDeletionUntilHandled() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var target = semester(a, 2); var s = create(a, c);
        error(send("DELETE", COURSES + "/" + c.get("id") + "?version=0", a.token, null), 409, "COURSE_HAS_STUDY_SESSIONS");
        var move = courseUpdate(c); move.put("semesterId", target.get("id")); error(send("PUT", COURSES + "/" + c.get("id"), a.token, move), 409, "COURSE_HAS_STUDY_SESSIONS");
        var changed = courseUpdate(c); changed.put("name", "Tên môn mới"); var renamed = data(send("PUT", COURSES + "/" + c.get("id"), a.token, changed)); var edit = update(s); edit.put("status", "COMPLETED"); var done = data(send("PUT", item(s), a.token, edit));
        move = courseUpdate(renamed); move.put("semesterId", target.get("id")); error(send("PUT", COURSES + "/" + c.get("id"), a.token, move), 409, "COURSE_HAS_STUDY_SESSIONS");
        assertThat(send("DELETE", item(s) + "?version=" + done.get("version"), a.token, null).statusCode()).isEqualTo(204); var moved = data(send("PUT", COURSES + "/" + c.get("id"), a.token, move)); assertThat(send("DELETE", COURSES + "/" + c.get("id") + "?version=" + moved.get("version"), a.token, null).statusCode()).isEqualTo(204);
    }
    @Test void deletingStudyKeepsAssignmentCourseAndSemester() throws Exception {
        var a = account(); var sem = semester(a, 1); var c = course(a, sem, "QA"); var t = assignment(a, c); var v = input(c); v.put("assignmentId", t.get("id")); var s = data(send("POST", PATH, a.token, v));
        var r = send("DELETE", item(s) + "?version=0", a.token, null); assertThat(r.statusCode()).isEqualTo(204); assertThat(r.body()).isEmpty(); error(send("GET", item(s), a.token, null), 404, "STUDY_SESSION_NOT_FOUND"); assertThat(data(send("GET", TASKS + "/" + t.get("id"), a.token, null))).isEqualTo(t); assertThat(send("GET", COURSES + "/" + c.get("id"), a.token, null).statusCode()).isEqualTo(200); assertThat(send("GET", "/api/v1/semesters/" + sem.get("id"), a.token, null).statusCode()).isEqualTo(200);
    }
    @Test void foreignRecordsAndFiltersAreNotReadableWritableOrUsableAsParents() throws Exception {
        var a = account(); var b = account(); var sem = semester(a, 1); var c = course(a, sem, "QA"); var t = assignment(a, c); var s = create(a, c); var d = course(b, semester(b, 1), "QB");
        for (String method : List.of("GET", "PUT", "DELETE")) error(send(method, item(s) + (method.equals("DELETE") ? "?version=0" : ""), b.token, method.equals("PUT") ? update(s) : null), 404, "STUDY_SESSION_NOT_FOUND");
        error(send("GET", PATH + "?courseId=" + c.get("id"), b.token, null), 404, "COURSE_NOT_FOUND"); error(send("GET", PATH + "?semesterId=" + sem.get("id"), b.token, null), 404, "SEMESTER_NOT_FOUND"); error(send("GET", PATH + "?assignmentId=" + t.get("id"), b.token, null), 404, "ASSIGNMENT_NOT_FOUND");
        error(send("POST", PATH, b.token, input(c)), 404, "COURSE_NOT_FOUND"); var v = input(d); v.put("assignmentId", t.get("id")); error(send("POST", PATH, b.token, v), 404, "ASSIGNMENT_NOT_FOUND"); assertThat(list(b, "")).isEmpty();
        v = input(c); v.put("courseId", UUID.randomUUID()); error(send("POST", PATH, a.token, v), 404, "COURSE_NOT_FOUND"); v = input(c); v.put("assignmentId", UUID.randomUUID()); error(send("POST", PATH, a.token, v), 404, "ASSIGNMENT_NOT_FOUND");
    }
    @Test void suppliedOwnerOrFocusedSecondsCannotChangeOwnershipOrCreditStudyTime() throws Exception {
        var a = account(); var b = account(); var c = course(a, semester(a, 1), "QA"); var v = input(c); v.put("userId", b.id); v.put("focusedSeconds", 99999); var r = send("POST", PATH, a.token, v);
        if (r.statusCode() == 201) { var s = data(r); assertThat(s.containsKey("focusedSeconds")).isFalse(); assertThat(jdbc.queryForObject("SELECT user_id FROM study_sessions WHERE id=?", UUID.class, UUID.fromString(s.get("id").toString()))).isEqualTo(a.id); }
        else assertThat(r.statusCode()).isEqualTo(400); assertThat(list(b, "?userId=" + a.id)).isEmpty();
    }
    @Test void authenticationRevocationMethodsAndUnopenedRoutesRemainProtected() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c);
        for (String method : List.of("GET", "POST", "PUT", "DELETE")) error(send(method, method.equals("PUT") || method.equals("DELETE") ? item(s) + "?version=0" : PATH, null, method.equals("POST") || method.equals("PUT") ? update(s) : null), 401, "AUTHENTICATION_REQUIRED");
        assertThat(send("PATCH", item(s), a.token, Map.of()).statusCode()).isEqualTo(403); assertThat(send("GET", "/api/v1/grades", a.token, null).statusCode()).isEqualTo(403);
        jdbc.update("UPDATE refresh_sessions SET revoked_at=now(),revocation_reason='LOGOUT' WHERE user_id=?", a.id); error(send("GET", PATH, a.token, null), 401, "INVALID_ACCESS_TOKEN");
    }
    @Test void browserRequiresBearerDoesNotSetCookieAndRejectsForeignOrigin() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA");
        var r = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + PATH)).header("Origin", "http://localhost:8092").header("Authorization", "Bearer " + a.token).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(input(c)))).build();
        var result = client.send(r, HttpResponse.BodyHandlers.ofString()); assertThat(result.statusCode()).isEqualTo(201); assertThat(result.headers().allValues("Set-Cookie")).isEmpty();
        r = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + PATH)).header("Cookie", "FOCUS_REFRESH=not-a-bearer").GET().build(); error(client.send(r, HttpResponse.BodyHandlers.ofString()), 401, "AUTHENTICATION_REQUIRED");
        r = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + PATH)).header("Origin", "https://foreign.example").header("Authorization", "Bearer " + a.token).GET().build(); assertThat(client.send(r, HttpResponse.BodyHandlers.ofString()).statusCode()).isEqualTo(403);
    }
    @Test void directDatabaseWritesEnforceOwnerSameCourseAndScheduleChecks() throws Exception {
        var a = account(); var b = account(); var sem = semester(a, 1); var c = course(a, sem, "QA"); var d = course(a, sem, "QB"); var t = assignment(a, d); var s = create(a, c); var id = UUID.fromString(s.get("id").toString());
        for (String sql : List.of("UPDATE study_sessions SET user_id='" + b.id + "' WHERE id=?", "UPDATE study_sessions SET assignment_id='" + t.get("id") + "' WHERE id=?", "UPDATE study_sessions SET status='UNKNOWN' WHERE id=?", "UPDATE study_sessions SET duration_minutes=0 WHERE id=?", "UPDATE study_sessions SET ends_at=starts_at WHERE id=?", "UPDATE study_sessions SET title=' ' WHERE id=?", "UPDATE study_sessions SET version=-1 WHERE id=?", "UPDATE study_sessions SET starts_at='infinity',ends_at='infinity' WHERE id=?", "UPDATE study_sessions SET starts_at='2026-10-30T23:30:00+07',ends_at='2026-10-31T00:15:00+07' WHERE id=?")) assertThatThrownBy(() -> jdbc.update(sql, id)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update("DELETE FROM courses WHERE id=?", UUID.fromString(c.get("id").toString()))).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class); assertThat(data(send("GET", item(s), a.token, null))).isEqualTo(s);
    }
    @Test void concurrentSameTimeCreatesHaveOneWinnerEvenAcrossCourses() throws Exception {
        var a = account(); var sem = semester(a, 1); var c = course(a, sem, "QA"); var d = course(a, sem, "QB");
        var results = concurrent(() -> send("POST", PATH, a.token, input(c)), () -> send("POST", PATH, a.token, input(d)));
        assertThat(results.stream().map(HttpResponse::statusCode).sorted().toList()).containsExactly(201, 409); assertThat(list(a, "")).hasSize(1);
    }
    @Test void concurrentEditsHaveOneVersionWinner() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var first = update(s); first.put("notes", "First"); var second = update(s); second.put("notes", "Second");
        var results = concurrent(() -> send("PUT", item(s), a.token, first), () -> send("PUT", item(s), a.token, second)); assertThat(results.stream().map(HttpResponse::statusCode).sorted().toList()).containsExactly(200, 409);
    }
    @Test void concurrentDifferentRowsCannotBothMoveIntoAnEmptyTimeSlot() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var first = create(a, c); var v = input(c); v.put("startsAt", "2026-10-30T20:00:00+07:00"); var second = data(send("POST", PATH, a.token, v));
        var left = update(first); left.put("startsAt", "2026-10-30T21:00:00+07:00"); var right = update(second); right.put("startsAt", "2026-10-30T21:00:00+07:00");
        var results = concurrent(() -> send("PUT", item(first), a.token, left), () -> send("PUT", item(second), a.token, right)); assertThat(results.stream().map(HttpResponse::statusCode).sorted().toList()).containsExactly(200, 409);
        assertThat(list(a, "?from=" + enc("2026-10-30T21:00:00+07:00") + "&to=" + enc("2026-10-30T22:00:00+07:00"))).hasSize(1);
    }
    @Test void concurrentDeadlineShorteningAndStudyLengtheningCannotBothCommit() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var t = assignment(a, c); var v = input(c); v.put("assignmentId", t.get("id")); v.put("durationMinutes", 15); var s = data(send("POST", PATH, a.token, v));
        var edit = update(s); edit.put("durationMinutes", 60); var change = assignmentUpdate(t); change.put("dueAt", "2026-10-30T19:30:00+07:00");
        var results = concurrent(() -> send("PUT", TASKS + "/" + t.get("id"), a.token, change), () -> send("PUT", item(s), a.token, edit));
        if (results.getFirst().statusCode() == 200) error(results.getLast(), 409, "STUDY_AFTER_DEADLINE"); else { error(results.getFirst(), 409, "ASSIGNMENT_DEADLINE_CONFLICT"); assertThat(results.getLast().statusCode()).isEqualTo(200); }
    }
    @Test void concurrentAssignmentDeleteAndStudyEditKeepsPlanAndFencesOldVersion() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var t = assignment(a, c); var v = input(c); v.put("assignmentId", t.get("id")); var s = data(send("POST", PATH, a.token, v)); var edit = update(s); edit.put("notes", "Concurrent edit");
        var results = concurrent(() -> send("DELETE", TASKS + "/" + t.get("id") + "?version=0", a.token, null), () -> send("PUT", item(s), a.token, edit));
        assertThat(results.getFirst().statusCode()).isEqualTo(204); var saved = data(send("GET", item(s), a.token, null)); assertThat(saved.get("assignmentId")).isNull();
        if (results.getLast().statusCode() == 200) { assertThat(saved.get("notes")).isEqualTo("Concurrent edit"); assertThat(((Number) saved.get("version")).longValue()).isEqualTo(2); }
        else { error(results.getLast(), 409, "STUDY_SESSION_VERSION_CONFLICT"); assertThat(((Number) saved.get("version")).longValue()).isEqualTo(1); }
    }
    @Test void concurrentDeleteAndEditCannotResurrectStudy() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var edit = update(s); edit.put("notes", "Changed");
        var results = concurrent(() -> send("DELETE", item(s) + "?version=0", a.token, null), () -> send("PUT", item(s), a.token, edit));
        if (results.getFirst().statusCode() == 204) error(results.getLast(), 404, "STUDY_SESSION_NOT_FOUND"); else { error(results.getFirst(), 409, "STUDY_SESSION_VERSION_CONFLICT"); assertThat(results.getLast().statusCode()).isEqualTo(200); }
    }
    @Test void concurrentCourseDeleteAndIndependentStudyCreateNeverOrphan() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var results = concurrent(() -> send("DELETE", COURSES + "/" + c.get("id") + "?version=0", a.token, null), () -> send("POST", PATH, a.token, input(c)));
        if (results.getFirst().statusCode() == 204) { error(results.getLast(), 404, "COURSE_NOT_FOUND"); assertThat(list(a, "")).isEmpty(); } else { error(results.getFirst(), 409, "COURSE_HAS_STUDY_SESSIONS"); assertThat(results.getLast().statusCode()).isEqualTo(201); }
    }
    @Test void concurrentAssignmentDeleteAndStudyCreateNeverOrphanOrLosePlan() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var t = assignment(a, c); var v = input(c); v.put("assignmentId", t.get("id"));
        var results = concurrent(() -> send("DELETE", TASKS + "/" + t.get("id") + "?version=0", a.token, null), () -> send("POST", PATH, a.token, v)); assertThat(results.getFirst().statusCode()).isEqualTo(204);
        if (results.getLast().statusCode() == 201) assertThat(((Map<?, ?>) list(a, "").getFirst()).get("assignmentId")).isNull(); else { error(results.getLast(), 404, "ASSIGNMENT_NOT_FOUND"); assertThat(list(a, "")).isEmpty(); }
    }
    @Test void concurrentDeadlineShorteningAndStudyCreationCannotCommitInvalidLink() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var t = assignment(a, c); var v = input(c); v.put("assignmentId", t.get("id")); var change = assignmentUpdate(t); change.put("dueAt", "2026-10-30T18:00:00+07:00");
        var results = concurrent(() -> send("PUT", TASKS + "/" + t.get("id"), a.token, change), () -> send("POST", PATH, a.token, v));
        if (results.getFirst().statusCode() == 200) error(results.getLast(), 409, "STUDY_AFTER_DEADLINE"); else { error(results.getFirst(), 409, "ASSIGNMENT_DEADLINE_CONFLICT"); assertThat(results.getLast().statusCode()).isEqualTo(201); }
    }
    @Test void concurrentAssignmentCourseChangeAndStudyCreationStayInSameCourse() throws Exception {
        var a = account(); var sem = semester(a, 1); var c = course(a, sem, "QA"); var d = course(a, sem, "QB"); var t = assignment(a, c); var v = input(c); v.put("assignmentId", t.get("id")); var change = assignmentUpdate(t); change.put("courseId", d.get("id"));
        var results = concurrent(() -> send("PUT", TASKS + "/" + t.get("id"), a.token, change), () -> send("POST", PATH, a.token, v));
        if (results.getFirst().statusCode() == 200) error(results.getLast(), 409, "STUDY_ASSIGNMENT_COURSE_MISMATCH"); else { error(results.getFirst(), 409, "ASSIGNMENT_HAS_STUDY_SESSIONS"); assertThat(results.getLast().statusCode()).isEqualTo(201); }
    }
    private List<HttpResponse<String>> concurrent(Callable<HttpResponse<String>> first, Callable<HttpResponse<String>> second) throws Exception {
        var gate = new CountDownLatch(1);
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) { var a = pool.submit(() -> { gate.await(); return first.call(); }); var b = pool.submit(() -> { gate.await(); return second.call(); }); gate.countDown(); return List.of(a.get(20, TimeUnit.SECONDS), b.get(20, TimeUnit.SECONDS)); }
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershell51GuideRunsCrudRangeFiltersAndClosesOnlyItsOwnSession() throws Exception {
        var a = account(); var sem = semester(a, 1); var c = course(a, sem, "QA"); var task = assignment(a, c); String email = jdbc.queryForObject("SELECT email FROM app_users WHERE id=?", String.class, a.id);
        String ps = Path.of(System.getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "powershell.exe").toString(); String id = null; long version = 0;
        for (String mode : List.of("Create", "List", "Get", "Update", "Delete")) {
            String script = "[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); function Read-Host { param([string]$Prompt,[switch]$AsSecureString); if ($AsSecureString) { ConvertTo-SecureString $env:STUDY_TEST_PASSWORD -AsPlainText -Force } else { $env:STUDY_TEST_EMAIL } }; "
                    + "& './scripts/Try-StudySessions.ps1' -BaseUrl 'http://127.0.0.1:" + port + "' -Mode " + mode + " -CourseId '" + c.get("id") + "' -AssignmentId '" + task.get("id") + "' -Title 'Study guide' -StartsAt '2026-10-30T19:00:00+07:00'"
                    + (mode.equals("Get") || mode.equals("Update") || mode.equals("Delete") ? " -StudySessionId '" + id + "' -Version " + version : "")
                    + (mode.equals("List") ? " -SemesterId '" + sem.get("id") + "' -FilterStatus PLANNED -From '2026-10-30T18:00:00+07:00' -To '2026-10-30T21:00:00+07:00'" : "")
                    + (mode.equals("Update") ? " -Notes 'Updated from PowerShell' -Status IN_PROGRESS -DurationMinutes 60" : "");
            var builder = new ProcessBuilder(ps, "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script).redirectErrorStream(true);
            builder.environment().keySet().removeIf(name -> name.equalsIgnoreCase("PSModulePath")); builder.environment().put("PSModulePath", Path.of(System.getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "Modules").toString());
            builder.environment().put("STUDY_TEST_EMAIL", email); builder.environment().put("STUDY_TEST_PASSWORD", SECRET);
            var process = builder.start();
            try {
                assertThat(process.waitFor(30, TimeUnit.SECONDS)).isTrue(); String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8); assertThat(process.exitValue()).as(output).isZero(); assertThat(output).doesNotContain(SECRET, "accessToken", "refreshToken");
                if (!mode.equals("Delete")) { var current = jdbc.queryForMap("SELECT id,version,notes,starts_at,duration_minutes,status FROM study_sessions WHERE user_id=?", a.id); id = current.get("id").toString(); version = ((Number) current.get("version")).longValue(); assertThat(((java.sql.Timestamp) current.get("starts_at")).toInstant()).isEqualTo(Instant.parse("2026-10-30T12:00:00Z")); if (mode.equals("Update")) { assertThat(current.get("notes")).isEqualTo("Updated from PowerShell"); assertThat(current.get("duration_minutes")).isEqualTo(60); } }
            } finally { if (process.isAlive()) process.destroyForcibly(); }
        }
        assertThat(list(a, "")).isEmpty(); assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL", Integer.class, a.id)).isEqualTo(1);
    }
}
