package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import com.focusstudy.notifications.*;
import com.focusstudy.users.UserRepository;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.*;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.*;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(NotificationReadIntegrationTests.ClockFixture.class)
@DirtiesContext
class NotificationReadIntegrationTests {
    private static final String SCHEMA="backend_it_"+UUID.randomUUID().toString().replace("-","");
    private static final String URL=Objects.requireNonNull(System.getenv("TEST_DB_URL")),USER=System.getenv("TEST_DB_USER"),PASSWORD=System.getenv("TEST_DB_PASSWORD");
    private static final String ROOT="/api/v1/notification-read-states",SECRET="Notification7b1!Test";
    private static final Instant BASE=Instant.parse("2026-10-30T00:00:00Z");
    private static final AtomicReference<Instant> WHEN=new AtomicReference<>(BASE);
    @TestConfiguration(proxyBeanMethods=false) static class ClockFixture {
        @Bean @Primary NotificationReadService testedNotificationService(NotificationReadRepository rows,UserRepository users) {
            var clock=new Clock(){ public ZoneId getZone(){return ZoneOffset.UTC;} public Clock withZone(ZoneId z){return Clock.fixed(instant(),z);} public Instant instant(){return WHEN.get();} };
            return new NotificationReadService(rows,users,clock);
        }
    }
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired PlatformTransactionManager transactions;
    private final HttpClient client=HttpClient.newHttpClient();
    record Account(UUID id,String email,String token) { }
    record Fixture(Account owner,UUID course,UUID task,UUID exam,UUID schedule) { }
    @BeforeEach void resetClock(){WHEN.set(BASE);}
    @DynamicPropertySource static void configure(DynamicPropertyRegistry r) {
        TestJwtResources.configure(r);
        r.add("spring.datasource.url",()->URL+(URL.contains("?")?"&":"?")+"currentSchema="+SCHEMA);
        r.add("spring.datasource.username",()->USER); r.add("spring.datasource.password",()->PASSWORD);
        r.add("spring.flyway.default-schema",()->SCHEMA);r.add("spring.flyway.schemas",()->SCHEMA);
        for(String route:List.of("login","register","refresh","logout"))r.add("app.auth.rate-limit."+route+"-per-minute",()->1000);
    }
    @AfterAll static void cleanup()throws Exception {
        if(!SCHEMA.matches("backend_it_[a-f0-9]{32}"))throw new IllegalStateException("Unsafe schema");
        try(var c=DriverManager.getConnection(URL,USER,PASSWORD);var s=c.createStatement()){s.execute("DROP SCHEMA IF EXISTS "+SCHEMA+" CASCADE");}
    }
    HttpResponse<String> send(String method,String path,String token,Object input)throws Exception {
        var b=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).timeout(Duration.ofSeconds(15));
        if(token!=null)b.header("Authorization","Bearer "+token);
        if(input!=null)b.header("Content-Type","application/json");
        return client.send(b.method(method,input==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(input))).build(),HttpResponse.BodyHandlers.ofString());
    }
    Map<?,?> data(HttpResponse<String> r){assertThat(r.statusCode()).as(r.body()).isEqualTo(200);return (Map<?,?>)json.readValue(r.body(),Map.class).get("data");}
    List<Map<?,?>> items(HttpResponse<String> r){return ((List<?>)data(r).get("items")).stream().<Map<?,?>>map(x->(Map<?,?>)x).toList();}
    void error(HttpResponse<String> r,int code,String name){assertThat(r.statusCode()).as(r.body()).isEqualTo(code);assertThat(json.readValue(r.body(),Map.class).get("code")).isEqualTo(name);assertThat(r.body()).doesNotContain(SECRET,"SELECT ","org.hibernate","password_hash");}
    Account account()throws Exception {
        String email="receipt-"+UUID.randomUUID()+"@example.test";
        var r=send("POST","/api/v1/auth/register",null,Map.of("email",email,"fullName","Kiểm thử thông báo","password",SECRET,"confirmPassword",SECRET));
        assertThat(r.statusCode()).isEqualTo(201);var u=(Map<?,?>)json.readValue(r.body(),Map.class).get("data");
        return new Account(UUID.fromString(u.get("id").toString()),email,login(email));
    }
    String login(String email)throws Exception{return data(send("POST","/api/v1/auth/login",null,Map.of("email",email,"password",SECRET))).get("accessToken").toString();}
    Fixture fixture()throws Exception {
        var a=account();UUID semester=UUID.randomUUID(),course=UUID.randomUUID(),task=UUID.randomUUID(),exam=UUID.randomUUID(),schedule=UUID.randomUUID();
        jdbc.update("INSERT INTO semesters(id,user_id,term,start_year) VALUES (?,?,1,2026)",semester,a.id);
        jdbc.update("INSERT INTO courses(id,user_id,semester_id,code,name,credits) VALUES (?,?,?,'JAVA','Lập trình Java',3)",course,a.id,semester);
        jdbc.update("INSERT INTO assignments(id,user_id,course_id,title,due_at,notes) VALUES (?,?,?,'Bài kiểm thử',?,'PRIVATE NOTES')",task,a.id,course,java.sql.Timestamp.from(BASE.plusSeconds(86400)));
        jdbc.update("INSERT INTO exams(id,user_id,course_id,kind,format,starts_at,ends_at,time_zone) VALUES (?,?,?,'FINAL','WRITTEN','2026-11-01T01:00:00Z','2026-11-01T03:00:00Z','Asia/Ho_Chi_Minh')",exam,a.id,course);
        jdbc.update("INSERT INTO class_schedules(id,user_id,course_id,weekday_mask,starts_on,ends_on,start_time,end_time,time_zone) VALUES (?,?,?,127,'2026-10-30','2026-11-02','08:00','10:00','Asia/Ho_Chi_Minh')",schedule,a.id,course);
        return new Fixture(a,course,task,exam,schedule);
    }
    Map<String,Object> target(String kind,UUID id,String date){var t=new LinkedHashMap<String,Object>();t.put("kind",kind);t.put("sourceId",id.toString());if(date!=null)t.put("occurrenceDate",date);return t;}
    Map<String,Object> task(Fixture f){return target("ASSIGNMENT",f.task,null);}
    Map<String,Object> exam(Fixture f){return target("EXAM",f.exam,null);}
    Map<String,Object> lesson(Fixture f,String date){return target("CLASS",f.schedule,date);}
    HttpResponse<String> query(Account a,List<?> targets)throws Exception{return send("POST",ROOT+"/query",a.token,Map.of("targets",targets));}
    Map<?,?> state(Account a,Map<?,?> target)throws Exception{return items(query(a,List.of(target))).getFirst();}
    Map<String,Object> readItem(Map<?,?> state){return Map.of("target",state.get("target"),"revision",state.get("revision"));}
    HttpResponse<String> mark(Account a,Map<?,?> state)throws Exception{return send("PUT",ROOT,a.token,Map.of("items",List.of(readItem(state))));}
    long count(Account a){return jdbc.queryForObject("SELECT count(*) FROM notification_read_states WHERE user_id=?",Long.class,a.id);}

    @Test void emptyQueryDoesNotWriteOrSeedAnything()throws Exception {
        var a=account();assertThat(items(query(a,List.of()))).isEmpty();assertThat(count(a)).isZero();
    }
    @Test void queryReturnsOpaqueCurrentRevisionAndNeverPrivateContent()throws Exception {
        var f=fixture();var r=query(f.owner,List.of(task(f)));var s=items(r).getFirst();
        assertThat(s.get("available")).isEqualTo(true);assertThat(s.get("read")).isEqualTo(false);assertThat(s.get("readAt")).isNull();
        assertThat(s.get("revision").toString()).matches("[a-f0-9]{64}");assertThat(count(f.owner)).isZero();
        assertThat(r.body()).doesNotContain("PRIVATE NOTES","Lập trình Java","Bài kiểm thử",f.owner.email);
        assertThat(r.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
    }
    @Test void receiptSurvivesFreshLoginAndIndependentDatabaseConnection()throws Exception {
        var f=fixture();var s=state(f.owner,task(f));var r=mark(f.owner,s);assertThat(items(r).getFirst().get("read")).isEqualTo(true);
        var again=new Account(f.owner.id,f.owner.email,login(f.owner.email));assertThat(state(again,task(f)).get("read")).isEqualTo(true);
        try(var c=DriverManager.getConnection(URL,USER,PASSWORD);var p=c.prepareStatement("SELECT revision FROM "+SCHEMA+".notification_read_states WHERE user_id=?")) {
            p.setObject(1,f.owner.id);try(var rows=p.executeQuery()){assertThat(rows.next()).isTrue();assertThat(rows.getString(1)).isEqualTo(s.get("revision"));}
        }
    }
    @Test void retryIsIdempotentAndKeepsOriginalReadTime()throws Exception {
        var f=fixture();var s=state(f.owner,task(f));var first=items(mark(f.owner,s)).getFirst();WHEN.set(BASE.plusSeconds(120));
        var second=items(mark(f.owner,s)).getFirst();assertThat(second.get("readAt")).isEqualTo(first.get("readAt"));assertThat(count(f.owner)).isEqualTo(1);
    }
    @Test void deadlineUpdateViaRealAssignmentApiMakesOldReadAndWriteStale()throws Exception {
        var f=fixture();var old=state(f.owner,task(f));mark(f.owner,old);
        var input=new HashMap<String,Object>(Map.of("courseId",f.course,"title","Bài kiểm thử","dueAt",BASE.plusSeconds(2*86400).toString(),"priority","MEDIUM","status","TODO","notes","PRIVATE NOTES","version",0));
        data(send("PUT","/api/v1/assignments/"+f.task,f.owner.token,input));
        var fresh=state(f.owner,task(f));assertThat(fresh.get("revision")).isNotEqualTo(old.get("revision"));assertThat(fresh.get("read")).isEqualTo(false);assertThat(fresh.get("readAt")).isNull();
        error(mark(f.owner,old),409,"NOTIFICATION_REVISION_CONFLICT");assertThat(state(f.owner,task(f)).get("read")).isEqualTo(false);
        assertThat(items(mark(f.owner,fresh)).getFirst().get("read")).isEqualTo(true);assertThat(count(f.owner)).isEqualTo(1);
    }
    @Test void completedAssignmentIsUnavailableAndReopeningWithNewVersionIsUnread()throws Exception {
        var f=fixture();var old=state(f.owner,task(f));mark(f.owner,old);
        jdbc.update("UPDATE assignments SET status='COMPLETED',version=version+1 WHERE id=?",f.task);
        var hidden=state(f.owner,task(f));assertThat(hidden.get("available")).isEqualTo(false);assertThat(hidden.get("revision")).isNull();assertThat(hidden.get("readAt")).isNull();
        error(mark(f.owner,old),404,"NOTIFICATION_SOURCE_UNAVAILABLE");
        jdbc.update("UPDATE assignments SET status='TODO',version=version+1 WHERE id=?",f.task);assertThat(state(f.owner,task(f)).get("read")).isEqualTo(false);
    }
    @Test void courseRenameInvalidatesAllKindsButColorChangeDoesNot()throws Exception {
        var f=fixture();var targets=List.of(task(f),exam(f),lesson(f,"2026-10-30"));var original=items(query(f.owner,targets));
        data(send("PUT",ROOT,f.owner.token,Map.of("items",original.stream().map(this::readItem).toList())));
        jdbc.update("UPDATE courses SET color='mint',version=version+1 WHERE id=?",f.course);
        assertThat(items(query(f.owner,targets))).allSatisfy(x->assertThat(x.get("read")).isEqualTo(true));
        jdbc.update("UPDATE courses SET name='Tên mới',version=version+1 WHERE id=?",f.course);
        assertThat(items(query(f.owner,targets))).allSatisfy(x->assertThat(x.get("read")).isEqualTo(false));
    }
    @Test void basisLetsClientDetectSourceOrMetadataNewerThanItsDisplayedContent()throws Exception {
        var f=fixture();var old=state(f.owner,task(f));
        assertThat(old.get("basis")).isEqualTo(Map.of("sourceVersion",0,"courseVersion",0,"semesterVersion",0));
        jdbc.update("UPDATE assignments SET version=version+1 WHERE id=?",f.task);
        jdbc.update("UPDATE courses SET version=version+2 WHERE id=?",f.course);
        jdbc.update("UPDATE semesters SET version=version+3 WHERE id=(SELECT semester_id FROM courses WHERE id=?)",f.course);
        assertThat(state(f.owner,task(f)).get("basis")).isEqualTo(Map.of("sourceVersion",1,"courseVersion",2,"semesterVersion",3));
    }
    @Test void eachClassDateHasIndependentStateAndResultOrderIsPreserved()throws Exception {
        var f=fixture();var a=lesson(f,"2026-10-30");var b=lesson(f,"2026-10-31");mark(f.owner,state(f.owner,a));
        var rows=items(query(f.owner,List.of(b,exam(f),a,task(f))));
        assertThat(rows.get(0).get("read")).isEqualTo(false);assertThat(rows.get(2).get("read")).isEqualTo(true);
        assertThat(rows.get(0).get("target")).isEqualTo(b);assertThat(rows.get(2).get("target")).isEqualTo(a);
    }
    @Test void changingAnotherClassDateDoesNotInvalidateUnchangedLesson()throws Exception {
        var f=fixture();var friday=state(f.owner,lesson(f,"2026-10-30"));var saturday=state(f.owner,lesson(f,"2026-10-31"));mark(f.owner,friday);mark(f.owner,saturday);
        data(send("PUT","/api/v1/class-schedules/"+f.schedule+"/exceptions/2026-10-31",f.owner.token,Map.of("kind","CHANGED","room","B202","reason","Đổi phòng","scheduleVersion",0)));
        assertThat(state(f.owner,lesson(f,"2026-10-30")).get("read")).isEqualTo(true);
        assertThat(state(f.owner,lesson(f,"2026-10-31")).get("read")).isEqualTo(false);error(mark(f.owner,saturday),409,"NOTIFICATION_REVISION_CONFLICT");
    }
    @Test void cancelledClassIsUnavailableWithoutAffectingOtherDates()throws Exception {
        var f=fixture();var old=state(f.owner,lesson(f,"2026-10-30"));mark(f.owner,old);
        data(send("PUT","/api/v1/class-schedules/"+f.schedule+"/exceptions/2026-10-30",f.owner.token,Map.of("kind","CANCELLED","reason","Nghỉ học","scheduleVersion",0)));
        assertThat(state(f.owner,lesson(f,"2026-10-30")).get("available")).isEqualTo(false);
        assertThat(state(f.owner,lesson(f,"2026-10-31")).get("available")).isEqualTo(true);error(mark(f.owner,old),404,"NOTIFICATION_SOURCE_UNAVAILABLE");
    }
    @Test void classMustBeInRuleRangeAndMatchWeekday()throws Exception {
        var f=fixture();jdbc.update("UPDATE class_schedules SET weekday_mask=16 WHERE id=?",f.schedule);
        for(String date:List.of("2026-10-29","2026-10-31","2026-11-03"))assertThat(state(f.owner,lesson(f,date)).get("available")).isEqualTo(false);
        assertThat(state(f.owner,lesson(f,"2026-10-30")).get("available")).isEqualTo(true);
    }
    @Test void expiryUsesSourceTimeZoneAndExactEndBoundary()throws Exception {
        var f=fixture();var t=lesson(f,"2026-10-30");WHEN.set(Instant.parse("2026-10-30T02:59:59.999999Z"));assertThat(state(f.owner,t).get("available")).isEqualTo(true);
        WHEN.set(Instant.parse("2026-10-30T03:00:00Z"));assertThat(state(f.owner,t).get("available")).isEqualTo(false);
        WHEN.set(Instant.parse("2026-11-01T03:00:00Z"));assertThat(state(f.owner,exam(f)).get("available")).isEqualTo(false);
    }
    @Test void disabledExamReminderIsUnavailable()throws Exception {
        var f=fixture();var old=state(f.owner,exam(f));jdbc.update("UPDATE exams SET reminder=false,reminder_minutes=ARRAY[]::integer[] WHERE id=?",f.exam);
        assertThat(state(f.owner,exam(f)).get("available")).isEqualTo(false);error(mark(f.owner,old),404,"NOTIFICATION_SOURCE_UNAVAILABLE");
    }
    @Test void newExamMilestoneIsUnreadAndRejectsOldMilestoneWriteWithoutVersionChange()throws Exception {
        var f=fixture();WHEN.set(Instant.parse("2026-10-31T01:00:00Z"));var old=state(f.owner,exam(f));mark(f.owner,old);
        assertThat(((Map<?,?>)old.get("basis")).get("milestoneMinutes")).isEqualTo(1440);
        WHEN.set(Instant.parse("2026-10-31T22:00:00Z"));var next=state(f.owner,exam(f));
        assertThat(next.get("read")).isEqualTo(false);assertThat(((Map<?,?>)next.get("basis")).get("milestoneMinutes")).isEqualTo(180);
        assertThat(((Map<?,?>)next.get("basis")).get("sourceVersion")).isEqualTo(0);
        error(mark(f.owner,old),409,"NOTIFICATION_REVISION_CONFLICT");assertThat(items(mark(f.owner,next)).getFirst().get("read")).isEqualTo(true);
    }
    @Test void examMilestoneRemainsReadAcrossMinuteTicksAndStartIfZeroNotConfigured()throws Exception {
        var f=fixture();WHEN.set(Instant.parse("2026-10-31T22:00:00Z"));var old=state(f.owner,exam(f));mark(f.owner,old);
        WHEN.set(Instant.parse("2026-11-01T01:01:00Z"));var next=state(f.owner,exam(f));
        assertThat(next.get("read")).isEqualTo(true);assertThat(next.get("revision")).isEqualTo(old.get("revision"));
    }
    @Test void zeroMilestoneStartsExactlyAtExamStartAndIsUnreadAgain()throws Exception {
        var f=fixture();jdbc.update("UPDATE exams SET reminder_minutes=ARRAY[180,0] WHERE id=?",f.exam);
        WHEN.set(Instant.parse("2026-11-01T00:59:59.999999Z"));var old=state(f.owner,exam(f));mark(f.owner,old);
        WHEN.set(Instant.parse("2026-11-01T01:00:00Z"));var next=state(f.owner,exam(f));
        assertThat(next.get("read")).isEqualTo(false);assertThat(((Map<?,?>)next.get("basis")).get("milestoneMinutes")).isEqualTo(0);
        error(mark(f.owner,old),409,"NOTIFICATION_REVISION_CONFLICT");
    }
    @Test void markingObservedBatchDoesNotMarkNewlyCreatedReminder()throws Exception {
        var f=fixture();var observed=items(query(f.owner,List.of(task(f),exam(f),lesson(f,"2026-10-30"))));
        UUID extra=UUID.randomUUID();jdbc.update("INSERT INTO assignments(id,user_id,course_id,title,due_at) VALUES (?,?,?,'Vừa tạo','2026-11-01T00:00:00Z')",extra,f.owner.id,f.course);
        var r=send("PUT",ROOT,f.owner.token,Map.of("items",observed.stream().map(this::readItem).toList()));assertThat(items(r)).allSatisfy(x->assertThat(x.get("read")).isEqualTo(true));
        assertThat(state(f.owner,target("ASSIGNMENT",extra,null)).get("read")).isEqualTo(false);assertThat(count(f.owner)).isEqualTo(3);
    }
    @Test void staleMemberRejectsWholeBatchWithoutPartialWrites()throws Exception {
        var f=fixture();var rows=items(query(f.owner,List.of(task(f),exam(f))));jdbc.update("UPDATE exams SET room='Mới',version=version+1 WHERE id=?",f.exam);
        error(send("PUT",ROOT,f.owner.token,Map.of("items",rows.stream().map(this::readItem).toList())),409,"NOTIFICATION_REVISION_CONFLICT");assertThat(count(f.owner)).isZero();
    }
    @Test void unavailableMemberRejectsWholeBatchWithoutPartialWrites()throws Exception {
        var f=fixture();var rows=items(query(f.owner,List.of(task(f),exam(f))));jdbc.update("DELETE FROM exams WHERE id=?",f.exam);
        error(send("PUT",ROOT,f.owner.token,Map.of("items",rows.stream().map(this::readItem).toList())),404,"NOTIFICATION_SOURCE_UNAVAILABLE");assertThat(count(f.owner)).isZero();
    }
    @Test void foreignAndMissingReferencesAreIndistinguishableAndCannotBeMarked()throws Exception {
        var f=fixture();var b=account();var own=state(f.owner,task(f));mark(f.owner,own);
        var foreign=state(b,task(f));var missing=state(b,target("ASSIGNMENT",UUID.randomUUID(),null));
        for(var s:List.of(foreign,missing)){assertThat(s.get("available")).isEqualTo(false);assertThat(s.get("read")).isEqualTo(false);assertThat(s.get("revision")).isNull();assertThat(s.get("readAt")).isNull();}
        error(mark(b,own),404,"NOTIFICATION_SOURCE_UNAVAILABLE");assertThat(count(b)).isZero();assertThat(state(f.owner,task(f)).get("read")).isEqualTo(true);
    }
    @Test void queryOwnerParameterCannotSelectAnotherAccount()throws Exception {
        var f=fixture();var b=account();var s=state(f.owner,task(f));mark(f.owner,s);
        var r=send("POST",ROOT+"/query?userId="+f.owner.id,b.token,Map.of("targets",List.of(task(f)),"userId",f.owner.id));assertThat(items(r).getFirst().get("available")).isEqualTo(false);
    }
    @ParameterizedTest @ValueSource(strings={"2026-02-30","2026-1-01","1899-12-31","2100-01-01","2026-10-30T00:00:00Z",""})
    void invalidClassDateFailsInsteadOfZeroState(String date)throws Exception {
        var a=account();error(query(a,List.of(target("CLASS",UUID.randomUUID(),date))),400,"INVALID_NOTIFICATION_TARGET");assertThat(count(a)).isZero();
    }
    @Test void missingClassDateAndNonClassDateAreRejected()throws Exception {
        var f=fixture();error(query(f.owner,List.of(target("CLASS",f.schedule,null))),400,"INVALID_NOTIFICATION_TARGET");
        error(query(f.owner,List.of(target("ASSIGNMENT",f.task,"2026-10-30"))),400,"INVALID_NOTIFICATION_TARGET");
    }
    @Test void duplicateKeysAreRejectedIncludingMarkBatch()throws Exception {
        var f=fixture();var t=task(f);error(query(f.owner,List.of(t,t)),400,"INVALID_NOTIFICATION_TARGET");var s=state(f.owner,t);
        error(send("PUT",ROOT,f.owner.token,Map.of("items",List.of(readItem(s),readItem(s)))),400,"INVALID_NOTIFICATION_TARGET");assertThat(count(f.owner)).isZero();
    }
    @Test void nestedValidationRejectsNullKeysBadKindsAndBadRevisions()throws Exception {
        var f=fixture();
        for(Object input:List.of(Map.of("targets",Arrays.asList((Object)null)),Map.of("targets",List.of(Map.of("kind","ASSIGNMENT"))),Map.of("targets",List.of(Map.of("kind","INVALID","sourceId",f.task.toString())))))
            assertThat(send("POST",ROOT+"/query",f.owner.token,input).statusCode()).isEqualTo(400);
        for(String rev:List.of("","f".repeat(63),"G".repeat(64),"<script>"))error(send("PUT",ROOT,f.owner.token,Map.of("items",List.of(Map.of("target",task(f),"revision",rev)))),400,"VALIDATION_FAILED");
        error(send("PUT",ROOT,f.owner.token,Map.of("items",List.of())),400,"VALIDATION_FAILED");assertThat(count(f.owner)).isZero();
    }
    @Test void batchLimitAccepts200AndRejects201()throws Exception {
        var f=fixture();var refs=new ArrayList<Map<String,Object>>();refs.add(task(f));
        for(int i=1;i<200;i++){UUID id=UUID.randomUUID();jdbc.update("INSERT INTO assignments(id,user_id,course_id,title,due_at) VALUES (?,?,?,'Bài','2026-11-01T00:00:00Z')",id,f.owner.id,f.course);refs.add(target("ASSIGNMENT",id,null));}
        var states=items(query(f.owner,refs));assertThat(states).hasSize(200);
        assertThat(items(send("PUT",ROOT,f.owner.token,Map.of("items",states.stream().map(this::readItem).toList())))).hasSize(200);assertThat(count(f.owner)).isEqualTo(200);
        refs.add(target("ASSIGNMENT",UUID.randomUUID(),null));error(query(f.owner,refs),400,"VALIDATION_FAILED");
        var tooMany=new ArrayList<>(states.stream().map(this::readItem).toList());tooMany.add(readItem(states.getFirst()));error(send("PUT",ROOT,f.owner.token,Map.of("items",tooMany)),400,"VALIDATION_FAILED");
    }
    @Test void authAndMethodAllowListAreEnforced()throws Exception {
        error(send("POST",ROOT+"/query",null,Map.of("targets",List.of())),401,"AUTHENTICATION_REQUIRED");
        error(send("PUT",ROOT,null,Map.of("items",List.of())),401,"AUTHENTICATION_REQUIRED");
        assertThat(send("POST",ROOT+"/query","bad",Map.of("targets",List.of())).statusCode()).isEqualTo(401);
        var a=account();for(String method:List.of("GET","POST","DELETE","PATCH"))error(send(method,ROOT,a.token,null),403,"ACCESS_DENIED");
    }
    @Test void queryingAndMarkingDoNotChangeAcademicRowsOrVersions()throws Exception {
        var f=fixture();var before=jdbc.queryForMap("SELECT * FROM assignments WHERE id=?",f.task);
        var s=state(f.owner,task(f));mark(f.owner,s);state(f.owner,task(f));assertThat(jdbc.queryForMap("SELECT * FROM assignments WHERE id=?",f.task)).isEqualTo(before);
    }
    @Test void parallelSameRevisionIsIdempotentAndReadTimeAgrees()throws Exception {
        var f=fixture();var s=state(f.owner,task(f));
        try(var pool=Executors.newVirtualThreadPerTaskExecutor()) {
            var a=pool.submit(()->items(mark(f.owner,s)).getFirst());var b=pool.submit(()->items(mark(f.owner,s)).getFirst());
            assertThat(a.get(15,TimeUnit.SECONDS).get("readAt")).isEqualTo(b.get(15,TimeUnit.SECONDS).get("readAt"));assertThat(count(f.owner)).isEqualTo(1);
        }
    }
    @Test void receiptWaitsForAcademicOwnerLockThenDetectsNewRevision()throws Exception {
        var f=fixture();var old=state(f.owner,task(f));var locked=new CountDownLatch(1);var release=new CountDownLatch(1);
        try(var pool=Executors.newVirtualThreadPerTaskExecutor()) {
            var writer=pool.submit(()->new TransactionTemplate(transactions).execute(status->{jdbc.queryForObject("SELECT id FROM app_users WHERE id=? FOR UPDATE",UUID.class,f.owner.id);locked.countDown();try{if(!release.await(5,TimeUnit.SECONDS))throw new IllegalStateException("Timeout");}catch(InterruptedException ex){throw new RuntimeException(ex);}jdbc.update("UPDATE assignments SET title='Mới',version=version+1 WHERE id=?",f.task);return null;}));
            assertThat(locked.await(5,TimeUnit.SECONDS)).isTrue();var reader=pool.submit(()->mark(f.owner,old));
            try{assertThatThrownBy(()->reader.get(150,TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);}finally{release.countDown();}
            writer.get(10,TimeUnit.SECONDS);error(reader.get(10,TimeUnit.SECONDS),409,"NOTIFICATION_REVISION_CONFLICT");assertThat(count(f.owner)).isZero();
        }finally{release.countDown();}
    }
    @Test void deletingSourcesViaApisCascadesOnlyTheirReceipts()throws Exception {
        var f=fixture();for(var t:List.of(task(f),exam(f),lesson(f,"2026-10-30")))mark(f.owner,state(f.owner,t));assertThat(count(f.owner)).isEqualTo(3);
        for(var pair:List.of(Map.entry("assignments",f.task),Map.entry("exams",f.exam),Map.entry("class-schedules",f.schedule))) {
            assertThat(send("DELETE","/api/v1/"+pair.getKey()+"/"+pair.getValue()+"?version=0",f.owner.token,null).statusCode()).isEqualTo(204);
        }
        assertThat(count(f.owner)).isZero();assertThat(state(f.owner,task(f)).get("available")).isEqualTo(false);
    }
    @Test void databaseRejectsCrossOwnerAndMismatchedSourceKeys()throws Exception {
        var f=fixture();var b=account();String sql="INSERT INTO notification_read_states(user_id,kind,source_id,occurrence_date,assignment_id,revision,read_at) VALUES (?,'ASSIGNMENT',?,'1970-01-01',?,?,'2026-10-30T00:00:00Z')";
        assertThatThrownBy(()->jdbc.update(sql,b.id,f.task,f.task,"f".repeat(64))).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThatThrownBy(()->jdbc.update(sql,f.owner.id,UUID.randomUUID(),f.task,"f".repeat(64))).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThat(count(f.owner)).isZero();
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershellQueriesMarksAndLogsOutOnlyItsOwnSession()throws Exception {
        var f=fixture();assertThat(runPowerShell(f,"-SourceId '"+f.task+"' -Mode Query",0)).contains("Chưa đọc");
        assertThat(runPowerShell(f,"-SourceId '"+f.task+"' -Mode MarkRead",0)).contains("Đã đọc");
        assertThat(runPowerShell(f,"-SourceId '"+f.task+"' -Mode Query",0)).contains("Đã đọc");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL",Long.class,f.owner.id)).isEqualTo(1);
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershellUnavailableSourceIsNotReadSuccess()throws Exception {
        var f=fixture();assertThat(runPowerShell(f,"-SourceId '"+UUID.randomUUID()+"' -Mode MarkRead",1)).contains("không còn khả dụng");assertThat(count(f.owner)).isZero();
    }
    String runPowerShell(Fixture f,String args,int expected)throws Exception {
        String ps=Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","powershell.exe").toString();
        String command="[Console]::OutputEncoding=[Text.UTF8Encoding]::new();function Read-Host {param([string]$Prompt,[switch]$AsSecureString);if($AsSecureString){ConvertTo-SecureString $env:RECEIPT_PASSWORD -AsPlainText -Force}else{$env:RECEIPT_EMAIL}};& './scripts/Try-NotificationReadStates.ps1' -BaseUrl 'http://127.0.0.1:"+port+"' "+args;
        var builder=new ProcessBuilder(ps,"-NoProfile","-ExecutionPolicy","Bypass","-Command",command).redirectErrorStream(true);
        builder.environment().keySet().removeIf(n->n.equalsIgnoreCase("PSModulePath"));builder.environment().put("PSModulePath",Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","Modules").toString());
        builder.environment().put("RECEIPT_EMAIL",f.owner.email);builder.environment().put("RECEIPT_PASSWORD",SECRET);
        var p=builder.start();var output=CompletableFuture.supplyAsync(()->{try{return new String(p.getInputStream().readAllBytes(),StandardCharsets.UTF_8);}catch(java.io.IOException ex){throw new java.io.UncheckedIOException(ex);}});
        try{assertThat(p.waitFor(30,TimeUnit.SECONDS)).isTrue();var text=output.get(5,TimeUnit.SECONDS);assertThat(p.exitValue()).as(text).isEqualTo(expected);assertThat(text).doesNotContain(SECRET,"accessToken","refreshToken");return text;}finally{if(p.isAlive())p.destroyForcibly();}
    }
}
