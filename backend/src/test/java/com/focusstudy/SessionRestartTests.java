package com.focusstudy;

import static org.assertj.core.api.Assertions.*;

import java.net.URI;
import java.net.http.*;
import java.sql.DriverManager;
import java.time.Duration;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import tools.jackson.databind.ObjectMapper;

class SessionRestartTests {
    private static final String URL = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Run Test-Local.ps1");
    private static final String USER = System.getenv("TEST_DB_USER"), PASSWORD = System.getenv("TEST_DB_PASSWORD");
    private final HttpClient client = HttpClient.newHttpClient();

    ConfigurableApplicationContext start(String schema) {
        var settings = new LinkedHashMap<String, Object>();
        TestJwtResources.configure((name, supplier) -> settings.put(name, supplier.get()));
        settings.put("server.port", "0"); settings.put("server.address", "127.0.0.1");
        settings.put("spring.main.banner-mode", "off"); settings.put("logging.level.root", "WARN");
        settings.put("spring.datasource.url", URL + (URL.contains("?") ? "&" : "?") + "currentSchema=" + schema);
        settings.put("spring.datasource.username", USER); settings.put("spring.datasource.password", PASSWORD);
        settings.put("spring.flyway.schemas", schema); settings.put("spring.flyway.default-schema", schema);
        String[] args = settings.entrySet().stream().map(entry -> "--" + entry.getKey() + "=" + entry.getValue()).toArray(String[]::new);
        return SpringApplication.run(FocusStudyBackendApplication.class, args);
    }
    HttpResponse<String> post(ConfigurableApplicationContext app, String path, Object payload) throws Exception {
        int port = app.getEnvironment().getRequiredProperty("local.server.port", Integer.class);
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(app.getBean(ObjectMapper.class).writeValueAsString(payload))).build();
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }
    Map<?, ?> data(ConfigurableApplicationContext app, HttpResponse<String> response) {
        assertThat(response.statusCode()).isEqualTo(200);
        return (Map<?, ?>) app.getBean(ObjectMapper.class).readValue(response.body(), Map.class).get("data");
    }
    HttpResponse<String> semester(ConfigurableApplicationContext app, String method, String path, String token, Object payload) throws Exception {
        int port = app.getEnvironment().getRequiredProperty("local.server.port", Integer.class);
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/json").header("Authorization", "Bearer " + token);
        return client.send(request.method(method, payload == null ? HttpRequest.BodyPublishers.noBody() :
                HttpRequest.BodyPublishers.ofString(app.getBean(ObjectMapper.class).writeValueAsString(payload))).build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test void refreshAndRevocationSurviveClosingAndRecreatingTheEntireBackend() throws Exception {
        String schema = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
        String email = "restart-" + UUID.randomUUID() + "@example.test", password = "RestartTest123!";
        String first, independent, rotated, semesterId, courseId, assignmentId, studyId, classId, examId, gradeConfigurationId;
        Map<?, ?> savedGradeConfiguration;
        Map<?, ?> savedGradeScores;
        Map<?, ?> savedGradeResult;
        try {
            try (var app = start(schema)) {
                assertThat(post(app, "/api/v1/auth/register", Map.of("email", email, "fullName", "Kiểm thử khởi động lại", "password", password, "confirmPassword", password)).statusCode()).isEqualTo(201);
                var pair = data(app, post(app, "/api/v1/auth/login", Map.of("email", email, "password", password)));
                first = pair.get("refreshToken").toString();
                independent = data(app, post(app, "/api/v1/auth/login", Map.of("email", email, "password", password))).get("refreshToken").toString();
                var created = semester(app, "POST", "/api/v1/semesters", pair.get("accessToken").toString(), Map.of("term", 1, "startYear", 2026, "status", "CURRENT", "note", "Persist across restart"));
                assertThat(created.statusCode()).isEqualTo(201);
                semesterId = ((Map<?, ?>) app.getBean(ObjectMapper.class).readValue(created.body(), Map.class).get("data")).get("id").toString();
                var course = semester(app, "POST", "/api/v1/courses", pair.get("accessToken").toString(), Map.of("semesterId", semesterId, "code", "RESTART101", "name", "Môn lưu qua khởi động lại", "credits", 3));
                assertThat(course.statusCode()).isEqualTo(201);
                courseId = ((Map<?, ?>) app.getBean(ObjectMapper.class).readValue(course.body(), Map.class).get("data")).get("id").toString();
                var assignment = semester(app, "POST", "/api/v1/assignments", pair.get("accessToken").toString(), Map.of("courseId", courseId,
                        "title", "Bài lưu qua khởi động lại", "dueAt", "2026-10-30T23:59:00+07:00", "notes", "Giữ nguyên dữ liệu"));
                assertThat(assignment.statusCode()).isEqualTo(201);
                assignmentId = ((Map<?, ?>) app.getBean(ObjectMapper.class).readValue(assignment.body(), Map.class).get("data")).get("id").toString();
                var study = semester(app, "POST", "/api/v1/study-sessions", pair.get("accessToken").toString(), Map.of("courseId", courseId,
                        "assignmentId", assignmentId, "title", "Buổi học giữ qua restart", "startsAt", "2026-10-30T19:00:00+07:00",
                        "timeZone", "Asia/Ho_Chi_Minh", "durationMinutes", 45, "notes", "Giữ kế hoạch"));
                assertThat(study.statusCode()).isEqualTo(201);
                studyId = ((Map<?, ?>) app.getBean(ObjectMapper.class).readValue(study.body(), Map.class).get("data")).get("id").toString();
                var schedule = semester(app, "POST", "/api/v1/class-schedules", pair.get("accessToken").toString(), Map.of("courseId", courseId,
                        "weekdays", List.of(1, 3), "startsOn", "2026-10-26", "endsOn", "2026-11-08", "startTime", "07:00", "endTime", "09:00", "timeZone", "Asia/Ho_Chi_Minh", "room", "A1.01"));
                assertThat(schedule.statusCode()).isEqualTo(201);
                classId = ((Map<?, ?>) app.getBean(ObjectMapper.class).readValue(schedule.body(), Map.class).get("data")).get("id").toString();
                var exam = semester(app, "POST", "/api/v1/exams", pair.get("accessToken").toString(), Map.of("courseId", courseId,
                        "kind", "FINAL", "format", "ONLINE", "startsAt", "2026-11-10T08:00:00+07:00", "endsAt", "2026-11-10T10:00:00+07:00",
                        "timeZone", "Asia/Ho_Chi_Minh", "notes", "Giữ lịch thi", "reminderMinutes", List.of(0, 180, 10080)));
                assertThat(exam.statusCode()).isEqualTo(201);
                examId = ((Map<?, ?>) app.getBean(ObjectMapper.class).readValue(exam.body(), Map.class).get("data")).get("id").toString();
                var configuration = semester(app, "POST", "/api/v1/courses/" + courseId + "/grade-configuration", pair.get("accessToken").toString(),
                        Map.of("assessment", "PRACTICAL", "parts", List.of(
                                Map.of("id", "th1", "name", "Thường kỳ thực hành", "kind", "PRACTICE_REGULAR"),
                                Map.of("id", "btl", "name", "BTL giữ qua restart", "kind", "PROJECT", "project", Map.of("target", "PRACTICE", "share", 100)))));
                assertThat(configuration.statusCode()).as(configuration.body()).isEqualTo(201);
                savedGradeConfiguration = (Map<?, ?>) app.getBean(ObjectMapper.class).readValue(configuration.body(), Map.class).get("data");
                gradeConfigurationId = savedGradeConfiguration.get("id").toString();
                var regularMark = new HashMap<String, Object>(); regularMark.put("id", "th1"); regularMark.put("score", 8.125); regularMark.put("remainderScore", null);
                var projectMark = new HashMap<String, Object>(); projectMark.put("id", "btl"); projectMark.put("score", 0); projectMark.put("remainderScore", null);
                savedGradeScores = data(app, semester(app, "PUT", "/api/v1/grade-configurations/" + gradeConfigurationId + "/scores", pair.get("accessToken").toString(), Map.of("version", 0, "parts", List.of(regularMark, projectMark))));
                savedGradeConfiguration = data(app, semester(app, "GET", "/api/v1/grade-configurations/" + gradeConfigurationId, pair.get("accessToken").toString(), null));
                savedGradeResult = data(app, semester(app, "GET", "/api/v1/grade-configurations/" + gradeConfigurationId + "/result", pair.get("accessToken").toString(), null));
                var change = semester(app, "PUT", "/api/v1/class-schedules/" + classId + "/exceptions/2026-10-26", pair.get("accessToken").toString(), Map.of("kind", "CHANGED", "room", "B2.03", "startTime", "10:00", "endTime", "12:00", "scheduleVersion", 0));
                assertThat(change.statusCode()).isEqualTo(200);
                var cancelled = semester(app, "PUT", "/api/v1/class-schedules/" + classId + "/exceptions/2026-10-28", pair.get("accessToken").toString(), Map.of("kind", "CANCELLED", "reason", "Keep cancellation", "scheduleVersion", 1));
                assertThat(cancelled.statusCode()).isEqualTo(200);
            }
            try (var app = start(schema)) {
                var pair = data(app, post(app, "/api/v1/auth/refresh", Map.of("refreshToken", first)));
                rotated = pair.get("refreshToken").toString();
                assertThat(data(app, semester(app, "GET", "/api/v1/grade-configurations/" + gradeConfigurationId + "/result", pair.get("accessToken").toString(), null))).isEqualTo(savedGradeResult);
                assertThat(data(app, semester(app, "GET", "/api/v1/grade-configurations/" + gradeConfigurationId + "/scores", pair.get("accessToken").toString(), null))).isEqualTo(savedGradeScores);
                assertThat(data(app, semester(app, "GET", "/api/v1/grade-configurations/" + gradeConfigurationId, pair.get("accessToken").toString(), null))).isEqualTo(savedGradeConfiguration);
                assertThat(data(app, semester(app, "GET", "/api/v1/semesters/" + semesterId, pair.get("accessToken").toString(), null)).get("note")).isEqualTo("Persist across restart");
                assertThat(data(app, semester(app, "GET", "/api/v1/courses/" + courseId, pair.get("accessToken").toString(), null)).get("code")).isEqualTo("RESTART101");
                var assignment = data(app, semester(app, "GET", "/api/v1/assignments/" + assignmentId, pair.get("accessToken").toString(), null));
                assertThat(assignment.get("dueAt")).isEqualTo("2026-10-30T16:59:00Z"); assertThat(assignment.get("notes")).isEqualTo("Giữ nguyên dữ liệu");
                var study = data(app, semester(app, "GET", "/api/v1/study-sessions/" + studyId, pair.get("accessToken").toString(), null));
                assertThat(study.get("startsAt")).isEqualTo("2026-10-30T12:00:00Z"); assertThat(study.get("endsAt")).isEqualTo("2026-10-30T12:45:00Z");
                assertThat(study.get("assignmentId")).isEqualTo(assignmentId); assertThat(study.get("timeZone")).isEqualTo("Asia/Ho_Chi_Minh");
                var schedule = data(app, semester(app, "GET", "/api/v1/class-schedules/" + classId, pair.get("accessToken").toString(), null));
                assertThat(schedule.get("weekdays")).isEqualTo(List.of(1, 3)); assertThat(schedule.get("room")).isEqualTo("A1.01"); assertThat(schedule.get("version")).isEqualTo(2);
                var expanded = semester(app, "GET", "/api/v1/class-schedules/occurrences?from=2026-10-26&to=2026-11-08", pair.get("accessToken").toString(), null);
                assertThat(expanded.statusCode()).isEqualTo(200); assertThat((List<?>) app.getBean(ObjectMapper.class).readValue(expanded.body(), Map.class).get("data")).hasSize(4);
                var changed = data(app, semester(app, "GET", "/api/v1/class-schedules/" + classId + "/exceptions/2026-10-26", pair.get("accessToken").toString(), null));
                assertThat(changed.get("startTime")).isEqualTo("10:00"); assertThat(changed.get("room")).isEqualTo("B2.03");
                assertThat(data(app, semester(app, "GET", "/api/v1/class-schedules/" + classId + "/exceptions/2026-10-28", pair.get("accessToken").toString(), null)).get("kind")).isEqualTo("CANCELLED");
                assertThat(semester(app, "DELETE", "/api/v1/class-schedules/" + classId + "/exceptions/2026-10-26?scheduleVersion=2", pair.get("accessToken").toString(), null).statusCode()).isEqualTo(204);
                assertThat(post(app, "/api/v1/auth/logout", Map.of("refreshToken", rotated)).statusCode()).isEqualTo(204);
            }
            try (var app = start(schema)) {
                assertThat(post(app, "/api/v1/auth/refresh", Map.of("refreshToken", rotated)).statusCode()).isEqualTo(401);
                assertThat(post(app, "/api/v1/auth/refresh", Map.of("refreshToken", first)).statusCode()).isEqualTo(401);
                var pair = data(app, post(app, "/api/v1/auth/refresh", Map.of("refreshToken", independent)));
                assertThat(data(app, semester(app, "GET", "/api/v1/grade-configurations/" + gradeConfigurationId + "/result", pair.get("accessToken").toString(), null))).isEqualTo(savedGradeResult);
                assertThat(data(app, semester(app, "GET", "/api/v1/grade-configurations/" + gradeConfigurationId + "/scores", pair.get("accessToken").toString(), null))).isEqualTo(savedGradeScores);
                assertThat(data(app, semester(app, "GET", "/api/v1/courses/" + courseId + "/grade-configuration", pair.get("accessToken").toString(), null))).isEqualTo(savedGradeConfiguration);
                assertThat(data(app, semester(app, "GET", "/api/v1/semesters/" + semesterId, pair.get("accessToken").toString(), null)).get("status")).isEqualTo("CURRENT");
                assertThat(data(app, semester(app, "GET", "/api/v1/courses/" + courseId, pair.get("accessToken").toString(), null)).get("semesterId")).isEqualTo(semesterId);
                assertThat(data(app, semester(app, "GET", "/api/v1/assignments/" + assignmentId, pair.get("accessToken").toString(), null)).get("courseId")).isEqualTo(courseId);
                assertThat(data(app, semester(app, "GET", "/api/v1/study-sessions/" + studyId, pair.get("accessToken").toString(), null)).get("notes")).isEqualTo("Giữ kế hoạch");
                assertThat(data(app, semester(app, "GET", "/api/v1/class-schedules/" + classId, pair.get("accessToken").toString(), null)).get("courseId")).isEqualTo(courseId);
                var savedExam = data(app, semester(app, "GET", "/api/v1/exams/" + examId, pair.get("accessToken").toString(), null));
                assertThat(savedExam.get("courseId")).isEqualTo(courseId); assertThat(savedExam.get("notes")).isEqualTo("Giữ lịch thi");
                assertThat(savedExam.get("startsAt")).isEqualTo("2026-11-10T01:00:00Z"); assertThat(savedExam.get("reminderMinutes")).isEqualTo(List.of(10080, 180, 0));
                assertThat(semester(app, "GET", "/api/v1/class-schedules/" + classId + "/exceptions/2026-10-26", pair.get("accessToken").toString(), null).statusCode()).isEqualTo(404);
                assertThat(data(app, semester(app, "GET", "/api/v1/class-schedules/" + classId + "/exceptions/2026-10-28", pair.get("accessToken").toString(), null)).get("reason")).isEqualTo("Keep cancellation");
            }
        } finally {
            if (!schema.matches("backend_it_[a-f0-9]{32}")) throw new IllegalStateException("Unsafe schema");
            try (var connection = DriverManager.getConnection(URL, USER, PASSWORD); var statement = connection.createStatement()) {
                statement.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
            }
        }
    }
}
