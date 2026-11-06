package com.focusstudy;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.sql.DriverManager;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DirtiesContext
class PersonalDataExportIntegrationTests {
    private static final String SCHEMA = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
    private static final String DB_URL = Objects.requireNonNull(System.getenv("TEST_DB_URL"));
    private static final String DB_USER = System.getenv("TEST_DB_USER"), DB_PASSWORD = System.getenv("TEST_DB_PASSWORD");
    private static final String ROOT = "/api/v1/users/me/export", SECRET = "Export9E1!Test";
    private static final List<String> SECTIONS = List.of("semesters", "courses", "assignments", "studySessions",
            "classSchedules", "classExceptions", "exams", "gradeConfigurations", "pomodoroSessions");
    @LocalServerPort int port;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactionManager;
    private final HttpClient client = HttpClient.newHttpClient();

    private record Account(UUID id, String email, String token, String refresh) { }
    private record Academic(JsonNode semester, JsonNode course, JsonNode assignment) { }
    private record FullData(Academic base, JsonNode study, JsonNode schedule, JsonNode exception,
                            JsonNode exam, JsonNode scores, JsonNode reminders) { }

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        TestJwtResources.configure(registry);
        registry.add("spring.datasource.url", () -> DB_URL + (DB_URL.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA);
        registry.add("spring.datasource.username", () -> DB_USER);
        registry.add("spring.datasource.password", () -> DB_PASSWORD);
        registry.add("spring.flyway.default-schema", () -> SCHEMA);
        registry.add("spring.flyway.schemas", () -> SCHEMA);
        for (String route : List.of("login", "register", "logout")) {
            registry.add("app.auth.rate-limit." + route + "-per-minute", () -> 1000);
        }
    }

    @AfterAll
    static void cleanup() throws Exception {
        if (!SCHEMA.matches("backend_it_[a-f0-9]{32}")) throw new IllegalStateException("Unexpected test schema");
        try (var connection = DriverManager.getConnection(DB_URL, DB_USER, DB_PASSWORD);
             var statement = connection.createStatement()) {
            statement.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        }
    }

    @Test void emptyAccountDownloadsVersionedUtf8DocumentWithEffectiveDefaultsAndNoWrites() throws Exception {
        var account = account();
        var before = databaseSnapshot(account);
        var response = export(account);
        var file = document(response);
        assertThat(file.path("format").asString()).isEqualTo("focusyourstudy-personal-data");
        assertThat(file.path("formatVersion").intValue()).isEqualTo(1);
        assertThat(file.path("exportedAt").asString()).endsWith("Z");
        assertThat(file.path("profile").path("fullName").asString()).isEqualTo("Nguyễn Nhật Nam");
        assertThat(file.path("profile").path("email").asString()).isEqualTo(account.email());
        for (String section : SECTIONS) assertThat(file.path(section).isArray() && file.path(section).isEmpty()).as(section).isTrue();
        assertThat(file.path("pomodoroGoal").path("dailySessions").intValue()).isEqualTo(4);
        assertThat(file.path("pomodoroGoal").path("persisted").booleanValue()).isFalse();
        assertThat(file.path("notificationPreferences").path("version").longValue()).isZero();
        assertThat(file.path("notificationPreferences").path("quietStart").asString()).isEqualTo("22:00");
        assertThat(databaseSnapshot(account)).isEqualTo(before);
        assertThat(response.headers().firstValue("Content-Disposition").orElseThrow())
                .matches("attachment; filename=\"focusyourstudy-[0-9]{8}-[0-9]{6}\\.json\"");
        assertThat(response.headers().firstValue("Content-Type").orElseThrow()).contains("application/json", "utf-8");
        assertThat(response.headers().firstValue("Cache-Control")).hasValue("no-store");
        assertThat(response.headers().firstValue("Content-Length").orElseThrow())
                .isEqualTo(Integer.toString(response.body().getBytes(StandardCharsets.UTF_8).length));
        assertThat(response.headers().firstValue("X-Request-ID")).isPresent();
        assertThat(fieldNames(file)).containsExactlyInAnyOrder("format", "formatVersion", "exportedAt", "profile",
                "semesters", "courses", "assignments", "studySessions", "classSchedules", "classExceptions", "exams",
                "gradeConfigurations", "pomodoroSessions", "pomodoroGoal", "notificationPreferences");
    }

