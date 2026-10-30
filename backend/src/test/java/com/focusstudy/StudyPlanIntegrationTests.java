package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import com.focusstudy.academics.courses.CourseRepository;
import com.focusstudy.assignments.AssignmentRepository;
import com.focusstudy.exams.ExamRepository;
import com.focusstudy.planning.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.*;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.*;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(StudyPlanIntegrationTests.ClockFixture.class)
@DirtiesContext
class StudyPlanIntegrationTests {
    static final String SCHEMA="backend_it_"+UUID.randomUUID().toString().replace("-","");
    static final String URL=Objects.requireNonNull(System.getenv("TEST_DB_URL")),USER=System.getenv("TEST_DB_USER"),PASSWORD=System.getenv("TEST_DB_PASSWORD");
    static final String ROOT="/api/v1/study-plans/preview",SECRET="StudyPlan8a1!Test";
    static final Instant BASE=Instant.parse("2026-11-02T00:00:00Z");
    static final AtomicReference<Instant> WHEN=new AtomicReference<>(BASE);
    @TestConfiguration(proxyBeanMethods=false) static class ClockFixture {
        @Bean @Primary StudyPlanService testedStudyPlanService(CourseRepository courses,AssignmentRepository assignments,ExamRepository exams,StudyPlanBusyReader busy){
            var clock=new Clock(){public ZoneId getZone(){return ZoneOffset.UTC;}public Clock withZone(ZoneId z){return Clock.fixed(instant(),z);}public Instant instant(){return WHEN.get();}};
            return new StudyPlanService(courses,assignments,exams,busy,clock);
        }
    }
    @BeforeEach void resetClock(){WHEN.set(BASE);}
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    final HttpClient client=HttpClient.newHttpClient();
    record Account(String token,UUID id,String email) { }
    record Fixture(Account owner,Map<?,?> course) { }
    @DynamicPropertySource static void configure(DynamicPropertyRegistry r){
        TestJwtResources.configure(r);r.add("spring.datasource.url",()->URL+(URL.contains("?")?"&":"?")+"currentSchema="+SCHEMA);
        r.add("spring.datasource.username",()->USER);r.add("spring.datasource.password",()->PASSWORD);r.add("spring.flyway.default-schema",()->SCHEMA);r.add("spring.flyway.schemas",()->SCHEMA);
        for(String route:List.of("login","register","refresh","logout"))r.add("app.auth.rate-limit."+route+"-per-minute",()->1000);
    }
    @AfterAll static void cleanup()throws Exception{if(!SCHEMA.matches("backend_it_[a-f0-9]{32}"))throw new IllegalStateException("Unsafe schema");try(var c=DriverManager.getConnection(URL,USER,PASSWORD);var s=c.createStatement()){s.execute("DROP SCHEMA IF EXISTS "+SCHEMA+" CASCADE");}}
    HttpResponse<String> send(String method,String path,String token,Object input)throws Exception{
        var r=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).timeout(Duration.ofSeconds(15));
        if(token!=null)r.header("Authorization","Bearer "+token);if(input!=null)r.header("Content-Type","application/json");
        return client.send(r.method(method,input==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(input))).build(),HttpResponse.BodyHandlers.ofString());
    }
    Map<?,?> data(HttpResponse<String> r){assertThat(r.statusCode()).as(r.body()).isIn(200,201);return (Map<?,?>)json.readValue(r.body(),Map.class).get("data");}
    void error(HttpResponse<String> r,int status,String code){assertThat(r.statusCode()).as(r.body()).isEqualTo(status);assertThat(json.readValue(r.body(),Map.class).get("code")).isEqualTo(code);assertThat(r.body()).doesNotContain(SECRET,"password_hash","org.hibernate","SELECT ");}
    Account account()throws Exception{String email="plan8a1-"+UUID.randomUUID()+"@example.test";var u=data(send("POST","/api/v1/auth/register",null,Map.of("email",email,"fullName","Kiểm thử kế hoạch","password",SECRET,"confirmPassword",SECRET)));var pair=data(send("POST","/api/v1/auth/login",null,Map.of("email",email,"password",SECRET)));return new Account(pair.get("accessToken").toString(),UUID.fromString(u.get("id").toString()),email);}
    Fixture fixture()throws Exception{var a=account();return new Fixture(a,course(a,1));}
    Map<?,?> course(Account a,int term)throws Exception{var s=data(send("POST","/api/v1/semesters",a.token,Map.of("term",term,"startYear",2026,"status","UPCOMING")));return data(send("POST","/api/v1/courses",a.token,Map.of("semesterId",s.get("id"),"code","REACT","name","Lập trình React","credits",3)));}
    Map<String,Object> input(Fixture f){return new HashMap<>(Map.of("courseId",f.course.get("id"),"goal","Làm bài React","fromDate","2026-11-02","toDate","2026-11-03","timeZone","Asia/Ho_Chi_Minh","availableStart","19:00","availableEnd","21:00","totalMinutes",180,"sessionMinutes",45,"breakMinutes",10));}
    Map<String,Object> one(Fixture f){var r=input(f);r.put("toDate","2026-11-02");r.put("totalMinutes",45);return r;}
    Map<?,?> preview(Fixture f,Map<String,Object> r)throws Exception{return data(send("POST",ROOT,f.owner.token,r));}
    List<Map<?,?>> sessions(Map<?,?> r){return ((List<?>)r.get("sessions")).stream().<Map<?,?>>map(x->(Map<?,?>)x).toList();}
    long number(Map<?,?> r,String field){return ((Number)r.get(field)).longValue();}
    String first(Map<?,?> r){return sessions(r).getFirst().get("startsAt").toString();}
    Map<?,?> task(Fixture f,String status,String due)throws Exception{return data(send("POST","/api/v1/assignments",f.owner.token,Map.of("courseId",f.course.get("id"),"title","Bài React","status",status,"dueAt",due,"notes","Không đưa ghi chú riêng vào đề xuất")));}
    Map<?,?> exam(Fixture f,String from,String to)throws Exception{return data(send("POST","/api/v1/exams",f.owner.token,Map.of("courseId",f.course.get("id"),"kind","FINAL","format","PRACTICAL","startsAt",from,"endsAt",to,"timeZone","Asia/Ho_Chi_Minh","reminder",false,"reminderMinutes",List.of())));}
    Map<?,?> rule(Fixture f)throws Exception{return data(send("POST","/api/v1/class-schedules",f.owner.token,Map.of("courseId",f.course.get("id"),"weekdays",List.of(1),"startsOn","2026-11-02","endsOn","2026-11-09","startTime","19:00","endTime","20:00","timeZone","Asia/Ho_Chi_Minh")));}
    void study(Fixture f,String from,int duration)throws Exception{data(send("POST","/api/v1/study-sessions",f.owner.token,Map.of("courseId",f.course.get("id"),"title","Buổi đã lưu","startsAt",from,"timeZone","Asia/Ho_Chi_Minh","durationMinutes",duration)));}
    @Test void threeHourExampleHasFourSessionsAndSnapshotMetadata()throws Exception{
        var f=fixture();var response=send("POST",ROOT,f.owner.token,input(f));var r=data(response);
        assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");assertThat(r.get("engine")).isEqualTo("RULE_BASED_V1");assertThat(r.get("persisted")).isEqualTo(false);assertThat(r.get("asOf")).isEqualTo(BASE.toString());
        assertThat(r.get("complete")).isEqualTo(true);assertThat(number(r,"scheduledMinutes")).isEqualTo(180);assertThat(number(r,"unscheduledMinutes")).isZero();assertThat(sessions(r)).hasSize(4);assertThat(first(r)).isEqualTo("2026-11-02T12:00:00Z");
        assertThat(response.body()).doesNotContain("accessToken","userId","password","Không đưa ghi chú");
    }
    @Test void repeatedPreviewsDoNotWriteOrReserveAndAreDeterministic()throws Exception{
        var f=fixture();var before=jdbc.queryForList("SELECT * FROM study_sessions WHERE user_id=?",f.owner.id);var user=jdbc.queryForMap("SELECT * FROM app_users WHERE id=?",f.owner.id);var course=jdbc.queryForMap("SELECT * FROM courses WHERE id=?",UUID.fromString(f.course.get("id").toString()));
        var a=preview(f,input(f));assertThat(preview(f,input(f))).isEqualTo(a);assertThat(jdbc.queryForList("SELECT * FROM study_sessions WHERE user_id=?",f.owner.id)).isEqualTo(before);assertThat(jdbc.queryForMap("SELECT * FROM app_users WHERE id=?",f.owner.id)).isEqualTo(user);assertThat(jdbc.queryForMap("SELECT * FROM courses WHERE id=?",UUID.fromString(f.course.get("id").toString()))).isEqualTo(course);
    }
    @Test void partialPlanReportsUnscheduledMinutesWithoutCallingItComplete()throws Exception{var f=fixture();var r=input(f);r.put("toDate","2026-11-02");var p=preview(f,r);assertThat(number(p,"scheduledMinutes")).isEqualTo(90);assertThat(number(p,"unscheduledMinutes")).isEqualTo(90);assertThat(p.get("complete")).isEqualTo(false);}
    @Test void busyTimeFromOtherSemesterIsStillReservedAcrossAllThreeSources()throws Exception{
        var f=fixture();var other=new Fixture(f.owner,course(f.owner,2));rule(other);study(other,"2026-11-02T20:00:00+07:00",30);exam(other,"2026-11-02T20:30:00+07:00","2026-11-02T21:00:00+07:00");
        var r=one(f);r.put("availableEnd","22:00");assertThat(first(preview(f,r))).isEqualTo("2026-11-02T14:00:00Z");
    }
    @Test void cancellingThenRestoringOneClassDateChangesProposalWithoutChangingTheRule()throws Exception{
        var f=fixture();var s=rule(f);var p="/api/v1/class-schedules/"+s.get("id");assertThat(first(preview(f,one(f)))).isEqualTo("2026-11-02T13:00:00Z");
        var changed=data(send("PUT",p+"/exceptions/2026-11-02",f.owner.token,Map.of("kind","CANCELLED","scheduleVersion",0)));assertThat(first(preview(f,one(f)))).isEqualTo("2026-11-02T12:00:00Z");
        assertThat(send("DELETE",p+"/exceptions/2026-11-02?scheduleVersion="+changed.get("scheduleVersion"),f.owner.token,null).statusCode()).isEqualTo(204);assertThat(first(preview(f,one(f)))).isEqualTo("2026-11-02T13:00:00Z");
    }
    @Test void movedClassUsesEffectiveTimeAndOtherDateExceptionDoesNotMoveToday()throws Exception{
        var f=fixture();var s=rule(f);var p="/api/v1/class-schedules/"+s.get("id");
        var e=data(send("PUT",p+"/exceptions/2026-11-09",f.owner.token,Map.of("kind","CANCELLED","scheduleVersion",0)));assertThat(first(preview(f,one(f)))).isEqualTo("2026-11-02T13:00:00Z");
        data(send("PUT",p+"/exceptions/2026-11-02",f.owner.token,Map.of("kind","CHANGED","startTime","20:00","endTime","20:30","scheduleVersion",e.get("scheduleVersion"))));assertThat(first(preview(f,one(f)))).isEqualTo("2026-11-02T12:00:00Z");
    }
    @Test void assignmentDeadlineAllowsExactFinishAndKeepsItsObservedVersion()throws Exception{
        var f=fixture();var t=task(f,"TODO","2026-11-02T19:45:00+07:00");var r=one(f);r.put("assignmentId",t.get("id"));var p=preview(f,r);assertThat(number(p,"scheduledMinutes")).isEqualTo(45);assertThat(((Map<?,?>)p.get("target")).get("version")).isEqualTo(t.get("version"));assertThat(sessions(p).getFirst().get("assignmentId")).isEqualTo(t.get("id"));
    }
    @Test void microsecondDeadlineIsNotRoundedIntoExtraStudyTime()throws Exception{var f=fixture();var t=task(f,"TODO","2026-11-02T19:44:59.999999+07:00");var r=one(f);r.put("assignmentId",t.get("id"));assertThat(sessions(preview(f,r))).isEmpty();}
    @Test void examStartIsTheReviewDeadlineEvenWithRemindersDisabled()throws Exception{var f=fixture();var e=exam(f,"2026-11-02T19:45:00+07:00","2026-11-02T20:45:00+07:00");var r=one(f);r.put("examId",e.get("id"));assertThat(number(preview(f,r),"scheduledMinutes")).isEqualTo(45);}
    @Test void completedAndExpiredTargetsHaveExplicitConflicts()throws Exception{
        var f=fixture();for(var spec:List.of(List.of("COMPLETED","2026-11-03T20:00:00+07:00","STUDY_PLAN_TARGET_COMPLETED"),List.of("TODO",BASE.toString(),"STUDY_PLAN_DEADLINE_PASSED"))){var t=task(f,spec.get(0),spec.get(1));var r=one(f);r.put("assignmentId",t.get("id"));error(send("POST",ROOT,f.owner.token,r),409,spec.get(2));}
    }
    @Test void linkedCourseMismatchCannotBeUsedForAnotherCourse()throws Exception{var f=fixture();var other=new Fixture(f.owner,course(f.owner,2));var t=task(other,"TODO","2026-11-03T19:00:00+07:00");var r=one(f);r.put("assignmentId",t.get("id"));error(send("POST",ROOT,f.owner.token,r),409,"STUDY_PLAN_TARGET_COURSE_MISMATCH");}
    @Test void missingAndForeignTargetsUseSameNotFoundWithoutLeakingNames()throws Exception{
        var f=fixture();var b=fixture();var task=task(b,"TODO","2026-11-03T20:00:00+07:00");var exam=exam(b,"2026-11-03T19:00:00+07:00","2026-11-03T20:00:00+07:00");
        for(var pair:List.of(List.of("courseId",b.course.get("id"),"COURSE_NOT_FOUND"),List.of("assignmentId",task.get("id"),"ASSIGNMENT_NOT_FOUND"),List.of("examId",exam.get("id"),"EXAM_NOT_FOUND")))for(Object id:List.of(pair.get(1),UUID.randomUUID().toString())){var r=one(f);r.put(pair.getFirst().toString(),id);error(send("POST",ROOT,f.owner.token,r),404,pair.getLast().toString());}
    }
    @Test void anotherAccountsBusyTimeAndSpoofedOwnerFieldHaveNoEffect()throws Exception{
        var f=fixture();var b=fixture();rule(b);var r=one(f);r.put("userId",b.owner.id);assertThat(first(preview(f,r))).isEqualTo("2026-11-02T12:00:00Z");
    }
    @Test void explicitBearerAndExactPostRouteAreRequired()throws Exception{
        var f=fixture();error(send("POST",ROOT,null,one(f)),401,"AUTHENTICATION_REQUIRED");assertThat(send("POST",ROOT,"invalid",one(f)).statusCode()).isEqualTo(401);
        for(String method:List.of("GET","PUT","DELETE","PATCH"))error(send(method,ROOT,f.owner.token,null),403,"ACCESS_DENIED");error(send("POST","/api/v1/study-plans/apply",f.owner.token,one(f)),403,"ACCESS_DENIED");
    }
    @Test void invalidCalendarAndZoneFieldsAreRejected()throws Exception{
        var f=fixture();var cases=List.of(Map.entry("fromDate","2026-02-30"),Map.entry("fromDate","2026-11-01"),Map.entry("toDate","2026-11-16"),Map.entry("toDate","2026-11-01"),Map.entry("timeZone","+07:00"),Map.entry("timeZone","Bad/Zone"),Map.entry("availableStart","9:00"),Map.entry("availableEnd","24:00"),Map.entry("availableEnd","18:00"));
        for(var c:cases){var r=one(f);r.put(c.getKey(),c.getValue());error(send("POST",ROOT,f.owner.token,r),400,"INVALID_STUDY_PLAN");}
        var r=one(f);r.put("weekdays",List.of(1,1));error(send("POST",ROOT,f.owner.token,r),400,"INVALID_STUDY_PLAN");
    }
    @Test void numericNestedAndRequiredValidationPreventsUnboundedOrMalformedWork()throws Exception{
        var f=fixture();for(var c:List.of(Map.entry("totalMinutes",0),Map.entry("totalMinutes",1441),Map.entry("sessionMinutes",14),Map.entry("sessionMinutes",241),Map.entry("breakMinutes",-1),Map.entry("breakMinutes",61),Map.entry("weekdays",List.of()),Map.entry("weekdays",List.of(0)),Map.entry("goal"," "))){var r=one(f);r.put(c.getKey(),c.getValue());error(send("POST",ROOT,f.owner.token,r),400,"VALIDATION_FAILED");}
        var r=one(f);r.put("totalMinutes",1.5);assertThat(send("POST",ROOT,f.owner.token,r).statusCode()).isEqualTo(400);r=one(f);r.remove("courseId");error(send("POST",ROOT,f.owner.token,r),400,"VALIDATION_FAILED");r=one(f);r.put("weekdays",Arrays.asList(1,null));error(send("POST",ROOT,f.owner.token,r),400,"VALIDATION_FAILED");
    }
    @Test void cannotCombineAssignmentAndExamTargets()throws Exception{var f=fixture();var r=one(f);r.put("assignmentId",UUID.randomUUID());r.put("examId",UUID.randomUUID());error(send("POST",ROOT,f.owner.token,r),400,"INVALID_STUDY_PLAN");}
    @Test void optionalDefaultsAreConsistentWithExplicitValues()throws Exception{var f=fixture();var r=input(f);var a=preview(f,r);r.remove("breakMinutes");r.remove("weekdays");assertThat(preview(f,r)).isEqualTo(a);}
    @Test void noAvailableWeekdayIsARealEmptyPlanNotAnError()throws Exception{var f=fixture();var r=one(f);r.put("weekdays",List.of(7));var p=preview(f,r);assertThat(sessions(p)).isEmpty();assertThat(number(p,"unscheduledMinutes")).isEqualTo(45);assertThat(p.get("complete")).isEqualTo(false);}
    @Test void canonicalStudyApiCanSaveEachProposalOnlyWhenUserExplicitlyRequestsIt()throws Exception{
        var f=fixture();var p=preview(f,input(f));for(var s:sessions(p)){data(send("POST","/api/v1/study-sessions",f.owner.token,Map.of("courseId",s.get("courseId"),"title",s.get("title"),"startsAt",s.get("startsAt"),"timeZone",s.get("timeZone"),"durationMinutes",s.get("durationMinutes"))));}
        assertThat(number(preview(f,input(f)),"scheduledMinutes")).isLessThan(180);
    }
    @Test void newBusyEventBetweenPreviewAndSaveIsRejectedByExistingWriter()throws Exception{
        var f=fixture();var s=sessions(preview(f,one(f))).getFirst();study(f,"2026-11-02T19:00:00+07:00",60);
        error(send("POST","/api/v1/study-sessions",f.owner.token,Map.of("courseId",s.get("courseId"),"title",s.get("title"),"startsAt",s.get("startsAt"),"timeZone",s.get("timeZone"),"durationMinutes",s.get("durationMinutes"))),409,"STUDY_TIME_CONFLICT");assertThat(first(preview(f,one(f)))).isEqualTo("2026-11-02T13:00:00Z");
    }
    @Test void deadlineAndSourceDeletionAreReflectedByTheNextPreview()throws Exception{
        var f=fixture();var t=task(f,"TODO","2026-11-02T19:45:00+07:00");var r=one(f);r.put("assignmentId",t.get("id"));assertThat(number(preview(f,r),"scheduledMinutes")).isEqualTo(45);
        var update=new HashMap<String,Object>();for(String k:List.of("courseId","title","dueAt","priority","status","notes","version"))update.put(k,t.get(k));update.put("dueAt","2026-11-02T19:30:00+07:00");var changed=data(send("PUT","/api/v1/assignments/"+t.get("id"),f.owner.token,update));
        assertThat(number(preview(f,r),"scheduledMinutes")).isZero();assertThat(send("DELETE","/api/v1/assignments/"+t.get("id")+"?version="+changed.get("version"),f.owner.token,null).statusCode()).isEqualTo(204);error(send("POST",ROOT,f.owner.token,r),404,"ASSIGNMENT_NOT_FOUND");
    }
    @Test void differentRuleZoneUsesRealInstantAcrossLocalDateBoundary()throws Exception{
        var f=fixture();data(send("POST","/api/v1/class-schedules",f.owner.token,Map.of("courseId",f.course.get("id"),"weekdays",List.of(2),"startsOn","2026-11-03","endsOn","2026-11-03","startTime","01:00","endTime","02:00","timeZone","Pacific/Kiritimati")));
        assertThat(first(preview(f,one(f)))).isEqualTo("2026-11-02T12:00:00Z");
        var r=one(f);r.put("availableStart","18:00");r.put("availableEnd","21:00");assertThat(first(preview(f,r))).isEqualTo("2026-11-02T12:00:00Z");
    }
    @Test void maximumTotalIsBoundedAndCountsStillAddUp()throws Exception{var f=fixture();var r=input(f);r.put("totalMinutes",1440);r.put("sessionMinutes",15);r.put("availableStart","00:00");r.put("availableEnd","23:59");r.put("toDate","2026-11-15");var p=preview(f,r);assertThat(sessions(p)).hasSize(96);assertThat(number(p,"scheduledMinutes")+number(p,"unscheduledMinutes")).isEqualTo(1440);}
    @Test void calendarUtcUpperBoundaryCannotYieldAnUnsaveableSession()throws Exception{var f=fixture();var r=one(f);r.put("fromDate","2099-12-31");r.put("toDate","2099-12-31");r.put("timeZone","America/New_York");r.put("availableStart","22:00");r.put("availableEnd","23:59");error(send("POST",ROOT,f.owner.token,r),400,"INVALID_STUDY_PLAN");}
    @Test @EnabledOnOs(OS.WINDOWS) void powershellPreviewsWithoutSavingAndRevokesOnlyItsOwnLogin()throws Exception{
        var f=fixture();assertThat(runPowerShell(f,"",0)).contains("180","RULE_BASED_V1");assertThat(jdbc.queryForObject("SELECT count(*) FROM study_sessions WHERE user_id=?",Long.class,f.owner.id)).isZero();assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL",Long.class,f.owner.id)).isEqualTo(1);
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershellFailureIsNotReportedAsAnEmptySuccess()throws Exception{var f=fixture();assertThat(runPowerShell(f,"-AssignmentId '"+UUID.randomUUID()+"'",1)).contains("ASSIGNMENT_NOT_FOUND");}
    String runPowerShell(Fixture f,String args,int expected)throws Exception{
        String ps=Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","powershell.exe").toString();
        String command="[Console]::OutputEncoding=[Text.UTF8Encoding]::new();function Read-Host {param([string]$Prompt,[switch]$AsSecureString);if($AsSecureString){ConvertTo-SecureString $env:PLAN_PASSWORD -AsPlainText -Force}else{$env:PLAN_EMAIL}};& './scripts/Try-StudyPlan.ps1' -BaseUrl 'http://127.0.0.1:"+port+"' -CourseId '"+f.course.get("id")+"' -FromDate '2026-11-02' -ToDate '2026-11-03' "+args;
        var builder=new ProcessBuilder(ps,"-NoProfile","-ExecutionPolicy","Bypass","-Command",command).redirectErrorStream(true);builder.environment().keySet().removeIf(n->n.equalsIgnoreCase("PSModulePath"));builder.environment().put("PSModulePath",Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","Modules").toString());builder.environment().put("PLAN_EMAIL",f.owner.email);builder.environment().put("PLAN_PASSWORD",SECRET);
        var p=builder.start();var output=CompletableFuture.supplyAsync(()->{try{return new String(p.getInputStream().readAllBytes(),StandardCharsets.UTF_8);}catch(java.io.IOException e){throw new java.io.UncheckedIOException(e);}});
        try{assertThat(p.waitFor(30,TimeUnit.SECONDS)).isTrue();var text=output.get(5,TimeUnit.SECONDS);assertThat(p.exitValue()).as(text).isEqualTo(expected);assertThat(text).doesNotContain(SECRET,"accessToken","refreshToken");return text;}finally{if(p.isAlive())p.destroyForcibly();}
    }
}
