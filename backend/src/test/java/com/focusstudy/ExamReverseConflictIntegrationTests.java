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
class ExamReverseConflictIntegrationTests {
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
    String classItem(Map<?, ?> r) { return CLASSES + "/" + r.get("id"); }
    String studyItem(Map<?, ?> r) { return STUDIES + "/" + r.get("id"); }
    String exceptionPath(Map<?, ?> r) { return classItem(r) + "/exceptions/2026-11-10"; }
    Map<String, Object> classUpdate(Map<?, ?> r) { return fields(r, "courseId", "weekdays", "startsOn", "endsOn", "startTime", "endTime", "timeZone", "room", "teacher", "reminderMinutes", "notes", "version"); }
    Map<String, Object> studyUpdate(Map<?, ?> r) { return fields(r, "courseId", "assignmentId", "title", "startsAt", "timeZone", "durationMinutes", "status", "notes", "version"); }
    Map<?, ?> classGet(Account a, Map<?, ?> r) throws Exception { return data(send("GET", classItem(r), a.token, null)); }
    Map<?, ?> studyGet(Account a, Map<?, ?> r) throws Exception { return data(send("GET", studyItem(r), a.token, null)); }
    Map<?, ?> exceptionGet(Account a, Map<?, ?> r) throws Exception { return data(send("GET", exceptionPath(r), a.token, null)); }
    List<?> exceptions(Account a, Map<?, ?> r) throws Exception { return (List<?>) body(send("GET", classItem(r) + "/exceptions", a.token, null)).get("data"); }
    Map<String, Object> change(Account a, Map<?, ?> r, String start, String end) throws Exception { return new HashMap<>(Map.of("kind", "CHANGED", "scheduleVersion", classVersion(a, r), "startTime", start, "endTime", end, "reason", "Đổi giờ thử")); }
    String snapshot(String table, Map<?, ?> row) {
        if (!Set.of("class_schedules", "class_exceptions", "study_sessions", "exams").contains(table)) throw new IllegalArgumentException("Unknown test table");
        return jdbc.queryForObject("SELECT row_to_json(r)::text FROM " + table + " r WHERE id=?", String.class, UUID.fromString(row.get("id").toString()));
    }
    Map<?, ?> examBlock(HttpResponse<String> response, Map<?, ?> e) {
        var hit = collision(response, "EXAM", e); assertThat(body(response).get("detail").toString()).contains("Trùng lịch thi", hit.get("courseName").toString()); return hit;
    }
    void oneWinner(List<HttpResponse<String>> results, int leftSuccess, int rightSuccess) {
        boolean left = results.getFirst().statusCode() == leftSuccess;
        assertThat(results.getFirst().statusCode()).as(results.getFirst().body()).isEqualTo(left ? leftSuccess : 409);
        assertThat(results.getLast().statusCode()).as(results.getLast().body()).isEqualTo(left ? 409 : rightSuccess);
        error(left ? results.getLast() : results.getFirst(), 409, "SCHEDULE_TIME_CONFLICT");
    }
    @Test void classCreateRejectsEveryOverlapShapeAndAllowsTouchingAnExam() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var e = create(a, c);
        for (var times : List.of(List.of("08:00", "10:00"), List.of("08:30", "09:00"), List.of("07:00", "11:00"), List.of("09:59", "11:00"), List.of("07:00", "08:01"))) {
            var hit = examBlock(send("POST", CLASSES, a.token, rule(c, times.getFirst(), times.getLast())), e); assertThat(hit.get("title")).isEqualTo("Thi giữa kỳ · Tự luận"); assertThat(hit.get("startTime")).isEqualTo("08:00"); assertThat(hit.get("endTime")).isEqualTo("10:00");
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM class_schedules WHERE user_id=?", Integer.class, a.id)).isZero();
        singleClass(a, c, "06:00", "08:00"); singleClass(a, c, "10:00", "12:00"); assertThat(data(send("GET", item(e), a.token, null))).isEqualTo(e);
    }
    @Test void failedClassUpdateKeepsEveryColumnAndTheExamUnchanged() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var d = course(a, semester(a, 2), "QB"); var r = singleClass(a, c, "06:00", "07:00"); var e = create(a, c); var before = snapshot("class_schedules", r); var examBefore = snapshot("exams", e);
        var v = classUpdate(r); v.put("courseId", d.get("id")); v.put("startTime", "09:00"); v.put("endTime", "11:00"); v.put("room", "NEW"); v.put("teacher", "New teacher"); v.put("notes", "Must not save"); v.put("reminderMinutes", 120);
        examBlock(send("PUT", classItem(r), a.token, v), e); assertThat(classGet(a, r)).isEqualTo(r); assertThat(snapshot("class_schedules", r)).isEqualTo(before); assertThat(snapshot("exams", e)).isEqualTo(examBefore);
    }
    @Test void checksTheEntireRecurringRuleBeyondNinetyTwoDays() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var v = input(c); v.put("startsAt", "2027-10-05T08:00:00+07:00"); v.put("endsAt", "2027-10-05T10:00:00+07:00"); var e = data(send("POST", PATH, a.token, v));
        var r = rule(c, "07:00", "09:00"); r.put("endsOn", "2027-11-09"); examBlock(send("POST", CLASSES, a.token, r), e);
        r.put("weekdays", List.of(3)); data(send("POST", CLASSES, a.token, r)); // Wednesday does not occupy the Tuesday exam.
    }
    @Test void classOutsideExamDateOrWeekdayDoesNotFalselyConflict() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); create(a, c);
        for (String day : List.of("2026-11-03", "2026-11-11", "2026-11-17")) {
            var r = rule(c, "07:00", "09:00"); r.put("startsOn", day); r.put("endsOn", day); r.put("weekdays", List.of(LocalDate.parse(day).getDayOfWeek().getValue())); data(send("POST", CLASSES, a.token, r));
        }
    }
    @Test void wholeRuleEditKeepsCancelledDateFreeForItsExam() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var v = rule(c, "07:00", "09:00"); v.put("endsOn", "2026-11-17"); var r = data(send("POST", CLASSES, a.token, v));
        var cancellation = override(a, r, new HashMap<>(Map.of("kind", "CANCELLED", "reason", "Nghỉ thi"))); create(a, c);
        var update = classUpdate(classGet(a, r)); update.put("startTime", "06:00"); update.put("room", "B1.02"); var saved = data(send("PUT", classItem(r), a.token, update));
        assertThat(saved.get("version")).isEqualTo(2); assertThat(exceptionGet(a, r).get("id")).isEqualTo(cancellation.get("id")); assertThat(exceptionGet(a, r).get("kind")).isEqualTo("CANCELLED");
    }
    @Test void wholeRuleEditUsesChangedHoursInsteadOfTheNewBaseHours() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var r = singleClass(a, c, "06:00", "07:00"); var exception = override(a, r, change(a, r, "12:00", "14:00")); create(a, c);
        var v = classUpdate(classGet(a, r)); v.put("startTime", "08:00"); v.put("endTime", "10:00"); data(send("PUT", classItem(r), a.token, v));
        assertThat(exceptionGet(a, r).get("startTime")).isEqualTo("12:00"); assertThat(exceptionGet(a, r).get("id")).isEqualTo(exception.get("id"));
    }
    @Test void inheritedExceptionHoursAreRecomputedBeforeWholeRuleUpdate() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var r = singleClass(a, c, "06:00", "07:00");
        var exception = override(a, r, new HashMap<>(Map.of("kind", "CHANGED", "startTime", "05:00", "reason", "Kế thừa giờ kết thúc"))); var e = create(a, c); var current = classGet(a, r); var before = snapshot("class_schedules", r); var exceptionBefore = snapshot("class_exceptions", exception);
        var v = classUpdate(current); v.put("endTime", "09:00"); examBlock(send("PUT", classItem(r), a.token, v), e); assertThat(classGet(a, r)).isEqualTo(current); assertThat(snapshot("class_schedules", r)).isEqualTo(before); assertThat(snapshot("class_exceptions", exception)).isEqualTo(exceptionBefore);
    }
    @Test void newChangedOccurrenceCannotOverlapExamOrIncreaseParentVersion() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var r = singleClass(a, c, "06:00", "07:00"); var e = create(a, c); var before = snapshot("class_schedules", r);
        examBlock(send("PUT", exceptionPath(r), a.token, change(a, r, "09:00", "11:00")), e); assertThat(exceptions(a, r)).isEmpty(); assertThat(classGet(a, r)).isEqualTo(r); assertThat(snapshot("class_schedules", r)).isEqualTo(before);
    }
    @Test void replacingCancelledOrChangedExceptionKeepsOldRowOnConflict() throws Exception {
        for (String kind : List.of("CANCELLED", "CHANGED")) {
            var a = account(); var c = course(a, semester(a, 1), "QA"); var r = singleClass(a, c, "06:00", "07:00"); var value = kind.equals("CANCELLED") ? new HashMap<String, Object>(Map.of("kind", kind, "reason", "Nghỉ")) : change(a, r, "12:00", "14:00"); var old = override(a, r, value); var e = create(a, c);
            var before = snapshot("class_schedules", r); var oldBefore = snapshot("class_exceptions", old); examBlock(send("PUT", exceptionPath(r), a.token, change(a, r, "09:00", "11:00")), e);
            assertThat(exceptionGet(a, r)).isEqualTo(old); assertThat(snapshot("class_schedules", r)).isEqualTo(before); assertThat(snapshot("class_exceptions", old)).isEqualTo(oldBefore);
        }
    }
    @Test void restoringCancelledOrChangedOccurrenceKeepsExceptionAndVersionOnConflict() throws Exception {
        for (String kind : List.of("CANCELLED", "CHANGED")) {
            var a = account(); var c = course(a, semester(a, 1), "QA"); var r = singleClass(a, c, "07:00", "09:00"); var value = kind.equals("CANCELLED") ? new HashMap<String, Object>(Map.of("kind", kind, "reason", "Nghỉ")) : change(a, r, "12:00", "14:00"); var old = override(a, r, value); var e = create(a, c);
            var before = snapshot("class_schedules", r); var oldBefore = snapshot("class_exceptions", old); examBlock(send("DELETE", exceptionPath(r) + "?scheduleVersion=1", a.token, null), e);
            assertThat(exceptionGet(a, r)).isEqualTo(old); assertThat(snapshot("class_schedules", r)).isEqualTo(before); assertThat(snapshot("class_exceptions", old)).isEqualTo(oldBefore);
        }
    }
    @Test void legacyClassOverlapRemainsReadableAndCanBeCancelledAndDeleted() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var r = singleClass(a, c, "06:00", "07:00"); var e = create(a, c);
        jdbc.update("UPDATE class_schedules SET start_time='07:00',end_time='09:00' WHERE id=?", UUID.fromString(r.get("id").toString())); var old = classGet(a, r); assertThat(body(send("GET", CLASSES, a.token, null)).get("data")).isNotNull();
        var v = classUpdate(old); v.put("room", "NEW"); examBlock(send("PUT", classItem(r), a.token, v), e);
        override(a, r, new HashMap<>(Map.of("kind", "CANCELLED", "reason", "Giải phóng giờ cũ"))); assertThat(send("DELETE", classItem(r) + "?version=1", a.token, null).statusCode()).isEqualTo(204);
    }
    @Test void everyStudyStatusIsBlockedByAnExam() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var e = create(a, c);
        for (String status : List.of("PLANNED", "IN_PROGRESS", "COMPLETED")) { var v = study(c, "2026-11-10T09:00:00+07:00", 45); v.put("status", status); examBlock(send("POST", STUDIES, a.token, v), e); }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM study_sessions WHERE user_id=?", Integer.class, a.id)).isZero();
    }
    @Test void studiesCanTouchBothExamEndpoints() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); create(a, c);
        data(send("POST", STUDIES, a.token, study(c, "2026-11-10T07:00:00+07:00", 60))); data(send("POST", STUDIES, a.token, study(c, "2026-11-10T10:00:00+07:00", 60)));
    }
    @Test void failedStudyUpdatePreservesAllColumnsIncludingLinkAndVersion() throws Exception {
        var a = account(); var sem = semester(a, 1); var c = course(a, sem, "QA"); var d = course(a, sem, "QB"); var s = data(send("POST", STUDIES, a.token, study(c, "2026-11-10T11:00:00+07:00", 60))); var e = create(a, c); var before = snapshot("study_sessions", s);
        var v = studyUpdate(s); v.put("startsAt", "2026-11-10T09:00:00+07:00"); v.put("durationMinutes", 45); v.put("courseId", d.get("id")); v.put("title", "Must not save"); v.put("notes", "New notes"); v.put("status", "IN_PROGRESS");
        examBlock(send("PUT", studyItem(s), a.token, v), e); assertThat(studyGet(a, s)).isEqualTo(s); assertThat(snapshot("study_sessions", s)).isEqualTo(before);
    }
    @Test void establishedSelfStudyConflictCodeStillTakesPrecedence() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = data(send("POST", STUDIES, a.token, study(c, "2026-11-10T11:00:00+07:00", 60))); create(a, c);
        jdbc.update("UPDATE study_sessions SET starts_at='2026-11-10T01:00:00Z',ends_at='2026-11-10T02:00:00Z' WHERE id=?", UUID.fromString(s.get("id").toString()));
        error(send("POST", STUDIES, a.token, study(c, "2026-11-10T08:30:00+07:00", 30)), 409, "STUDY_TIME_CONFLICT");
    }
    @Test void examsOfAnotherCourseOrSemesterStillBlockBothWriters() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var d = course(a, semester(a, 2), "QB"); var e = create(a, c);
        for (var response : List.of(send("POST", CLASSES, a.token, rule(d, "09:00", "11:00")), send("POST", STUDIES, a.token, study(d, "2026-11-10T09:00:00+07:00", 45)))) {
            var hit = examBlock(response, e); assertThat(hit.get("courseName")).isEqualTo(c.get("name")); assertThat(hit.get("courseId")).isNotEqualTo(d.get("id"));
        }
    }
    @Test void anotherAccountsExamsNeverBlockOrLeakToEitherWriter() throws Exception {
        var a = account(); var b = account(); var c = course(a, semester(a, 1), "PRIVATE"); var d = course(b, semester(b, 1), "PUBLIC"); var e = create(a, c);
        for (var response : List.of(send("POST", CLASSES, b.token, rule(d, "07:00", "09:00")), send("POST", STUDIES, b.token, study(d, "2026-11-10T09:00:00+07:00", 60)))) {
            data(response); assertThat(response.body()).doesNotContain(c.get("id").toString(), e.get("id").toString(), a.id.toString(), c.get("name").toString());
        }
    }
    @Test void ownershipAndVersionsAreCheckedBeforeExamConflicts() throws Exception {
        var a = account(); var b = account(); var c = course(a, semester(a, 1), "QA"); var foreign = course(b, semester(b, 1), "PRIVATE"); var r = singleClass(a, c, "06:00", "07:00"); var s = data(send("POST", STUDIES, a.token, study(c, "2026-11-10T11:00:00+07:00", 60))); create(a, c);
        error(send("POST", CLASSES, a.token, rule(foreign, "09:00", "11:00")), 404, "COURSE_NOT_FOUND"); error(send("POST", STUDIES, a.token, study(foreign, "2026-11-10T09:00:00+07:00", 45)), 404, "COURSE_NOT_FOUND");
        var v = classUpdate(r); v.put("version", 99); v.put("startTime", "09:00"); v.put("endTime", "11:00"); error(send("PUT", classItem(r), a.token, v), 409, "CLASS_SCHEDULE_VERSION_CONFLICT");
        var ex = change(a, r, "09:00", "11:00"); ex.put("scheduleVersion", 99); error(send("PUT", exceptionPath(r), a.token, ex), 409, "CLASS_SCHEDULE_VERSION_CONFLICT"); error(send("DELETE", exceptionPath(r) + "?scheduleVersion=99", a.token, null), 409, "CLASS_SCHEDULE_VERSION_CONFLICT");
        var sv = studyUpdate(s); sv.put("version", 99); sv.put("startsAt", "2026-11-10T09:00:00+07:00"); error(send("PUT", studyItem(s), a.token, sv), 409, "STUDY_SESSION_VERSION_CONFLICT");
        for (String path : List.of(classItem(r), exceptionPath(r))) { var response = send("GET", path, b.token, null); error(response, 404, "CLASS_SCHEDULE_NOT_FOUND"); assertThat(response.body()).doesNotContain("conflict"); }
        var response = send("PUT", studyItem(s), b.token, sv); error(response, 404, "STUDY_SESSION_NOT_FOUND"); assertThat(response.body()).doesNotContain("conflict");
    }
    @Test void classAcrossTheDateLineStillConflictsByInstant() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var v = input(c); v.put("startsAt", "2026-11-09T00:30:00-10:00"); v.put("endsAt", "2026-11-09T01:30:00-10:00"); v.put("timeZone", "Pacific/Honolulu"); var e = data(send("POST", PATH, a.token, v));
        var r = rule(c, "00:00", "02:00"); r.put("timeZone", "Pacific/Kiritimati"); var hit = examBlock(send("POST", CLASSES, a.token, r), e);
        assertThat(hit.get("date")).isEqualTo("2026-11-09"); assertThat(hit.get("timeZone")).isEqualTo("Pacific/Honolulu"); assertThat(hit.get("startsAt")).isEqualTo("2026-11-09T10:30:00Z");
    }
    @Test void studyOnPreviousLocalDayStillConflictsByInstant() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var e = create(a, c); var v = study(c, "2026-11-09T20:15:00-05:00", 60); v.put("timeZone", "America/New_York");
        var hit = examBlock(send("POST", STUDIES, a.token, v), e); assertThat(hit.get("date")).isEqualTo("2026-11-10"); assertThat(hit.get("startsAt")).isEqualTo("2026-11-10T01:00:00Z");
    }
    @Test void sameDstWallClockCanBeFreeOrBusyDependingOnExplicitOffset() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var v = input(c); v.put("startsAt", "2026-11-01T01:00:00-05:00"); v.put("endsAt", "2026-11-01T01:30:00-05:00"); v.put("timeZone", "America/New_York"); var e = data(send("POST", PATH, a.token, v));
        var s = study(c, "2026-11-01T01:00:00-04:00", 30); s.put("timeZone", "America/New_York"); data(send("POST", STUDIES, a.token, s));
        s.put("startsAt", "2026-11-01T01:15:00-05:00"); examBlock(send("POST", STUDIES, a.token, s), e);
    }
    @Test void deletingTheBlockingExamAllowsRestoringWithoutInventingANewVersion() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var r = singleClass(a, c, "07:00", "09:00"); override(a, r, new HashMap<>(Map.of("kind", "CANCELLED", "reason", "Nghỉ thi"))); var e = create(a, c);
        examBlock(send("DELETE", exceptionPath(r) + "?scheduleVersion=1", a.token, null), e); assertThat(classVersion(a, r)).isEqualTo(1);
        assertThat(send("DELETE", item(e) + "?version=0", a.token, null).statusCode()).isEqualTo(204); assertThat(send("DELETE", exceptionPath(r) + "?scheduleVersion=1", a.token, null).statusCode()).isEqualTo(204); assertThat(exceptions(a, r)).isEmpty(); assertThat(classVersion(a, r)).isEqualTo(2);
    }
    @Test void legacyStudyOverlapRemainsReadableAndCanMoveOutOrBeDeleted() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = data(send("POST", STUDIES, a.token, study(c, "2026-11-10T11:00:00+07:00", 60))); var e = create(a, c); UUID id = UUID.fromString(s.get("id").toString());
        String legacy = "UPDATE study_sessions SET starts_at='2026-11-10T01:00:00Z',ends_at='2026-11-10T02:00:00Z' WHERE id=?"; jdbc.update(legacy, id); var current = studyGet(a, s); var unchanged = studyUpdate(current); unchanged.put("notes", "Cannot save while overlapping"); examBlock(send("PUT", studyItem(s), a.token, unchanged), e);
        var move = studyUpdate(current); move.put("startsAt", "2026-11-10T11:00:00+07:00"); var moved = data(send("PUT", studyItem(s), a.token, move)); assertThat(moved.get("version")).isEqualTo(1);
        jdbc.update(legacy, id); assertThat(send("DELETE", studyItem(s) + "?version=1", a.token, null).statusCode()).isEqualTo(204);
    }
    @Test void concurrentClassAndExamCreatesHaveOnlyOneWinner() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var results = concurrent(() -> send("POST", CLASSES, a.token, rule(c, "09:00", "11:00")), () -> send("POST", PATH, a.token, input(c))); oneWinner(results, 201, 201);
        assertThat(jdbc.queryForObject("SELECT (SELECT count(*) FROM class_schedules WHERE user_id=?)+(SELECT count(*) FROM exams WHERE user_id=?)", Integer.class, a.id, a.id)).isEqualTo(1);
    }
    @Test void concurrentStudyAndExamCreatesHaveOnlyOneWinner() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var results = concurrent(() -> send("POST", STUDIES, a.token, study(c, "2026-11-10T09:00:00+07:00", 45)), () -> send("POST", PATH, a.token, input(c))); oneWinner(results, 201, 201);
        assertThat(jdbc.queryForObject("SELECT (SELECT count(*) FROM study_sessions WHERE user_id=?)+(SELECT count(*) FROM exams WHERE user_id=?)", Integer.class, a.id, a.id)).isEqualTo(1);
    }
    @Test void concurrentClassAndExamUpdatesCannotBothMoveIntoTheGap() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var r = singleClass(a, c, "06:00", "07:00"); var e = data(send("POST", PATH, a.token, exam(c, "10:00", "11:00"))); var left = classUpdate(r); left.put("startTime", "08:00"); left.put("endTime", "09:00"); var right = update(e); right.putAll(exam(c, "08:00", "09:00"));
        var results = concurrent(() -> send("PUT", classItem(r), a.token, left), () -> send("PUT", item(e), a.token, right)); oneWinner(results, 200, 200);
        assertThat(classVersion(a, r) + ((Number) data(send("GET", item(e), a.token, null)).get("version")).longValue()).isEqualTo(1);
        assertThat(classGet(a, r)).isEqualTo(results.getFirst().statusCode() == 200 ? data(results.getFirst()) : r);
    }
    @Test void concurrentStudyAndExamUpdatesCannotBothMoveIntoTheGap() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = data(send("POST", STUDIES, a.token, study(c, "2026-11-10T06:00:00+07:00", 60))); var e = data(send("POST", PATH, a.token, exam(c, "10:00", "11:00"))); var left = studyUpdate(s); left.put("startsAt", "2026-11-10T08:00:00+07:00"); var right = update(e); right.putAll(exam(c, "08:00", "09:00"));
        var results = concurrent(() -> send("PUT", studyItem(s), a.token, left), () -> send("PUT", item(e), a.token, right)); oneWinner(results, 200, 200);
        assertThat(((Number) studyGet(a, s).get("version")).longValue() + ((Number) data(send("GET", item(e), a.token, null)).get("version")).longValue()).isEqualTo(1);
        assertThat(studyGet(a, s)).isEqualTo(results.getFirst().statusCode() == 200 ? data(results.getFirst()) : s);
    }
    @Test void concurrentExceptionChangeAndExamCreateCannotDoubleBook() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var r = singleClass(a, c, "06:00", "07:00"); var v = change(a, r, "08:00", "09:00");
        var results = concurrent(() -> send("PUT", exceptionPath(r), a.token, v), () -> send("POST", PATH, a.token, input(c))); oneWinner(results, 200, 201);
        boolean changed = results.getFirst().statusCode() == 200; assertThat(classVersion(a, r)).isEqualTo(changed ? 1 : 0); assertThat(exceptions(a, r)).hasSize(changed ? 1 : 0);
        assertThat(list(a, "")).hasSize(changed ? 0 : 1);
    }
    @Test void concurrentRestoresAndNewExamsSerializeForBothExceptionKinds() throws Exception {
        for (String kind : List.of("CANCELLED", "CHANGED")) {
            var a = account(); var c = course(a, semester(a, 1), "QA"); var r = singleClass(a, c, "07:00", "09:00"); var v = kind.equals("CANCELLED") ? new HashMap<String, Object>(Map.of("kind", kind, "reason", "Nghỉ")) : change(a, r, "12:00", "14:00"); var old = override(a, r, v);
            var results = concurrent(() -> send("DELETE", exceptionPath(r) + "?scheduleVersion=1", a.token, null), () -> send("POST", PATH, a.token, input(c))); oneWinner(results, 204, 201);
            boolean restored = results.getFirst().statusCode() == 204; assertThat(classVersion(a, r)).isEqualTo(restored ? 2 : 1); assertThat(exceptions(a, r)).hasSize(restored ? 0 : 1); assertThat(list(a, "")).hasSize(restored ? 0 : 1);
            if (!restored) assertThat(exceptionGet(a, r)).isEqualTo(old);
        }
    }
    @Test void concurrentRestoresAndExamUpdatesSerializeForBothExceptionKinds() throws Exception {
        for (String kind : List.of("CANCELLED", "CHANGED")) {
            var a = account(); var c = course(a, semester(a, 1), "QA"); var r = singleClass(a, c, "07:00", "09:00"); var v = kind.equals("CANCELLED") ? new HashMap<String, Object>(Map.of("kind", kind, "reason", "Nghỉ")) : change(a, r, "12:00", "14:00"); var old = override(a, r, v); var e = data(send("POST", PATH, a.token, exam(c, "10:00", "11:00"))); var move = update(e); move.putAll(input(c));
            var results = concurrent(() -> send("DELETE", exceptionPath(r) + "?scheduleVersion=1", a.token, null), () -> send("PUT", item(e), a.token, move)); oneWinner(results, 204, 200);
            boolean restored = results.getFirst().statusCode() == 204; assertThat(classVersion(a, r)).isEqualTo(restored ? 2 : 1); assertThat(exceptions(a, r)).hasSize(restored ? 0 : 1);
            var examNow = data(send("GET", item(e), a.token, null)); assertThat(examNow.get("version")).isEqualTo(restored ? 0 : 1); if (restored) assertThat(examNow).isEqualTo(e); else assertThat(exceptionGet(a, r)).isEqualTo(old);
        }
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershell51AllReverseWritersExplainExamConflictAndRevokeOnlyTheirOwnSession() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var cancelled = singleClass(a, c, "07:00", "09:00"); override(a, cancelled, new HashMap<>(Map.of("kind", "CANCELLED", "reason", "Nghỉ thi"))); var r = singleClass(a, c, "06:00", "07:00"); create(a, c);
        String email = jdbc.queryForObject("SELECT email FROM app_users WHERE id=?", String.class, a.id), ps = Path.of(System.getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "powershell.exe").toString();
        for (String command : List.of(
                "& './scripts/Try-ClassSchedules.ps1' -Mode Create -CourseId '" + c.get("id") + "' -Weekdays @(2) -StartsOn '2026-11-10' -EndsOn '2026-11-10' -StartTime '09:00' -EndTime '11:00'",
                "& './scripts/Try-StudySessions.ps1' -Mode Create -CourseId '" + c.get("id") + "' -Title 'Study exam conflict' -StartsAt '2026-11-10T09:00:00+07:00' -DurationMinutes 45",
                "& './scripts/Try-ClassExceptions.ps1' -Mode Change -ClassScheduleId '" + r.get("id") + "' -Date '2026-11-10' -ScheduleVersion 0 -StartTime '09:00' -EndTime '11:00'",
                "& './scripts/Try-ClassExceptions.ps1' -Mode Restore -ClassScheduleId '" + cancelled.get("id") + "' -Date '2026-11-10' -ScheduleVersion 1")) {
            String script = "[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); function Read-Host { param([string]$Prompt,[switch]$AsSecureString); if ($AsSecureString) { ConvertTo-SecureString $env:CONFLICT_TEST_PASSWORD -AsPlainText -Force } else { $env:CONFLICT_TEST_EMAIL } }; " + command + " -BaseUrl 'http://127.0.0.1:" + port + "'";
            var builder = new ProcessBuilder(ps, "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script).redirectErrorStream(true); builder.environment().keySet().removeIf(name -> name.equalsIgnoreCase("PSModulePath")); builder.environment().put("PSModulePath", Path.of(System.getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "Modules").toString()); builder.environment().put("CONFLICT_TEST_EMAIL", email); builder.environment().put("CONFLICT_TEST_PASSWORD", SECRET); var process = builder.start();
            try { assertThat(process.waitFor(30, TimeUnit.SECONDS)).isTrue(); String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8); assertThat(process.exitValue()).as(output).isNotZero(); assertThat(output).contains("SCHEDULE_TIME_CONFLICT", "Trùng lịch thi", c.get("name").toString(), "08:00", "10:00").doesNotContain(SECRET, "accessToken", "refreshToken"); }
            finally { if (process.isAlive()) process.destroyForcibly(); }
        }
        assertThat(classVersion(a, r)).isZero(); assertThat(classVersion(a, cancelled)).isEqualTo(1); assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL", Integer.class, a.id)).isEqualTo(1);
    }
}