    private FullData populate(Account account) throws Exception {
        var base = academic(account);
        String course = base.course().path("id").asString(), assignment = base.assignment().path("id").asString();
        var study = data(send("POST", "/api/v1/study-sessions", account.token(), Map.of(
                "courseId", course, "assignmentId", assignment, "title", "Ôn Java", "startsAt", "2027-01-05T10:00:00Z",
                "timeZone", "UTC", "durationMinutes", 45, "status", "PLANNED", "notes", "Ghi chú tiếng Việt")));
        var schedule = data(send("POST", "/api/v1/class-schedules", account.token(), Map.ofEntries(
                Map.entry("courseId", course), Map.entry("weekdays", List.of(1)), Map.entry("startsOn", "2027-01-04"),
                Map.entry("endsOn", "2027-01-10"), Map.entry("startTime", "08:00"), Map.entry("endTime", "09:00"),
                Map.entry("timeZone", "UTC"), Map.entry("room", "A1"), Map.entry("teacher", "Giảng viên"),
                Map.entry("reminderMinutes", 30), Map.entry("notes", ""))));
        String schedulePath = "/api/v1/class-schedules/" + schedule.path("id").asString();
        var exception = data(send("PUT", schedulePath + "/exceptions/2027-01-04", account.token(),
                Map.of("kind", "CANCELLED", "reason", "Nghỉ một buổi", "scheduleVersion", schedule.path("version").longValue())));
        var exam = data(send("POST", "/api/v1/exams", account.token(), Map.of(
                "courseId", course, "kind", "FINAL", "format", "WRITTEN", "startsAt", "2027-01-06T08:00:00Z",
                "endsAt", "2027-01-06T09:00:00Z", "timeZone", "UTC", "room", "B2", "reminder", true,
                "reminderMinutes", List.of(1440, 30), "notes", "Mang thẻ sinh viên")));
        var config = data(send("POST", "/api/v1/courses/" + course + "/grade-configuration", account.token(),
                Map.of("assessment", "THEORY", "parts", List.of(
                        Map.of("id", "tk0", "name", "Thường kỳ", "kind", "REGULAR"),
                        Map.of("id", "tk-null", "name", "Kiểm tra", "kind", "REGULAR_TEST"),
                        Map.of("id", "mid", "name", "Giữa kỳ", "kind", "MIDTERM"),
                        Map.of("id", "btl", "name", "Bài tập lớn", "kind", "PROJECT",
                                "project", Map.of("target", "FINAL", "share", 40))))));
        var scores = data(send("PUT", "/api/v1/grade-configurations/" + config.path("id").asString() + "/scores", account.token(),
                Map.of("version", config.path("version").longValue(), "parts", List.of(
                        score("tk0", 0, null), score("tk-null", null, null), score("mid", 7.5, null), score("btl", 9, 7)))));
        var focus = data(send("POST", "/api/v1/pomodoro-sessions", account.token(),
                Map.of("clientRequestId", UUID.randomUUID().toString(), "courseId", course, "timeZone", "Asia/Ho_Chi_Minh")));
        data(send("POST", "/api/v1/pomodoro-sessions/" + focus.path("id").asString() + "/cancel", account.token(), Map.of("version", 0)));
        data(send("PUT", "/api/v1/pomodoro-goal", account.token(), Map.of("version", 0, "dailySessions", 6)));
        var reminders = data(send("PUT", "/api/v1/notification-preferences", account.token(), Map.of(
                "assignments", false, "classes", true, "exams", false, "reminderMinutes", 60,
                "quiet", true, "quietStart", "23:00", "quietEnd", "06:30", "version", 0)));
        return new FullData(base, study, schedule, exception, exam, scores, reminders);
    }

