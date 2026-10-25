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
class ExamConflictIntegrationTests {
    private static final String SCHEMA = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
    private static final String URL = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Run Test-Local.ps1"), USER = System.getenv("TEST_DB_USER"), PASSWORD = System.getenv("TEST_DB_PASSWORD");
    private static final String SECRET = "ExamTest123!", PATH = "/api/v1/exams", COURSES = "/api/v1/courses";
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
        try (var c = DriverManager.getConnection(URL, USER, PASSWORD); var s = c.createStatement()) { s.execute("DROP SCHEMA " + SCHEMA + " CASCADE"); }
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
        String email = "exam-" + UUID.randomUUID() + "@example.test";
        var user = data(send("POST", "/api/v1/auth/register", null, Map.of("email", email, "fullName", "Kiểm thử lịch thi", "password", SECRET, "confirmPassword", SECRET)));
        return new Account(data(send("POST", "/api/v1/auth/login", null, Map.of("email", email, "password", SECRET))).get("accessToken").toString(), UUID.fromString(user.get("id").toString()));
    }
    Map<?, ?> semester(Account a, int term) throws Exception { return data(send("POST", "/api/v1/semesters", a.token, Map.of("term", term, "startYear", 2026, "status", "UPCOMING"))); }
    Map<?, ?> course(Account a, Map<?, ?> semester, String code) throws Exception { return data(send("POST", COURSES, a.token, Map.of("semesterId", semester.get("id"), "code", code, "name", "Môn thi " + code, "credits", 3))); }
    Map<String, Object> input(Map<?, ?> course) { return new HashMap<>(Map.of("courseId", course.get("id"), "kind", "MIDTERM", "format", "WRITTEN", "startsAt", "2026-11-10T08:00:00+07:00", "endsAt", "2026-11-10T10:00:00+07:00", "timeZone", "Asia/Ho_Chi_Minh")); }
    Map<?, ?> create(Account a, Map<?, ?> c) throws Exception { return data(send("POST", PATH, a.token, input(c))); }
    Map<String, Object> fields(Map<?, ?> row, String... keys) { var result = new HashMap<String, Object>(); for (String key : keys) result.put(key, row.get(key)); return result; }
    Map<String, Object> update(Map<?, ?> row) { return fields(row, "courseId", "kind", "format", "startsAt", "endsAt", "timeZone", "room", "reminder", "reminderMinutes", "notes", "version"); }
    Map<String, Object> courseUpdate(Map<?, ?> row) { return fields(row, "semesterId", "code", "name", "credits", "teacher", "room", "status", "color", "description", "version"); }
    String item(Map<?, ?> row) { return PATH + "/" + row.get("id"); }
    String enc(String value) { return URLEncoder.encode(value, StandardCharsets.UTF_8); }
    void error(HttpResponse<String> r, int status, String code) {
        assertThat(r.statusCode()).as(r.body()).isEqualTo(status); assertThat(body(r).get("code")).isEqualTo(code);
        assertThat(r.body()).doesNotContain("password_hash", "org.hibernate", "SELECT ", "INSERT ", SECRET);
    }
    private static final String CLASSES = "/api/v1/class-schedules", STUDIES = "/api/v1/study-sessions";
    Map<String, Object> exam(Map<?, ?> c, String start, String end) {
        var v = input(c); v.put("startsAt", "2026-11-10T" + start + ":00+07:00"); v.put("endsAt", "2026-11-10T" + end + ":00+07:00"); return v;
    }
    Map<String, Object> rule(Map<?, ?> c, String start, String end) {
        return new HashMap<>(Map.of("courseId", c.get("id"), "weekdays", List.of(2), "startsOn", "2026-11-10", "endsOn", "2026-11-10", "startTime", start, "endTime", end, "timeZone", "Asia/Ho_Chi_Minh"));
    }
    Map<String, Object> study(Map<?, ?> c, String start, int duration) {
        return new HashMap<>(Map.of("courseId", c.get("id"), "title", "Ôn trước thi", "startsAt", start, "durationMinutes", duration, "timeZone", "Asia/Ho_Chi_Minh"));
    }
    Map<?, ?> singleClass(Account a, Map<?, ?> c, String start, String end) throws Exception { return data(send("POST", CLASSES, a.token, rule(c, start, end))); }
    long classVersion(Account a, Map<?, ?> r) throws Exception { return ((Number) data(send("GET", CLASSES + "/" + r.get("id"), a.token, null)).get("version")).longValue(); }
    Map<?, ?> override(Account a, Map<?, ?> r, Map<String, Object> value) throws Exception {
        value.put("scheduleVersion", classVersion(a, r)); return data(send("PUT", CLASSES + "/" + r.get("id") + "/exceptions/2026-11-10", a.token, value));
    }
    Map<?, ?> collision(HttpResponse<String> response, String kind, Map<?, ?> source) {
        error(response, 409, "SCHEDULE_TIME_CONFLICT"); assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
        var hit = (Map<?, ?>) body(response).get("conflict"); assertThat(hit.get("kind")).isEqualTo(kind); assertThat(hit.get("id")).isEqualTo(source.get("id"));
        assertThat(hit.get("courseId")).isEqualTo(source.get("courseId"));
        for (String key : List.of("userId", "notes", "reminderMinutes", "version")) assertThat(hit.containsKey(key)).isFalse();
        return hit;
    }
    List<HttpResponse<String>> concurrent(Callable<HttpResponse<String>> first, Callable<HttpResponse<String>> second) throws Exception {
        var gate = new CountDownLatch(1);
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            var left = pool.submit(() -> { gate.await(); return first.call(); }); var right = pool.submit(() -> { gate.await(); return second.call(); }); gate.countDown();
            return List.of(left.get(20, TimeUnit.SECONDS), right.get(20, TimeUnit.SECONDS));
        }
    }
    @Test void examsRejectEveryOverlapShapeAndAllowBothTouchingBoundaries() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var existing = create(a, c);
        for (var times : List.of(List.of("08:00", "10:00"), List.of("08:30", "09:00"), List.of("07:00", "11:00"), List.of("09:59", "11:00"), List.of("07:00", "08:01"))) {
            var response = send("POST", PATH, a.token, exam(c, times.getFirst(), times.getLast())); var hit = collision(response, "EXAM", existing);
            assertThat(hit.get("title")).isEqualTo("Thi giữa kỳ · Tự luận"); assertThat(hit.get("courseName")).isEqualTo(c.get("name")); assertThat(body(response).get("detail").toString()).contains("Trùng lịch thi", "08:00", "10:00");
        }
        data(send("POST", PATH, a.token, exam(c, "06:00", "08:00"))); data(send("POST", PATH, a.token, exam(c, "10:00", "12:00"))); assertThat(list(a, "")).hasSize(3);
    }
    @Test void examsRejectClassEqualContainedContainingAndOneMinuteOverlaps() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var r = singleClass(a, c, "07:00", "09:00");
        for (var times : List.of(List.of("07:00", "09:00"), List.of("07:30", "08:30"), List.of("06:00", "10:00"), List.of("08:59", "10:00"))) collision(send("POST", PATH, a.token, exam(c, times.getFirst(), times.getLast())), "CLASS", r);
        assertThat(list(a, "")).isEmpty(); assertThat(classVersion(a, r)).isZero();
    }
    @Test void classRecurrenceReservesOnlyItsWeekdaysInsideItsDateRange() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var v = rule(c, "07:00", "09:00"); v.put("startsOn", "2026-11-01"); v.put("endsOn", "2026-11-30"); var r = data(send("POST", CLASSES, a.token, v));
        collision(send("POST", PATH, a.token, input(c)), "CLASS", r);
        for (String day : List.of("2026-11-11", "2026-10-27", "2026-12-01")) { var e = input(c); e.put("startsAt", day + "T08:00:00+07:00"); e.put("endsAt", day + "T10:00:00+07:00"); data(send("POST", PATH, a.token, e)); }
        assertThat(list(a, "")).hasSize(3);
    }
    @Test void cancelledOccurrenceFreesOnlyItsOwnDate() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var v = rule(c, "07:00", "09:00"); v.put("endsOn", "2026-11-17"); var r = data(send("POST", CLASSES, a.token, v));
        override(a, r, new HashMap<>(Map.of("kind", "CANCELLED", "reason", "Nghỉ buổi này"))); create(a, c);
        var next = input(c); next.put("startsAt", "2026-11-17T08:00:00+07:00"); next.put("endsAt", "2026-11-17T10:00:00+07:00"); collision(send("POST", PATH, a.token, next), "CLASS", r);
    }
    @Test void changedOccurrenceFreesOriginalHoursAndReservesNewHours() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var r = singleClass(a, c, "07:00", "09:00");
        override(a, r, new HashMap<>(Map.of("kind", "CHANGED", "startTime", "12:00", "endTime", "14:00", "reason", "Đổi giờ"))); create(a, c);
        var hit = collision(send("POST", PATH, a.token, exam(c, "12:30", "13:30")), "CLASS", r); assertThat(hit.get("startTime")).isEqualTo("12:00"); assertThat(hit.get("endTime")).isEqualTo("14:00");
    }
    @Test void partialChangeInheritsTheOtherTimeFromTheRule() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var r = singleClass(a, c, "07:00", "09:00");
        override(a, r, new HashMap<>(Map.of("kind", "CHANGED", "startTime", "08:00", "reason", "Đổi giờ bắt đầu")));
        data(send("POST", PATH, a.token, exam(c, "07:00", "08:00"))); var hit = collision(send("POST", PATH, a.token, input(c)), "CLASS", r);
        assertThat(hit.get("startTime")).isEqualTo("08:00"); assertThat(hit.get("endTime")).isEqualTo("09:00");
    }
    @Test void roomOnlyChangeStillReservesTheOriginalTime() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var r = singleClass(a, c, "07:00", "09:00");
        override(a, r, new HashMap<>(Map.of("kind", "CHANGED", "room", "B2.03", "reason", "Đổi phòng")));
        collision(send("POST", PATH, a.token, input(c)), "CLASS", r); assertThat(list(a, "")).isEmpty();
    }
    @Test void updateExcludesItselfAndCanMoveWithinItsOriginalHours() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var e = create(a, c);
        var same = data(send("PUT", item(e), a.token, update(e))); assertThat(same.get("version")).isEqualTo(1);
        var move = update(same); move.put("startsAt", "2026-11-10T09:00:00+07:00"); move.put("endsAt", "2026-11-10T11:00:00+07:00");
        assertThat(data(send("PUT", item(e), a.token, move)).get("startsAt")).isEqualTo("2026-11-10T02:00:00Z"); assertThat(list(a, "")).hasSize(1);
    }
    @Test void allStudyStatusesStillReserveTheirTime() throws Exception {
        for (String status : List.of("PLANNED", "IN_PROGRESS", "COMPLETED")) {
            var a = account(); var c = course(a, semester(a, 1), "QA"); var v = study(c, "2026-11-10T08:15:00+07:00", 45); v.put("status", status); var s = data(send("POST", STUDIES, a.token, v));
            var hit = collision(send("POST", PATH, a.token, input(c)), "STUDY", s); assertThat(hit.get("title")).isEqualTo("Ôn trước thi"); assertThat(list(a, "")).isEmpty();
        }
    }
    @Test void examsMayTouchClassEndpoints() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); singleClass(a, c, "07:00", "09:00");
        data(send("POST", PATH, a.token, exam(c, "05:00", "07:00"))); data(send("POST", PATH, a.token, exam(c, "09:00", "11:00"))); assertThat(list(a, "")).hasSize(2);
    }
    @Test void examsMayTouchStudyEndpoints() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); data(send("POST", STUDIES, a.token, study(c, "2026-11-10T08:00:00+07:00", 60)));
        data(send("POST", PATH, a.token, exam(c, "06:00", "08:00"))); data(send("POST", PATH, a.token, exam(c, "09:00", "11:00"))); assertThat(list(a, "")).hasSize(2);
    }
    @Test void examsCompareInstantsAcrossDifferentZones() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var e = create(a, c); var v = input(c);
        v.put("startsAt", "2026-11-10T02:30:00+01:00"); v.put("endsAt", "2026-11-10T03:30:00+01:00"); v.put("timeZone", "Europe/Berlin");
        var hit = collision(send("POST", PATH, a.token, v), "EXAM", e); assertThat(hit.get("startsAt")).isEqualTo("2026-11-10T01:00:00Z"); assertThat(hit.get("timeZone")).isEqualTo("Asia/Ho_Chi_Minh");
    }
    @Test void studyOnThePreviousLocalDateCanConflictByUtc() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var v = study(c, "2026-11-09T20:00:00-05:00", 60); v.put("timeZone", "America/New_York"); var s = data(send("POST", STUDIES, a.token, v));
        var hit = collision(send("POST", PATH, a.token, input(c)), "STUDY", s); assertThat(hit.get("date")).isEqualTo("2026-11-09"); assertThat(hit.get("startTime")).isEqualTo("20:00"); assertThat(hit.get("startsAt")).isEqualTo("2026-11-10T01:00:00Z");
    }
    @Test void oppositeDateLineClassIsNotMissedByUtcDateWindow() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var r = rule(c, "00:00", "02:00"); r.put("timeZone", "Pacific/Kiritimati"); var saved = data(send("POST", CLASSES, a.token, r));
        var v = input(c); v.put("startsAt", "2026-11-09T00:30:00-10:00"); v.put("endsAt", "2026-11-09T01:30:00-10:00"); v.put("timeZone", "Pacific/Honolulu");
        var hit = collision(send("POST", PATH, a.token, v), "CLASS", saved); assertThat(hit.get("date")).isEqualTo("2026-11-10"); assertThat(hit.get("startTime")).isEqualTo("00:00"); assertThat(hit.get("startsAt")).isEqualTo("2026-11-09T10:00:00Z");
    }
    @Test void repeatedDstWallClockIsComparedUsingItsExplicitOffset() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var v = input(c); v.put("timeZone", "America/New_York");
        v.put("startsAt", "2026-11-01T01:00:00-04:00"); v.put("endsAt", "2026-11-01T01:30:00-04:00"); data(send("POST", PATH, a.token, v));
        v.put("startsAt", "2026-11-01T01:00:00-05:00"); v.put("endsAt", "2026-11-01T01:30:00-05:00"); var later = data(send("POST", PATH, a.token, v));
        v.put("startsAt", "2026-11-01T01:15:00-05:00"); v.put("endsAt", "2026-11-01T01:45:00-05:00"); collision(send("POST", PATH, a.token, v), "EXAM", later); assertThat(list(a, "")).hasSize(2);
    }
    @Test void differentCourseAndSemesterInSameAccountStillBlockForEveryBusyKind() throws Exception {
        for (String kind : List.of("EXAM", "CLASS", "STUDY")) {
            var a = account(); var c = course(a, semester(a, 1), "QA"); var d = course(a, semester(a, 2), "QB");
            var source = switch (kind) { case "EXAM" -> create(a, c); case "CLASS" -> singleClass(a, c, "07:00", "09:00"); default -> data(send("POST", STUDIES, a.token, study(c, "2026-11-10T08:00:00+07:00", 60))); };
            var hit = collision(send("POST", PATH, a.token, input(d)), kind, source); assertThat(hit.get("courseName")).isEqualTo(c.get("name")); assertThat(hit.get("courseId")).isNotEqualTo(d.get("id"));
        }
    }
    @Test void otherAccountsBusyRecordsNeverBlockOrLeak() throws Exception {
        for (String kind : List.of("EXAM", "CLASS", "STUDY")) {
            var a = account(); var b = account(); var c = course(a, semester(a, 1), "PRIVATE"); var d = course(b, semester(b, 1), "PUBLIC");
            switch (kind) { case "EXAM" -> create(a, c); case "CLASS" -> singleClass(a, c, "07:00", "09:00"); default -> data(send("POST", STUDIES, a.token, study(c, "2026-11-10T08:00:00+07:00", 60))); }
            var response = send("POST", PATH, b.token, input(d)); data(response); assertThat(response.body()).doesNotContain(c.get("id").toString(), c.get("name").toString(), a.id.toString());
        }
    }
    @Test void failedCreateNeverInsertsOrTouchesTheConflictingExam() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var e = create(a, c); var v = input(c); v.put("room", "NEW"); v.put("notes", "Must not save"); v.put("reminder", false); v.put("reminderMinutes", List.of());
        collision(send("POST", PATH, a.token, v), "EXAM", e); assertThat(data(send("GET", item(e), a.token, null))).isEqualTo(e); assertThat(list(a, "")).isEqualTo(List.of(e));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM exams WHERE user_id=?", Integer.class, a.id)).isEqualTo(1);
    }
    @Test void failedUpdatePreservesAllColumnsIncludingVersionTimestampAndReminderArray() throws Exception {
        var a = account(); var sem = semester(a, 1); var c = course(a, sem, "QA"); var d = course(a, sem, "QB"); var r = singleClass(a, c, "07:00", "09:00"); var e = data(send("POST", PATH, a.token, exam(c, "12:00", "14:00")));
        UUID id = UUID.fromString(e.get("id").toString()); String sql = "SELECT row_to_json(e)::text FROM exams e WHERE id=?"; String before = jdbc.queryForObject(sql, String.class, id);
        var v = update(e); v.putAll(input(d)); v.put("kind", "FINAL"); v.put("format", "ONLINE"); v.put("room", "NEW"); v.put("notes", "Must not save"); v.put("reminder", false); v.put("reminderMinutes", List.of());
        collision(send("PUT", item(e), a.token, v), "CLASS", r); assertThat(data(send("GET", item(e), a.token, null))).isEqualTo(e); assertThat(jdbc.queryForObject(sql, String.class, id)).isEqualTo(before);
    }
    @Test void ownershipAndStaleVersionErrorsTakePrecedenceOverConflictDetails() throws Exception {
        var a = account(); var b = account(); var c = course(a, semester(a, 1), "QA"); var foreign = course(b, semester(b, 1), "PRIVATE"); var busy = singleClass(a, c, "07:00", "09:00"); var e = data(send("POST", PATH, a.token, exam(c, "12:00", "14:00"))); var f = create(b, foreign);
        error(send("POST", PATH, a.token, input(foreign)), 404, "COURSE_NOT_FOUND");
        var stale = update(e); stale.putAll(input(c)); stale.put("version", 99); error(send("PUT", item(e), a.token, stale), 409, "EXAM_VERSION_CONFLICT");
        var foreignCourse = update(e); foreignCourse.putAll(input(foreign)); error(send("PUT", item(e), a.token, foreignCourse), 404, "COURSE_NOT_FOUND");
        var foreignExam = update(f); foreignExam.putAll(input(c)); var response = send("PUT", item(f), a.token, foreignExam); error(response, 404, "EXAM_NOT_FOUND"); assertThat(response.body()).doesNotContain("conflict", foreign.get("id").toString());
        assertThat(classVersion(a, busy)).isZero(); assertThat(data(send("GET", item(e), a.token, null))).isEqualTo(e);
    }
    @Test void deletingAnExamFreesItsHoursForARetry() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var e = create(a, c); collision(send("POST", PATH, a.token, input(c)), "EXAM", e);
        assertThat(send("DELETE", item(e) + "?version=0", a.token, null).statusCode()).isEqualTo(204); var replacement = create(a, c); assertThat(replacement.get("id")).isNotEqualTo(e.get("id")); assertThat(list(a, "")).hasSize(1);
    }
    @Test void legacyConflictingDataRemainsReadableMovableAndDeletable() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); singleClass(a, c, "07:00", "09:00"); var e = data(send("POST", PATH, a.token, exam(c, "12:00", "14:00"))); UUID id = UUID.fromString(e.get("id").toString());
        // Simulate data predating this rule; do not depend on unfinished reverse checking.
        String legacy = "UPDATE exams SET starts_at='2026-11-10T01:00:00Z',ends_at='2026-11-10T03:00:00Z' WHERE id=?"; jdbc.update(legacy, id);
        var existing = data(send("GET", item(e), a.token, null)); assertThat(list(a, "")).hasSize(1);
        var move = update(existing); move.putAll(exam(c, "12:00", "14:00")); var moved = data(send("PUT", item(e), a.token, move)); assertThat(moved.get("startsAt")).isEqualTo("2026-11-10T05:00:00Z");
        jdbc.update(legacy, id); assertThat(send("DELETE", item(e) + "?version=" + moved.get("version"), a.token, null).statusCode()).isEqualTo(204);
    }
    @Test void firstConflictIsStableAcrossKindsAndRequests() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var r = singleClass(a, c, "07:00", "08:00"); var s = data(send("POST", STUDIES, a.token, study(c, "2026-11-10T08:00:00+07:00", 30))); var e = data(send("POST", PATH, a.token, exam(c, "08:30", "09:00")));
        for (int i = 0; i < 3; i++) collision(send("POST", PATH, a.token, exam(c, "06:30", "09:30")), "CLASS", r);
        collision(send("POST", PATH, a.token, exam(c, "08:00", "09:30")), "STUDY", s); collision(send("POST", PATH, a.token, exam(c, "08:30", "09:30")), "EXAM", e);
    }
    @Test void simultaneousExamCreatesHaveOnlyOneWinnerPerInterval() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA");
        for (int day = 10; day <= 12; day++) {
            var v = input(c); v.put("startsAt", "2026-11-" + day + "T08:00:00+07:00"); v.put("endsAt", "2026-11-" + day + "T10:00:00+07:00");
            var results = concurrent(() -> send("POST", PATH, a.token, v), () -> send("POST", PATH, a.token, v)); assertThat(results.stream().map(HttpResponse::statusCode).sorted().toList()).containsExactly(201, 409);
            var winner = data(results.stream().filter(r -> r.statusCode() == 201).findFirst().orElseThrow()); collision(results.stream().filter(r -> r.statusCode() == 409).findFirst().orElseThrow(), "EXAM", winner);
        }
        assertThat(list(a, "")).hasSize(3);
    }
    @Test void simultaneousMovesOfDifferentExamsIntoOneFreeIntervalHaveOneWinner() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var e = data(send("POST", PATH, a.token, exam(c, "08:00", "09:00"))); var f = data(send("POST", PATH, a.token, exam(c, "10:00", "11:00")));
        var left = update(e); left.putAll(exam(c, "09:00", "10:00")); var right = update(f); right.putAll(exam(c, "09:00", "10:00"));
        var results = concurrent(() -> send("PUT", item(e), a.token, left), () -> send("PUT", item(f), a.token, right)); assertThat(results.stream().map(HttpResponse::statusCode).sorted().toList()).containsExactly(200, 409);
        var winner = data(results.stream().filter(r -> r.statusCode() == 200).findFirst().orElseThrow()); collision(results.stream().filter(r -> r.statusCode() == 409).findFirst().orElseThrow(), "EXAM", winner);
        var rows = list(a, ""); assertThat(rows).hasSize(2); assertThat(rows.stream().map(r -> ((Number) ((Map<?, ?>) r).get("version")).intValue()).sorted().toList()).containsExactly(0, 1);
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershell51DisplaysConflictAndClosesOnlyItsOwnSession() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); singleClass(a, c, "07:00", "09:00");
        String email = jdbc.queryForObject("SELECT email FROM app_users WHERE id=?", String.class, a.id), ps = Path.of(System.getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "powershell.exe").toString();
        String script = "[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); function Read-Host { param([string]$Prompt,[switch]$AsSecureString); if ($AsSecureString) { ConvertTo-SecureString $env:EXAM_TEST_PASSWORD -AsPlainText -Force } else { $env:EXAM_TEST_EMAIL } }; & './scripts/Try-Exams.ps1' -BaseUrl 'http://127.0.0.1:" + port + "' -Mode Create -CourseId '" + c.get("id") + "' -StartsAt '2026-11-10T08:00:00+07:00' -EndsAt '2026-11-10T10:00:00+07:00'";
        var builder = new ProcessBuilder(ps, "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script).redirectErrorStream(true); builder.environment().keySet().removeIf(name -> name.equalsIgnoreCase("PSModulePath")); builder.environment().put("PSModulePath", Path.of(System.getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "Modules").toString()); builder.environment().put("EXAM_TEST_EMAIL", email); builder.environment().put("EXAM_TEST_PASSWORD", SECRET); var process = builder.start();
        try { assertThat(process.waitFor(30, TimeUnit.SECONDS)).isTrue(); String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8); assertThat(process.exitValue()).as(output).isNotZero(); assertThat(output).contains("SCHEDULE_TIME_CONFLICT", "Trùng lịch học", c.get("name").toString(), "07:00", "09:00").doesNotContain(SECRET, "accessToken", "refreshToken"); }
        finally { if (process.isAlive()) process.destroyForcibly(); }
        assertThat(list(a, "")).isEmpty(); assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL", Integer.class, a.id)).isEqualTo(1);
    }
}
