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
class ExamIntegrationTests {
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
    @Test void emptyOwnedFiltersUseEnvelopeAndNoStore() throws Exception {
        var a = account(); var sem = semester(a, 1); var c = course(a, sem, "QA");
        assertThat(list(a, "?courseId=" + c.get("id") + "&semesterId=" + sem.get("id") + "&kind=MIDTERM&format=WRITTEN")).isEmpty();
        var response = send("GET", PATH, a.token, null); assertThat(body(response).get("meta")).isNotNull(); assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
    }
    @Test void createTrimsDefaultsStoresUtcAndNeverExposesOrAcceptsOwnership() throws Exception {
        var a = account(); var b = account(); var c = course(a, semester(a, 1), "QA"); var v = input(c); v.put("room", "  A2.03  "); v.put("notes", "  Ghi chú\nDòng hai  "); v.put("userId", b.id); v.put("id", UUID.randomUUID());
        var response = send("POST", PATH, a.token, v); var exam = data(response); assertThat(response.statusCode()).isEqualTo(201); assertThat(response.headers().firstValue("Location")).contains(item(exam));
        assertThat(exam.get("startsAt")).isEqualTo("2026-11-10T01:00:00Z"); assertThat(exam.get("endsAt")).isEqualTo("2026-11-10T03:00:00Z"); assertThat(exam.get("room")).isEqualTo("A2.03"); assertThat(exam.get("notes")).isEqualTo("Ghi chú\nDòng hai");
        assertThat(exam.get("reminder")).isEqualTo(true); assertThat(exam.get("reminderMinutes")).isEqualTo(List.of(1440,180)); assertThat(exam.get("version")).isEqualTo(0);
        assertThat(data(send("GET", item(exam), a.token, null))).isEqualTo(exam); assertThat(jdbc.queryForObject("SELECT user_id FROM exams WHERE id=?", UUID.class, UUID.fromString(exam.get("id").toString()))).isEqualTo(a.id);
        for (String key : List.of("userId", "updateRevision", "passwordHash")) assertThat(exam.containsKey(key)).isFalse();
    }
    @Test void everyKindAndFormatCanBeStored() throws Exception {
        var a = account(); var c = course(a, semester(a,1), "QA"); int day = 10;
        for (String kind : List.of("MIDTERM","FINAL","OTHER")) for (String format : List.of("WRITTEN","MULTIPLE_CHOICE","PRACTICAL","ORAL","ONLINE")) {
            var v=input(c); v.put("kind",kind); v.put("format",format); String date=LocalDate.of(2026,11,day++).toString(); v.put("startsAt",date+"T08:00:00+07:00");v.put("endsAt",date+"T10:00:00+07:00");var exam=data(send("POST",PATH,a.token,v));assertThat(exam.get("kind")).isEqualTo(kind);assertThat(exam.get("format")).isEqualTo(format);
        }
        assertThat(list(a,"")).hasSize(15);
    }
    @Test void missingRequiredFieldsAre400AndNeverWrite() throws Exception {
        var a=account();var c=course(a,semester(a,1),"QA");for(String key:List.of("courseId","kind","format","startsAt","endsAt","timeZone")){var v=input(c);v.remove(key);error(send("POST",PATH,a.token,v),400,"VALIDATION_FAILED");}assertThat(list(a,"")).isEmpty();
    }
    @Test void invalidEnumsAndOversizedTextNeverWrite() throws Exception {
        var a=account();var c=course(a,semester(a,1),"QA");for(var e:Map.of("room","x".repeat(101),"notes","x".repeat(5001),"timeZone","x".repeat(101),"startsAt","x".repeat(41)).entrySet()){var v=input(c);v.put(e.getKey(),e.getValue());error(send("POST",PATH,a.token,v),400,"VALIDATION_FAILED");}
        for(String key:List.of("kind","format")){var v=input(c);v.put(key,"UNKNOWN");assertThat(send("POST",PATH,a.token,v).statusCode()).isEqualTo(400);}assertThat(list(a,"")).isEmpty();
    }
    @Test void malformedOffsetDatesPrecisionAndDayBoundariesNeverWrite() throws Exception {
        var a=account();var c=course(a,semester(a,1),"QA");
        for(String start:List.of("2026-11-10T08:00:00","2026-02-30T08:00:00+07:00","2026-11-10T08:00:01+07:00","2026-11-10T08:00:00.001+07:00","1899-12-31T23:00:00Z","2100-01-01T00:00:00Z"," ")){var v=input(c);v.put("startsAt",start);error(send("POST",PATH,a.token,v),400,"VALIDATION_FAILED");}
        for(String end:List.of("2026-11-10T08:00:00+07:00","2026-11-10T07:59:00+07:00","2026-11-11T00:00:00+07:00","2026-11-10T10:00:00.001+07:00","2100-01-01T00:00:00Z")){var v=input(c);v.put("endsAt",end);error(send("POST",PATH,a.token,v),400,"VALIDATION_FAILED");}
        var v=input(c);v.put("timeZone","Fake/Zone");error(send("POST",PATH,a.token,v),400,"VALIDATION_FAILED");assertThat(list(a,"")).isEmpty();
    }
    @Test void absoluteTimestampsCanBeSpecifiedInUtcWhileKeepingTheChosenZone() throws Exception {
        var a=account();var c=course(a,semester(a,1),"QA");var v=input(c);v.put("startsAt","2026-11-10T01:00:00Z");v.put("endsAt","2026-11-10T03:00:00Z");var exam=data(send("POST",PATH,a.token,v));assertThat(exam.get("timeZone")).isEqualTo("Asia/Ho_Chi_Minh");assertThat(exam.get("startsAt")).isEqualTo("2026-11-10T01:00:00Z");
    }
    @Test void yearBoundsAreCheckedInBothAbsoluteAndChosenLocalTime() throws Exception {
        var a=account();var c=course(a,semester(a,1),"QA");var v=input(c);v.put("timeZone","UTC");v.put("startsAt","1900-01-01T00:00:00Z");v.put("endsAt","1900-01-01T01:00:00Z");data(send("POST",PATH,a.token,v));v.put("startsAt","2099-12-31T22:00:00Z");v.put("endsAt","2099-12-31T23:59:00Z");data(send("POST",PATH,a.token,v));v.put("startsAt","2099-12-31T22:00:00-10:00");v.put("endsAt","2099-12-31T23:59:00-10:00");v.put("timeZone","Pacific/Honolulu");error(send("POST",PATH,a.token,v),400,"VALIDATION_FAILED");
    }
    @Test void explicitDstOffsetsAreUnambiguousAndOrderUsesInstants() throws Exception {
        var a=account();var c=course(a,semester(a,1),"QA");var v=input(c);v.put("timeZone","America/New_York");v.put("startsAt","2026-11-01T01:30:00-04:00");v.put("endsAt","2026-11-01T01:45:00-05:00");var exam=data(send("POST",PATH,a.token,v));assertThat(exam.get("startsAt")).isEqualTo("2026-11-01T05:30:00Z");assertThat(exam.get("endsAt")).isEqualTo("2026-11-01T06:45:00Z");
    }
    @Test void remindersAreSortedAndZeroIsAValidStartTimeReminder() throws Exception {
        var a=account();var c=course(a,semester(a,1),"QA");var v=input(c);v.put("reminderMinutes",List.of(0,180,10080,15));assertThat(data(send("POST",PATH,a.token,v)).get("reminderMinutes")).isEqualTo(List.of(10080,180,15,0));
    }
    @Test void disabledRemindersDefaultToEmptyWithoutLosingOtherData() throws Exception {
        var a=account();var c=course(a,semester(a,1),"QA");var v=input(c);v.put("reminder",false);var exam=data(send("POST",PATH,a.token,v));assertThat(exam.get("reminder")).isEqualTo(false);assertThat(exam.get("reminderMinutes")).isEqualTo(List.of());
    }
    @Test void invalidReminderArraysAndFlagMismatchAre400() throws Exception {
        var a=account();var c=course(a,semester(a,1),"QA");for(Object points:List.of(List.of(),List.of(-1),List.of(10081),List.of(15,15),Arrays.asList(15,null),List.of(1.5),java.util.stream.IntStream.range(0,11).boxed().toList())){var v=input(c);v.put("reminderMinutes",points);assertThat(send("POST",PATH,a.token,v).statusCode()).as(points.toString()).isEqualTo(400);}
        var v=input(c);v.put("reminder",false);v.put("reminderMinutes",List.of(15));error(send("POST",PATH,a.token,v),400,"VALIDATION_FAILED");assertThat(list(a,"")).isEmpty();
    }
    @Test void otherOwnersAndMissingRecordsAlwaysReturn404WithoutChangingData() throws Exception {
        var a=account();var b=account();var sem=semester(a,1);var c=course(a,sem,"QA");var exam=create(a,c);
        for(String id:List.of(exam.get("id").toString(),UUID.randomUUID().toString())){error(send("GET",PATH+"/"+id,b.token,null),404,"EXAM_NOT_FOUND");error(send("PUT",PATH+"/"+id,b.token,update(exam)),404,"EXAM_NOT_FOUND");error(send("DELETE",PATH+"/"+id+"?version=0",b.token,null),404,"EXAM_NOT_FOUND");}
        error(send("POST",PATH,b.token,input(c)),404,"COURSE_NOT_FOUND");error(send("GET",PATH+"?courseId="+c.get("id"),b.token,null),404,"COURSE_NOT_FOUND");error(send("GET",PATH+"?semesterId="+sem.get("id"),b.token,null),404,"SEMESTER_NOT_FOUND");assertThat(list(b,"")).isEmpty();assertThat(data(send("GET",item(exam),a.token,null))).isEqualTo(exam);
    }
    @Test void unauthenticatedAndUnsupportedMethodsAreDenied() throws Exception {
        var a=account();var c=course(a,semester(a,1),"QA");var exam=create(a,c);for(String method:List.of("GET","POST","PUT","DELETE"))assertThat(send(method,method.equals("POST")?PATH:item(exam)+(method.equals("DELETE")?"?version=0":""),null,method.equals("POST")?input(c):method.equals("PUT")?update(exam):null).statusCode()).isEqualTo(401);
        assertThat(send("PATCH",item(exam),a.token,Map.of()).statusCode()).isEqualTo(403);assertThat(send("GET","/api/v1/grades",a.token,null).statusCode()).isEqualTo(403);
    }
    @Test void listFiltersUseAndAndIntersectingHalfOpenUtcIntervals() throws Exception {
        var a=account();var sem=semester(a,1);var other=semester(a,2);var c=course(a,sem,"QA");var d=course(a,other,"QB");var first=create(a,c);var v=input(d);v.put("kind","FINAL");v.put("format","ONLINE");v.put("startsAt","2026-11-10T11:00:00+07:00");v.put("endsAt","2026-11-10T12:00:00+07:00");var second=data(send("POST",PATH,a.token,v));assertThat(list(a,"")).hasSize(2);
        assertThat(list(a,"?courseId="+c.get("id")+"&semesterId="+sem.get("id")+"&kind=MIDTERM&format=WRITTEN")).isEqualTo(List.of(first));assertThat(list(a,"?semesterId="+other.get("id")+"&kind=FINAL")).isEqualTo(List.of(second));assertThat(list(a,"?courseId="+c.get("id")+"&semesterId="+other.get("id"))).isEmpty();
        assertThat(list(a,"?to="+enc("2026-11-10T08:00:00+07:00"))).isEmpty();assertThat(list(a,"?from="+enc("2026-11-10T10:00:00+07:00"))).isEqualTo(List.of(second));assertThat(list(a,"?from=2026-11-10T00:59:00Z&to=2026-11-10T01:01:00Z")).isEqualTo(List.of(first));
    }
    @Test void malformedFiltersAndInvertedRangesAre400EvenOnEmptyLists() throws Exception {
        var a=account();for(String query:List.of("?from=bad","?from=2026-11-10","?from=1899-01-01T00:00:00Z","?to=2100-01-01T00:01:00Z","?from=2026-11-10T03:00:00Z&to=2026-11-10T01:00:00Z","?from=2026-11-10T01:00:00Z&to=2026-11-10T01:00:00Z","?from="))error(send("GET",PATH+query,a.token,null),400,"INVALID_EXAM_RANGE");
        for(String query:List.of("?courseId=bad","?semesterId=bad","?kind=bad","?format=bad"))assertThat(send("GET",PATH+query,a.token,null).statusCode()).isEqualTo(400);assertThat(list(a,"?from=1900-01-01T00:00:00Z&to=2100-01-01T00:00:00Z")).isEmpty();
    }
    @Test void completeUpdateMovesToAnotherOwnedCourseAndPreservesIdentityAndCreationTime() throws Exception {
        var a=account();var sem=semester(a,1);var c=course(a,sem,"QA");var d=course(a,semester(a,2),"QB");var exam=create(a,c);var v=update(exam);v.put("courseId",d.get("id"));v.put("kind","FINAL");v.put("format","PRACTICAL");v.put("room"," B9 ");v.put("reminder",false);v.put("reminderMinutes",List.of());v.put("notes"," Ghi chú mới ");var next=data(send("PUT",item(exam),a.token,v));
        assertThat(next.get("id")).isEqualTo(exam.get("id"));assertThat(next.get("createdAt")).isEqualTo(exam.get("createdAt"));assertThat(next.get("version")).isEqualTo(1);assertThat(next.get("courseId")).isEqualTo(d.get("id"));assertThat(next.get("room")).isEqualTo("B9");assertThat(next.get("notes")).isEqualTo("Ghi chú mới");assertThat(list(a,"?semesterId="+sem.get("id"))).isEmpty();assertThat(data(send("GET",item(exam),a.token,null))).isEqualTo(next);
    }
    @Test void foreignCourseAndInvalidUpdateCannotModifyTheExistingRecord() throws Exception {
        var a=account();var b=account();var c=course(a,semester(a,1),"QA");var foreign=course(b,semester(b,1),"QB");var exam=create(a,c);var v=update(exam);v.put("courseId",foreign.get("id"));error(send("PUT",item(exam),a.token,v),404,"COURSE_NOT_FOUND");v=update(exam);v.put("endsAt",v.get("startsAt"));error(send("PUT",item(exam),a.token,v),400,"VALIDATION_FAILED");assertThat(data(send("GET",item(exam),a.token,null))).isEqualTo(exam);
    }
    @Test void identicalPutStillConsumesVersionAndRejectsTheOldCopy() throws Exception {
        var a=account();var c=course(a,semester(a,1),"QA");var exam=create(a,c);var next=data(send("PUT",item(exam),a.token,update(exam)));assertThat(next.get("version")).isEqualTo(1);error(send("PUT",item(exam),a.token,update(exam)),409,"EXAM_VERSION_CONFLICT");assertThat(data(send("PUT",item(exam),a.token,update(next))).get("version")).isEqualTo(2);
    }
    @Test void missingNegativeFractionalVersionsNeverWriteOrDelete() throws Exception {
        var a=account();var c=course(a,semester(a,1),"QA");var exam=create(a,c);for(Object version:List.of(-1,1.5,"bad")){var v=update(exam);v.put("version",version);assertThat(send("PUT",item(exam),a.token,v).statusCode()).isEqualTo(400);}var v=update(exam);v.remove("version");assertThat(send("PUT",item(exam),a.token,v).statusCode()).isEqualTo(400);
        for(String suffix:List.of("","?version=-1","?version=1.5","?version=bad"))assertThat(send("DELETE",item(exam)+suffix,a.token,null).statusCode()).isEqualTo(400);assertThat(data(send("GET",item(exam),a.token,null))).isEqualTo(exam);
    }
    @Test void staleDeleteAndUpdateAre409AndDeletionNeverResurrectsAnExam() throws Exception {
        var a=account();var c=course(a,semester(a,1),"QA");var exam=create(a,c);var v=update(exam);v.put("room","B2");var next=data(send("PUT",item(exam),a.token,v));error(send("DELETE",item(exam)+"?version=0",a.token,null),409,"EXAM_VERSION_CONFLICT");error(send("PUT",item(exam),a.token,update(exam)),409,"EXAM_VERSION_CONFLICT");var deleted=send("DELETE",item(exam)+"?version="+next.get("version"),a.token,null);assertThat(deleted.statusCode()).isEqualTo(204);assertThat(deleted.body()).isEmpty();assertThat(deleted.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");error(send("PUT",item(exam),a.token,update(next)),404,"EXAM_NOT_FOUND");assertThat(list(a,"")).isEmpty();assertThat(data(send("GET",COURSES+"/"+c.get("id"),a.token,null))).isEqualTo(c);
    }
    @Test void courseCannotMoveOrDeleteUntilItsExamsAreHandledButMetadataCanChange() throws Exception {
        var a=account();var sem=semester(a,1);var target=semester(a,2);var c=course(a,sem,"QA");var exam=create(a,c);error(send("DELETE",COURSES+"/"+c.get("id")+"?version=0",a.token,null),409,"COURSE_HAS_EXAMS");var move=courseUpdate(c);move.put("semesterId",target.get("id"));error(send("PUT",COURSES+"/"+c.get("id"),a.token,move),409,"COURSE_HAS_EXAMS");var metadata=courseUpdate(c);metadata.put("teacher","Updated teacher");var changed=data(send("PUT",COURSES+"/"+c.get("id"),a.token,metadata));assertThat(send("DELETE",item(exam)+"?version=0",a.token,null).statusCode()).isEqualTo(204);move=courseUpdate(changed);move.put("semesterId",target.get("id"));assertThat(data(send("PUT",COURSES+"/"+c.get("id"),a.token,move)).get("semesterId")).isEqualTo(target.get("id"));
    }
    @Test void databaseChecksAndCompositeOwnerForeignKeyProtectStoredData() throws Exception {
        var a=account();var b=account();var c=course(a,semester(a,1),"QA");var exam=create(a,c);UUID id=UUID.fromString(exam.get("id").toString());
        for(String expression:List.of("user_id='"+b.id+"'","kind='BAD'","format='BAD'","room=repeat('x',101)","ends_at=starts_at","ends_at=starts_at+interval '1 day'","starts_at=starts_at+interval '1 second'","reminder_minutes=ARRAY[15,15]","reminder_minutes=ARRAY[-1]","reminder_minutes=ARRAY[NULL]::integer[]","reminder_minutes=ARRAY[10081]","reminder=false","notes=repeat('x',5001)","version=-1","update_revision=-1"))assertThatThrownBy(()->jdbc.update("UPDATE exams SET "+expression+" WHERE id=?",id)).as(expression).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThat(data(send("GET",item(exam),a.token,null))).isEqualTo(exam);
    }
    @Test void concurrentEditsHaveExactlyOneWinner() throws Exception {
        var a=account();var c=course(a,semester(a,1),"QA");var exam=create(a,c);var left=update(exam);left.put("room","Left");var right=update(exam);right.put("room","Right");var results=concurrent(()->send("PUT",item(exam),a.token,left),()->send("PUT",item(exam),a.token,right));assertThat(results.stream().map(HttpResponse::statusCode)).containsExactlyInAnyOrder(200,409);assertThat(data(send("GET",item(exam),a.token,null)).get("version")).isEqualTo(1);
    }
    @Test void concurrentIdenticalEditsStillHaveOneWinner() throws Exception {
        var a=account();var c=course(a,semester(a,1),"QA");var exam=create(a,c);var same=update(exam);var results=concurrent(()->send("PUT",item(exam),a.token,same),()->send("PUT",item(exam),a.token,same));assertThat(results.stream().map(HttpResponse::statusCode)).containsExactlyInAnyOrder(200,409);
    }
    @Test void concurrentDeleteAndEditCannotResurrect() throws Exception {
        var a=account();var c=course(a,semester(a,1),"QA");var exam=create(a,c);var edit=update(exam);edit.put("room","Changed");var results=concurrent(()->send("DELETE",item(exam)+"?version=0",a.token,null),()->send("PUT",item(exam),a.token,edit));if(results.getFirst().statusCode()==204)error(results.getLast(),404,"EXAM_NOT_FOUND");else{error(results.getFirst(),409,"EXAM_VERSION_CONFLICT");assertThat(results.getLast().statusCode()).isEqualTo(200);}
    }
    @Test void concurrentCourseDeleteAndExamCreateCannotOrphan() throws Exception {
        var a=account();var c=course(a,semester(a,1),"QA");var results=concurrent(()->send("DELETE",COURSES+"/"+c.get("id")+"?version=0",a.token,null),()->send("POST",PATH,a.token,input(c)));if(results.getFirst().statusCode()==204)error(results.getLast(),404,"COURSE_NOT_FOUND");else{error(results.getFirst(),409,"COURSE_HAS_EXAMS");assertThat(results.getLast().statusCode()).isEqualTo(201);}
    }
    @Test void concurrentCourseMoveAndExamCreateKeepOneSemester() throws Exception {
        var a=account();var sem=semester(a,1);var target=semester(a,2);var c=course(a,sem,"QA");var move=courseUpdate(c);move.put("semesterId",target.get("id"));var results=concurrent(()->send("PUT",COURSES+"/"+c.get("id"),a.token,move),()->send("POST",PATH,a.token,input(c)));assertThat(results.getLast().statusCode()).isEqualTo(201);if(results.getFirst().statusCode()==200)assertThat(list(a,"?semesterId="+target.get("id"))).hasSize(1);else{error(results.getFirst(),409,"COURSE_HAS_EXAMS");assertThat(list(a,"?semesterId="+sem.get("id"))).hasSize(1);}
    }
    private List<HttpResponse<String>> concurrent(Callable<HttpResponse<String>> first, Callable<HttpResponse<String>> second) throws Exception {
        var gate=new CountDownLatch(1);try(var pool=Executors.newVirtualThreadPerTaskExecutor()){var left=pool.submit(()->{gate.await();return first.call();});var right=pool.submit(()->{gate.await();return second.call();});gate.countDown();return List.of(left.get(20,TimeUnit.SECONDS),right.get(20,TimeUnit.SECONDS));}
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershell51GuideExercisesRealCrudAndOnlyClosesItsOwnSession() throws Exception {
        var a=account();var sem=semester(a,1);var c=course(a,sem,"QA");String email=jdbc.queryForObject("SELECT email FROM app_users WHERE id=?",String.class,a.id),ps=Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","powershell.exe").toString(),id=null;long version=0;
        for(String mode:List.of("Create","List","Get","Update","Delete")){
            String script="[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); function Read-Host { param([string]$Prompt,[switch]$AsSecureString); if ($AsSecureString) { ConvertTo-SecureString $env:EXAM_TEST_PASSWORD -AsPlainText -Force } else { $env:EXAM_TEST_EMAIL } }; & './scripts/Try-Exams.ps1' -BaseUrl 'http://127.0.0.1:"+port+"' -Mode "+mode+" -CourseId '"+c.get("id")+"' -Kind MIDTERM -Format WRITTEN -StartsAt '2026-11-10T08:00:00+07:00' -EndsAt '2026-11-10T10:00:00+07:00'"+(List.of("Get","Update","Delete").contains(mode)?" -ExamId '"+id+"' -Version "+version:"")+(mode.equals("List")?" -SemesterId '"+sem.get("id")+"' -FilterKind MIDTERM -From '2026-11-10T07:00:00+07:00' -To '2026-11-10T11:00:00+07:00'":"")+(mode.equals("Update")?" -Room 'B2.03' -Notes 'Updated exam from PowerShell' -NoReminder":"");
            var builder=new ProcessBuilder(ps,"-NoProfile","-ExecutionPolicy","Bypass","-Command",script).redirectErrorStream(true);builder.environment().keySet().removeIf(name->name.equalsIgnoreCase("PSModulePath"));builder.environment().put("PSModulePath",Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","Modules").toString());builder.environment().put("EXAM_TEST_EMAIL",email);builder.environment().put("EXAM_TEST_PASSWORD",SECRET);var process=builder.start();
            try{assertThat(process.waitFor(30,TimeUnit.SECONDS)).isTrue();String output=new String(process.getInputStream().readAllBytes(),StandardCharsets.UTF_8);assertThat(process.exitValue()).as(output).isZero();assertThat(output).doesNotContain(SECRET,"accessToken","refreshToken");if(!mode.equals("Delete")){var current=jdbc.queryForMap("SELECT id,version,room,reminder FROM exams WHERE user_id=?",a.id);id=current.get("id").toString();version=((Number)current.get("version")).longValue();if(mode.equals("Update")){assertThat(current.get("room")).isEqualTo("B2.03");assertThat(current.get("reminder")).isEqualTo(false);}}}finally{if(process.isAlive())process.destroyForcibly();}
        }
        assertThat(list(a,"")).isEmpty();assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL",Integer.class,a.id)).isEqualTo(1);
    }
}
