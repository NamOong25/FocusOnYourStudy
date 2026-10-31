package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import com.focusstudy.academics.courses.CourseRepository;
import com.focusstudy.assignments.AssignmentRepository;
import com.focusstudy.exams.ExamRepository;
import com.focusstudy.planning.*;
import com.focusstudy.users.UserRepository;
import com.focusstudy.study.StudySessionRepository;
import org.flywaydb.core.Flyway;
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
@Import({StudyPlanApplyIntegrationTests.ClockFixture.class,StudyPlanApplyIntegrationTests.ApplyClockFixture.class})
@DirtiesContext
class StudyPlanApplyIntegrationTests {
    static final String SCHEMA="backend_it_"+UUID.randomUUID().toString().replace("-","");
    static final String URL=Objects.requireNonNull(System.getenv("TEST_DB_URL")),USER=System.getenv("TEST_DB_USER"),PASSWORD=System.getenv("TEST_DB_PASSWORD");
    static final String ROOT="/api/v1/study-plans/preview",SECRET="StudyPlan8a3a!Test";
    static final Instant BASE=Instant.parse("2026-11-02T00:00:00Z");
    static final AtomicReference<Instant> WHEN=new AtomicReference<>(BASE);
    @TestConfiguration(proxyBeanMethods=false) static class ClockFixture {
        @Bean @Primary StudyPlanService testedStudyPlanService(CourseRepository courses,AssignmentRepository assignments,ExamRepository exams,StudyPlanBusyReader busy){
            var clock=new Clock(){public ZoneId getZone(){return ZoneOffset.UTC;}public Clock withZone(ZoneId z){return Clock.fixed(instant(),z);}public Instant instant(){return WHEN.get();}};
            return new StudyPlanService(courses,assignments,exams,busy,clock);
        }
    }
    @TestConfiguration(proxyBeanMethods=false) static class ApplyClockFixture {
        @Bean @Primary StudyPlanApplyService testedApply(UserRepository users,CourseRepository courses,AssignmentRepository assignments,ExamRepository exams,StudyPlanBusyReader busy,StudySessionRepository studies,StudyPlanApplications applications,ObjectMapper json){
            var clock=new Clock(){public ZoneId getZone(){return ZoneOffset.UTC;}public Clock withZone(ZoneId z){return Clock.fixed(instant(),z);}public Instant instant(){return WHEN.get();}};
            return new StudyPlanApplyService(users,courses,assignments,exams,busy,studies,applications,json,clock);
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
    Account account()throws Exception{String email="plan8a3a-"+UUID.randomUUID()+"@example.test";var u=data(send("POST","/api/v1/auth/register",null,Map.of("email",email,"fullName","Kiểm thử kế hoạch","password",SECRET,"confirmPassword",SECRET)));var pair=data(send("POST","/api/v1/auth/login",null,Map.of("email",email,"password",SECRET)));return new Account(pair.get("accessToken").toString(),UUID.fromString(u.get("id").toString()),email);}
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
    static final String APPLY="/api/v1/study-plans/apply",RECEIPTS="/api/v1/study-plans/applications/";
    Map<String,Object> command(Fixture f)throws Exception{return command(f,input(f));}
    Map<String,Object> command(Fixture f,Map<String,Object> conditions)throws Exception{
        var p=preview(f,conditions);var r=new HashMap<String,Object>();r.put("clientRequestId",UUID.randomUUID().toString());r.put("conditions",conditions);r.put("courseVersion",p.get("courseVersion"));r.put("targetVersion",((Map<?,?>)p.get("target")).get("version"));
        r.put("sessions",sessions(p).stream().map(s->new HashMap<String,Object>(Map.of("index",s.get("index"),"title",s.get("title"),"startsAt",s.get("startsAt"),"durationMinutes",s.get("durationMinutes")))).collect(java.util.stream.Collectors.toCollection(ArrayList::new)));return r;
    }
    @SuppressWarnings("unchecked") List<Map<String,Object>> drafts(Map<String,Object> r){return (List<Map<String,Object>>)r.get("sessions");}
    HttpResponse<String> apply(Fixture f,Map<String,Object> r)throws Exception{return send("POST",APPLY,f.owner.token,r);}
    long rows(Fixture f,String table){return jdbc.queryForObject("SELECT count(*) FROM "+table+" WHERE user_id=?",Long.class,f.owner.id);}
    void empty(Fixture f){assertThat(rows(f,"study_sessions")).isZero();assertThat(rows(f,"study_plan_applications")).isZero();}
    Map<?,?> saved(Map<?,?> receipt,int index){return (Map<?,?>)((Map<?,?>)((List<?>)receipt.get("sessions")).get(index)).get("session");}
    void noReceipt(Fixture f,Map<String,Object> r)throws Exception{error(send("GET",RECEIPTS+r.get("clientRequestId"),f.owner.token,null),404,"STUDY_PLAN_APPLICATION_NOT_FOUND");}
    @Test void savesAllFourRealStudyRowsAndImmutableReceiptWithExactLinks()throws Exception{
        var f=fixture();var r=command(f);var response=apply(f,r);assertThat(response.statusCode()).isEqualTo(201);var p=data(response);
        assertThat(response.headers().firstValue("Cache-Control").orElse("")).contains("no-store");assertThat(response.headers().firstValue("Location").orElse("")).isEqualTo(RECEIPTS+r.get("clientRequestId"));
        assertThat(p.get("persisted")).isEqualTo(true);assertThat(number(p,"savedMinutes")).isEqualTo(180);assertThat(number(p,"remainingMinutes")).isZero();assertThat(((List<?>)p.get("sessions"))).hasSize(4);
        assertThat(rows(f,"study_sessions")).isEqualTo(4);assertThat(rows(f,"study_plan_applications")).isEqualTo(1);
        for(int i=0;i<4;i++){var row=saved(p,i);assertThat(row.get("status")).isEqualTo("PLANNED");assertThat(row.get("courseId")).isEqualTo(f.course.get("id"));assertThat(row.get("assignmentId")).isNull();assertThat(data(send("GET","/api/v1/study-sessions/"+row.get("id"),f.owner.token,null)).get("title")).isEqualTo(row.get("title"));}
        assertThat(data(send("GET",RECEIPTS+r.get("clientRequestId"),f.owner.token,null))).isEqualTo(p);
    }
    @Test void retryAndLookupAfterIgnoredResponseNeverCreateDuplicateRows()throws Exception{
        var f=fixture();var r=command(f);var first=data(apply(f,r));var retry=apply(f,r);assertThat(retry.statusCode()).isEqualTo(200);assertThat(data(retry)).isEqualTo(first);assertThat(data(send("GET",RECEIPTS+r.get("clientRequestId"),f.owner.token,null))).isEqualTo(first);assertThat(rows(f,"study_sessions")).isEqualTo(4);
    }
    @Test void retrySurvivesNewDayExpiredTargetAndDeletedCourseWithoutRecreatingAnything()throws Exception{
        var f=fixture();var t=task(f,"TODO","2026-11-03T19:45:00+07:00");var c=input(f);c.put("assignmentId",t.get("id"));var r=command(f,c);var p=data(apply(f,r));
        for(int i=0;i<((List<?>)p.get("sessions")).size();i++)assertThat(send("DELETE","/api/v1/study-sessions/"+saved(p,i).get("id")+"?version=0",f.owner.token,null).statusCode()).isEqualTo(204);
        assertThat(send("DELETE","/api/v1/assignments/"+t.get("id")+"?version=0",f.owner.token,null).statusCode()).isEqualTo(204);
        assertThat(send("DELETE","/api/v1/courses/"+f.course.get("id")+"?version=0",f.owner.token,null).statusCode()).isEqualTo(204);assertThat(rows(f,"study_sessions")).isZero();WHEN.set(BASE.plusSeconds(10*86400));
        assertThat(data(apply(f,r))).isEqualTo(p);assertThat(rows(f,"study_sessions")).isZero();assertThat(rows(f,"study_plan_applications")).isEqualTo(1);
    }
    @Test void receiptIsHistoricalAfterIndividualStudyUpdateOrDelete()throws Exception{
        var f=fixture();var r=command(f);var p=data(apply(f,r));var first=saved(p,0);assertThat(send("DELETE","/api/v1/study-sessions/"+first.get("id")+"?version=0",f.owner.token,null).statusCode()).isEqualTo(204);
        assertThat(data(apply(f,r))).isEqualTo(p);assertThat(rows(f,"study_sessions")).isEqualTo(3);assertThat(data(send("GET",RECEIPTS+r.get("clientRequestId"),f.owner.token,null))).isEqualTo(p);
    }
    @Test void sameKeyWithChangedContentOrContextIsAConflict()throws Exception{
        var f=fixture();var r=command(f);data(apply(f,r));drafts(r).getFirst().put("title","Đổi nội dung");error(apply(f,r),409,"STUDY_PLAN_REQUEST_REUSED");assertThat(rows(f,"study_sessions")).isEqualTo(4);
    }
    @Test void normalizationAcceptsOffsetOrderWeekdayAndWhitespaceEquivalence()throws Exception{
        var f=fixture();var r=command(f);var p=data(apply(f,r));drafts(r).getFirst().put("startsAt","2026-11-02T19:00:00+07:00");drafts(r).getFirst().put("title","  "+drafts(r).getFirst().get("title")+"  ");Collections.reverse(drafts(r));
        @SuppressWarnings("unchecked") var c=(Map<String,Object>)r.get("conditions");c.put("weekdays",List.of(7,6,5,4,3,2,1));c.remove("breakMinutes");c.put("goal","  Làm bài React  ");assertThat(data(apply(f,r))).isEqualTo(p);
    }
    @Test void ownerKeysAreIndependentAndForeignReceiptIsIndistinguishableFromMissing()throws Exception{
        var a=fixture();var b=fixture();var r=command(a);data(apply(a,r));error(send("GET",RECEIPTS+r.get("clientRequestId"),b.owner.token,null),404,"STUDY_PLAN_APPLICATION_NOT_FOUND");var q=command(b);q.put("clientRequestId",r.get("clientRequestId"));assertThat(apply(b,q).statusCode()).isEqualTo(201);assertThat(rows(a,"study_sessions")).isEqualTo(4);assertThat(rows(b,"study_sessions")).isEqualTo(4);
    }
    @Test void selectedSubsetAndEditedTitleDurationAreSavedWithRemainingMinutes()throws Exception{
        var f=fixture();var r=command(f);var chosen=new ArrayList<>(List.of(drafts(r).get(1),drafts(r).get(3)));chosen.getFirst().put("title","Buổi đã chỉnh");chosen.getFirst().put("durationMinutes",30);r.put("sessions",chosen);var p=data(apply(f,r));assertThat(number(p,"savedMinutes")).isEqualTo(75);assertThat(number(p,"remainingMinutes")).isEqualTo(105);assertThat(saved(p,0).get("title")).isEqualTo("Buổi đã chỉnh");assertThat(rows(f,"study_sessions")).isEqualTo(2);
    }
    @Test void assignmentLinkAndExactDeadlineAreStored()throws Exception{
        var f=fixture();var t=task(f,"TODO","2026-11-02T19:45:00+07:00");var c=input(f);c.put("assignmentId",t.get("id"));var r=command(f,c);var p=data(apply(f,r));assertThat(saved(p,0).get("assignmentId")).isEqualTo(t.get("id"));assertThat(saved(p,0).get("endsAt")).isEqualTo("2026-11-02T12:45:00Z");assertThat(number(p,"savedMinutes")).isEqualTo(45);
    }
    @Test void editedSessionCannotCrossAssignmentDeadlineEvenByAMicrosecond()throws Exception{
        var f=fixture();var t=task(f,"TODO","2026-11-02T19:44:59.999999+07:00");var c=input(f);c.put("assignmentId",t.get("id"));var r=command(f,one(f));r.put("conditions",c);r.put("targetVersion",t.get("version"));error(apply(f,r),409,"STUDY_AFTER_DEADLINE");empty(f);
    }
    @Test void examTargetStoredAsMetadataAndStartsAtIsStrictDeadline()throws Exception{
        var f=fixture();var e=exam(f,"2026-11-02T19:45:00+07:00","2026-11-02T20:45:00+07:00");var c=input(f);c.put("examId",e.get("id"));var r=command(f,c);var invalid=new HashMap<>(r);invalid.put("clientRequestId",UUID.randomUUID());invalid.put("sessions",new ArrayList<>(List.of(new HashMap<>(drafts(r).getFirst()))));drafts(invalid).getFirst().put("durationMinutes",46);error(apply(f,invalid),409,"STUDY_AFTER_DEADLINE");empty(f);var p=data(apply(f,r));assertThat(((Map<?,?>)p.get("target")).get("id")).isEqualTo(e.get("id"));assertThat(saved(p,0).get("assignmentId")).isNull();
    }
    @Test void staleCourseOrTargetVersionSavesNothing()throws Exception{
        var f=fixture();var r=command(f);r.put("courseVersion",1);error(apply(f,r),409,"STUDY_PLAN_SOURCE_CHANGED");empty(f);
        var t=task(f,"TODO","2026-11-03T20:00:00+07:00");var c=input(f);c.put("assignmentId",t.get("id"));r=command(f,c);jdbc.update("UPDATE assignments SET version=version+1 WHERE id=?",UUID.fromString(t.get("id").toString()));error(apply(f,r),409,"STUDY_PLAN_SOURCE_CHANGED");empty(f);
    }
    @Test void targetCompletedOrExpiredSincePreviewIsNotSaved()throws Exception{
        var f=fixture();var t=task(f,"TODO","2026-11-03T20:00:00+07:00");var c=input(f);c.put("assignmentId",t.get("id"));var r=command(f,c);jdbc.update("UPDATE assignments SET status='COMPLETED',version=version+1 WHERE id=?",UUID.fromString(t.get("id").toString()));error(apply(f,r),409,"STUDY_PLAN_TARGET_COMPLETED");empty(f);
        jdbc.update("UPDATE assignments SET status='TODO',due_at=?,version=0 WHERE id=?",java.sql.Timestamp.from(BASE),UUID.fromString(t.get("id").toString()));error(apply(f,r),409,"STUDY_PLAN_DEADLINE_PASSED");empty(f);
    }
    @Test void missingForeignAndMismatchedSourcesDoNotLeakOrWrite()throws Exception{
        var f=fixture();var b=fixture();var t=task(b,"TODO","2026-11-03T20:00:00+07:00");
        for(Object id:List.of(b.course.get("id"),UUID.randomUUID().toString())){var r=command(f);@SuppressWarnings("unchecked") var c=(Map<String,Object>)r.get("conditions");c.put("courseId",id);error(apply(f,r),404,"COURSE_NOT_FOUND");}
        for(Object id:List.of(t.get("id"),UUID.randomUUID().toString())){var r=command(f);@SuppressWarnings("unchecked") var c=(Map<String,Object>)r.get("conditions");c.put("assignmentId",id);r.put("targetVersion",0);error(apply(f,r),404,"ASSIGNMENT_NOT_FOUND");}
        var other=new Fixture(f.owner,course(f.owner,2));var ownTask=task(other,"TODO","2026-11-03T20:00:00+07:00");var r=command(f);@SuppressWarnings("unchecked") var c=(Map<String,Object>)r.get("conditions");c.put("assignmentId",ownTask.get("id"));r.put("targetVersion",0);error(apply(f,r),409,"STUDY_PLAN_TARGET_COURSE_MISMATCH");empty(f);
    }
    @Test void ownerStatusTotalsAndLinkedIdsCannotBeSpoofedByExtraFields()throws Exception{
        var f=fixture();var b=fixture();var r=command(f);r.put("userId",b.owner.id);r.put("savedMinutes",0);drafts(r).getFirst().put("status","COMPLETED");drafts(r).getFirst().put("courseId",b.course.get("id"));var p=data(apply(f,r));assertThat(number(p,"savedMinutes")).isEqualTo(180);assertThat(saved(p,0).get("status")).isEqualTo("PLANNED");assertThat(saved(p,0).get("courseId")).isEqualTo(f.course.get("id"));assertThat(rows(b,"study_sessions")).isZero();
    }
    @Test void existingStudyConflictInLastSlotDoesNotSaveEarlierValidSlots()throws Exception{
        var f=fixture();var r=command(f);study(f,"2026-11-03T19:55:00+07:00",45);error(apply(f,r),409,"STUDY_PLAN_TIME_CONFLICT");assertThat(rows(f,"study_sessions")).isEqualTo(1);assertThat(rows(f,"study_plan_applications")).isZero();noReceipt(f,r);
    }
    @Test void newClassFromAnotherSemesterBlocksSaveWhileTouchingBoundaryIsAllowed()throws Exception{
        var f=fixture();var r=command(f,one(f));var other=new Fixture(f.owner,course(f.owner,2));var s=rule(other);error(apply(f,r),409,"STUDY_PLAN_TIME_CONFLICT");empty(f);drafts(r).getFirst().put("startsAt","2026-11-02T20:00:00+07:00");assertThat(apply(f,r).statusCode()).isEqualTo(201);
    }
    @Test void cancelledClassIsFreeButRestoredOrRescheduledClassIsBusy()throws Exception{
        var f=fixture();var s=rule(f);var e=data(send("PUT","/api/v1/class-schedules/"+s.get("id")+"/exceptions/2026-11-02",f.owner.token,Map.of("kind","CANCELLED","scheduleVersion",0)));var r=command(f,one(f));
        assertThat(send("DELETE","/api/v1/class-schedules/"+s.get("id")+"/exceptions/2026-11-02?version="+e.get("version")+"&scheduleVersion="+e.get("scheduleVersion"),f.owner.token,null).statusCode()).isEqualTo(204);error(apply(f,r),409,"STUDY_PLAN_TIME_CONFLICT");empty(f);
    }
    @Test void examBusyTimeDoesNotDependOnReminderSetting()throws Exception{
        var f=fixture();var r=command(f,one(f));exam(f,"2026-11-02T19:00:00+07:00","2026-11-02T20:00:00+07:00");error(apply(f,r),409,"STUDY_PLAN_TIME_CONFLICT");empty(f);
    }
    @Test void otherAccountBusyTimeDoesNotBlock()throws Exception{var f=fixture();var b=fixture();rule(b);assertThat(apply(f,command(f)).statusCode()).isEqualTo(201);}
    @Test void editedPeerOverlapAndInsufficientRestAreRejectedAtomically()throws Exception{
        var f=fixture();for(String start:List.of("2026-11-02T19:30:00+07:00","2026-11-02T19:54:00+07:00")){var r=command(f);drafts(r).get(1).put("startsAt",start);error(apply(f,r),409,"STUDY_PLAN_SELECTION_CONFLICT");empty(f);}
    }
    @Test void exactRestBoundaryAndUnsortedDraftsAreAccepted()throws Exception{var f=fixture();var r=command(f);Collections.reverse(drafts(r));assertThat(apply(f,r).statusCode()).isEqualTo(201);}
    @Test void outsideRangeWeekdayAndWindowAreRejected()throws Exception{
        var f=fixture();for(String start:List.of("2026-11-04T19:00:00+07:00","2026-11-02T18:59:00+07:00","2026-11-02T20:30:00+07:00")){var r=command(f,one(f));drafts(r).getFirst().put("startsAt",start);error(apply(f,r),409,"STUDY_PLAN_OUTSIDE_AVAILABILITY");empty(f);}
        var r=command(f,one(f));@SuppressWarnings("unchecked") var c=(Map<String,Object>)r.get("conditions");c.put("weekdays",List.of(2));error(apply(f,r),409,"STUDY_PLAN_OUTSIDE_AVAILABILITY");empty(f);
    }
    @Test void pastMinuteAndFractionalStartAreRejected()throws Exception{
        var f=fixture();var r=command(f,one(f));WHEN.set(Instant.parse("2026-11-02T12:00:00.000000001Z"));error(apply(f,r),409,"STUDY_PLAN_IN_PAST");empty(f);WHEN.set(BASE);drafts(r).getFirst().put("startsAt","2026-11-02T12:00:00.000001Z");error(apply(f,r),400,"INVALID_STUDY_PLAN");empty(f);
    }
    @Test void totalLimitDuplicateIndicesAndConditionalVersionsAreValidated()throws Exception{
        var f=fixture();var r=command(f);drafts(r).get(1).put("index",1);error(apply(f,r),400,"INVALID_STUDY_PLAN");empty(f);
        r=command(f,one(f));drafts(r).getFirst().put("durationMinutes",46);error(apply(f,r),400,"INVALID_STUDY_PLAN");empty(f);
        r=command(f);r.put("targetVersion",0);error(apply(f,r),400,"INVALID_STUDY_PLAN");empty(f);
        var t=task(f,"TODO","2026-11-03T20:00:00+07:00");var c=input(f);c.put("assignmentId",t.get("id"));r=command(f,c);r.remove("targetVersion");error(apply(f,r),400,"INVALID_STUDY_PLAN");empty(f);
    }
    @Test void beanValidationBoundsAndMalformedJsonPreventWrites()throws Exception{
        var f=fixture();for(var entry:List.of(Map.entry("sessions",List.of()),Map.entry("courseVersion",-1),Map.entry("clientRequestId","not-uuid"))){var r=command(f);r.put(entry.getKey(),entry.getValue());assertThat(apply(f,r).statusCode()).isEqualTo(400);empty(f);}
        for(var entry:List.of(Map.entry("index",0),Map.entry("durationMinutes",241),Map.entry("title"," "),Map.entry("startsAt",""))){var r=command(f);drafts(r).getFirst().put(entry.getKey(),entry.getValue());error(apply(f,r),400,"VALIDATION_FAILED");empty(f);}
        var r=command(f);r.put("sessions",Arrays.asList((Object)null));error(apply(f,r),400,"VALIDATION_FAILED");r=command(f);r.put("sessions",Collections.nCopies(98,drafts(r).getFirst()));error(apply(f,r),400,"VALIDATION_FAILED");r=command(f);r.remove("conditions");error(apply(f,r),400,"VALIDATION_FAILED");empty(f);
    }
    @Test void explicitBearerIsRequiredAndUnsupportedMethodsRemainDenied()throws Exception{
        var f=fixture();var r=command(f);error(send("POST",APPLY,null,r),401,"AUTHENTICATION_REQUIRED");assertThat(send("POST",APPLY,"bad",r).statusCode()).isEqualTo(401);error(send("GET",RECEIPTS+UUID.randomUUID(),null,null),401,"AUTHENTICATION_REQUIRED");
        for(String method:List.of("GET","PUT","PATCH","DELETE"))error(send(method,APPLY,f.owner.token,null),403,"ACCESS_DENIED");error(send("POST",RECEIPTS+UUID.randomUUID(),f.owner.token,r),403,"ACCESS_DENIED");error(send("GET",RECEIPTS+UUID.randomUUID(),f.owner.token,null),404,"STUDY_PLAN_APPLICATION_NOT_FOUND");empty(f);
    }
    @Test void failedCommandDoesNotConsumeKeyAndCanBeCorrectedExplicitly()throws Exception{
        var f=fixture();var r=command(f);drafts(r).getFirst().put("startsAt","2026-11-02T18:00:00+07:00");error(apply(f,r),409,"STUDY_PLAN_OUTSIDE_AVAILABILITY");noReceipt(f,r);drafts(r).getFirst().put("startsAt","2026-11-02T19:00:00+07:00");assertThat(apply(f,r).statusCode()).isEqualTo(201);
    }
    @Test void concurrentSameKeyReturnsOneCreatedOneReplay()throws Exception{
        var f=fixture();var r=command(f);try(var pool=Executors.newFixedThreadPool(2)){var gate=new CountDownLatch(1);Callable<HttpResponse<String>> work=()->{gate.await();return apply(f,r);};var a=pool.submit(work);var b=pool.submit(work);gate.countDown();var x=a.get(20,TimeUnit.SECONDS);var y=b.get(20,TimeUnit.SECONDS);assertThat(List.of(x.statusCode(),y.statusCode())).containsExactlyInAnyOrder(201,200);assertThat(data(x)).isEqualTo(data(y));}assertThat(rows(f,"study_sessions")).isEqualTo(4);assertThat(rows(f,"study_plan_applications")).isEqualTo(1);
    }
    @Test void concurrentDifferentKeysCannotReserveSameEmptyIntervals()throws Exception{
        var f=fixture();var r=command(f);var q=new HashMap<>(r);q.put("clientRequestId",UUID.randomUUID());try(var pool=Executors.newFixedThreadPool(2)){var gate=new CountDownLatch(1);var a=pool.submit(()->{gate.await();return apply(f,r);});var b=pool.submit(()->{gate.await();return apply(f,q);});gate.countDown();var x=a.get(20,TimeUnit.SECONDS);var y=b.get(20,TimeUnit.SECONDS);assertThat(List.of(x.statusCode(),y.statusCode())).containsExactlyInAnyOrder(201,409);error(x.statusCode()==409?x:y,409,"STUDY_PLAN_TIME_CONFLICT");}assertThat(rows(f,"study_sessions")).isEqualTo(4);assertThat(rows(f,"study_plan_applications")).isEqualTo(1);
    }
    @Test void databaseFailureOnSecondRowRollsBackFirstRowAndReceipt()throws Exception{
        var f=fixture();var r=command(f);drafts(r).get(1).put("title","FAIL_APPLY_QA");jdbc.execute("CREATE FUNCTION fail_apply_row() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'qa constraint' USING ERRCODE='23514'; END $$");jdbc.execute("CREATE TRIGGER fail_apply_row BEFORE INSERT ON study_sessions FOR EACH ROW WHEN (NEW.title='FAIL_APPLY_QA') EXECUTE FUNCTION fail_apply_row()");
        try{error(apply(f,r),409,"DATA_CONFLICT");empty(f);noReceipt(f,r);}finally{jdbc.execute("DROP TRIGGER fail_apply_row ON study_sessions");jdbc.execute("DROP FUNCTION fail_apply_row()");}
        assertThat(apply(f,r).statusCode()).isEqualTo(201);
    }
    @Test void databaseFailureOnReceiptRollsBackAllStudyRows()throws Exception{
        var f=fixture();var r=command(f);jdbc.execute("CREATE FUNCTION fail_apply_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'qa receipt' USING ERRCODE='23514'; END $$");jdbc.execute("CREATE TRIGGER fail_apply_receipt BEFORE INSERT ON study_plan_applications FOR EACH ROW EXECUTE FUNCTION fail_apply_receipt()");
        try{error(apply(f,r),409,"DATA_CONFLICT");empty(f);noReceipt(f,r);}finally{jdbc.execute("DROP TRIGGER fail_apply_receipt ON study_plan_applications");jdbc.execute("DROP FUNCTION fail_apply_receipt()");}
        assertThat(apply(f,r).statusCode()).isEqualTo(201);
    }
    void awaitBlocked(int pid)throws Exception{long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(5);while(System.nanoTime()<end){if(jdbc.queryForObject("SELECT count(*) FROM pg_stat_activity WHERE ?=ANY(pg_blocking_pids(pid))",Integer.class,pid)>0)return;Thread.sleep(20);}fail("Writer did not reach owner lock");}
    @Test void readsCommittedBusyRowsAfterWaitingForAcademicOwnerLock()throws Exception{
        var f=fixture();var r=command(f,one(f));try(var connection=DriverManager.getConnection(URL+(URL.contains("?")?"&":"?")+"currentSchema="+SCHEMA,USER,PASSWORD);var pool=Executors.newSingleThreadExecutor()){
            connection.setAutoCommit(false);int pid;try(var s=connection.createStatement();var rs=s.executeQuery("SELECT pg_backend_pid()")){rs.next();pid=rs.getInt(1);}try(var s=connection.prepareStatement("SELECT id FROM app_users WHERE id=? FOR UPDATE")){s.setObject(1,f.owner.id);s.executeQuery().close();}
            var result=pool.submit(()->apply(f,r));awaitBlocked(pid);
            try(var s=connection.prepareStatement("INSERT INTO study_sessions(id,user_id,course_id,title,starts_at,ends_at,time_zone,duration_minutes) VALUES (?,?,?,'Concurrent academic writer','2026-11-02T12:00:00Z','2026-11-02T13:00:00Z','Asia/Ho_Chi_Minh',60)")){s.setObject(1,UUID.randomUUID());s.setObject(2,f.owner.id);s.setObject(3,UUID.fromString(f.course.get("id").toString()));s.executeUpdate();}connection.commit();error(result.get(20,TimeUnit.SECONDS),409,"STUDY_PLAN_TIME_CONFLICT");
        }assertThat(rows(f,"study_sessions")).isEqualTo(1);assertThat(rows(f,"study_plan_applications")).isZero();
    }
    @Test void samplesClockAfterWaitingForLockSoAStaleNowCannotSavePastSessions()throws Exception{
        var f=fixture();var r=command(f,one(f));try(var connection=DriverManager.getConnection(URL+(URL.contains("?")?"&":"?")+"currentSchema="+SCHEMA,USER,PASSWORD);var pool=Executors.newSingleThreadExecutor()){
            connection.setAutoCommit(false);int pid;try(var s=connection.createStatement();var rs=s.executeQuery("SELECT pg_backend_pid()")){rs.next();pid=rs.getInt(1);}try(var s=connection.prepareStatement("SELECT id FROM app_users WHERE id=? FOR UPDATE")){s.setObject(1,f.owner.id);s.executeQuery().close();}var result=pool.submit(()->apply(f,r));awaitBlocked(pid);WHEN.set(Instant.parse("2026-11-02T12:00:00.000001Z"));connection.commit();error(result.get(20,TimeUnit.SECONDS),409,"STUDY_PLAN_IN_PAST");
        }empty(f);
    }
    @Test void gapOrAmbiguousAvailabilityBoundaryCannotBeBypassedWithAnOffset()throws Exception{
        var f=fixture();for(var spec:List.of(List.of("2027-03-14","02:15","03:45","2027-03-14T07:00:00Z"),List.of("2027-11-07","01:00","03:00","2027-11-07T06:00:00Z"))){var r=command(f,one(f));@SuppressWarnings("unchecked") var c=(Map<String,Object>)r.get("conditions");c.put("fromDate",spec.get(0));c.put("toDate",spec.get(0));c.put("timeZone","America/New_York");c.put("availableStart",spec.get(1));c.put("availableEnd",spec.get(2));drafts(r).getFirst().put("startsAt",spec.get(3));error(apply(f,r),409,"STUDY_PLAN_OUTSIDE_AVAILABILITY");empty(f);}
    }
    @Test void explicitInstantDuringFallbackKeepsRealElapsedMinutes()throws Exception{
        var f=fixture();var r=command(f,one(f));@SuppressWarnings("unchecked") var c=(Map<String,Object>)r.get("conditions");c.put("fromDate","2027-11-07");c.put("toDate","2027-11-07");c.put("timeZone","America/New_York");c.put("availableStart","00:00");c.put("availableEnd","03:00");c.put("totalMinutes",60);drafts(r).getFirst().put("startsAt","2027-11-07T05:30:00Z");drafts(r).getFirst().put("durationMinutes",60);var p=data(apply(f,r));assertThat(saved(p,0).get("endsAt")).isEqualTo("2027-11-07T06:30:00Z");assertThat(number(p,"savedMinutes")).isEqualTo(60);
    }
    @Test void halfHourZoneAndFinalSmallRemainderRemainSaveable()throws Exception{
        var f=fixture();var c=one(f);c.put("timeZone","Australia/Darwin");c.put("totalMinutes",46);var r=command(f,c);var p=data(apply(f,r));assertThat(number(p,"savedMinutes")).isEqualTo(46);assertThat(number(saved(p,1),"durationMinutes")).isEqualTo(1);
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershellPrepareApplyGetAndRetryPreserveKeyWithoutLeakingCredentials()throws Exception{
        var f=fixture();var dir=java.nio.file.Files.createTempDirectory(Path.of(".local"),"plan-apply-test-");var file=dir.resolve("request.json");
        try{assertThat(runApplyPowerShell(f,file,"Prepare",0)).contains("CHƯA LƯU");empty(f);var request=json.readValue(java.nio.file.Files.readString(file,StandardCharsets.UTF_8).replace("\uFEFF",""),Map.class);assertThat(request.get("clientRequestId")).isNotNull();
            assertThat(runApplyPowerShell(f,file,"Apply",0)).contains("180","savedMinutes");assertThat(runApplyPowerShell(f,file,"Get",0)).contains("không ghi thêm");assertThat(runApplyPowerShell(f,file,"Apply",0)).contains("180");assertThat(rows(f,"study_sessions")).isEqualTo(4);assertThat(rows(f,"study_plan_applications")).isEqualTo(1);assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL",Long.class,f.owner.id)).isEqualTo(1);
        }finally{java.nio.file.Files.deleteIfExists(file);java.nio.file.Files.deleteIfExists(dir);}
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershellApplyConflictKeepsRequestFileAndDoesNotReportSuccess()throws Exception{
        var f=fixture();var dir=java.nio.file.Files.createTempDirectory(Path.of(".local"),"plan-apply-test-");var file=dir.resolve("request.json");
        try{runApplyPowerShell(f,file,"Prepare",0);var bytes=java.nio.file.Files.readAllBytes(file);study(f,"2026-11-02T19:00:00+07:00",45);assertThat(runApplyPowerShell(f,file,"Apply",1)).contains("STUDY_PLAN_TIME_CONFLICT");assertThat(java.nio.file.Files.readAllBytes(file)).isEqualTo(bytes);assertThat(rows(f,"study_sessions")).isEqualTo(1);assertThat(rows(f,"study_plan_applications")).isZero();assertThat(runApplyPowerShell(f,file,"Get",1)).contains("STUDY_PLAN_APPLICATION_NOT_FOUND");
        }finally{java.nio.file.Files.deleteIfExists(file);java.nio.file.Files.deleteIfExists(dir);}
    }
    String runApplyPowerShell(Fixture f,Path file,String mode,int expected)throws Exception{
        String ps=Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","powershell.exe").toString();
        String command="[Console]::OutputEncoding=[Text.UTF8Encoding]::new();function Read-Host {param([string]$Prompt,[switch]$AsSecureString);if($AsSecureString){ConvertTo-SecureString $env:PLAN_PASSWORD -AsPlainText -Force}else{$env:PLAN_EMAIL}};& './scripts/Try-StudyPlanApply.ps1' -BaseUrl 'http://127.0.0.1:"+port+"' -Mode '"+mode+"' -RequestFile '"+file.toAbsolutePath().toString().replace("'","''")+"' -CourseId '"+f.course.get("id")+"' -FromDate '2026-11-02' -ToDate '2026-11-03'";
        var builder=new ProcessBuilder(ps,"-NoProfile","-ExecutionPolicy","Bypass","-Command",command).redirectErrorStream(true);builder.environment().keySet().removeIf(n->n.equalsIgnoreCase("PSModulePath"));builder.environment().put("PSModulePath",Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","Modules").toString());builder.environment().put("PLAN_EMAIL",f.owner.email);builder.environment().put("PLAN_PASSWORD",SECRET);
        var process=builder.start();var output=CompletableFuture.supplyAsync(()->{try{return new String(process.getInputStream().readAllBytes(),StandardCharsets.UTF_8);}catch(java.io.IOException e){throw new java.io.UncheckedIOException(e);}});
        try{assertThat(process.waitFor(40,TimeUnit.SECONDS)).isTrue();var text=output.get(5,TimeUnit.SECONDS);assertThat(process.exitValue()).as(text).isEqualTo(expected);assertThat(text).doesNotContain(SECRET,"accessToken","refreshToken");return text;}finally{if(process.isAlive())process.destroyForcibly();}
    }
    @Test void additiveMigrationFromV12PreservesExistingAcademicData()throws Exception{
        var f=fixture();var r=command(f);data(apply(f,r));String schema="backend_it_"+UUID.randomUUID().toString().replace("-","");
        try{Flyway.configure().dataSource(URL,USER,PASSWORD).schemas(schema).defaultSchema(schema).target("12").load().migrate();
            for(String table:List.of("app_users","semesters","courses","study_sessions"))jdbc.execute("INSERT INTO "+schema+"."+table+" SELECT * FROM "+SCHEMA+"."+table+" WHERE "+(table.equals("app_users")?"id":"user_id")+"='"+f.owner.id+"'");
            Flyway.configure().dataSource(URL,USER,PASSWORD).schemas(schema).defaultSchema(schema).load().migrate();assertThat(jdbc.queryForObject("SELECT count(*) FROM "+schema+".study_sessions",Long.class)).isEqualTo(4);assertThat(jdbc.queryForObject("SELECT count(*) FROM "+schema+".study_plan_applications",Long.class)).isZero();assertThat(jdbc.queryForObject("SELECT max(version::int) FROM "+schema+".flyway_schema_history WHERE success AND version IS NOT NULL",Integer.class)).isEqualTo(13);
        }finally{if(!schema.matches("backend_it_[a-f0-9]{32}"))throw new IllegalStateException("Unsafe schema");jdbc.execute("DROP SCHEMA IF EXISTS "+schema+" CASCADE");}
    }
}
