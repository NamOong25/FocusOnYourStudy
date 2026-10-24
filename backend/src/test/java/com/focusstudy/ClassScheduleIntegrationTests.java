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
class ClassScheduleIntegrationTests {
    private static final String SCHEMA = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
    private static final String URL = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Run Test-Local.ps1");
    private static final String USER = System.getenv("TEST_DB_USER"), PASSWORD = System.getenv("TEST_DB_PASSWORD");
    private static final String SECRET = "ClassTest123!", PATH = "/api/v1/class-schedules", COURSES = "/api/v1/courses";
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
        String email = "class-" + UUID.randomUUID() + "@example.test";
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
    @Test void emptyListAndOwnedFiltersAreDistinctFromErrors() throws Exception {
        var a = account(); var sem = semester(a, 1); var c = course(a, sem, "QA");
        assertThat(list(a, "")).isEmpty(); assertThat(list(a, "?courseId=" + c.get("id") + "&semesterId=" + sem.get("id"))).isEmpty();
        assertThat(occurrences(a, "?from=2026-10-26&to=2026-11-01")).isEmpty();
        var r = send("GET", PATH, a.token, null); assertThat(body(r).get("meta")).isNotNull(); assertThat(r.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
    }
    @Test void createTrimsDefaultsSortsDaysAndDoesNotExposeOwnerOrMask() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var v = input(c); v.put("weekdays", List.of(3, 1)); v.put("room", "  A1.01  "); v.put("teacher", "  Giảng viên  "); v.put("notes", "  Dòng một\nDòng hai  ");
        var r = send("POST", PATH, a.token, v); var s = data(r); assertThat(r.statusCode()).isEqualTo(201); assertThat(r.headers().firstValue("Location")).contains(item(s));
        assertThat(s.get("weekdays")).isEqualTo(List.of(1, 3)); assertThat(s.get("room")).isEqualTo("A1.01"); assertThat(s.get("teacher")).isEqualTo("Giảng viên"); assertThat(s.get("notes")).isEqualTo("Dòng một\nDòng hai"); assertThat(s.get("reminderMinutes")).isEqualTo(15); assertThat(s.get("startTime")).isEqualTo("07:00");
        assertThat(data(send("GET", item(s), a.token, null))).isEqualTo(s); assertThat(s.containsKey("userId")).isFalse(); assertThat(s.containsKey("weekdayMask")).isFalse();
        assertThat(jdbc.queryForObject("SELECT weekday_mask FROM class_schedules WHERE id=?", Integer.class, UUID.fromString(s.get("id").toString()))).isEqualTo(5);
        assertThat(jdbc.queryForObject("SELECT to_char(start_time,'HH24:MI') FROM class_schedules WHERE id=?", String.class, UUID.fromString(s.get("id").toString()))).isEqualTo("07:00");
    }
    @Test void wallClockDatesAndTimesStayExactAcrossDifferentJvmTimeZones() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var previous = TimeZone.getDefault(); var saved = new ArrayList<Map<?, ?>>();
        try {
            for (String zone : List.of("UTC", "Asia/Ho_Chi_Minh", "America/Los_Angeles")) {
                TimeZone.setDefault(TimeZone.getTimeZone(zone)); var s = create(a, c); saved.add(s); UUID id = UUID.fromString(s.get("id").toString());
                assertThat(jdbc.queryForObject("SELECT start_time::text FROM class_schedules WHERE id=?", String.class, id)).isEqualTo("07:00:00");
                assertThat(jdbc.queryForObject("SELECT starts_on::text FROM class_schedules WHERE id=?", String.class, id)).isEqualTo("2026-10-26");
                for (var old : saved) { var current = data(send("GET", item(old), a.token, null)); assertThat(current.get("startTime")).isEqualTo("07:00"); assertThat(current.get("startsOn")).isEqualTo("2026-10-26"); }
                var first = (Map<?, ?>) occurrences(a, "?from=2026-10-26&to=2026-10-26").getFirst(); assertThat(first.get("startsAt")).isEqualTo("2026-10-26T00:00:00Z");
            }
        } finally { TimeZone.setDefault(previous); }
    }
    @Test void expansionUsesSelectedWeekdaysInclusiveBoundariesAndUtcInstants() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var rows = occurrences(a, "?from=2026-10-26&to=2026-11-08");
        assertThat(rows).hasSize(4); assertThat(rows.stream().map(v -> ((Map<?, ?>) v).get("date").toString())).containsExactly("2026-10-26", "2026-10-28", "2026-11-02", "2026-11-04");
        var first = (Map<?, ?>) rows.getFirst(); assertThat(first.get("scheduleId")).isEqualTo(s.get("id")); assertThat(first.get("startsAt")).isEqualTo("2026-10-26T00:00:00Z"); assertThat(first.get("endsAt")).isEqualTo("2026-10-26T02:00:00Z"); assertThat(first.get("scheduleVersion")).isEqualTo(0);
        assertThat(occurrences(a, "?from=2026-10-28&to=2026-10-28")).hasSize(1); assertThat(occurrences(a, "?from=2026-11-09&to=2026-11-15")).isEmpty();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM class_schedules WHERE user_id=?", Integer.class, a.id)).isEqualTo(1);
    }
    @Test void sundayIsSevenAndLeapDayCanBeASingleOccurrence() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var v = input(c); v.put("weekdays", List.of(7)); v.put("startsOn", "2026-11-01"); v.put("endsOn", "2026-11-01"); data(send("POST", PATH, a.token, v));
        assertThat(occurrences(a, "?from=2026-10-31&to=2026-11-02")).hasSize(1);
        v.put("weekdays", List.of(2)); v.put("startsOn", "2028-02-29"); v.put("endsOn", "2028-02-29"); data(send("POST", PATH, a.token, v)); assertThat(occurrences(a, "?from=2028-02-29&to=2028-02-29")).hasSize(1);
    }
    @Test void dstCrossingUsesWallClockRuleWithDifferentUtcOffsets() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var v = input(c); v.put("timeZone", "America/New_York"); v.put("weekdays", List.of(7)); v.put("startsOn", "2026-03-01"); v.put("endsOn", "2026-03-15"); v.put("startTime", "09:00"); v.put("endTime", "10:00"); data(send("POST", PATH, a.token, v));
        var rows = occurrences(a, "?from=2026-03-01&to=2026-03-15"); assertThat(rows).hasSize(3); assertThat(((Map<?, ?>) rows.get(0)).get("startsAt")).isEqualTo("2026-03-01T14:00:00Z"); assertThat(((Map<?, ?>) rows.get(1)).get("startsAt")).isEqualTo("2026-03-08T13:00:00Z");
    }
    @Test void nonexistentAndAmbiguousDstTimesAreRejectedAcrossTheEntireRule() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var v = input(c); v.put("timeZone", "America/New_York"); v.put("weekdays", List.of(7)); v.put("startsOn", "2026-03-01"); v.put("endsOn", "2026-03-15"); v.put("startTime", "02:30"); v.put("endTime", "04:00");
        var r = send("POST", PATH, a.token, v); error(r, 400, "VALIDATION_FAILED"); assertThat(r.body()).contains("startTime", "2026-03-08");
        v.put("startTime", "01:00"); v.put("endTime", "02:30"); error(send("POST", PATH, a.token, v), 400, "VALIDATION_FAILED");
        v.put("startsOn", "2026-10-25"); v.put("endsOn", "2026-11-08"); v.put("startTime", "01:30"); v.put("endTime", "03:00"); error(send("POST", PATH, a.token, v), 400, "VALIDATION_FAILED"); assertThat(list(a, "")).isEmpty();
    }
    @Test void requiredOversizedNullDaysDuplicateDaysAndInvalidNumbersNeverWrite() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA");
        for (String field : List.of("courseId", "weekdays", "startsOn", "endsOn", "startTime", "endTime", "timeZone")) { var v = input(c); v.remove(field); error(send("POST", PATH, a.token, v), 400, "VALIDATION_FAILED"); }
        for (Object days : List.of(List.of(), List.of(0), List.of(8), List.of(1, 1), Arrays.asList(1, null))) { var v = input(c); v.put("weekdays", days); error(send("POST", PATH, a.token, v), 400, "VALIDATION_FAILED"); }
        for (var entry : Map.<String, Object>of("room", "x".repeat(101), "teacher", "x".repeat(201), "notes", "x".repeat(5001), "reminderMinutes", -1).entrySet()) { var v = input(c); v.put(entry.getKey(), entry.getValue()); error(send("POST", PATH, a.token, v), 400, "VALIDATION_FAILED"); }
        for (Object reminder : List.of(10081, 2.5, "bad")) { var v = input(c); v.put("reminderMinutes", reminder); assertThat(send("POST", PATH, a.token, v).statusCode()).isEqualTo(400); }
        var v = input(c); v.put("weekdays", List.of(1.5)); assertThat(send("POST", PATH, a.token, v).statusCode()).isEqualTo(400); assertThat(list(a, "")).isEmpty();
    }
    @Test void badDatesExcessiveRangeAndRangeWithoutMatchingDayProduceFieldErrors() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA");
        for (String date : List.of("2026-02-30", "2026-1-01", "1899-01-01", "2100-01-01", "2026-10-26T00:00:00Z", "infinity")) { var v = input(c); v.put("startsOn", date); error(send("POST", PATH, a.token, v), 400, "VALIDATION_FAILED"); }
        var v = input(c); v.put("endsOn", "2026-10-25"); error(send("POST", PATH, a.token, v), 400, "VALIDATION_FAILED"); v.put("endsOn", "2027-10-27"); error(send("POST", PATH, a.token, v), 400, "VALIDATION_FAILED");
        v = input(c); v.put("startsOn", "2026-10-27"); v.put("endsOn", "2026-10-27"); var r = send("POST", PATH, a.token, v); error(r, 400, "VALIDATION_FAILED"); assertThat(r.body()).contains("weekdays");
    }
    @Test void timesAreMinutePrecisionOrderedAndCannotCrossMidnight() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA");
        for (String time : List.of("7:00", "24:00", "07:60", "07:00:01", "07:00:00", "07:00Z")) { var v = input(c); v.put("startTime", time); error(send("POST", PATH, a.token, v), 400, "VALIDATION_FAILED"); }
        for (String end : List.of("07:00", "06:59", "00:00", "24:00")) { var v = input(c); v.put("endTime", end); error(send("POST", PATH, a.token, v), 400, "VALIDATION_FAILED"); }
        var v = input(c); v.put("startTime", "23:58"); v.put("endTime", "23:59"); data(send("POST", PATH, a.token, v));
        v.put("timeZone", "+07:00"); error(send("POST", PATH, a.token, v), 400, "VALIDATION_FAILED"); v.put("timeZone", "Fake/Zone"); error(send("POST", PATH, a.token, v), 400, "VALIDATION_FAILED");
    }
    @Test void filtersCombineOwnerCourseSemesterAndDateRange() throws Exception {
        var a = account(); var sem = semester(a, 1); var otherSem = semester(a, 2); var c = course(a, sem, "QA"); var d = course(a, otherSem, "QB"); create(a, c); create(a, d);
        String query = "?courseId=" + c.get("id") + "&semesterId=" + sem.get("id") + "&from=2026-10-28&to=2026-10-28";
        assertThat(list(a, "")).hasSize(2); assertThat(list(a, query)).hasSize(1); assertThat(occurrences(a, query)).hasSize(1);
        assertThat(list(a, query.replace(sem.get("id").toString(), otherSem.get("id").toString()))).isEmpty();
        assertThat(list(a, "?from=2026-11-09")).isEmpty(); assertThat(list(a, "?to=2026-10-25")).isEmpty();
        assertThat(list(a, "?from=2026-10-27&to=2026-10-27")).hasSize(2); assertThat(occurrences(a, "?from=2026-10-27&to=2026-10-27")).isEmpty();
    }
    @Test void fullYearRuleAndAbsoluteYearBoundariesAreCheckedWithoutServerTimeZone() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var v = input(c); v.put("startsOn", "2026-01-01"); v.put("endsOn", "2026-12-31"); data(send("POST", PATH, a.token, v));
        v.put("startsOn", "1900-01-01"); v.put("endsOn", "1900-01-01"); v.put("weekdays", List.of(1)); v.put("startTime", "00:00"); v.put("endTime", "01:00");
        error(send("POST", PATH, a.token, v), 400, "VALIDATION_FAILED"); v.put("timeZone", "UTC"); data(send("POST", PATH, a.token, v));
        v.put("startsOn", "2099-12-31"); v.put("endsOn", "2099-12-31"); v.put("weekdays", List.of(LocalDate.of(2099, 12, 31).getDayOfWeek().getValue())); v.put("startTime", "22:00"); v.put("endTime", "23:59"); data(send("POST", PATH, a.token, v));
        v.put("timeZone", "Pacific/Honolulu"); error(send("POST", PATH, a.token, v), 400, "VALIDATION_FAILED");
    }
    @Test void occurrenceRangeIsBoundedAndMalformedQueriesReturn400() throws Exception {
        var a = account();
        for (String query : List.of("?from=bad", "?to=2026-02-30", "?from=2026-10-28&to=2026-10-27", "?from=1899-01-01", "?to=2100-01-01", "?from=")) error(send("GET", PATH + query, a.token, null), 400, "INVALID_CLASS_RANGE");
        for (String query : List.of("?from=2026-01-01&to=2026-04-03", "?from=&to=2026-01-01")) error(send("GET", PATH + "/occurrences" + query, a.token, null), 400, "INVALID_CLASS_RANGE");
        assertThat(send("GET", PATH + "/occurrences?from=2026-01-01", a.token, null).statusCode()).isEqualTo(400);
        assertThat(occurrences(a, "?from=2026-01-01&to=2026-04-02")).isEmpty();
        for (String query : List.of("?courseId=bad", "?semesterId=bad")) assertThat(send("GET", PATH + query, a.token, null).statusCode()).isEqualTo(400);
        assertThat(send("GET", PATH + "/bad", a.token, null).statusCode()).isEqualTo(400);
    }
    @Test void fullUpdateReassignsCourseAndReplacesEntireRuleWithSameIdentity() throws Exception {
        var a = account(); var sem = semester(a, 1); var c = course(a, sem, "QA"); var d = course(a, sem, "QB"); var s = create(a, c); var v = update(s); v.put("courseId", d.get("id")); v.put("weekdays", List.of(2, 4)); v.put("room", "B2"); v.put("teacher", "New"); v.put("reminderMinutes", 0); v.put("startTime", "09:15"); v.put("endTime", "11:15");
        var changed = data(send("PUT", item(s), a.token, v)); assertThat(changed.get("id")).isEqualTo(s.get("id")); assertThat(changed.get("version")).isEqualTo(1); assertThat(changed.get("courseId")).isEqualTo(d.get("id"));
        var rows = occurrences(a, "?from=2026-10-26&to=2026-11-01"); assertThat(rows).hasSize(2); assertThat(((Map<?, ?>) rows.getFirst()).get("date")).isEqualTo("2026-10-27"); assertThat(((Map<?, ?>) rows.getFirst()).get("startsAt")).isEqualTo("2026-10-27T02:15:00Z");
        v = update(changed); v.remove("room"); v.remove("teacher"); v.remove("notes"); assertThat(data(send("PUT", item(changed), a.token, v)).get("room")).isEqualTo("");
    }
    @Test void invalidUpdateRollsBackAndStaleMissingNegativeOrFractionalVersionCannotWrite() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var v = update(s); v.put("room", "New"); var changed = data(send("PUT", item(s), a.token, v));
        error(send("PUT", item(s), a.token, update(s)), 409, "CLASS_SCHEDULE_VERSION_CONFLICT"); error(send("DELETE", item(s) + "?version=0", a.token, null), 409, "CLASS_SCHEDULE_VERSION_CONFLICT");
        for (Object version : List.of(-1, 0.5, "bad")) { v = update(changed); v.put("version", version); assertThat(send("PUT", item(s), a.token, v).statusCode()).isEqualTo(400); }
        v = update(changed); v.remove("version"); error(send("PUT", item(s), a.token, v), 400, "VALIDATION_FAILED");
        v = update(changed); v.put("endTime", "00:00"); error(send("PUT", item(s), a.token, v), 400, "VALIDATION_FAILED"); assertThat(data(send("GET", item(s), a.token, null))).isEqualTo(changed);
        for (String suffix : List.of("", "?version=-1", "?version=0.5")) assertThat(send("DELETE", item(s) + suffix, a.token, null).statusCode()).isEqualTo(400);
    }
    @Test void foreignAndMissingSchedulesAreIndistinguishableAndCannotBeMutated() throws Exception {
        var a = account(); var b = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c);
        assertThat(list(b, "")).isEmpty(); assertThat(occurrences(b, "?from=2026-10-26&to=2026-11-01")).isEmpty();
        for (String path : List.of(item(s), PATH + "/" + UUID.randomUUID())) {
            error(send("GET", path, b.token, null), 404, "CLASS_SCHEDULE_NOT_FOUND"); error(send("PUT", path, b.token, update(s)), 404, "CLASS_SCHEDULE_NOT_FOUND"); error(send("DELETE", path + "?version=0", b.token, null), 404, "CLASS_SCHEDULE_NOT_FOUND");
        }
        assertThat(data(send("GET", item(s), a.token, null))).isEqualTo(s);
    }
    @Test void foreignParentAndFiltersAreCheckedEvenWithAnEmptyCatalogue() throws Exception {
        var a = account(); var b = account(); var sem = semester(a, 1); var c = course(a, sem, "QA"); var own = course(b, semester(b, 1), "QB"); var s = create(b, own);
        for (String method : List.of("POST", "PUT")) { var v = method.equals("PUT") ? update(s) : input(c); v.put("courseId", c.get("id")); error(send(method, method.equals("PUT") ? item(s) : PATH, b.token, v), 404, "COURSE_NOT_FOUND"); }
        for (String prefix : List.of("?", "/occurrences?from=2026-10-26&to=2026-11-01&")) {
            error(send("GET", PATH + prefix + "courseId=" + c.get("id"), b.token, null), 404, "COURSE_NOT_FOUND"); error(send("GET", PATH + prefix + "semesterId=" + sem.get("id"), b.token, null), 404, "SEMESTER_NOT_FOUND");
        }
    }
    @Test void everyRouteRequiresExplicitBearerAndDoesNotTrustPayloadOwner() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c);
        for (String method : List.of("GET", "POST", "PUT", "DELETE")) error(send(method, method.equals("PUT") || method.equals("DELETE") ? item(s) + "?version=0" : PATH, null, method.equals("POST") || method.equals("PUT") ? update(s) : null), 401, "AUTHENTICATION_REQUIRED");
        error(send("GET", PATH + "/occurrences?from=2026-10-26&to=2026-11-01", null, null), 401, "AUTHENTICATION_REQUIRED"); error(send("GET", PATH, "invalid", null), 401, "INVALID_ACCESS_TOKEN");
        var b = account(); var v = input(c); v.put("userId", b.id); var forged = send("POST", PATH, a.token, v); assertThat(forged.statusCode()).isIn(201, 400); assertThat(list(b, "")).isEmpty();
        var cookieOnly = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + PATH)).header("Cookie", "FOCUS_REFRESH=not-a-bearer").GET().build();
        error(client.send(cookieOnly, HttpResponse.BodyHandlers.ofString()), 401, "AUTHENTICATION_REQUIRED");
        var browser = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + PATH)).header("Origin", "http://localhost:8092").header("Authorization", "Bearer " + a.token).GET().build();
        var allowed = client.send(browser, HttpResponse.BodyHandlers.ofString()); assertThat(allowed.statusCode()).isEqualTo(200); assertThat(allowed.headers().allValues("Set-Cookie")).isEmpty();
        var foreign = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + PATH)).header("Origin", "https://foreign.example").header("Authorization", "Bearer " + a.token).GET().build();
        assertThat(client.send(foreign, HttpResponse.BodyHandlers.ofString()).statusCode()).isEqualTo(403); assertThat(send("PATCH", item(s), a.token, Map.of()).statusCode()).isEqualTo(403);
        jdbc.update("UPDATE refresh_sessions SET revoked_at=now(),revocation_reason='LOGOUT' WHERE user_id=?", a.id); error(send("GET", PATH, a.token, null), 401, "INVALID_ACCESS_TOKEN");
    }
    @Test void deleteRemovesEntireRuleButNotItsCourseOrStudyPlans() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c);
        var study = data(send("POST", "/api/v1/study-sessions", a.token, Map.of("courseId", c.get("id"), "title", "Keep study", "startsAt", "2026-10-26T19:00:00+07:00", "timeZone", "Asia/Ho_Chi_Minh", "durationMinutes", 45)));
        var r = send("DELETE", item(s) + "?version=0", a.token, null); assertThat(r.statusCode()).isEqualTo(204); assertThat(r.body()).isEmpty(); assertThat(list(a, "")).isEmpty(); assertThat(occurrences(a, "?from=2026-10-26&to=2026-11-01")).isEmpty();
        assertThat(data(send("GET", COURSES + "/" + c.get("id"), a.token, null))).isEqualTo(c); assertThat(data(send("GET", "/api/v1/study-sessions/" + study.get("id"), a.token, null))).isEqualTo(study);
        error(send("DELETE", item(s) + "?version=0", a.token, null), 404, "CLASS_SCHEDULE_NOT_FOUND");
    }
    @Test void schedulesBlockCourseDeleteAndSemesterMoveButAllowRenameAndBecomeMovableAfterDeletion() throws Exception {
        var a = account(); var sem = semester(a, 1); var target = semester(a, 2); var c = course(a, sem, "QA"); var s = create(a, c);
        error(send("DELETE", COURSES + "/" + c.get("id") + "?version=0", a.token, null), 409, "COURSE_HAS_CLASS_SCHEDULES");
        var move = courseUpdate(c); move.put("semesterId", target.get("id")); error(send("PUT", COURSES + "/" + c.get("id"), a.token, move), 409, "COURSE_HAS_CLASS_SCHEDULES");
        var rename = courseUpdate(c); rename.put("name", "Renamed"); var changed = data(send("PUT", COURSES + "/" + c.get("id"), a.token, rename)); assertThat(data(send("GET", item(s), a.token, null))).isEqualTo(s);
        send("DELETE", item(s) + "?version=0", a.token, null); move = courseUpdate(changed); move.put("semesterId", target.get("id")); data(send("PUT", COURSES + "/" + c.get("id"), a.token, move));
    }
    @Test void databaseGuardsOwnerWeekdaysDateTimesNotesAndVersion() throws Exception {
        var a = account(); var b = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); UUID id = UUID.fromString(s.get("id").toString());
        for (String sql : List.of("UPDATE class_schedules SET user_id='" + b.id + "' WHERE id=?", "UPDATE class_schedules SET weekday_mask=0 WHERE id=?", "UPDATE class_schedules SET weekday_mask=128 WHERE id=?", "UPDATE class_schedules SET ends_on=starts_on-1 WHERE id=?", "UPDATE class_schedules SET ends_on=starts_on+366 WHERE id=?", "UPDATE class_schedules SET start_time='07:00:01' WHERE id=?", "UPDATE class_schedules SET end_time=start_time WHERE id=?", "UPDATE class_schedules SET end_time='24:00' WHERE id=?", "UPDATE class_schedules SET reminder_minutes=-1 WHERE id=?", "UPDATE class_schedules SET version=-1 WHERE id=?", "UPDATE class_schedules SET notes=repeat('x',5001) WHERE id=?")) assertThatThrownBy(() -> jdbc.update(sql, id)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }
    @Test void concurrentEditsUsingOneVersionHaveExactlyOneWinner() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var left = update(s); left.put("room", "Left"); var right = update(s); right.put("room", "Right");
        var results = concurrent(() -> send("PUT", item(s), a.token, left), () -> send("PUT", item(s), a.token, right)); assertThat(results.stream().map(HttpResponse::statusCode)).containsExactlyInAnyOrder(200, 409); assertThat(data(send("GET", item(s), a.token, null)).get("version")).isEqualTo(1);
    }
    @Test void concurrentDeleteAndEditNeverResurrectARule() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var s = create(a, c); var edit = update(s); edit.put("room", "Changed");
        var r = concurrent(() -> send("DELETE", item(s) + "?version=0", a.token, null), () -> send("PUT", item(s), a.token, edit));
        if (r.getFirst().statusCode() == 204) error(r.getLast(), 404, "CLASS_SCHEDULE_NOT_FOUND"); else { error(r.getFirst(), 409, "CLASS_SCHEDULE_VERSION_CONFLICT"); assertThat(r.getLast().statusCode()).isEqualTo(200); }
    }
    @Test void concurrentCourseDeleteAndClassCreateCannotOrphan() throws Exception {
        var a = account(); var c = course(a, semester(a, 1), "QA"); var r = concurrent(() -> send("DELETE", COURSES + "/" + c.get("id") + "?version=0", a.token, null), () -> send("POST", PATH, a.token, input(c)));
        if (r.getFirst().statusCode() == 204) error(r.getLast(), 404, "COURSE_NOT_FOUND"); else { error(r.getFirst(), 409, "COURSE_HAS_CLASS_SCHEDULES"); assertThat(r.getLast().statusCode()).isEqualTo(201); }
    }
    @Test void concurrentCourseMoveAndClassCreateRemainInOneSemester() throws Exception {
        var a = account(); var sem = semester(a, 1); var target = semester(a, 2); var c = course(a, sem, "QA"); var move = courseUpdate(c); move.put("semesterId", target.get("id"));
        var r = concurrent(() -> send("PUT", COURSES + "/" + c.get("id"), a.token, move), () -> send("POST", PATH, a.token, input(c)));
        assertThat(r.getLast().statusCode()).isEqualTo(201); if (r.getFirst().statusCode() == 200) assertThat(list(a, "?semesterId=" + target.get("id"))).hasSize(1); else { error(r.getFirst(), 409, "COURSE_HAS_CLASS_SCHEDULES"); assertThat(list(a, "?semesterId=" + sem.get("id"))).hasSize(1); }
    }
    private List<HttpResponse<String>> concurrent(Callable<HttpResponse<String>> first, Callable<HttpResponse<String>> second) throws Exception {
        var gate = new CountDownLatch(1);
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) { var a = pool.submit(() -> { gate.await(); return first.call(); }); var b = pool.submit(() -> { gate.await(); return second.call(); }); gate.countDown(); return List.of(a.get(20, TimeUnit.SECONDS), b.get(20, TimeUnit.SECONDS)); }
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershell51GuideUsesRealCrudOccurrencesAndClosesOnlyItsOwnSession() throws Exception {
        var a = account(); var sem = semester(a, 1); var c = course(a, sem, "QA"); String email = jdbc.queryForObject("SELECT email FROM app_users WHERE id=?", String.class, a.id);
        String ps = Path.of(System.getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "powershell.exe").toString(); String id = null; long version = 0;
        for (String mode : List.of("Create", "List", "Get", "Occurrences", "Update", "Delete")) {
            String script = "[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); function Read-Host { param([string]$Prompt,[switch]$AsSecureString); if ($AsSecureString) { ConvertTo-SecureString $env:CLASS_TEST_PASSWORD -AsPlainText -Force } else { $env:CLASS_TEST_EMAIL } }; "
                    + "& './scripts/Try-ClassSchedules.ps1' -BaseUrl 'http://127.0.0.1:" + port + "' -Mode " + mode + " -CourseId '" + c.get("id") + "' -Weekdays @(1,3) -StartsOn '2026-10-26' -EndsOn '2026-11-08'"
                    + (List.of("Get", "Update", "Delete").contains(mode) ? " -ClassScheduleId '" + id + "' -Version " + version : "")
                    + (List.of("List", "Occurrences").contains(mode) ? " -SemesterId '" + sem.get("id") + "' -From '2026-10-26' -To '2026-11-01'" : "")
                    + (mode.equals("Update") ? " -Room 'B2.03' -Teacher 'Test teacher' -Notes 'Updated from PowerShell'" : "");
            var builder = new ProcessBuilder(ps, "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script).redirectErrorStream(true);
            builder.environment().keySet().removeIf(name -> name.equalsIgnoreCase("PSModulePath")); builder.environment().put("PSModulePath", Path.of(System.getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "Modules").toString());
            builder.environment().put("CLASS_TEST_EMAIL", email); builder.environment().put("CLASS_TEST_PASSWORD", SECRET); var process = builder.start();
            try {
                assertThat(process.waitFor(30, TimeUnit.SECONDS)).isTrue(); String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8); assertThat(process.exitValue()).as(output).isZero(); assertThat(output).doesNotContain(SECRET, "accessToken", "refreshToken");
                if (!mode.equals("Delete")) { var current = jdbc.queryForMap("SELECT id,version,room FROM class_schedules WHERE user_id=?", a.id); id = current.get("id").toString(); version = ((Number) current.get("version")).longValue(); if (mode.equals("Update")) assertThat(current.get("room")).isEqualTo("B2.03"); }
            } finally { if (process.isAlive()) process.destroyForcibly(); }
        }
        assertThat(list(a, "")).isEmpty(); assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL", Integer.class, a.id)).isEqualTo(1);
    }
}
