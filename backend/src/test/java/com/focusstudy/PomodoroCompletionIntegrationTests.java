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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.*;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@DirtiesContext
class PomodoroCompletionIntegrationTests {
    private static final String SCHEMA="backend_it_"+UUID.randomUUID().toString().replace("-","");
    private static final String URL=Objects.requireNonNull(System.getenv("TEST_DB_URL"),"Run Test-Local.ps1"),USER=System.getenv("TEST_DB_USER"),PASSWORD=System.getenv("TEST_DB_PASSWORD");
    private static final String SECRET="PomodoroTest123!",PATH="/api/v1/pomodoro-sessions";
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    private final HttpClient client=HttpClient.newHttpClient();
    record Account(String token,UUID id) { }
    @DynamicPropertySource static void configure(DynamicPropertyRegistry r) {
        TestJwtResources.configure(r);r.add("spring.datasource.url",()->URL+(URL.contains("?")?"&":"?")+"currentSchema="+SCHEMA);
        r.add("spring.datasource.username",()->USER);r.add("spring.datasource.password",()->PASSWORD);r.add("spring.flyway.default-schema",()->SCHEMA);r.add("spring.flyway.schemas",()->SCHEMA);
        for(String route:List.of("login","register","refresh","logout"))r.add("app.auth.rate-limit."+route+"-per-minute",()->1000);
    }
    @AfterAll static void cleanup()throws Exception {
        if(!SCHEMA.matches("backend_it_[a-f0-9]{32}"))throw new IllegalStateException("Unsafe QA schema");
        try(var c=DriverManager.getConnection(URL,USER,PASSWORD);var s=c.createStatement()){s.execute("DROP SCHEMA IF EXISTS "+SCHEMA+" CASCADE");}
    }
    HttpResponse<String> send(String method,String path,String token,Object input)throws Exception {
        var r=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).timeout(Duration.ofSeconds(15));
        if(token!=null)r.header("Authorization","Bearer "+token);if(input!=null)r.header("Content-Type","application/json");
        return client.send(r.method(method,input==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(input))).build(),HttpResponse.BodyHandlers.ofString());
    }
    Map<?,?> body(HttpResponse<String> r){return json.readValue(r.body(),Map.class);}
    Map<?,?> data(HttpResponse<String> r){assertThat(r.statusCode()).as(r.body()).isIn(200,201);return (Map<?,?>)body(r).get("data");}
    void error(HttpResponse<String> r,int status,String code){assertThat(r.statusCode()).as(r.body()).isEqualTo(status);assertThat(body(r).get("code")).isEqualTo(code);assertThat(r.body()).doesNotContain(SECRET,"password_hash","org.hibernate","INSERT ","SELECT ");}
    Account account()throws Exception {
        String email="focus-"+UUID.randomUUID()+"@example.test";
        var user=data(send("POST","/api/v1/auth/register",null,Map.of("email",email,"fullName","Kiểm thử Pomodoro","password",SECRET,"confirmPassword",SECRET)));
        var pair=data(send("POST","/api/v1/auth/login",null,Map.of("email",email,"password",SECRET)));
        return new Account(pair.get("accessToken").toString(),UUID.fromString(user.get("id").toString()));
    }
    Map<?,?> course(Account a,String code)throws Exception {
        var sem=data(send("POST","/api/v1/semesters",a.token,Map.of("term",1,"startYear",2026,"status","CURRENT")));
        return data(send("POST","/api/v1/courses",a.token,Map.of("semesterId",sem.get("id"),"code",code,"name","Môn Pomodoro","credits",3)));
    }
    Map<?,?> otherCourse(Account a,Map<?,?> c)throws Exception {return data(send("POST","/api/v1/courses",a.token,Map.of("semesterId",c.get("semesterId"),"code","OTHER","name","Môn khác","credits",2)));}
    Map<String,Object> startInput(Map<?,?> c){return new HashMap<>(Map.of("clientRequestId",UUID.randomUUID().toString(),"courseId",c.get("id"),"timeZone","Asia/Ho_Chi_Minh"));}
    Map<?,?> start(Account a,Map<?,?> c)throws Exception {return data(send("POST",PATH,a.token,startInput(c)));}
    String item(Map<?,?> row){return PATH+"/"+row.get("id");}
    long n(Map<?,?> row,String key){return ((Number)row.get(key)).longValue();}
    Map<?,?> read(Account a,Map<?,?> row)throws Exception{return data(send("GET",item(row),a.token,null));}
    Map<?,?> change(Account a,Map<?,?> row,String action)throws Exception{return data(send("POST",item(row)+"/"+action,a.token,Map.of("version",row.get("version"))));}
    int count(Account a){return jdbc.queryForObject("SELECT count(*) FROM pomodoro_sessions WHERE user_id=?",Integer.class,a.id);}
    void expire(Map<?,?> row,Instant deadline) {
        var id=UUID.fromString(row.get("id").toString());var old=jdbc.queryForMap("SELECT elapsed_millis,paused_millis FROM pomodoro_sessions WHERE id=?",id);
        long elapsed=((Number)old.get("elapsed_millis")).longValue(),paused=((Number)old.get("paused_millis")).longValue();
        var start=OffsetDateTime.ofInstant(deadline.minusMillis(1500000+paused),ZoneOffset.UTC);var anchor=OffsetDateTime.ofInstant(deadline.minusMillis(1500000-elapsed),ZoneOffset.UTC);
        jdbc.update("UPDATE pomodoro_sessions SET started_at=?,state_changed_at=?,run_started_at=? WHERE id=?",start,anchor,anchor,id);
    }
    Map<?,?> completed(Account a,Map<?,?> c,Instant end)throws Exception {var row=start(a,c);expire(row,end);return change(a,row,"complete");}
    Map<?,?> history(Account a,String query)throws Exception{return data(send("GET",PATH+query,a.token,null));}
    @SuppressWarnings("unchecked") List<Map<?,?>> items(Map<?,?> history){return (List<Map<?,?>>)history.get("items");}
    Map<?,?> goal(Account a)throws Exception{return data(send("GET","/api/v1/pomodoro-goal",a.token,null));}
    Map<?,?> setGoal(Account a,int goal,long version)throws Exception{return data(send("PUT","/api/v1/pomodoro-goal",a.token,Map.of("dailySessions",goal,"version",version)));}
    Map<?,?> daily(Account a,String date,String zone)throws Exception{return data(send("GET",PATH+"/daily?date="+date+"&timeZone="+URLEncoder.encode(zone,StandardCharsets.UTF_8),a.token,null));}
    @Test void earlyCompleteRunningAndPausedCannotGrantCredit()throws Exception {
        var a=account();var row=start(a,course(a,"QA"));error(send("POST",item(row)+"/complete",a.token,Map.of("version",0)),409,"POMODORO_NOT_READY");var paused=change(a,row,"pause");error(send("POST",item(row)+"/complete",a.token,Map.of("version",paused.get("version"))),409,"POMODORO_NOT_READY");assertThat(n(history(a,""),"totalElements")).isZero();assertThat(read(a,row).get("status")).isEqualTo("PAUSED");
    }
    @Test void lateCompleteStoresActualDeadlineAndFreezesTimer()throws Exception {
        var a=account();var row=start(a,course(a,"QA"));var end=Instant.now().minusSeconds(3600).truncatedTo(java.time.temporal.ChronoUnit.MILLIS);expire(row,end);var value=change(a,row,"complete");
        assertThat(value.get("status")).isEqualTo("COMPLETED");assertThat(value.get("endedAt")).isEqualTo(end.toString());assertThat(Instant.parse(value.get("finalizedAt").toString())).isAfter(end);assertThat(n(value,"creditedStudyMillis")).isEqualTo(1500000);assertThat(n(value,"elapsedMillis")).isEqualTo(1500000);assertThat(value.get("endsAt")).isNull();assertThat(data(send("GET",PATH+"/active",a.token,null))).isNull();
        var later=read(a,value);for(String key:List.of("endedAt","finalizedAt","elapsedMillis","pausedMillis","version"))assertThat(later.get(key)).isEqualTo(value.get(key));
    }
    @Test void cancelRunningKeepsPartialTimeWithoutCreditingIt()throws Exception {
        var a=account();var row=start(a,course(a,"QA"));var past=OffsetDateTime.now(ZoneOffset.UTC).minusSeconds(5);jdbc.update("UPDATE pomodoro_sessions SET started_at=?,state_changed_at=?,run_started_at=? WHERE id=?",past,past,past,UUID.fromString(row.get("id").toString()));var value=change(a,row,"cancel");
        assertThat(value.get("status")).isEqualTo("CANCELLED");assertThat(n(value,"elapsedMillis")).isGreaterThanOrEqualTo(4900);assertThat(n(value,"creditedStudyMillis")).isZero();assertThat(value.get("endedAt")).isEqualTo(value.get("finalizedAt"));assertThat(value.get("timeUp")).isEqualTo(false);assertThat(data(send("GET",PATH+"/active",a.token,null))).isNull();assertThat(n(history(a,"?status=CANCELLED"),"totalElements")).isEqualTo(1);
    }
    @Test void cancelledPauseNeverAccumulatesMorePauseAfterFinalization()throws Exception {
        var a=account();var row=start(a,course(a,"QA"));var paused=change(a,row,"pause");var value=change(a,paused,"cancel");var later=read(a,value);
        for(String key:List.of("elapsedMillis","pausedMillis","remainingMillis","endedAt","finalizedAt","version"))assertThat(later.get(key)).isEqualTo(value.get(key));assertThat(n(value,"creditedStudyMillis")).isZero();
    }
    @Test void completeRetriesWithOriginalOrCurrentVersionNeverWriteTwice()throws Exception {
        var a=account();var row=start(a,course(a,"QA"));expire(row,Instant.now().minusSeconds(1));var done=change(a,row,"complete");var before=jdbc.queryForMap("SELECT * FROM pomodoro_sessions WHERE id=?",UUID.fromString(row.get("id").toString()));
        assertThat(change(a,row,"complete").get("version")).isEqualTo(done.get("version"));assertThat(change(a,done,"complete").get("version")).isEqualTo(done.get("version"));assertThat(jdbc.queryForMap("SELECT * FROM pomodoro_sessions WHERE id=?",UUID.fromString(row.get("id").toString()))).isEqualTo(before);assertThat(n(history(a,"?status=COMPLETED"),"totalElements")).isEqualTo(1);
    }
    @Test void cancelRetriesAreIdempotentAndNewSessionCanStart()throws Exception {
        var a=account();var c=course(a,"QA");var row=start(a,c);var done=change(a,row,"cancel");assertThat(change(a,row,"cancel").get("id")).isEqualTo(row.get("id"));assertThat(change(a,done,"cancel").get("version")).isEqualTo(done.get("version"));var next=start(a,c);assertThat(next.get("id")).isNotEqualTo(row.get("id"));assertThat(n(history(a,""),"totalElements")).isEqualTo(1);
    }
    @Test void terminalStatusCannotBeReversedOrPausedOrResumed()throws Exception {
        var a=account();var row=change(a,start(a,course(a,"QA")),"cancel");for(String action:List.of("complete","pause","resume"))error(send("POST",item(row)+"/"+action,a.token,Map.of("version",row.get("version"))),409,"POMODORO_ALREADY_FINISHED");assertThat(read(a,row).get("status")).isEqualTo("CANCELLED");
    }
    @Test void staleFinishCannotBypassAnInterveningPause()throws Exception {
        var a=account();var row=start(a,course(a,"QA"));var paused=change(a,row,"pause");for(String action:List.of("complete","cancel"))error(send("POST",item(row)+"/"+action,a.token,Map.of("version",0)),409,"POMODORO_VERSION_CONFLICT");assertThat(read(a,row).get("version")).isEqualTo(paused.get("version"));
    }
    @Test void terminalReplayDoesNotAcceptVersionsFromUnrelatedEarlierTransitions()throws Exception {
        var a=account();var row=start(a,course(a,"QA"));var paused=change(a,row,"pause");var resumed=change(a,paused,"resume");expire(resumed,Instant.now().minusSeconds(1));var completed=change(a,resumed,"complete");
        for(int version:List.of(0,1))error(send("POST",item(row)+"/complete",a.token,Map.of("version",version)),409,"POMODORO_VERSION_CONFLICT");assertThat(change(a,resumed,"complete").get("version")).isEqualTo(completed.get("version"));
    }
    @Test void elapsedSessionMustBeCompletedRatherThanDiscarded()throws Exception {
        var a=account();var row=start(a,course(a,"QA"));expire(row,Instant.now().minusSeconds(1));error(send("POST",item(row)+"/cancel",a.token,Map.of("version",0)),409,"POMODORO_TIME_UP");assertThat(change(a,row,"complete").get("status")).isEqualTo("COMPLETED");
    }
    List<HttpResponse<String>> concurrent(Callable<HttpResponse<String>> one,Callable<HttpResponse<String>> two)throws Exception {
        var gate=new CountDownLatch(1);try(var pool=Executors.newFixedThreadPool(2)){var a=pool.submit(()->{gate.await();return one.call();});var b=pool.submit(()->{gate.await();return two.call();});gate.countDown();return List.of(a.get(20,TimeUnit.SECONDS),b.get(20,TimeUnit.SECONDS));}
    }
    @Test void simultaneousCompletesYieldOneRecordAndOneCreditedSession()throws Exception {
        var a=account();var row=start(a,course(a,"QA"));expire(row,Instant.parse("2026-10-27T18:00:00Z"));var responses=concurrent(()->send("POST",item(row)+"/complete",a.token,Map.of("version",0)),()->send("POST",item(row)+"/complete",a.token,Map.of("version",0)));
        assertThat(responses).allSatisfy(r->assertThat(r.statusCode()).as(r.body()).isEqualTo(200));assertThat(n(history(a,""),"totalElements")).isEqualTo(1);var day=daily(a,"2026-10-28","Asia/Ho_Chi_Minh");assertThat(n(day,"completedSessions")).isEqualTo(1);assertThat(n(day,"studySeconds")).isEqualTo(1500);
    }
    @Test void simultaneousCancelsNeverGrantFocusCredit()throws Exception {
        var a=account();var row=start(a,course(a,"QA"));var responses=concurrent(()->send("POST",item(row)+"/cancel",a.token,Map.of("version",0)),()->send("POST",item(row)+"/cancel",a.token,Map.of("version",0)));assertThat(responses).allSatisfy(r->assertThat(r.statusCode()).as(r.body()).isEqualTo(200));assertThat(n(history(a,""),"totalElements")).isEqualTo(1);assertThat(n(data(send("GET",PATH+"/daily",a.token,null)),"completedSessions")).isZero();
    }
    @Test void replayOldStartAfterCompletionDoesNotReplaceNewActiveSession()throws Exception {
        var a=account();var c=course(a,"QA");var input=startInput(c);var old=data(send("POST",PATH,a.token,input));expire(old,Instant.now().minusSeconds(1));change(a,old,"complete");var active=start(a,c);var replay=data(send("POST",PATH,a.token,input));assertThat(replay.get("id")).isEqualTo(old.get("id"));assertThat(replay.get("status")).isEqualTo("COMPLETED");assertThat(data(send("GET",PATH+"/active",a.token,null)).get("id")).isEqualTo(active.get("id"));
    }
    @Test void historyFiltersPaginationAndEqualEndTimesAreDeterministic()throws Exception {
        var a=account();var c=course(a,"QA");var other=otherCourse(a,c);var end=Instant.parse("2026-10-27T18:00:00Z");completed(a,c,end);completed(a,c,end);completed(a,other,end.plusSeconds(1));change(a,start(a,c),"cancel");start(a,c);
        var first=history(a,"?page=0&size=2");var second=history(a,"?page=1&size=2");assertThat(n(first,"totalElements")).isEqualTo(4);assertThat(n(first,"totalPages")).isEqualTo(2);assertThat(items(first)).hasSize(2);assertThat(items(second)).hasSize(2);
        assertThat(items(first).stream().map(r->r.get("id").toString())).doesNotContainAnyElementsOf(items(second).stream().map(r->r.get("id").toString()).toList());
        assertThat(items(history(a,"?page=0&size=2")).stream().map(r->r.get("id").toString())).containsExactlyElementsOf(items(first).stream().map(r->r.get("id").toString()).toList());
        assertThat(n(history(a,"?status=COMPLETED&courseId="+c.get("id")+"&semesterId="+c.get("semesterId")),"totalElements")).isEqualTo(2);assertThat(n(history(a,"?status=CANCELLED"),"totalElements")).isEqualTo(1);assertThat(items(history(a,"?page=99&size=2"))).isEmpty();
        String lower=URLEncoder.encode(end.toString(),StandardCharsets.UTF_8),upper=URLEncoder.encode(end.plusSeconds(1).toString(),StandardCharsets.UTF_8);assertThat(n(history(a,"?from="+lower+"&to="+upper),"totalElements")).isEqualTo(2);
    }
    @Test void deletedSourceStillHasSnapshotAndCanBeFilteredByOriginalId()throws Exception {
        var a=account();var c=course(a,"ORIGINAL");var value=completed(a,c,Instant.now().minusSeconds(1));jdbc.update("DELETE FROM courses WHERE id=?",UUID.fromString(c.get("id").toString()));var history=history(a,"?courseId="+c.get("id"));assertThat(n(history,"totalElements")).isEqualTo(1);assertThat(items(history).getFirst().get("context")).isEqualTo(value.get("context"));
    }
    @Test void finishingLinkedSessionNeverChangesPlanOrAssignment()throws Exception {
        var a=account();var c=course(a,"QA");var task=data(send("POST","/api/v1/assignments",a.token,Map.of("courseId",c.get("id"),"title","Bài gốc","dueAt","2027-01-01T00:00:00Z")));var plan=data(send("POST","/api/v1/study-sessions",a.token,Map.of("courseId",c.get("id"),"assignmentId",task.get("id"),"title","Kế hoạch gốc","startsAt","2026-11-01T19:00:00+07:00","timeZone","Asia/Ho_Chi_Minh","durationMinutes",45)));
        var input=startInput(c);input.put("assignmentId",task.get("id"));input.put("studySessionId",plan.get("id"));var row=data(send("POST",PATH,a.token,input));expire(row,Instant.now().minusSeconds(1));change(a,row,"complete");assertThat(data(send("GET","/api/v1/assignments/"+task.get("id"),a.token,null))).isEqualTo(task);assertThat(data(send("GET","/api/v1/study-sessions/"+plan.get("id"),a.token,null))).isEqualTo(plan);assertThat(n(history(a,"?assignmentId="+task.get("id")+"&studySessionId="+plan.get("id")),"totalElements")).isEqualTo(1);
    }
    @Test void foreignAccountsCannotFinalizeOrSeeHistoryOrGoals()throws Exception {
        var a=account();var b=account();var row=start(a,course(a,"A"));for(String action:List.of("complete","cancel"))error(send("POST",item(row)+"/"+action,b.token,Map.of("version",0)),404,"POMODORO_NOT_FOUND");change(a,row,"cancel");setGoal(a,9,0);assertThat(items(history(b,""))).isEmpty();assertThat(items(history(b,"?courseId="+((Map<?,?>)row.get("context")).get("courseId")))).isEmpty();assertThat(n(goal(b),"dailySessions")).isEqualTo(4);assertThat(n(data(send("GET",PATH+"/daily",b.token,null)),"completedSessions")).isZero();
    }
    @Test void invalidHistoryAndDailyQueriesAre400AndDoNotWrite()throws Exception {
        var a=account();for(String query:List.of("?status=RUNNING","?size=0","?size=101","?page=-1","?page=2147483647&size=100","?from=bad","?from=2026-10-28T00:00:00Z&to=2026-10-28T00:00:00Z","?courseId=bad"))assertThat(send("GET",PATH+query,a.token,null).statusCode()).as(query).isEqualTo(400);
        for(String query:List.of("?date=2026-02-30","?timeZone=Fake%2FZone","?date=2100-01-01"))assertThat(send("GET",PATH+"/daily"+query,a.token,null).statusCode()).isEqualTo(400);assertThat(count(a)).isZero();assertThat(jdbc.queryForObject("SELECT count(*) FROM pomodoro_preferences WHERE user_id=?",Integer.class,a.id)).isZero();
    }
    @Test void dailyUsesEndInstantRequestedZoneAndHalfOpenDayBounds()throws Exception {
        var a=account();var c=course(a,"QA");completed(a,c,Instant.parse("2026-10-26T16:59:59.999Z"));completed(a,c,Instant.parse("2026-10-26T17:00:00Z"));completed(a,c,Instant.parse("2026-10-27T16:59:59.999Z"));completed(a,c,Instant.parse("2026-10-27T17:00:00Z"));change(a,start(a,c),"cancel");var value=daily(a,"2026-10-27","Asia/Ho_Chi_Minh");assertThat(n(value,"completedSessions")).isEqualTo(2);assertThat(n(value,"studySeconds")).isEqualTo(3000);assertThat(n(value,"progressPercent")).isEqualTo(50);assertThat(n(value,"remainingSessions")).isEqualTo(2);assertThat(value.get("goalReached")).isEqualTo(false);
    }
    @Test void dailyHandlesDstAndCountsEachCompletionOnce()throws Exception {
        var a=account();var c=course(a,"QA");completed(a,c,Instant.parse("2025-11-02T04:00:00Z"));completed(a,c,Instant.parse("2025-11-03T04:59:59Z"));completed(a,c,Instant.parse("2025-11-03T05:00:00Z"));var value=daily(a,"2025-11-02","America/New_York");assertThat(n(value,"completedSessions")).isEqualTo(2);assertThat(value.get("from")).isEqualTo("2025-11-02T04:00:00Z");assertThat(value.get("to")).isEqualTo("2025-11-03T05:00:00Z");
    }
    @Test void goalDefaultsAreReadOnlyFirstSaveGetsNonzeroVersionAndNoopStaysStable()throws Exception {
        var a=account();assertThat(goal(a)).isEqualTo(Map.of("dailySessions",4,"version",0,"persisted",false));assertThat(jdbc.queryForObject("SELECT count(*) FROM pomodoro_preferences WHERE user_id=?",Integer.class,a.id)).isZero();var first=setGoal(a,4,0);assertThat(n(first,"version")).isEqualTo(1);assertThat(first.get("persisted")).isEqualTo(true);var changed=setGoal(a,6,1);assertThat(n(changed,"version")).isEqualTo(2);assertThat(setGoal(a,6,2)).isEqualTo(changed);error(send("PUT","/api/v1/pomodoro-goal",a.token,Map.of("dailySessions",8,"version",0)),409,"POMODORO_GOAL_VERSION_CONFLICT");
    }
    @Test void goalValidationAndStaleUpdateDoNotChangeStoredPreference()throws Exception {
        var a=account();for(Object value:List.of(0,13,-1,2.5,"bad"))assertThat(send("PUT","/api/v1/pomodoro-goal",a.token,Map.of("dailySessions",value,"version",0)).statusCode()).isEqualTo(400);assertThat(send("PUT","/api/v1/pomodoro-goal",a.token,Map.of("dailySessions",5)).statusCode()).isEqualTo(400);var first=setGoal(a,1,0);var changed=setGoal(a,12,1);assertThat(n(changed,"version")).isEqualTo(2);error(send("PUT","/api/v1/pomodoro-goal",a.token,Map.of("dailySessions",2,"version",first.get("version"))),409,"POMODORO_GOAL_VERSION_CONFLICT");assertThat(goal(a)).isEqualTo(changed);
    }
    @Test void concurrentFirstGoalWritesCannotOverwriteEachOtherUsingDefaultVersion()throws Exception {
        var a=account();var responses=concurrent(()->send("PUT","/api/v1/pomodoro-goal",a.token,Map.of("dailySessions",5,"version",0)),()->send("PUT","/api/v1/pomodoro-goal",a.token,Map.of("dailySessions",8,"version",0)));assertThat(responses.stream().map(HttpResponse::statusCode)).containsExactlyInAnyOrder(200,409);assertThat(n(goal(a),"version")).isEqualTo(1);assertThat(jdbc.queryForObject("SELECT count(*) FROM pomodoro_preferences WHERE user_id=?",Integer.class,a.id)).isEqualTo(1);
    }
    @Test void changingGoalPreservesHistoryAndProgressCapsAt100()throws Exception {
        var a=account();var c=course(a,"QA");completed(a,c,Instant.parse("2026-10-27T18:00:00Z"));completed(a,c,Instant.parse("2026-10-27T19:00:00Z"));setGoal(a,1,0);var value=daily(a,"2026-10-28","Asia/Ho_Chi_Minh");assertThat(n(value,"progressPercent")).isEqualTo(100);assertThat(n(value,"remainingSessions")).isZero();assertThat(value.get("goalReached")).isEqualTo(true);setGoal(a,8,1);assertThat(n(daily(a,"2026-10-28","Asia/Ho_Chi_Minh"),"completedSessions")).isEqualTo(2);assertThat(n(history(a,""),"totalElements")).isEqualTo(2);
    }
    @Test void readEndpointsHaveNoStoreAndRequireAuthentication()throws Exception {
        var a=account();for(String path:List.of(PATH,PATH+"/daily","/api/v1/pomodoro-goal")){var r=send("GET",path,a.token,null);assertThat(r.statusCode()).as(r.body()).isEqualTo(200);assertThat(r.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");assertThat(send("GET",path,null,null).statusCode()).isEqualTo(401);}assertThat(send("PUT","/api/v1/pomodoro-goal",null,Map.of("dailySessions",4,"version",0)).statusCode()).isEqualTo(401);
    }
    @Test void newWritesRequireBearerCookieAloneCannotAuthorizeAndAuthStillRequiresCsrf()throws Exception {
        var a=account();var row=start(a,course(a,"QA"));
        for(String action:List.of("complete","cancel"))assertThat(send("POST",item(row)+"/"+action,null,Map.of("version",0)).statusCode()).isEqualTo(401);
        var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/v1/pomodoro-goal")).header("Authorization","Bearer "+a.token).header("Origin","http://localhost:8092").header("Content-Type","application/json").PUT(HttpRequest.BodyPublishers.ofString("{\"dailySessions\":6,\"version\":0}")).build();
        var response=client.send(request,HttpResponse.BodyHandlers.ofString());assertThat(response.statusCode()).as(response.body()).isEqualTo(200);
        var cookieOnly=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/v1/pomodoro-goal")).header("Origin","http://localhost:8092").header("Cookie","FOCUS_REFRESH=test-only-cookie; FOCUS_XSRF=test-only-csrf").header("Content-Type","application/json").PUT(HttpRequest.BodyPublishers.ofString("{\"dailySessions\":8,\"version\":1}")).build();
        assertThat(client.send(cookieOnly,HttpResponse.BodyHandlers.ofString()).statusCode()).isEqualTo(401);assertThat(n(goal(a),"dailySessions")).isEqualTo(6);
        var logout=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/v1/auth/logout")).header("Origin","http://localhost:8092").header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString("{}")).build();error(client.send(logout,HttpResponse.BodyHandlers.ofString()),403,"CSRF_INVALID");
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershellCompletesReadsHistoryAndChangesGoalWithoutLeakingCredentials()throws Exception {
        var a=account();var row=start(a,course(a,"PS"));expire(row,Instant.parse("2026-10-27T18:00:00Z"));assertThat(runPowerShell(a,"Complete","")).contains("COMPLETED");assertThat(runPowerShell(a,"History","-Status COMPLETED")).contains("COMPLETED","Lịch sử: 1");assertThat(runPowerShell(a,"SetGoal","-DailySessions 6")).contains("Mục tiêu: 6");assertThat(runPowerShell(a,"Goal","")).contains("Mục tiêu: 6");assertThat(runPowerShell(a,"Daily","-Date '2026-10-28' -TimeZone UTC")).contains("0/6");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL",Integer.class,a.id)).isEqualTo(1);
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershellCancelsAndRetriesByExplicitIdWithoutCreatingExtraHistory()throws Exception {
        var a=account();var row=start(a,course(a,"PS"));assertThat(runPowerShell(a,"Cancel","")).contains("CANCELLED");assertThat(runPowerShell(a,"Cancel","-SessionId '"+row.get("id")+"'")).contains("CANCELLED");assertThat(n(history(a,""),"totalElements")).isEqualTo(1);
    }
    String runPowerShell(Account a,String mode,String args)throws Exception {
        String ps=Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","powershell.exe").toString();
        String command="[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); function Read-Host { param([string]$Prompt,[switch]$AsSecureString); if($AsSecureString){ConvertTo-SecureString $env:POMODORO_TEST_PASSWORD -AsPlainText -Force}else{$env:POMODORO_TEST_EMAIL} }; & './scripts/Try-Pomodoro.ps1' -BaseUrl 'http://127.0.0.1:"+port+"' -Mode "+mode+" "+args;
        var builder=new ProcessBuilder(ps,"-NoProfile","-ExecutionPolicy","Bypass","-Command",command).redirectErrorStream(true);builder.environment().keySet().removeIf(n->n.equalsIgnoreCase("PSModulePath"));builder.environment().put("PSModulePath",Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","Modules").toString());builder.environment().put("POMODORO_TEST_EMAIL",jdbc.queryForObject("SELECT email FROM app_users WHERE id=?",String.class,a.id));builder.environment().put("POMODORO_TEST_PASSWORD",SECRET);
        var process=builder.start();var captured=CompletableFuture.supplyAsync(()->{try{return new String(process.getInputStream().readAllBytes(),StandardCharsets.UTF_8);}catch(java.io.IOException ex){throw new java.io.UncheckedIOException(ex);}});
        try{assertThat(process.waitFor(30,TimeUnit.SECONDS)).isTrue();var output=captured.get(5,TimeUnit.SECONDS);assertThat(process.exitValue()).as(output).isZero();assertThat(output).doesNotContain(SECRET,"accessToken","refreshToken");return output;}finally{if(process.isAlive())process.destroyForcibly();}
    }
}
