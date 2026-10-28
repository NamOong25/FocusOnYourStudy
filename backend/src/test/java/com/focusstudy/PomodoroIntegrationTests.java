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
class PomodoroIntegrationTests {
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
    @Test void emptyActiveIsNullWithEnvelopeAndNoStore()throws Exception {
        var a=account();var r=send("GET",PATH+"/active",a.token,null);assertThat(data(r)).isNull();assertThat(body(r).get("meta")).isNotNull();assertThat(r.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
    }
    @Test void startStoresServerTimeFixedDurationAndContextSnapshot()throws Exception {
        var a=account();var c=course(a,"FOCUS");var before=Instant.now();var r=send("POST",PATH,a.token,startInput(c));var row=data(r);
        assertThat(r.statusCode()).isEqualTo(201);assertThat(r.headers().firstValue("Location")).contains(item(row));assertThat(row.get("status")).isEqualTo("RUNNING");
        assertThat(n(row,"durationSeconds")).isEqualTo(1500);assertThat(n(row,"remainingMillis")).isEqualTo(1500000);assertThat(n(row,"remainingSeconds")).isEqualTo(1500);assertThat(n(row,"elapsedMillis")).isZero();assertThat(row.get("timeUp")).isEqualTo(false);
        var begun=Instant.parse(row.get("startedAt").toString());assertThat(begun).isBetween(before.minusSeconds(1),Instant.now().plusSeconds(1));assertThat(Instant.parse(row.get("endsAt").toString())).isEqualTo(begun.plusSeconds(1500));
        var ctx=(Map<?,?>)row.get("context");assertThat(ctx.get("courseId")).isEqualTo(c.get("id"));assertThat(ctx.get("semesterId")).isEqualTo(c.get("semesterId"));assertThat(ctx.get("courseCode")).isEqualTo("FOCUS");assertThat(ctx.get("assignmentId")).isNull();
        assertThat(row.containsKey("userId")).isFalse();assertThat(count(a)).isEqualTo(1);
    }
    @Test void replaySameStartDoesNotResetRunningOrPausedSession()throws Exception {
        var a=account();var c=course(a,"QA");var input=startInput(c);var first=data(send("POST",PATH,a.token,input));var paused=change(a,first,"pause");
        var replay=send("POST",PATH,a.token,input);var row=data(replay);assertThat(replay.statusCode()).isEqualTo(200);assertThat(row.get("id")).isEqualTo(first.get("id"));assertThat(row.get("startedAt")).isEqualTo(first.get("startedAt"));assertThat(row.get("status")).isEqualTo("PAUSED");assertThat(row.get("version")).isEqualTo(paused.get("version"));assertThat(row.get("remainingMillis")).isEqualTo(paused.get("remainingMillis"));assertThat(count(a)).isEqualTo(1);
    }
    @Test void reusedRequestWithDifferentBodyIsConflictWithoutChangingOriginal()throws Exception {
        var a=account();var c=course(a,"QA");var input=startInput(c);var row=data(send("POST",PATH,a.token,input));input.put("timeZone","UTC");error(send("POST",PATH,a.token,input),409,"POMODORO_REQUEST_REUSED");assertThat(read(a,row).get("timeZone")).isEqualTo("Asia/Ho_Chi_Minh");assertThat(count(a)).isEqualTo(1);
    }
    @Test void runningAndPausedBothReserveSingleActiveSlot()throws Exception {
        var a=account();var c=course(a,"QA");var row=start(a,c);error(send("POST",PATH,a.token,startInput(c)),409,"POMODORO_ALREADY_ACTIVE");change(a,row,"pause");error(send("POST",PATH,a.token,startInput(c)),409,"POMODORO_ALREADY_ACTIVE");assertThat(count(a)).isEqualTo(1);
    }
    @Test void pauseFreezesRemainingResumeKeepsIdAndMovesDeadline()throws Exception {
        var a=account();var c=course(a,"QA");var row=start(a,c);var paused=change(a,row,"pause");var again=read(a,paused);
        assertThat(paused.get("status")).isEqualTo("PAUSED");assertThat(n(paused,"version")).isEqualTo(1);assertThat(paused.get("endsAt")).isNull();assertThat(again.get("remainingMillis")).isEqualTo(paused.get("remainingMillis"));assertThat(n(again,"pausedMillis")).isGreaterThanOrEqualTo(n(paused,"pausedMillis"));
        var resumed=change(a,paused,"resume");assertThat(resumed.get("status")).isEqualTo("RUNNING");assertThat(n(resumed,"version")).isEqualTo(2);assertThat(resumed.get("id")).isEqualTo(row.get("id"));assertThat(resumed.get("startedAt")).isEqualTo(row.get("startedAt"));assertThat(resumed.get("remainingMillis")).isEqualTo(paused.get("remainingMillis"));
        assertThat(Instant.parse(resumed.get("endsAt").toString())).isEqualTo(Instant.parse(resumed.get("serverTime").toString()).plusMillis(n(paused,"remainingMillis")));
    }
    @Test void staleAndInvalidStateCommandsNeverChangeVersion()throws Exception {
        var a=account();var row=start(a,course(a,"QA"));error(send("POST",item(row)+"/resume",a.token,Map.of("version",0)),409,"POMODORO_INVALID_STATE");var paused=change(a,row,"pause");
        error(send("POST",item(row)+"/pause",a.token,Map.of("version",0)),409,"POMODORO_VERSION_CONFLICT");error(send("POST",item(row)+"/resume",a.token,Map.of("version",0)),409,"POMODORO_VERSION_CONFLICT");error(send("POST",item(row)+"/pause",a.token,Map.of("version",1)),409,"POMODORO_INVALID_STATE");assertThat(read(a,paused).get("version")).isEqualTo(1);
    }
    @Test void foreignIdsNeverDiscloseOrMutateAnotherAccountsSession()throws Exception {
        var a=account();var b=account();var row=start(a,course(a,"A"));assertThat(data(send("GET",PATH+"/active",b.token,null))).isNull();
        error(send("GET",item(row),b.token,null),404,"POMODORO_NOT_FOUND");for(String action:List.of("pause","resume"))error(send("POST",item(row)+"/"+action,b.token,Map.of("version",0)),404,"POMODORO_NOT_FOUND");assertThat(read(a,row).get("version")).isEqualTo(0);
    }
    @Test void eachAccountCanHaveItsOwnSessionAndSameRequestUuid()throws Exception {
        var a=account();var b=account();var x=startInput(course(a,"A"));var y=startInput(course(b,"B"));y.put("clientRequestId",x.get("clientRequestId"));var first=data(send("POST",PATH,a.token,x));var second=data(send("POST",PATH,b.token,y));assertThat(first.get("id")).isNotEqualTo(second.get("id"));assertThat(count(a)).isEqualTo(1);assertThat(count(b)).isEqualTo(1);
    }
    @Test void foreignMissingCourseAndInvalidTimeZoneNeverWrite()throws Exception {
        var a=account();var b=account();var c=course(b,"B");error(send("POST",PATH,a.token,startInput(c)),404,"COURSE_NOT_FOUND");
        var input=startInput(c);input.put("courseId",UUID.randomUUID().toString());error(send("POST",PATH,a.token,input),404,"COURSE_NOT_FOUND");input.put("timeZone","Fake/Zone");error(send("POST",PATH,a.token,input),400,"INVALID_POMODORO_TIME_ZONE");assertThat(count(a)).isZero();
    }
    @Test void missingInvalidFieldsAndVersionsCannotWrite()throws Exception {
        var a=account();var c=course(a,"QA");for(String key:List.of("clientRequestId","courseId","timeZone")){var input=startInput(c);input.remove(key);error(send("POST",PATH,a.token,input),400,"VALIDATION_FAILED");}
        var input=startInput(c);input.put("clientRequestId","bad");assertThat(send("POST",PATH,a.token,input).statusCode()).isEqualTo(400);assertThat(count(a)).isZero();var row=start(a,c);
        for(Object v:List.of(-1,0.5,"bad")){assertThat(send("POST",item(row)+"/pause",a.token,Map.of("version",v)).statusCode()).isEqualTo(400);}error(send("POST",item(row)+"/pause",a.token,Map.of()),400,"VALIDATION_FAILED");assertThat(read(a,row).get("version")).isEqualTo(0);
    }
    @Test void linksMustBelongToOwnerAndSameCourseAndStudyAssignment()throws Exception {
        var a=account();var b=account();var c=course(a,"QA");var other=otherCourse(a,c);var foreign=course(b,"QB");
        var task=data(send("POST","/api/v1/assignments",a.token,Map.of("courseId",c.get("id"),"title","Bài tập","dueAt","2027-01-01T00:00:00Z")));
        var external=data(send("POST","/api/v1/assignments",b.token,Map.of("courseId",foreign.get("id"),"title","Riêng B","dueAt","2027-01-01T00:00:00Z")));
        var plan=data(send("POST","/api/v1/study-sessions",a.token,Map.of("courseId",c.get("id"),"assignmentId",task.get("id"),"title","Buổi tự học","startsAt","2026-11-01T19:00:00+07:00","timeZone","Asia/Ho_Chi_Minh","durationMinutes",45)));
        var input=startInput(other);input.put("assignmentId",task.get("id"));error(send("POST",PATH,a.token,input),409,"POMODORO_CONTEXT_MISMATCH");
        input=startInput(c);input.put("assignmentId",external.get("id"));error(send("POST",PATH,a.token,input),404,"ASSIGNMENT_NOT_FOUND");
        input=startInput(c);input.put("studySessionId",UUID.randomUUID().toString());error(send("POST",PATH,a.token,input),404,"STUDY_SESSION_NOT_FOUND");
        input=startInput(c);input.put("studySessionId",plan.get("id"));error(send("POST",PATH,a.token,input),409,"POMODORO_CONTEXT_MISMATCH");
        input.put("assignmentId",task.get("id"));var row=data(send("POST",PATH,a.token,input));var ctx=(Map<?,?>)row.get("context");assertThat(ctx.get("studyTitle")).isEqualTo("Buổi tự học");assertThat(ctx.get("assignmentTitle")).isEqualTo("Bài tập");assertThat(data(send("GET","/api/v1/study-sessions/"+plan.get("id"),a.token,null))).isEqualTo(plan);assertThat(data(send("GET","/api/v1/assignments/"+task.get("id"),a.token,null))).isEqualTo(task);
    }
    @Test void renameMoveDeleteCoursePreservesOriginalContextAndReplay()throws Exception {
        var a=account();var c=course(a,"SNAPSHOT");var input=startInput(c);var row=data(send("POST",PATH,a.token,input));var ctx=row.get("context");
        var otherSemester=data(send("POST","/api/v1/semesters",a.token,Map.of("term",2,"startYear",2026,"status","UPCOMING")));
        jdbc.update("UPDATE courses SET name='New name',semester_id=? WHERE id=?",UUID.fromString(otherSemester.get("id").toString()),UUID.fromString(c.get("id").toString()));assertThat(read(a,row).get("context")).isEqualTo(ctx);
        jdbc.update("DELETE FROM courses WHERE id=?",UUID.fromString(c.get("id").toString()));
        assertThat(read(a,row).get("context")).isEqualTo(ctx);assertThat(data(send("POST",PATH,a.token,input)).get("context")).isEqualTo(ctx);change(a,row,"pause");
    }
    @Test void elapsedRunningAfterServerDowntimeIsCappedReadOnlyAndCannotPauseOrResume()throws Exception {
        var a=account();var c=course(a,"QA");var row=start(a,c);var past=OffsetDateTime.now(ZoneOffset.UTC).minusHours(2);
        jdbc.update("UPDATE pomodoro_sessions SET started_at=?,state_changed_at=?,run_started_at=? WHERE id=?",past,past,past,UUID.fromString(row.get("id").toString()));
        var before=jdbc.queryForMap("SELECT * FROM pomodoro_sessions WHERE id=?",UUID.fromString(row.get("id").toString()));var expired=read(a,row);assertThat(expired.get("status")).isEqualTo("RUNNING");assertThat(expired.get("timeUp")).isEqualTo(true);assertThat(n(expired,"elapsedMillis")).isEqualTo(1500000);assertThat(n(expired,"remainingMillis")).isZero();
        for(String action:List.of("pause","resume"))error(send("POST",item(row)+"/"+action,a.token,Map.of("version",0)),409,"POMODORO_TIME_UP");
        error(send("POST",PATH,a.token,startInput(c)),409,"POMODORO_ALREADY_ACTIVE");assertThat(jdbc.queryForMap("SELECT * FROM pomodoro_sessions WHERE id=?",UUID.fromString(row.get("id").toString()))).isEqualTo(before);
    }
    @Test void getActiveAndGetByIdDoNotWriteDatabaseOrIncrementVersion()throws Exception {
        var a=account();var row=start(a,course(a,"QA"));var before=jdbc.queryForMap("SELECT * FROM pomodoro_sessions WHERE id=?",UUID.fromString(row.get("id").toString()));
        for(int i=0;i<3;i++){read(a,row);assertThat(data(send("GET",PATH+"/active",a.token,null)).get("id")).isEqualTo(row.get("id"));}
        assertThat(jdbc.queryForMap("SELECT * FROM pomodoro_sessions WHERE id=?",UUID.fromString(row.get("id").toString()))).isEqualTo(before);
    }
    List<HttpResponse<String>> concurrent(Callable<HttpResponse<String>> one,Callable<HttpResponse<String>> two)throws Exception {
        var gate=new CountDownLatch(1);try(var pool=Executors.newFixedThreadPool(2)){var a=pool.submit(()->{gate.await();return one.call();});var b=pool.submit(()->{gate.await();return two.call();});gate.countDown();return List.of(a.get(20,TimeUnit.SECONDS),b.get(20,TimeUnit.SECONDS));}
    }
    @Test void concurrentDistinctStartsCreateExactlyOneSession()throws Exception {
        var a=account();var c=course(a,"QA");var one=startInput(c);var two=startInput(c);var responses=concurrent(()->send("POST",PATH,a.token,one),()->send("POST",PATH,a.token,two));assertThat(responses.stream().map(HttpResponse::statusCode)).containsExactlyInAnyOrder(201,409);assertThat(count(a)).isEqualTo(1);error(responses.stream().filter(r->r.statusCode()==409).findFirst().orElseThrow(),409,"POMODORO_ALREADY_ACTIVE");
    }
    @Test void concurrentSameStartReturnsOneCreationAndOneReplay()throws Exception {
        var a=account();var input=startInput(course(a,"QA"));var responses=concurrent(()->send("POST",PATH,a.token,input),()->send("POST",PATH,a.token,input));assertThat(responses.stream().map(HttpResponse::statusCode)).containsExactlyInAnyOrder(201,200);assertThat(data(responses.getFirst()).get("id")).isEqualTo(data(responses.getLast()).get("id"));assertThat(count(a)).isEqualTo(1);
    }
    @Test void concurrentPauseRejectsLateCommandWithoutDoubleCounting()throws Exception {
        var a=account();var row=start(a,course(a,"QA"));var input=Map.of("version",0);var responses=concurrent(()->send("POST",item(row)+"/pause",a.token,input),()->send("POST",item(row)+"/pause",a.token,input));assertThat(responses.stream().map(HttpResponse::statusCode)).containsExactlyInAnyOrder(200,409);var paused=read(a,row);assertThat(paused.get("status")).isEqualTo("PAUSED");assertThat(n(paused,"version")).isEqualTo(1);
    }
    @Test void databaseUniqueIndexAlsoProtectsAgainstBypassingService()throws Exception {
        var a=account();var row=start(a,course(a,"QA"));
        assertThatThrownBy(()->jdbc.update("INSERT INTO pomodoro_sessions SELECT ?,user_id,?,status,duration_seconds,started_at,state_changed_at,run_started_at,elapsed_millis,paused_millis,time_zone,course_id,course_code,course_name,semester_id,semester_term,semester_start_year,assignment_id,assignment_title,study_session_id,study_title,created_at,updated_at,version FROM pomodoro_sessions WHERE id=?",UUID.randomUUID(),UUID.randomUUID(),UUID.fromString(row.get("id").toString()))).isInstanceOf(DataIntegrityViolationException.class);assertThat(count(a)).isEqualTo(1);
    }
    @Test void anonymousRequestsRequireAuthentication()throws Exception {
        assertThat(send("GET",PATH+"/active",null,null).statusCode()).isEqualTo(401);assertThat(send("POST",PATH,null,Map.of()).statusCode()).isEqualTo(401);
        for(String suffix:List.of("","/pause","/resume"))assertThat(send(suffix.isEmpty()?"GET":"POST",PATH+"/"+UUID.randomUUID()+suffix,null,suffix.isEmpty()?null:Map.of("version",0)).statusCode()).isEqualTo(401);
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershellStartPauseResumeAndActiveNeverPrintCredentials()throws Exception {
        var a=account();var c=course(a,"PS");String request=UUID.randomUUID().toString();String output=runPowerShell(a,"Start","-CourseId '"+c.get("id")+"' -ClientRequestId '"+request+"'");assertThat(output).contains("RUNNING","1500");
        assertThat(runPowerShell(a,"Pause","")).contains("PAUSED");assertThat(runPowerShell(a,"Resume","")).contains("RUNNING");assertThat(runPowerShell(a,"Active","")).contains("RUNNING");assertThat(count(a)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL",Integer.class,a.id)).isEqualTo(1);
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershellReportsEmptyWithoutCreatingSession()throws Exception {
        var a=account();assertThat(runPowerShell(a,"Active","")).contains("Chưa có phiên Pomodoro đang hoạt động");assertThat(count(a)).isZero();
    }
    String runPowerShell(Account a,String mode,String args)throws Exception {
        String ps=Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","powershell.exe").toString();
        String command="[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); function Read-Host { param([string]$Prompt,[switch]$AsSecureString); if($AsSecureString){ConvertTo-SecureString $env:POMODORO_TEST_PASSWORD -AsPlainText -Force}else{$env:POMODORO_TEST_EMAIL} }; & './scripts/Try-Pomodoro.ps1' -BaseUrl 'http://127.0.0.1:"+port+"' -Mode "+mode+" "+args;
        var builder=new ProcessBuilder(ps,"-NoProfile","-ExecutionPolicy","Bypass","-Command",command).redirectErrorStream(true);builder.environment().keySet().removeIf(n->n.equalsIgnoreCase("PSModulePath"));builder.environment().put("PSModulePath",Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","Modules").toString());builder.environment().put("POMODORO_TEST_EMAIL",jdbc.queryForObject("SELECT email FROM app_users WHERE id=?",String.class,a.id));builder.environment().put("POMODORO_TEST_PASSWORD",SECRET);
        var process=builder.start();var captured=CompletableFuture.supplyAsync(()->{try{return new String(process.getInputStream().readAllBytes(),StandardCharsets.UTF_8);}catch(java.io.IOException ex){throw new java.io.UncheckedIOException(ex);}});
        try{assertThat(process.waitFor(30,TimeUnit.SECONDS)).isTrue();var output=captured.get(5,TimeUnit.SECONDS);assertThat(process.exitValue()).as(output).isZero();assertThat(output).doesNotContain(SECRET,"accessToken","refreshToken");return output;}finally{if(process.isAlive())process.destroyForcibly();}
    }
}
