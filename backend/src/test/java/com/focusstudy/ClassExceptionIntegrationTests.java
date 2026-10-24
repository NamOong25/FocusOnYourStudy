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
class ClassExceptionIntegrationTests {
    private static final String SCHEMA = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
    private static final String URL = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Run Test-Local.ps1");
    private static final String USER = System.getenv("TEST_DB_USER"), PASSWORD = System.getenv("TEST_DB_PASSWORD");
    private static final String SECRET = "ExceptionTest123!", PATH = "/api/v1/class-schedules", COURSES = "/api/v1/courses";
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
        String email = "exception-" + UUID.randomUUID() + "@example.test";
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
    @Test void emptyListAndMissingOverrideAreDifferentFromMissingParent() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c);
        assertThat(exceptionList(a, s)).isEmpty(); error(send("GET", at(s, "2026-10-26"), a.token, null), 404, "CLASS_EXCEPTION_NOT_FOUND");
        error(send("DELETE", at(s, "2026-10-26") + "?scheduleVersion=0", a.token, null), 404, "CLASS_EXCEPTION_NOT_FOUND");
        error(send("GET", PATH + "/" + UUID.randomUUID() + "/exceptions", a.token, null), 404, "CLASS_SCHEDULE_NOT_FOUND");
        var r = send("GET", exceptions(s), a.token, null); assertThat(body(r).get("meta")).isNotNull(); assertThat(r.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
    }
    @Test void cancelAffectsExactlyOneDateAndPreservesOtherWeeksAndBaseFields() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var e = save(a, s, "2026-10-26", cancel(0));
        assertThat(e.get("kind")).isEqualTo("CANCELLED"); assertThat(e.get("reason")).isEqualTo("Nghỉ một buổi"); assertThat(e.get("scheduleVersion")).isEqualTo(1); assertThat(e.get("startTime")).isNull();
        assertThat(e.containsKey("userId")).isFalse(); assertThat(e.containsKey("version")).isFalse();
        var first = occurrence(a, "2026-10-26"); assertThat(first.get("cancelled")).isEqualTo(true); assertThat(first.get("changed")).isEqualTo(false); assertThat(first.get("exceptionId")).isEqualTo(e.get("id")); assertThat(first.get("startTime")).isEqualTo("07:00");
        for (String day : List.of("2026-10-28", "2026-11-02")) { var row = occurrence(a, day); assertThat(row.get("cancelled")).isEqualTo(false); assertThat(row.get("exceptionId")).isNull(); }
        var parent = data(send("GET", item(s), a.token, null)); assertThat(parent.get("weekdays")).isEqualTo(s.get("weekdays")); assertThat(parent.get("startTime")).isEqualTo(s.get("startTime"));
        assertThat(occurrences(a, "?from=2026-10-26&to=2026-11-08")).hasSize(4); assertThat(exceptionList(a, s)).hasSize(1);
    }
    @Test void changedTimeRoomAndTeacherApplyOnlyOnTheSelectedDate() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var v = change(0); v.put("startTime", "10:00"); v.put("endTime", "12:00"); v.put("teacher", "  Giảng viên thay thế  "); var e = save(a, s, "2026-10-26", v);
        var row = occurrence(a, "2026-10-26"); assertThat(row.get("changed")).isEqualTo(true); assertThat(row.get("cancelled")).isEqualTo(false); assertThat(row.get("room")).isEqualTo("B2.03"); assertThat(row.get("teacher")).isEqualTo("Giảng viên thay thế"); assertThat(row.get("startsAt")).isEqualTo("2026-10-26T03:00:00Z"); assertThat(row.get("endsAt")).isEqualTo("2026-10-26T05:00:00Z");
        assertThat(row.get("courseId")).isEqualTo(c.get("id")); assertThat(row.get("exceptionId")).isEqualTo(e.get("id")); assertThat(occurrence(a, "2026-11-02").get("startTime")).isEqualTo("07:00");
    }
    @Test void partialOverridesInheritWhileEmptyTextExplicitlyClears() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var input = input(c); input.put("room", "A1"); input.put("teacher", "Base teacher"); var s = data(send("POST", PATH, a.token, input));
        var v = change(0); v.remove("room"); v.put("teacher", ""); v.put("startTime", "08:00"); var e = save(a, s, "2026-10-26", v); assertThat(e.get("room")).isNull(); assertThat(e.get("endTime")).isNull();
        var row = occurrence(a, "2026-10-26"); assertThat(row.get("room")).isEqualTo("A1"); assertThat(row.get("teacher")).isEqualTo(""); assertThat(row.get("endTime")).isEqualTo("09:00");
        var edit = update(data(send("GET", item(s), a.token, null))); edit.put("room", "A2"); edit.put("teacher", "Renamed"); edit.put("endTime", "10:00"); var newer = data(send("PUT", item(s), a.token, edit));
        row = occurrence(a, "2026-10-26"); assertThat(row.get("room")).isEqualTo("A2"); assertThat(row.get("teacher")).isEqualTo(""); assertThat(row.get("startTime")).isEqualTo("08:00"); assertThat(row.get("endTime")).isEqualTo("10:00"); assertThat(row.get("scheduleVersion")).isEqualTo(newer.get("version"));
    }
    @Test void upsertReplacesOneOverrideAndCanSwitchBetweenChangedAndCancelled() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var first = save(a, s, "2026-10-26", cancel(0));
        var changed = save(a, s, "2026-10-26", change(1)); assertThat(changed.get("id")).isEqualTo(first.get("id")); assertThat(occurrence(a, "2026-10-26").get("cancelled")).isEqualTo(false);
        var cancelled = save(a, s, "2026-10-26", cancel(2)); assertThat(cancelled.get("room")).isNull(); assertThat(cancelled.get("scheduleVersion")).isEqualTo(3); assertThat(exceptionList(a, s)).hasSize(1);
    }
    @Test void restoringOneDateKeepsTheOtherOverrideAndReturnsToCurrentBaseRule() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); save(a, s, "2026-10-26", cancel(0)); save(a, s, "2026-10-28", change(1));
        var r = send("DELETE", at(s, "2026-10-26") + "?scheduleVersion=2", a.token, null); assertThat(r.statusCode()).isEqualTo(204); assertThat(r.body()).isEmpty();
        var row = occurrence(a, "2026-10-26"); assertThat(row.get("cancelled")).isEqualTo(false); assertThat(row.get("changed")).isEqualTo(false); assertThat(row.get("exceptionId")).isNull(); assertThat(row.get("reason")).isEqualTo(""); assertThat(row.get("scheduleVersion")).isEqualTo(3);
        assertThat(occurrence(a, "2026-10-28").get("room")).isEqualTo("B2.03"); assertThat(exceptionList(a, s)).hasSize(1); error(send("GET", at(s, "2026-10-26"), a.token, null), 404, "CLASS_EXCEPTION_NOT_FOUND");
    }
    @Test void staleSaveRestoreAndWholeRuleCannotOverwriteANewerOverride() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var first = save(a, s, "2026-10-26", change(0));
        error(send("PUT", at(s, "2026-10-26"), a.token, cancel(0)), 409, "CLASS_SCHEDULE_VERSION_CONFLICT"); error(send("DELETE", at(s, "2026-10-26") + "?scheduleVersion=0", a.token, null), 409, "CLASS_SCHEDULE_VERSION_CONFLICT"); error(send("PUT", item(s), a.token, update(s)), 409, "CLASS_SCHEDULE_VERSION_CONFLICT");
        assertThat(data(send("GET", at(s, "2026-10-26"), a.token, null))).isEqualTo(first);
    }
    @Test void restoredThenRecreatedRowCannotBeChangedByAnOldEditor() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var first = save(a, s, "2026-10-26", change(0));
        assertThat(send("DELETE", at(s, "2026-10-26") + "?scheduleVersion=1", a.token, null).statusCode()).isEqualTo(204); var second = save(a, s, "2026-10-26", cancel(2)); assertThat(second.get("id")).isNotEqualTo(first.get("id"));
        error(send("PUT", at(s, "2026-10-26"), a.token, change(1)), 409, "CLASS_SCHEDULE_VERSION_CONFLICT"); error(send("DELETE", at(s, "2026-10-26") + "?scheduleVersion=1", a.token, null), 409, "CLASS_SCHEDULE_VERSION_CONFLICT"); assertThat(occurrence(a, "2026-10-26").get("cancelled")).isEqualTo(true);
    }
    @Test void malformedDatesAndDaysOutsideTheOriginalScheduleNeverCreateAnOverride() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c);
        for (String day : List.of("2026-02-30", "1899-01-01", "2100-01-01", "2026-1-01", "bad")) error(send("PUT", at(s, day), a.token, cancel(0)), 400, "INVALID_CLASS_DATE");
        for (String day : List.of("2026-10-27", "2026-10-19", "2026-11-09")) { error(send("PUT", at(s, day), a.token, cancel(0)), 404, "CLASS_OCCURRENCE_NOT_FOUND"); error(send("GET", at(s, day), a.token, null), 404, "CLASS_OCCURRENCE_NOT_FOUND"); }
        assertThat(exceptionList(a, s)).isEmpty(); assertThat(version(a, s)).isZero();
    }
    @Test void missingInvalidAndOversizedFieldsNeverWrite() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c);
        for (String key : List.of("kind", "scheduleVersion")) { var v = change(0); v.remove(key); error(send("PUT", at(s, "2026-10-26"), a.token, v), 400, "VALIDATION_FAILED"); }
        for (var e : Map.<String, Object>of("reason", "x".repeat(1001), "room", "x".repeat(101), "teacher", "x".repeat(201), "scheduleVersion", -1, "startTime", "24:00", "endTime", "09:00:00").entrySet()) { var v = change(0); v.put(e.getKey(), e.getValue()); assertThat(send("PUT", at(s, "2026-10-26"), a.token, v).statusCode()).isEqualTo(400); }
        for (Object value : List.of(0.5, "bad")) { var v = change(0); v.put("scheduleVersion", value); assertThat(send("PUT", at(s, "2026-10-26"), a.token, v).statusCode()).isEqualTo(400); }
        var v = change(0); v.put("kind", "RESTORED"); assertThat(send("PUT", at(s, "2026-10-26"), a.token, v).statusCode()).isEqualTo(400);
        for (String q : List.of("", "?scheduleVersion=-1", "?scheduleVersion=0.5")) assertThat(send("DELETE", at(s, "2026-10-26") + q, a.token, null).statusCode()).isEqualTo(400);
        assertThat(exceptionList(a, s)).isEmpty(); assertThat(version(a, s)).isZero();
    }
    @Test void cancellationRejectsOverridesAndChangedRequiresAnOverride() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c);
        for (String key : List.of("startTime", "endTime", "room", "teacher")) { var v = cancel(0); v.put(key, key.endsWith("Time") ? "08:00" : ""); error(send("PUT", at(s, "2026-10-26"), a.token, v), 400, "INVALID_CLASS_EXCEPTION"); }
        var empty = change(0); empty.remove("room"); error(send("PUT", at(s, "2026-10-26"), a.token, empty), 400, "INVALID_CLASS_EXCEPTION");
        assertThat(version(a, s)).isZero();
    }
    @Test void effectiveTimesAreValidatedIncludingTheInheritedEndpoint() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c);
        for (var pair : List.of(Map.of("startTime", "10:00"), Map.of("endTime", "06:00"), Map.of("startTime", "08:00", "endTime", "08:00"))) { var v = change(0); v.putAll(pair); error(send("PUT", at(s, "2026-10-26"), a.token, v), 400, "INVALID_CLASS_EXCEPTION"); }
        var v = change(0); v.put("startTime", "08:00"); save(a, s, "2026-10-26", v); var old = data(send("GET", at(s, "2026-10-26"), a.token, null)); v = change(1); v.put("endTime", "06:00"); error(send("PUT", at(s, "2026-10-26"), a.token, v), 400, "INVALID_CLASS_EXCEPTION"); assertThat(data(send("GET", at(s, "2026-10-26"), a.token, null))).isEqualTo(old); assertThat(version(a, s)).isEqualTo(1);
    }
    @Test void dstGapAndAmbiguityForAnOverrideAreRejectedUsingTheRuleZone() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var v = input(c); v.put("weekdays", List.of(7)); v.put("startsOn", "2026-03-08"); v.put("endsOn", "2026-03-08"); v.put("startTime", "09:00"); v.put("endTime", "10:00"); v.put("timeZone", "America/New_York"); var s = data(send("POST", PATH, a.token, v));
        var e = change(0); e.put("startTime", "02:30"); e.put("endTime", "04:00"); error(send("PUT", at(s, "2026-03-08"), a.token, e), 400, "INVALID_CLASS_EXCEPTION");
        v.put("startsOn", "2026-11-01"); v.put("endsOn", "2026-11-01"); s = data(send("POST", PATH, a.token, v)); e.put("startTime", "01:30"); error(send("PUT", at(s, "2026-11-01"), a.token, e), 400, "INVALID_CLASS_EXCEPTION");
    }
    @Test void foreignParentCannotListReadSaveOrRestoreAndPayloadCannotTransferOwnership() throws Exception {
        var a = account(); var b = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); save(a, s, "2026-10-26", cancel(0));
        error(send("GET", exceptions(s), b.token, null), 404, "CLASS_SCHEDULE_NOT_FOUND"); error(send("GET", at(s, "2026-10-26"), b.token, null), 404, "CLASS_SCHEDULE_NOT_FOUND"); error(send("PUT", at(s, "2026-10-26"), b.token, change(1)), 404, "CLASS_SCHEDULE_NOT_FOUND"); error(send("DELETE", at(s, "2026-10-26") + "?scheduleVersion=1", b.token, null), 404, "CLASS_SCHEDULE_NOT_FOUND");
        var v = change(1); v.put("userId", b.id); v.put("scheduleId", UUID.randomUUID()); var r = send("PUT", at(s, "2026-10-26"), a.token, v); assertThat(r.statusCode()).isIn(200, 400); assertThat(list(b, "")).isEmpty(); assertThat(jdbc.queryForObject("SELECT user_id FROM class_exceptions WHERE schedule_id=?", UUID.class, UUID.fromString(s.get("id").toString()))).isEqualTo(a.id);
    }
    @Test void nestedRoutesRequireBearerRejectCookiesAndRevokedSessions() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c);
        for (String method : List.of("GET", "PUT", "DELETE")) error(send(method, at(s, "2026-10-26") + "?scheduleVersion=0", null, method.equals("PUT") ? cancel(0) : null), 401, "AUTHENTICATION_REQUIRED");
        error(send("GET", exceptions(s), null, null), 401, "AUTHENTICATION_REQUIRED");
        var cookie = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + exceptions(s))).header("Cookie", "FOCUS_REFRESH=not-a-bearer").GET().build(); error(client.send(cookie, HttpResponse.BodyHandlers.ofString()), 401, "AUTHENTICATION_REQUIRED");
        assertThat(send("POST", at(s, "2026-10-26"), a.token, cancel(0)).statusCode()).isEqualTo(403);
        jdbc.update("UPDATE refresh_sessions SET revoked_at=now(),revocation_reason='LOGOUT' WHERE user_id=?", a.id); error(send("GET", exceptions(s), a.token, null), 401, "INVALID_ACCESS_TOKEN");
    }
    @Test void wholeRuleCannotRemoveAnExceptionalDayOrInvalidateInheritedTimes() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var e = change(0); e.put("startTime", "08:00"); save(a, s, "2026-10-26", e); var parent = data(send("GET", item(s), a.token, null));
        for (var patch : List.of(Map.<String, Object>of("weekdays", List.of(3)), Map.<String, Object>of("startsOn", "2026-10-28"), Map.<String, Object>of("endTime", "07:30"))) { var v = update(parent); v.putAll(patch); error(send("PUT", item(s), a.token, v), 409, "CLASS_SCHEDULE_HAS_EXCEPTIONS"); }
        assertThat(data(send("GET", item(s), a.token, null))).isEqualTo(parent); assertThat(occurrence(a, "2026-10-26").get("startTime")).isEqualTo("08:00");
    }
    @Test void movingRuleToAnotherCourseRequiresRestoringExceptionsFirst() throws Exception {
        var a = account(); var sem = semester(a, 1); var c = course(a, sem, "QA"); var d = course(a, sem, "QB"); var s = create(a, c); save(a, s, "2026-10-26", cancel(0));
        var v = update(data(send("GET", item(s), a.token, null))); v.put("courseId", d.get("id")); error(send("PUT", item(s), a.token, v), 409, "CLASS_SCHEDULE_HAS_EXCEPTIONS");
        assertThat(send("DELETE", at(s, "2026-10-26") + "?scheduleVersion=1", a.token, null).statusCode()).isEqualTo(204); v.put("version", 2); assertThat(data(send("PUT", item(s), a.token, v)).get("courseId")).isEqualTo(d.get("id"));
    }
    @Test void deletingWholeRuleCascadesOnlyItsOwnOverrides() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var otherValues = input(c); otherValues.put("startTime", "09:00"); otherValues.put("endTime", "11:00"); var other = data(send("POST", PATH, a.token, otherValues)); save(a, s, "2026-10-26", cancel(0)); save(a, other, "2026-10-28", change(0));
        assertThat(send("DELETE", item(s) + "?version=1", a.token, null).statusCode()).isEqualTo(204); assertThat(jdbc.queryForObject("SELECT count(*) FROM class_exceptions WHERE schedule_id=?", Integer.class, UUID.fromString(s.get("id").toString()))).isZero(); assertThat(exceptionList(a, other)).hasSize(1);
    }
    @Test void databaseGuardsUniqueDateOwnerKindTimesAndRevision() throws Exception {
        var a = account(); var b = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var e = save(a, s, "2026-10-26", cancel(0)); var id = UUID.fromString(e.get("id").toString());
        for (String sql : List.of("UPDATE class_exceptions SET user_id='" + b.id + "' WHERE id=?", "UPDATE class_exceptions SET kind='BAD' WHERE id=?", "UPDATE class_exceptions SET room='A1' WHERE id=?", "UPDATE class_exceptions SET kind='CHANGED' WHERE id=?", "UPDATE class_exceptions SET kind='CHANGED',start_time='24:00' WHERE id=?", "UPDATE class_exceptions SET version=-1 WHERE id=?")) assertThatThrownBy(() -> jdbc.update(sql, id)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update("UPDATE class_schedules SET exception_revision=-1 WHERE id=?", UUID.fromString(s.get("id").toString()))).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update("INSERT INTO class_exceptions(id,user_id,schedule_id,occurrence_date,kind) VALUES (?,?,?,'2026-10-26','CANCELLED')", UUID.randomUUID(), a.id, UUID.fromString(s.get("id").toString()))).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }
    @Test void concurrentEditsOnSameOrDifferentDaysHaveExactlyOneWinnerPerVersion() throws Exception {
        for (String secondDay : List.of("2026-10-26", "2026-10-28")) { var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var r = concurrent(() -> send("PUT", at(s, "2026-10-26"), a.token, cancel(0)), () -> send("PUT", at(s, secondDay), a.token, change(0))); assertThat(r.stream().map(HttpResponse::statusCode).sorted().toList()).containsExactly(200, 409); assertThat(exceptionList(a, s)).hasSize(1); assertThat(version(a, s)).isEqualTo(1); }
    }
    @Test void concurrentWholeRuleChangeAndOverrideShareTheSameVersionGuard() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var edit = update(s); edit.put("room", "Changed base");
        var r = concurrent(() -> send("PUT", item(s), a.token, edit), () -> send("PUT", at(s, "2026-10-26"), a.token, cancel(0))); assertThat(r.stream().map(HttpResponse::statusCode).sorted().toList()).containsExactly(200, 409); assertThat(version(a, s)).isEqualTo(1);
    }
    @Test void concurrentDeleteOfRuleAndCreateOfOverrideCannotOrphanOrResurrect() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var r = concurrent(() -> send("DELETE", item(s) + "?version=0", a.token, null), () -> send("PUT", at(s, "2026-10-26"), a.token, cancel(0)));
        if (r.getFirst().statusCode() == 204) { error(r.getLast(), 404, "CLASS_SCHEDULE_NOT_FOUND"); assertThat(jdbc.queryForObject("SELECT count(*) FROM class_exceptions WHERE user_id=?", Integer.class, a.id)).isZero(); } else { error(r.getFirst(), 409, "CLASS_SCHEDULE_VERSION_CONFLICT"); assertThat(r.getLast().statusCode()).isEqualTo(200); }
    }
    @Test void concurrentRestoreAndEditDoNotUndoTheWinningOperation() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); save(a, s, "2026-10-26", cancel(0)); var r = concurrent(() -> send("DELETE", at(s, "2026-10-26") + "?scheduleVersion=1", a.token, null), () -> send("PUT", at(s, "2026-10-26"), a.token, change(1)));
        if (r.getFirst().statusCode() == 204) { error(r.getLast(), 409, "CLASS_SCHEDULE_VERSION_CONFLICT"); assertThat(exceptionList(a, s)).isEmpty(); } else { error(r.getFirst(), 409, "CLASS_SCHEDULE_VERSION_CONFLICT"); assertThat(r.getLast().statusCode()).isEqualTo(200); }
    }
    @Test void occurrenceReadsSeeOneConsistentSnapshotOfRuleVersionAndOverrides() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c);
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            var writer = pool.submit(() -> { for (int i = 1; i <= 12; i++) { var v = i % 2 == 1 ? cancel(i - 1) : change(i - 1); if (i % 2 == 0) v.put("room", "Room-" + i); save(a, s, "2026-10-26", v); } return true; });
            int reads = 0;
            do {
                var rows = occurrences(a, "?from=2026-10-26&to=2026-11-08"); var first = (Map<?, ?>) rows.getFirst(); long v = ((Number) first.get("scheduleVersion")).longValue();
                for (var row : rows) assertThat(((Map<?, ?>) row).get("scheduleVersion")).isEqualTo(first.get("scheduleVersion"));
                assertThat(first.get("cancelled")).isEqualTo(v % 2 == 1); if (v > 0 && v % 2 == 0) assertThat(first.get("room")).isEqualTo("Room-" + v); reads++;
            } while (!writer.isDone() || reads < 10);
            assertThat(writer.get(20, TimeUnit.SECONDS)).isTrue();
        }
    }
    private List<HttpResponse<String>> concurrent(Callable<HttpResponse<String>> first, Callable<HttpResponse<String>> second) throws Exception {
        var gate = new CountDownLatch(1); try (var pool = Executors.newVirtualThreadPerTaskExecutor()) { var a = pool.submit(() -> { gate.await(); return first.call(); }); var b = pool.submit(() -> { gate.await(); return second.call(); }); gate.countDown(); return List.of(a.get(20, TimeUnit.SECONDS), b.get(20, TimeUnit.SECONDS)); }
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershell51GuideRunsCancelChangeGetListRestoreAndClosesOnlyItsOwnSession() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); String email = jdbc.queryForObject("SELECT email FROM app_users WHERE id=?", String.class, a.id);
        String ps = Path.of(System.getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "powershell.exe").toString(); long currentVersion = 0;
        for (String mode : List.of("Cancel", "List", "Get", "Change", "Restore")) {
            String script = "[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); function Read-Host { param([string]$Prompt,[switch]$AsSecureString); if ($AsSecureString) { ConvertTo-SecureString $env:EXCEPTION_TEST_PASSWORD -AsPlainText -Force } else { $env:EXCEPTION_TEST_EMAIL } }; "
                    + "& './scripts/Try-ClassExceptions.ps1' -BaseUrl 'http://127.0.0.1:" + port + "' -Mode " + mode + " -ClassScheduleId '" + s.get("id") + "' -Date '2026-10-26' -ScheduleVersion " + currentVersion
                    + (mode.equals("Change") ? " -StartTime '10:00' -EndTime '12:00' -Room 'B2.03' -Teacher 'Replacement' -Reason 'Changed via PowerShell'" : "");
            var builder = new ProcessBuilder(ps, "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script).redirectErrorStream(true);
            builder.environment().keySet().removeIf(name -> name.equalsIgnoreCase("PSModulePath")); builder.environment().put("PSModulePath", Path.of(System.getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "Modules").toString()); builder.environment().put("EXCEPTION_TEST_EMAIL", email); builder.environment().put("EXCEPTION_TEST_PASSWORD", SECRET); var process = builder.start();
            try {
                assertThat(process.waitFor(30, TimeUnit.SECONDS)).isTrue(); String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8); assertThat(process.exitValue()).as(output).isZero(); assertThat(output).doesNotContain(SECRET, "accessToken", "refreshToken");
                currentVersion = version(a, s); if (mode.equals("Change")) { var row = occurrence(a, "2026-10-26"); assertThat(row.get("startTime")).isEqualTo("10:00"); assertThat(row.get("room")).isEqualTo("B2.03"); }
            } finally { if (process.isAlive()) process.destroyForcibly(); }
        }
        assertThat(exceptionList(a, s)).isEmpty(); assertThat(currentVersion).isEqualTo(3); assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL", Integer.class, a.id)).isEqualTo(1);
    }
}
