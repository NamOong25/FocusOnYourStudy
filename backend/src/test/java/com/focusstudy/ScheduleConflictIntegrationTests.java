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
class ScheduleConflictIntegrationTests {
    private static final String SCHEMA = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
    private static final String URL = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Run Test-Local.ps1");
    private static final String USER = System.getenv("TEST_DB_USER"), PASSWORD = System.getenv("TEST_DB_PASSWORD");
    private static final String SECRET = "ConflictTest123!", PATH = "/api/v1/class-schedules", COURSES = "/api/v1/courses";
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
    List<?> occurrences(Account a, String query) throws Exception { return list(a, "/occurrences" + query); }
    Account account() throws Exception {
        String email = "conflict-" + UUID.randomUUID() + "@example.test";
        var user = data(send("POST", "/api/v1/auth/register", null, Map.of("email", email, "fullName", "Kiểm thử lịch học", "password", SECRET, "confirmPassword", SECRET)));
        var pair = data(send("POST", "/api/v1/auth/login", null, Map.of("email", email, "password", SECRET)));
        return new Account(pair.get("accessToken").toString(), UUID.fromString(user.get("id").toString()));
    }
    Map<?, ?> semester(Account a, int term) throws Exception { return data(send("POST", "/api/v1/semesters", a.token, Map.of("term", term, "startYear", 2026, "status", "UPCOMING"))); }
    Map<?, ?> course(Account a, Map<?, ?> s, String code) throws Exception { return data(send("POST", COURSES, a.token, Map.of("semesterId", s.get("id"), "code", code, "name", "Môn lịch học", "credits", 3))); }
    Map<String, Object> input(Map<?, ?> c) { return new HashMap<>(Map.of("courseId", c.get("id"), "weekdays", List.of(1, 3), "startsOn", "2026-10-26", "endsOn", "2026-11-08", "startTime", "07:00", "endTime", "09:00", "timeZone", "Asia/Ho_Chi_Minh")); }
    Map<?, ?> create(Account a, Map<?, ?> c) throws Exception { return data(send("POST", PATH, a.token, input(c))); }
    Map<String, Object> fields(Map<?, ?> row, String... keys) { var result = new HashMap<String, Object>(); for (String k : keys) result.put(k, row.get(k)); return result; }
    Map<String, Object> update(Map<?, ?> s) { return fields(s, "courseId", "weekdays", "startsOn", "endsOn", "startTime", "endTime", "timeZone", "room", "teacher", "reminderMinutes", "notes", "version"); }
    Map<String, Object> courseUpdate(Map<?, ?> c) { return fields(c, "semesterId", "code", "name", "credits", "teacher", "room", "status", "color", "description", "version"); }
    String item(Map<?, ?> s) { return PATH + "/" + s.get("id"); }
    void error(HttpResponse<String> r, int status, String code) { assertThat(r.statusCode()).as(r.body()).isEqualTo(status); assertThat(body(r).get("code")).isEqualTo(code); assertThat(r.body()).doesNotContain("password_hash", "org.hibernate", "SELECT ", "INSERT ", SECRET); }
    String exceptions(Map<?, ?> s) { return item(s) + "/exceptions"; }
    String at(Map<?, ?> s, String day) { return exceptions(s) + "/" + day; }
    long version(Account a, Map<?, ?> s) throws Exception { return ((Number) data(send("GET", item(s), a.token, null)).get("version")).longValue(); }
    Map<String, Object> cancel(long version) { return new HashMap<>(Map.of("kind", "CANCELLED", "scheduleVersion", version, "reason", "  Nghỉ một buổi  ")); }
    Map<String, Object> change(long version) { return new HashMap<>(Map.of("kind", "CHANGED", "scheduleVersion", version, "room", "B2.03", "reason", "Đổi phòng")); }
    Map<?, ?> save(Account a, Map<?, ?> s, String day, Map<String, Object> value) throws Exception { return data(send("PUT", at(s, day), a.token, value)); }
    List<?> exceptionList(Account a, Map<?, ?> s) throws Exception { var r = send("GET", exceptions(s), a.token, null); assertThat(r.statusCode()).as(r.body()).isEqualTo(200); return (List<?>) body(r).get("data"); }
    Map<?, ?> occurrence(Account a, String day) throws Exception { return (Map<?, ?>) occurrences(a, "?from=" + day + "&to=" + day).getFirst(); }
    private static final String STUDIES = "/api/v1/study-sessions";
    Map<String, Object> once(Map<?, ?> c, String day, String start, String end) {
        var v = input(c); v.put("startsOn", day); v.put("endsOn", day); v.put("weekdays", List.of(LocalDate.parse(day).getDayOfWeek().getValue())); v.put("startTime", start); v.put("endTime", end); return v;
    }
    Map<?, ?> single(Account a, Map<?, ?> c, String day, String start, String end) throws Exception { return data(send("POST", PATH, a.token, once(c, day, start, end))); }
    Map<String, Object> study(Map<?, ?> c, String start, int minutes) { return new HashMap<>(Map.of("courseId", c.get("id"), "title", "Ôn bài riêng", "startsAt", start, "timeZone", "Asia/Ho_Chi_Minh", "durationMinutes", minutes)); }
    Map<String, Object> studyUpdate(Map<?, ?> s) { return fields(s, "courseId", "assignmentId", "title", "startsAt", "timeZone", "durationMinutes", "status", "notes", "version"); }
    String studyItem(Map<?, ?> s) { return STUDIES + "/" + s.get("id"); }
    Map<?, ?> collision(HttpResponse<String> r, String kind, Map<?, ?> source) {
        error(r, 409, "SCHEDULE_TIME_CONFLICT"); assertThat(r.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
        var conflict = (Map<?, ?>) body(r).get("conflict"); assertThat(conflict.get("kind")).isEqualTo(kind); assertThat(conflict.get("id")).isEqualTo(source.get("id"));
        assertThat(conflict.get("courseId")).isEqualTo(source.get("courseId")); assertThat(conflict.get("courseName")).isEqualTo("Môn lịch học"); assertThat(body(r).get("detail").toString()).contains("Trùng", "Môn lịch học");
        assertThat(body(r).get("requestId")).isNotNull(); return conflict;
    }
    @Test void sameOrDifferentCourseAndSemesterStillCannotReserveTheSameTime() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "JAVA"); var d = course(a, semester(a, 2), "REACT"); var s = create(a, c);
        for (var subject : List.of(c, d)) {
            var v = once(subject, "2026-10-26", "08:00", "10:00"); var conflict = collision(send("POST", PATH, a.token, v), "CLASS", s);
            assertThat(conflict.get("date")).isEqualTo("2026-10-26"); assertThat(conflict.get("startsAt")).isEqualTo("2026-10-26T00:00:00Z"); assertThat(conflict.get("timeZone")).isEqualTo("Asia/Ho_Chi_Minh");
        }
        assertThat(list(a, "")).hasSize(1); assertThat(version(a, s)).isZero();
    }
    @Test void touchingEndpointsAreAllowedButEqualContainedAndOneMinuteOverlapsAreNot() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c);
        for (var times : List.of(List.of("07:00", "09:00"), List.of("07:30", "08:30"), List.of("06:00", "10:00"), List.of("08:59", "10:00")))
            collision(send("POST", PATH, a.token, once(c, "2026-10-26", times.getFirst(), times.getLast())), "CLASS", s);
        single(a, c, "2026-10-26", "05:00", "07:00"); single(a, c, "2026-10-26", "09:00", "11:00"); assertThat(list(a, "")).hasSize(3);
    }
    @Test void disjointWeekdaysOrDateRangesDoNotConflict() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); create(a, c);
        single(a, c, "2026-10-27", "07:00", "09:00"); single(a, c, "2026-11-09", "07:00", "09:00"); assertThat(list(a, "")).hasSize(3);
    }
    @Test void fullYearChecksIncludeDatesBeyondTheNinetyTwoDayReadWindow() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var last = single(a, c, "2026-12-28", "07:00", "09:00");
        var v = input(c); v.put("startsOn", "2026-01-01"); v.put("endsOn", "2026-12-31"); var hit = collision(send("POST", PATH, a.token, v), "CLASS", last); assertThat(hit.get("date")).isEqualTo("2026-12-28");
        assertThat(list(a, "")).hasSize(1);
    }
    @Test void wholeRuleUpdateExcludesItselfAndFailedChangesLeaveVersionAndDataUntouched() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var other = single(a, c, "2026-10-26", "10:00", "12:00");
        var v = update(s); v.put("room", "New room"); var saved = data(send("PUT", item(s), a.token, v)); assertThat(saved.get("version")).isEqualTo(1);
        v = update(saved); v.put("startTime", "10:00"); v.put("endTime", "11:00"); collision(send("PUT", item(s), a.token, v), "CLASS", other);
        assertThat(data(send("GET", item(s), a.token, null))).isEqualTo(saved); error(send("PUT", item(s), a.token, update(s)), 409, "CLASS_SCHEDULE_VERSION_CONFLICT");
    }
    @Test void classCreationChecksExistingSelfStudyAcrossCoursesAndStatuses() throws Exception {
        for (String status : List.of("PLANNED", "IN_PROGRESS", "COMPLETED")) {
            var a = account(); var sem = semester(a, 1); var c = course(a, sem, "QA"); var d = course(a, sem, "QB"); var v = study(d, "2026-10-26T08:00:00+07:00", 45); v.put("status", status);
            var saved = data(send("POST", STUDIES, a.token, v)); var hit = collision(send("POST", PATH, a.token, input(c)), "STUDY", saved); assertThat(hit.get("title")).isEqualTo("Ôn bài riêng"); assertThat(hit.get("startTime")).isEqualTo("08:00"); assertThat(list(a, "")).isEmpty();
        }
    }
    @Test void classUpdateChecksSelfStudyAndRollsBack() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var other = data(send("POST", STUDIES, a.token, study(c, "2026-10-26T10:00:00+07:00", 60)));
        var v = update(s); v.put("startTime", "08:00"); v.put("endTime", "11:00"); collision(send("PUT", item(s), a.token, v), "STUDY", other); assertThat(data(send("GET", item(s), a.token, null))).isEqualTo(s);
    }
    @Test void selfStudyCreationChecksClassesRegardlessOfItsStatusAndAcceptsTouchingEdges() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c);
        for (String status : List.of("PLANNED", "IN_PROGRESS", "COMPLETED")) { var v = study(c, "2026-10-26T08:00:00+07:00", 45); v.put("status", status); collision(send("POST", STUDIES, a.token, v), "CLASS", s); }
        data(send("POST", STUDIES, a.token, study(c, "2026-10-26T06:00:00+07:00", 60))); data(send("POST", STUDIES, a.token, study(c, "2026-10-26T09:00:00+07:00", 60)));
    }
    @Test void selfStudyUpdateChecksClassesWithoutChangingItsExistingVersionOrContent() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var saved = data(send("POST", STUDIES, a.token, study(c, "2026-10-26T10:00:00+07:00", 60)));
        var v = studyUpdate(saved); v.put("startsAt", "2026-10-26T08:00:00+07:00"); collision(send("PUT", studyItem(saved), a.token, v), "CLASS", s); assertThat(data(send("GET", studyItem(saved), a.token, null))).isEqualTo(saved);
        var changed = data(send("PUT", studyItem(saved), a.token, studyUpdate(saved))); assertThat(changed.get("version")).isEqualTo(0); // An identical PUT remains a no-op.
        v = studyUpdate(saved); v.put("title", "Changed"); data(send("PUT", studyItem(saved), a.token, v)); v.put("startsAt", "2026-10-26T08:00:00+07:00"); error(send("PUT", studyItem(saved), a.token, v), 409, "STUDY_SESSION_VERSION_CONFLICT");
    }
    @Test void lateNightSelfStudyMatchesTheNextLocalClassDateInBothWriteDirections() throws Exception {
        for (boolean classFirst : List.of(true, false)) {
            var a = account(); var c = course(a, semester(a, 1), "QA"); var v = study(c, "2026-10-26T23:00:00+07:00", 45); var rule = once(c, "2026-10-27", "06:15", "07:15"); rule.put("timeZone", "Pacific/Kiritimati");
            if (classFirst) { var s = data(send("POST", PATH, a.token, rule)); collision(send("POST", STUDIES, a.token, v), "CLASS", s); }
            else { var s = data(send("POST", STUDIES, a.token, v)); var hit = collision(send("POST", PATH, a.token, rule), "STUDY", s); assertThat(hit.get("date")).isEqualTo("2026-10-26"); assertThat(hit.get("endsAt")).isEqualTo("2026-10-26T16:45:00Z"); }
        }
    }
    @Test void cancellationFreesOnlyThatDayForClassesAndSelfStudy() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); save(a, s, "2026-10-26", cancel(0));
        data(send("POST", STUDIES, a.token, study(c, "2026-10-26T08:00:00+07:00", 45))); collision(send("POST", STUDIES, a.token, study(c, "2026-11-02T08:00:00+07:00", 45)), "CLASS", s);
        single(a, c, "2026-10-26", "07:00", "08:00"); collision(send("POST", PATH, a.token, once(c, "2026-11-02", "07:00", "08:00")), "CLASS", s);
    }
    @Test void changedOccurrenceFreesItsOldTimeAndOccupiesOnlyItsNewTimeAndDate() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var edit = change(0); edit.put("startTime", "10:00"); edit.put("endTime", "12:00"); save(a, s, "2026-10-26", edit);
        data(send("POST", STUDIES, a.token, study(c, "2026-10-26T07:00:00+07:00", 60))); collision(send("POST", STUDIES, a.token, study(c, "2026-10-26T11:00:00+07:00", 45)), "CLASS", s);
        collision(send("POST", PATH, a.token, once(c, "2026-10-26", "11:00", "12:00")), "CLASS", s); single(a, c, "2026-11-02", "10:00", "12:00");
    }
    @Test void conflictingNewOrUpdatedExceptionLeavesItsRowAndParentRevisionUntouched() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var other = single(a, c, "2026-10-26", "10:00", "12:00");
        var v = change(0); v.put("startTime", "10:30"); v.put("endTime", "11:30"); collision(send("PUT", at(s, "2026-10-26"), a.token, v), "CLASS", other); assertThat(exceptionList(a, s)).isEmpty(); assertThat(version(a, s)).isZero();
        var old = save(a, s, "2026-10-26", change(0)); v.put("scheduleVersion", 1); collision(send("PUT", at(s, "2026-10-26"), a.token, v), "CLASS", other); assertThat(data(send("GET", at(s, "2026-10-26"), a.token, null))).isEqualTo(old); assertThat(version(a, s)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT exception_revision FROM class_schedules WHERE id=?", Long.class, UUID.fromString(s.get("id").toString()))).isEqualTo(1);
    }
    @Test void exceptionChangeAlsoChecksSelfStudy() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var other = data(send("POST", STUDIES, a.token, study(c, "2026-10-26T10:00:00+07:00", 60)));
        var v = change(0); v.put("startTime", "10:00"); v.put("endTime", "11:00"); collision(send("PUT", at(s, "2026-10-26"), a.token, v), "STUDY", other); assertThat(version(a, s)).isZero();
    }
    @Test void restoringACancelledDayIsBlockedUntilTheNewStudyOccupyingItIsMovedOrDeleted() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var old = save(a, s, "2026-10-26", cancel(0)); var other = data(send("POST", STUDIES, a.token, study(c, "2026-10-26T08:00:00+07:00", 45)));
        collision(send("DELETE", at(s, "2026-10-26") + "?scheduleVersion=1", a.token, null), "STUDY", other); assertThat(data(send("GET", at(s, "2026-10-26"), a.token, null))).isEqualTo(old); assertThat(version(a, s)).isEqualTo(1);
        assertThat(send("DELETE", studyItem(other) + "?version=0", a.token, null).statusCode()).isEqualTo(204); assertThat(send("DELETE", at(s, "2026-10-26") + "?scheduleVersion=1", a.token, null).statusCode()).isEqualTo(204); assertThat(version(a, s)).isEqualTo(2);
    }
    @Test void restoringAChangedDayCanConflictWithAClassInTheFreedOriginalTime() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var v = change(0); v.put("startTime", "10:00"); v.put("endTime", "12:00"); var old = save(a, s, "2026-10-26", v); var other = single(a, c, "2026-10-26", "07:00", "09:00");
        collision(send("DELETE", at(s, "2026-10-26") + "?scheduleVersion=1", a.token, null), "CLASS", other); assertThat(data(send("GET", at(s, "2026-10-26"), a.token, null))).isEqualTo(old); assertThat(version(a, s)).isEqualTo(1);
    }
    @Test void wholeRuleEditsUseInheritedExceptionTimesButKeepExplicitOverrides() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = single(a, c, "2026-10-26", "07:00", "09:00"); save(a, s, "2026-10-26", change(0)); var other = data(send("POST", STUDIES, a.token, study(c, "2026-10-26T10:00:00+07:00", 60)));
        var parent = data(send("GET", item(s), a.token, null)); var v = update(parent); v.put("startTime", "10:00"); v.put("endTime", "12:00"); collision(send("PUT", item(s), a.token, v), "STUDY", other); assertThat(data(send("GET", item(s), a.token, null))).isEqualTo(parent);
        var edit = change(1); edit.put("startTime", "12:00"); edit.put("endTime", "13:00"); save(a, s, "2026-10-26", edit); v.put("version", 2); var updated = data(send("PUT", item(s), a.token, v)); assertThat(updated.get("version")).isEqualTo(3); // Explicit 12–13 wins over new base 10–12.
        collision(send("PUT", at(s, "2026-10-26"), a.token, change(3)), "STUDY", other); assertThat(version(a, s)).isEqualTo(3);
    }
    @Test void wholeRuleEditCanUseAFullyCancelledRangeWithoutFalseConflicts() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = single(a, c, "2026-10-26", "07:00", "09:00"); save(a, s, "2026-10-26", cancel(0));
        data(send("POST", STUDIES, a.token, study(c, "2026-10-26T10:00:00+07:00", 60))); var v = update(data(send("GET", item(s), a.token, null))); v.put("startTime", "10:00"); v.put("endTime", "12:00"); assertThat(data(send("PUT", item(s), a.token, v)).get("version")).isEqualTo(2);
    }
    @Test void foreignOwnersNeverBlockOrAppearInConflictPayloads() throws Exception {
        var a = account(); var b = account(); var c = course(a, semester(a, 1), "QA"); var d = course(b, semester(b, 1), "QB"); create(b, d); var s = create(a, c);
        collision(send("POST", STUDIES, a.token, study(c, "2026-10-26T08:00:00+07:00", 45)), "CLASS", s); var v = input(d); error(send("POST", PATH, a.token, v), 404, "COURSE_NOT_FOUND");
        save(a, s, "2026-10-26", cancel(0)); var foreignStudy = study(d, "2026-10-26T10:00:00+07:00", 45); data(send("POST", STUDIES, b.token, foreignStudy)); data(send("POST", STUDIES, a.token, study(c, "2026-10-26T10:00:00+07:00", 45)));
    }
    @Test void oppositeDateLineZonesConflictEvenWithDifferentLocalDatesAndWeekdays() throws Exception {
        for (boolean reverse : List.of(true, false)) {
            var a = account(); var c = course(a, semester(a, 1), "QA"); var east = once(c, "2026-10-27", "00:15", "01:15"); east.put("timeZone", "Pacific/Kiritimati"); var west = once(c, "2026-10-26", "00:30", "01:30"); west.put("timeZone", "Pacific/Honolulu");
            var first = data(send("POST", PATH, a.token, reverse ? west : east)); var hit = collision(send("POST", PATH, a.token, reverse ? east : west), "CLASS", first); assertThat(hit.get("date")).isEqualTo(reverse ? "2026-10-26" : "2026-10-27");
        }
    }
    @Test void sameLocalClockCanBeDisjointInDifferentZonesButChangingZoneCanIntroduceAConflict() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var v = once(c, "2026-10-26", "07:00", "09:00"); v.put("timeZone", "UTC"); var other = data(send("POST", PATH, a.token, v));
        var edit = update(other); edit.put("timeZone", "Asia/Ho_Chi_Minh"); collision(send("PUT", item(other), a.token, edit), "CLASS", s); assertThat(data(send("GET", item(other), a.token, null))).isEqualTo(other);
    }
    @Test void dstOffsetsAreEvaluatedForEachOccurrenceInsteadOfReusingTheFirstWeek() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var v = input(c); v.put("startsOn", "2026-03-01"); v.put("endsOn", "2026-03-08"); v.put("weekdays", List.of(7)); v.put("startTime", "09:00"); v.put("endTime", "10:00"); v.put("timeZone", "America/New_York"); var s = data(send("POST", PATH, a.token, v));
        v.put("timeZone", "UTC"); v.put("startTime", "13:00"); v.put("endTime", "13:30"); var hit = collision(send("POST", PATH, a.token, v), "CLASS", s); assertThat(hit.get("date")).isEqualTo("2026-03-08");
    }
    @Test void concurrentIdenticalClassCreatesHaveExactlyOneWinner() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var r = concurrent(() -> send("POST", PATH, a.token, input(c)), () -> send("POST", PATH, a.token, input(c)));
        assertThat(r.stream().map(HttpResponse::statusCode).sorted().toList()).containsExactly(201, 409); assertThat(list(a, "")).hasSize(1);
    }
    @Test void concurrentClassAndSelfStudyCreatesCannotBothReserveTheSameTime() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var r = concurrent(() -> send("POST", PATH, a.token, input(c)), () -> send("POST", STUDIES, a.token, study(c, "2026-10-26T08:00:00+07:00", 45)));
        assertThat(r.stream().map(HttpResponse::statusCode).sorted().toList()).containsExactly(201, 409); assertThat(jdbc.queryForObject("SELECT (SELECT count(*) FROM class_schedules WHERE user_id=?)+(SELECT count(*) FROM study_sessions WHERE user_id=?)", Long.class, a.id, a.id)).isEqualTo(1);
    }
    @Test void concurrentUpdatesToTwoRulesShareTheSameAccountLock() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = single(a, c, "2026-10-26", "07:00", "08:00"); var other = single(a, c, "2026-10-26", "10:00", "11:00"); var left = update(s); var right = update(other); for (var v : List.of(left, right)) { v.put("startTime", "08:00"); v.put("endTime", "10:00"); }
        var r = concurrent(() -> send("PUT", item(s), a.token, left), () -> send("PUT", item(other), a.token, right)); assertThat(r.stream().map(HttpResponse::statusCode).sorted().toList()).containsExactly(200, 409); assertThat(version(a, s) + version(a, other)).isEqualTo(1);
    }
    @Test void concurrentRestoreAndNewSelfStudyCannotSilentlyDoubleBook() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); save(a, s, "2026-10-26", cancel(0));
        var r = concurrent(() -> send("DELETE", at(s, "2026-10-26") + "?scheduleVersion=1", a.token, null), () -> send("POST", STUDIES, a.token, study(c, "2026-10-26T08:00:00+07:00", 45)));
        if (r.getFirst().statusCode() == 204) { collision(r.getLast(), "CLASS", s); assertThat(version(a, s)).isEqualTo(2); assertThat(exceptionList(a, s)).isEmpty(); } else { assertThat(r.getLast().statusCode()).isEqualTo(201); assertThat(body(r.getFirst()).get("code")).isEqualTo("SCHEDULE_TIME_CONFLICT"); assertThat(version(a, s)).isEqualTo(1); }
    }
    @Test void concurrentExceptionAndNewClassCheckTheEffectiveReplacementTime() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var v = change(0); v.put("startTime", "10:00"); v.put("endTime", "12:00");
        var r = concurrent(() -> send("PUT", at(s, "2026-10-26"), a.token, v), () -> send("POST", PATH, a.token, once(c, "2026-10-26", "10:00", "12:00")));
        if (r.getFirst().statusCode() == 200) { assertThat(r.getLast().statusCode()).isEqualTo(409); assertThat(version(a, s)).isEqualTo(1); } else { assertThat(r.getFirst().statusCode()).isEqualTo(409); assertThat(r.getLast().statusCode()).isEqualTo(201); assertThat(version(a, s)).isZero(); }
    }
    @Test void concurrentRuleAndSelfStudyUpdatesOnlyAllowOneToMoveIntoTheGap() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = single(a, c, "2026-10-26", "07:00", "08:00"); var other = data(send("POST", STUDIES, a.token, study(c, "2026-10-26T10:00:00+07:00", 60)));
        var left = update(s); left.put("startTime", "08:00"); left.put("endTime", "10:00"); var right = studyUpdate(other); right.put("startsAt", "2026-10-26T08:00:00+07:00"); right.put("durationMinutes", 120);
        var r = concurrent(() -> send("PUT", item(s), a.token, left), () -> send("PUT", studyItem(other), a.token, right)); assertThat(r.stream().map(HttpResponse::statusCode).sorted().toList()).containsExactly(200, 409);
    }
    @Test void legacyOverlapsRemainReadableAndCanBeRepairedByCancellationOrDeletion() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = single(a, c, "2026-10-26", "07:00", "09:00"); UUID duplicate = UUID.randomUUID();
        jdbc.update("INSERT INTO class_schedules(id,user_id,course_id,weekday_mask,starts_on,ends_on,start_time,end_time,time_zone,room,teacher,reminder_minutes,notes) SELECT ?,user_id,course_id,weekday_mask,starts_on,ends_on,start_time,end_time,time_zone,room,teacher,reminder_minutes,notes FROM class_schedules WHERE id=?", duplicate, UUID.fromString(s.get("id").toString()));
        assertThat(list(a, "")).hasSize(2); save(a, s, "2026-10-26", cancel(0)); assertThat(send("DELETE", PATH + "/" + duplicate + "?version=0", a.token, null).statusCode()).isEqualTo(204);
        data(send("POST", STUDIES, a.token, study(c, "2026-10-26T08:00:00+07:00", 45))); assertThat(list(a, "")).hasSize(1);
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershell51ScriptsExplainConflictsAndCloseTheirOwnSessionsEvenOnFailure() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); single(a, c, "2026-10-26", "10:00", "12:00");
        String email = jdbc.queryForObject("SELECT email FROM app_users WHERE id=?", String.class, a.id);
        String ps = Path.of(System.getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "powershell.exe").toString();
        for (String command : List.of(
                "& './scripts/Try-ClassSchedules.ps1' -Mode Create -CourseId '" + c.get("id") + "' -Weekdays @(1) -StartsOn '2026-10-26' -EndsOn '2026-10-26' -StartTime '08:00' -EndTime '09:00'",
                "& './scripts/Try-StudySessions.ps1' -Mode Create -CourseId '" + c.get("id") + "' -Title 'Study conflict' -StartsAt '2026-10-26T08:00:00+07:00' -DurationMinutes 45",
                "& './scripts/Try-ClassExceptions.ps1' -Mode Change -ClassScheduleId '" + s.get("id") + "' -Date '2026-10-26' -ScheduleVersion 0 -StartTime '10:00' -EndTime '11:00'")) {
            String script = "[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); function Read-Host { param([string]$Prompt,[switch]$AsSecureString); if ($AsSecureString) { ConvertTo-SecureString $env:CONFLICT_TEST_PASSWORD -AsPlainText -Force } else { $env:CONFLICT_TEST_EMAIL } }; "
                    + command + " -BaseUrl 'http://127.0.0.1:" + port + "'";
            var builder = new ProcessBuilder(ps, "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script).redirectErrorStream(true);
            builder.environment().keySet().removeIf(name -> name.equalsIgnoreCase("PSModulePath")); builder.environment().put("PSModulePath", Path.of(System.getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "Modules").toString());
            builder.environment().put("CONFLICT_TEST_EMAIL", email); builder.environment().put("CONFLICT_TEST_PASSWORD", SECRET); var process = builder.start();
            try {
                assertThat(process.waitFor(30, TimeUnit.SECONDS)).isTrue(); String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                assertThat(process.exitValue()).as(output).isNotZero(); assertThat(output).contains("SCHEDULE_TIME_CONFLICT", "26/10/2026").doesNotContain(SECRET, "accessToken", "refreshToken");
            } finally { if (process.isAlive()) process.destroyForcibly(); }
        }
        assertThat(version(a, s)).isZero(); assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL", Integer.class, a.id)).isEqualTo(1);
    }
    private List<HttpResponse<String>> concurrent(Callable<HttpResponse<String>> first, Callable<HttpResponse<String>> second) throws Exception {
        var gate = new CountDownLatch(1); try (var pool = Executors.newVirtualThreadPerTaskExecutor()) { var a = pool.submit(() -> { gate.await(); return first.call(); }); var b = pool.submit(() -> { gate.await(); return second.call(); }); gate.countDown(); return List.of(a.get(20, TimeUnit.SECONDS), b.get(20, TimeUnit.SECONDS)); }
    }
}