    @Test void preservesAllRelationsScoresProjectsExceptionsAndFocusContext() throws Exception {
        var account = account();
        var fixture = populate(account);
        var base = fixture.base();
        String course = base.course().path("id").asString();
        var before = databaseSnapshot(account);
        var file = document(export(account));
        for (String section : SECTIONS) assertThat(file.path(section).size()).as(section).isEqualTo(1);
        assertThat(file.path("courses").get(0).path("semesterId").asString()).isEqualTo(base.semester().path("id").asString());
        assertThat(file.path("studySessions").get(0)).isEqualTo(fixture.study());
        assertThat(file.path("classExceptions").get(0)).isEqualTo(fixture.exception());
        assertThat(file.path("classExceptions").get(0).path("scheduleId").asString()).isEqualTo(fixture.schedule().path("id").asString());
        assertThat(file.path("exams").get(0)).isEqualTo(fixture.exam());
        assertThat(file.path("gradeConfigurations").get(0)).isEqualTo(fixture.scores());
        assertThat(file.path("gradeConfigurations").get(0).path("parts").get(0).path("score").intValue()).isZero();
        assertThat(file.path("gradeConfigurations").get(0).path("parts").get(1).path("score").isNull()).isTrue();
        assertThat(file.path("pomodoroSessions").get(0).path("context").path("courseId").asString()).isEqualTo(course);
        assertThat(file.path("pomodoroSessions").get(0).path("status").asString()).isEqualTo("CANCELLED");
        assertThat(file.path("pomodoroGoal").path("dailySessions").intValue()).isEqualTo(6);
        assertThat(file.path("notificationPreferences")).isEqualTo(fixture.reminders());
        assertThat(databaseSnapshot(account)).isEqualTo(before);
        var again = document(export(account));
        for (String section : SECTIONS) {
            if (!section.equals("pomodoroSessions")) assertThat(again.path(section)).isEqualTo(file.path(section));
        }
    }

    @Test void exportsOnlyBearerOwnerAcrossEverySectionAndIgnoresForeignOwnerQuery() throws Exception {
        var alice = account();
        var bob = account();
        var foreign = populate(bob).base();
        var own = academic(alice);
        var file = document(send("GET", ROOT + "?userId=" + bob.id() + "&ownerId=" + bob.id(), alice.token(), null));
        assertThat(file.path("profile").path("id").asString()).isEqualTo(alice.id().toString());
        assertThat(file.path("courses").get(0).path("id").asString()).isEqualTo(own.course().path("id").asString());
        assertThat(file.path("assignments").get(0).path("id").asString()).isEqualTo(own.assignment().path("id").asString());
        for (String section : SECTIONS.subList(3, SECTIONS.size())) assertThat(file.path(section).isEmpty()).as(section).isTrue();
        assertThat(file.path("pomodoroGoal").path("dailySessions").intValue()).isEqualTo(4);
        assertThat(file.path("notificationPreferences").path("version").longValue()).isZero();
        assertThat(file.toString()).doesNotContain(bob.email(), bob.id().toString(),
                foreign.course().path("id").asString(), foreign.assignment().path("id").asString());
        problem(send("GET", ROOT, null, null), 401, "AUTHENTICATION_REQUIRED");
        problem(send("GET", ROOT, "broken-token", null), 401, "INVALID_ACCESS_TOKEN");
        send("POST", "/api/v1/auth/logout", alice.token(), Map.of("refreshToken", alice.refresh()));
        problem(export(alice), 401, "INVALID_ACCESS_TOKEN");
    }

    @Test void realBrowserCookieDoesNotAuthenticateExportAndCorsExposesTheFilename() throws Exception {
        var account = account();
        String origin = "http://localhost:8092";
        var proofResponse = client.send(request("/api/v1/auth/csrf").header("Origin", origin).GET().build(), HttpResponse.BodyHandlers.ofString());
        var proof = data(proofResponse);
        String csrfCookie = proofResponse.headers().allValues("Set-Cookie").stream()
                .filter(value -> value.startsWith("FOCUS_XSRF=")).findFirst().orElseThrow().split(";", 2)[0];
        var login = client.send(request("/api/v1/auth/login").header("Origin", origin).header("X-Auth-Transport", "cookie")
                .header("Cookie", csrfCookie).header("X-XSRF-TOKEN", proof.path("token").asString()).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(Map.of("email", account.email(), "password", SECRET)))).build(),
                HttpResponse.BodyHandlers.ofString());
        data(login);
        String refreshCookie = login.headers().allValues("Set-Cookie").stream()
                .filter(value -> value.startsWith("FOCUS_REFRESH=")).findFirst().orElseThrow().split(";", 2)[0];
        problem(client.send(request(ROOT).header("Cookie", refreshCookie).GET().build(), HttpResponse.BodyHandlers.ofString()),
                401, "AUTHENTICATION_REQUIRED");
        var file = client.send(request(ROOT).header("Origin", origin).header("Authorization", "Bearer " + account.token()).GET().build(),
                HttpResponse.BodyHandlers.ofString());
        document(file);
        assertThat(file.headers().firstValue("Access-Control-Allow-Origin")).hasValue(origin);
        assertThat(file.headers().firstValue("Access-Control-Expose-Headers").orElseThrow()).contains("Content-Disposition");
    }

    @Test void oversizeDatasetReturnsAnErrorWithoutAPartialDownload() throws Exception {
        var account = account();
        var base = academic(account);
        jdbc.update("""
                INSERT INTO assignments (id,user_id,course_id,title,due_at)
                SELECT gen_random_uuid(), ?, ?, 'Export bulk ' || n, TIMESTAMPTZ '2027-01-07 00:00:00+00'
                FROM generate_series(1,10000) AS n
                """, account.id(), UUID.fromString(base.course().path("id").asString()));
        var response = export(account);
        problem(response, 413, "EXPORT_TOO_LARGE");
        assertThat(response.headers().firstValue("Content-Disposition")).isEmpty();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM assignments WHERE user_id=?", Integer.class, account.id())).isEqualTo(10001);
    }

    @Test void oversizeUtf8FileReturnsAnErrorWithoutAttachmentHeaders() throws Exception {
        var account = account();
        var base = academic(account);
        jdbc.update("""
                INSERT INTO assignments (id,user_id,course_id,title,due_at,notes)
                SELECT gen_random_uuid(), ?, ?, 'Export bytes ' || n, TIMESTAMPTZ '2027-01-07 00:00:00+00', repeat('N',5000)
                FROM generate_series(1,4200) AS n
                """, account.id(), UUID.fromString(base.course().path("id").asString()));
        var response = export(account);
        problem(response, 413, "EXPORT_TOO_LARGE");
        assertThat(response.headers().firstValue("Content-Disposition")).isEmpty();
        assertThat(response.body().length()).isLessThan(2000);
    }

    @Test void concurrentAtomicEditsCannotMixVersionsAcrossExportSections() throws Exception {
        var account = account();
        var base = academic(account);
        UUID course = UUID.fromString(base.course().path("id").asString()), task = UUID.fromString(base.assignment().path("id").asString());
        var transaction = new TransactionTemplate(transactionManager);
        var running = new AtomicBoolean(true);
        jdbc.update("UPDATE courses SET name='Snapshot-0' WHERE id=?", course);
        jdbc.update("UPDATE assignments SET title='Snapshot-0' WHERE id=?", task);
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            var writer = pool.submit(() -> {
                int version = 1;
                while (running.get()) {
                    String title = "Snapshot-" + version++;
                    transaction.executeWithoutResult(status -> {
                        jdbc.update("UPDATE courses SET name=? WHERE id=?", title, course);
                        jdbc.update("UPDATE assignments SET title=? WHERE id=?", title, task);
                    });
                }
            });
            try {
                for (int round = 0; round < 8; round++) {
                    var file = document(export(account));
                    assertThat(file.path("courses").get(0).path("name").asString())
                            .isEqualTo(file.path("assignments").get(0).path("title").asString());
                }
            } finally {
                running.set(false);
                writer.get();
            }
        }
    }

    private Account account() throws Exception {
        String email = "export-" + UUID.randomUUID() + "@example.test";
        var user = data(send("POST", "/api/v1/auth/register", null,
                Map.of("email", email, "password", SECRET, "confirmPassword", SECRET, "fullName", "Nguyễn Nhật Nam")));
        var session = data(send("POST", "/api/v1/auth/login", null, Map.of("email", email, "password", SECRET)));
        return new Account(UUID.fromString(user.path("id").asString()), email, session.path("accessToken").asString(), session.path("refreshToken").asString());
    }

    private Academic academic(Account account) throws Exception {
        var semester = data(send("POST", "/api/v1/semesters", account.token(), Map.of("term", 1, "startYear", 2026, "status", "UPCOMING", "note", "Học kỳ")));
        var course = data(send("POST", "/api/v1/courses", account.token(), Map.ofEntries(
                Map.entry("semesterId", semester.path("id").asString()), Map.entry("code", "EXPORT"),
                Map.entry("name", "Lập trình Java"), Map.entry("credits", 3), Map.entry("teacher", "Giảng viên"),
                Map.entry("room", "A101"), Map.entry("status", "STUDYING"), Map.entry("color", "lavender"), Map.entry("description", ""))));
        var assignment = data(send("POST", "/api/v1/assignments", account.token(), Map.of("courseId", course.path("id").asString(),
                "title", "Bài tập tiếng Việt", "dueAt", "2027-01-07T00:00:00Z", "priority", "HIGH", "status", "TODO", "notes", "Ghi chú")));
        return new Academic(semester, course, assignment);
    }

    private Map<String, Object> score(String id, Number value, Number remainder) {
        var part = new HashMap<String, Object>();
        part.put("id", id); part.put("score", value); part.put("remainderScore", remainder);
        return part;
    }

    private List<String> databaseSnapshot(Account account) {
        var snapshots = new ArrayList<String>();
        for (String table : List.of("app_users", "semesters", "courses", "assignments", "study_sessions", "class_schedules",
                "class_exceptions", "exams", "grade_configurations", "pomodoro_sessions", "pomodoro_preferences", "notification_preferences")) {
            String ownerColumn = table.equals("app_users") ? "id" : "user_id";
            snapshots.addAll(jdbc.queryForList("SELECT to_jsonb(t)::text FROM " + table + " t WHERE " + ownerColumn + "=? ORDER BY 1",
                    String.class, account.id()));
        }
        return snapshots;
    }

    private List<String> fieldNames(JsonNode value) {
        var names = new ArrayList<String>();
        value.properties().forEach(property -> names.add(property.getKey()));
        return names;
    }

    private HttpRequest.Builder request(String path) {
        return HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).timeout(Duration.ofSeconds(30));
    }

    private HttpResponse<String> send(String method, String path, String token, Object body) throws Exception {
        var request = request(path);
        if (token != null) request.header("Authorization", "Bearer " + token);
        if (body != null) request.header("Content-Type", "application/json");
        return client.send(request.method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> export(Account account) throws Exception { return send("GET", ROOT, account.token(), null); }

    private JsonNode data(HttpResponse<String> response) {
        assertThat(response.statusCode()).as(response.body()).isIn(200, 201);
        return json.readTree(response.body()).path("data");
    }

    private JsonNode document(HttpResponse<String> response) {
        assertThat(response.statusCode()).as(response.body()).isEqualTo(200);
        assertThat(response.body()).doesNotContain(SECRET, "passwordHash", "password_hash", "refreshToken", "accessToken", "tokenHash");
        return json.readTree(response.body());
    }

    private void problem(HttpResponse<String> response, int status, String code) {
        assertThat(response.statusCode()).as(response.body()).isEqualTo(status);
        assertThat(json.readTree(response.body()).path("code").asString()).isEqualTo(code);
    }
}
