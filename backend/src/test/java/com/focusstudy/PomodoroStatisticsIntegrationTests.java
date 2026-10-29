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

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@DirtiesContext
class PomodoroStatisticsIntegrationTests {
    private static final String SCHEMA="backend_it_"+UUID.randomUUID().toString().replace("-","");
    private static final String URL=Objects.requireNonNull(System.getenv("TEST_DB_URL"),"Run Test-Local.ps1"),USER=System.getenv("TEST_DB_USER"),PASSWORD=System.getenv("TEST_DB_PASSWORD");
    private static final String SECRET="Statistics6c1Test!",ROOT="/api/v1/pomodoro-statistics",SESSIONS="/api/v1/pomodoro-sessions";
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    private final HttpClient client=HttpClient.newHttpClient();
    record Account(String token,UUID id,String email) { }
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
    void invalid(HttpResponse<String> r){assertThat(r.statusCode()).as(r.body()).isEqualTo(400);assertThat(body(r).get("code")).isEqualTo("INVALID_POMODORO_STATISTICS_FILTER");assertThat(r.body()).doesNotContain(SECRET,"org.hibernate","SELECT ","password_hash");}
    long n(Map<?,?> value,String key){return ((Number)value.get(key)).longValue();}
    @SuppressWarnings("unchecked") List<Map<?,?>> rows(Map<?,?> value,String key){return (List<Map<?,?>>)value.get(key);}
    Account account()throws Exception {
        String email="stats-"+UUID.randomUUID()+"@example.test";
        var user=data(send("POST","/api/v1/auth/register",null,Map.of("email",email,"fullName","Kiểm thử thống kê","password",SECRET,"confirmPassword",SECRET)));
        var pair=data(send("POST","/api/v1/auth/login",null,Map.of("email",email,"password",SECRET)));
        return new Account(pair.get("accessToken").toString(),UUID.fromString(user.get("id").toString()),email);
    }
    Map<?,?> course(Account a)throws Exception {
        var semester=data(send("POST","/api/v1/semesters",a.token,Map.of("term",1,"startYear",2026,"status","CURRENT")));
        return data(send("POST","/api/v1/courses",a.token,Map.of("semesterId",semester.get("id"),"code","JAVA","name","Java ban đầu","credits",3)));
    }
    Map<?,?> otherCourse(Account a,Map<?,?> course)throws Exception {return data(send("POST","/api/v1/courses",a.token,Map.of("semesterId",course.get("semesterId"),"code","REACT","name","React","credits",3)));}
    Map<?,?> start(Account a,Map<?,?> c)throws Exception {return data(send("POST",SESSIONS,a.token,Map.of("clientRequestId",UUID.randomUUID().toString(),"courseId",c.get("id"),"timeZone","Asia/Ho_Chi_Minh")));}
    Map<?,?> change(Account a,Map<?,?> row,String action)throws Exception {return data(send("POST",SESSIONS+"/"+row.get("id")+"/"+action,a.token,Map.of("version",row.get("version"))));}
    void expire(Map<?,?> row,Instant end) {
        var anchor=OffsetDateTime.ofInstant(end.minusSeconds(1500),ZoneOffset.UTC);
        jdbc.update("UPDATE pomodoro_sessions SET started_at=?,state_changed_at=?,run_started_at=? WHERE id=?",anchor,anchor,anchor,UUID.fromString(row.get("id").toString()));
    }
    Map<?,?> completed(Account a,Map<?,?> c,String end)throws Exception {var row=start(a,c);expire(row,Instant.parse(end));return change(a,row,"complete");}
    Map<?,?> statistics(Account a,String query)throws Exception {return data(send("GET",ROOT+query,a.token,null));}
    Map<?,?> day(Map<?,?> value,String date){return rows(value,"days").stream().filter(d->d.get("date").equals(date)).findFirst().orElseThrow();}
    void consistent(Map<?,?> value) {
        for(String key:List.of("completedSessions","studyMillis","studySeconds")) {
            assertThat(rows(value,"days").stream().mapToLong(d->n(d,key)).sum()).isEqualTo(n(value,key));
            assertThat(rows(value,"courses").stream().mapToLong(c->n(c,key)).sum()).isEqualTo(n(value,key));
        }
    }
    @Test void emptyDefaultUsesProfileZoneAndReturnsAllSevenDays()throws Exception {
        var a=account();jdbc.update("UPDATE app_users SET time_zone='UTC' WHERE id=?",a.id);var value=statistics(a,"");
        assertThat(value.get("period")).isEqualTo("WEEK");assertThat(value.get("timeZone")).isEqualTo("UTC");assertThat(rows(value,"days")).hasSize(7);assertThat(rows(value,"courses")).isEmpty();assertThat(n(value,"completedSessions")).isZero();consistent(value);
        var date=LocalDate.parse(value.get("date").toString());assertThat(LocalDate.parse(value.get("fromDate").toString()).getDayOfWeek()).isEqualTo(DayOfWeek.MONDAY);assertThat(date).isBetween(LocalDate.parse(value.get("fromDate").toString()),LocalDate.parse(value.get("toDate").toString()));
    }
    @Test void everyCalendarMonthBucketExistsIncludingLeapDay()throws Exception {
        var a=account();for(var pair:new String[][]{{"2024-02-15","29"},{"2026-02-15","28"},{"2026-04-15","30"},{"2026-10-15","31"}}){var value=statistics(a,"?period=MONTH&date="+pair[0]+"&timeZone=UTC");assertThat(rows(value,"days")).hasSize(Integer.parseInt(pair[1]));assertThat(rows(value,"days")).allSatisfy(d->assertThat(n(d,"studyMillis")).isZero());consistent(value);}
    }
    @Test void aRealCompletionAddsExactly25MinutesAndReplayDoesNotCountTwice()throws Exception {
        var a=account();var c=course(a);assertThat(n(statistics(a,"?period=MONTH&date=2026-10-28"),"studyMillis")).isZero();
        var running=start(a,c);expire(running,Instant.parse("2026-10-27T18:00:00Z"));var finished=change(a,running,"complete");change(a,running,"complete");
        var value=statistics(a,"?period=MONTH&date=2026-10-28");assertThat(n(value,"completedSessions")).isEqualTo(1);assertThat(n(value,"studyMillis")).isEqualTo(1500000);assertThat(n(value,"studySeconds")).isEqualTo(1500);assertThat(n(day(value,"2026-10-28"),"studySeconds")).isEqualTo(1500);assertThat(finished.get("status")).isEqualTo("COMPLETED");consistent(value);
    }
    @Test void cancelledPartialAndPausedSessionsNeverInflateTotals()throws Exception {
        var a=account();var c=course(a);completed(a,c,"2026-10-27T18:00:00Z");var partial=start(a,c);var past=OffsetDateTime.now(ZoneOffset.UTC).minusSeconds(60);jdbc.update("UPDATE pomodoro_sessions SET started_at=?,state_changed_at=?,run_started_at=? WHERE id=?",past,past,past,UUID.fromString(partial.get("id").toString()));change(a,partial,"cancel");change(a,start(a,c),"pause");
        var value=statistics(a,"?period=MONTH&date=2026-10-28");assertThat(n(value,"completedSessions")).isEqualTo(1);assertThat(n(value,"studySeconds")).isEqualTo(1500);consistent(value);
    }
    @Test void expiredButUnconfirmedRunningSessionStillHasZeroCredit()throws Exception {
        var a=account();var row=start(a,course(a));expire(row,Instant.parse("2026-10-27T18:00:00Z"));var value=statistics(a,"?period=MONTH&date=2026-10-28");assertThat(n(value,"completedSessions")).isZero();assertThat(jdbc.queryForObject("SELECT status FROM pomodoro_sessions WHERE id=?",String.class,UUID.fromString(row.get("id").toString()))).isEqualTo("RUNNING");
    }
    @Test void totalsMatchExistingDailyAndCompletedHistoryAcrossCourses()throws Exception {
        var a=account();var c=course(a);var other=otherCourse(a,c);completed(a,c,"2026-10-27T18:00:00Z");completed(a,c,"2026-10-28T01:00:00Z");completed(a,other,"2026-10-28T18:00:00Z");
        var value=statistics(a,"?period=WEEK&date=2026-10-28&timeZone=Asia%2FHo_Chi_Minh");consistent(value);assertThat(rows(value,"courses")).hasSize(2);assertThat(n(rows(value,"courses").getFirst(),"studySeconds")).isEqualTo(3000);
        long dailyCount=0,dailyMillis=0;for(var day:rows(value,"days")){var known=data(send("GET",SESSIONS+"/daily?date="+day.get("date")+"&timeZone=Asia%2FHo_Chi_Minh",a.token,null));assertThat(n(known,"studyMillis")).isEqualTo(n(day,"studyMillis"));dailyCount+=n(known,"completedSessions");dailyMillis+=n(known,"studyMillis");}
        assertThat(dailyCount).isEqualTo(n(value,"completedSessions"));assertThat(dailyMillis).isEqualTo(n(value,"studyMillis"));
        var history=data(send("GET",SESSIONS+"?status=COMPLETED&size=100&from="+URLEncoder.encode(value.get("from").toString(),StandardCharsets.UTF_8)+"&to="+URLEncoder.encode(value.get("to").toString(),StandardCharsets.UTF_8),a.token,null));assertThat(n(history,"totalElements")).isEqualTo(n(value,"completedSessions"));assertThat(rows(history,"items").stream().mapToLong(r->n(r,"creditedStudyMillis")).sum()).isEqualTo(n(value,"studyMillis"));
    }
    @Test void endedAtRatherThanLateAcknowledgementDeterminesMonthAndDay()throws Exception {
        var a=account();var row=completed(a,course(a),"2026-02-28T17:00:00Z");assertThat(Instant.parse(row.get("finalizedAt").toString())).isAfter(Instant.parse("2026-03-01T00:00:00Z"));
        var asia=statistics(a,"?period=MONTH&date=2026-03-01&timeZone=Asia%2FHo_Chi_Minh");var utc=statistics(a,"?period=MONTH&date=2026-02-01&timeZone=UTC");assertThat(n(day(asia,"2026-03-01"),"completedSessions")).isEqualTo(1);assertThat(n(day(utc,"2026-02-28"),"completedSessions")).isEqualTo(1);assertThat(n(statistics(a,"?period=MONTH&date=2026-03-01&timeZone=UTC"),"completedSessions")).isZero();
    }
    @Test void rangeIncludesExactStartExcludesExactEndAcrossSpringDst()throws Exception {
        var a=account();var c=course(a);for(String end:List.of("2026-03-02T04:59:59.999Z","2026-03-02T05:00:00Z","2026-03-09T03:59:59.999Z","2026-03-09T04:00:00Z"))completed(a,c,end);
        var value=statistics(a,"?period=WEEK&date=2026-03-08&timeZone=America%2FNew_York");assertThat(n(value,"completedSessions")).isEqualTo(2);assertThat(n(day(value,"2026-03-02"),"completedSessions")).isEqualTo(1);assertThat(n(day(value,"2026-03-08"),"completedSessions")).isEqualTo(1);assertThat(Duration.between(Instant.parse(value.get("from").toString()),Instant.parse(value.get("to").toString()))).isEqualTo(Duration.ofHours(167));consistent(value);
    }
    @Test void repeatedAutumnHourIsOneDateWithTwoCompletedSessions()throws Exception {
        var a=account();var c=course(a);completed(a,c,"2025-11-02T05:30:00Z");completed(a,c,"2025-11-02T06:30:00Z");var value=statistics(a,"?period=WEEK&date=2025-11-02&timeZone=America%2FNew_York");assertThat(n(day(value,"2025-11-02"),"completedSessions")).isEqualTo(2);assertThat(n(value,"studySeconds")).isEqualTo(3000);consistent(value);
    }
    @Test void ownerAndOriginalSourceFiltersCannotRevealAnotherAccount()throws Exception {
        var a=account();var c=course(a);completed(a,c,"2026-10-27T18:00:00Z");var b=account();
        for(String filter:List.of("","&courseId="+c.get("id"),"&semesterId="+c.get("semesterId"),"&courseId="+UUID.randomUUID())){var response=send("GET",ROOT+"?period=MONTH&date=2026-10-28"+filter,b.token,null);var value=data(response);assertThat(n(value,"studyMillis")).isZero();assertThat(rows(value,"courses")).isEmpty();assertThat(response.body()).doesNotContain("Java ban đầu",a.id.toString());}
        assertThat(n(statistics(a,"?period=MONTH&date=2026-10-28&courseId="+c.get("id")+"&semesterId="+UUID.randomUUID()),"completedSessions")).isZero();
    }
    @Test void renamedAndDeletedSourceUsesLatestInRangeSnapshotWithoutLiveJoin()throws Exception {
        var a=account();var c=course(a);completed(a,c,"2026-10-27T18:00:00Z");var renamed=data(send("PUT","/api/v1/courses/"+c.get("id"),a.token,Map.of("semesterId",c.get("semesterId"),"code","JAVA","name","Java đổi tên","credits",3,"version",c.get("version"))));completed(a,renamed,"2026-10-28T18:00:00Z");
        assertThat(send("DELETE","/api/v1/courses/"+c.get("id")+"?version="+renamed.get("version"),a.token,null).statusCode()).isEqualTo(204);
        var value=statistics(a,"?period=MONTH&date=2026-10-28&courseId="+c.get("id"));assertThat(rows(value,"courses")).hasSize(1);assertThat(rows(value,"courses").getFirst().get("courseName")).isEqualTo("Java đổi tên");assertThat(n(value,"completedSessions")).isEqualTo(2);consistent(value);
    }
    @Test void movingOneCoursePreservesSeparateOriginalSemesterGroupsAndFilters()throws Exception {
        var a=account();var c=course(a);completed(a,c,"2026-10-27T18:00:00Z");var next=data(send("POST","/api/v1/semesters",a.token,Map.of("term",2,"startYear",2026,"status","UPCOMING")));var moved=data(send("PUT","/api/v1/courses/"+c.get("id"),a.token,Map.of("semesterId",next.get("id"),"code","JAVA","name","Java kỳ sau","credits",3,"version",c.get("version"))));completed(a,moved,"2026-10-28T18:00:00Z");
        var value=statistics(a,"?period=MONTH&date=2026-10-28");assertThat(rows(value,"courses")).hasSize(2);for(Object semester:List.of(c.get("semesterId"),next.get("id"))){var filtered=statistics(a,"?period=MONTH&date=2026-10-28&semesterId="+semester+"&courseId="+c.get("id"));assertThat(n(filtered,"completedSessions")).isEqualTo(1);assertThat(rows(filtered,"courses").getFirst().get("semesterId")).isEqualTo(semester);}consistent(value);
    }
    @Test void invalidFiltersAreSafeClientErrors()throws Exception {
        var a=account();for(String query:List.of("?period=DAY","?period=week","?period=","?date=2026-02-30","?date=2100-01-01","?period=WEEK&date=2099-12-31","?timeZone=Fake%2FZone","?timeZone=%2B07%3A00","?date=28%2F10%2F2026"))invalid(send("GET",ROOT+query,a.token,null));
        for(String field:List.of("courseId","semesterId"))assertThat(send("GET",ROOT+"?"+field+"=sample-id",a.token,null).statusCode()).isEqualTo(400);
    }
    @Test void authenticatedNoStoreEnvelopeNeverLeaksCredentialsAndCookiesAloneDoNotAuthorize()throws Exception {
        var a=account();var response=send("GET",ROOT,a.token,null);var payload=body(response);assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");assertThat(payload.get("meta")).isInstanceOf(Map.class);assertThat(response.body()).doesNotContain("accessToken","refreshToken","password_hash","\"userId\"",SECRET);
        assertThat(send("GET",ROOT,null,null).statusCode()).isEqualTo(401);assertThat(send("GET",ROOT+"?period=broken",null,null).statusCode()).isEqualTo(401);
        var cookie=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+ROOT)).header("Cookie","FOCUS_REFRESH=test-only-cookie; FOCUS_XSRF=test-only-csrf").GET().build();assertThat(client.send(cookie,HttpResponse.BodyHandlers.ofString()).statusCode()).isEqualTo(401);
        assertThat(send("POST",ROOT,a.token,Map.of()).statusCode()).isEqualTo(403);
    }
    @Test void readsDoNotCreateGoalsOrChangeAnySessionVersionOrTimestamp()throws Exception {
        var a=account();var c=course(a);completed(a,c,"2026-10-27T18:00:00Z");String sql="SELECT md5(string_agg(row_to_json(p)::text,'|' ORDER BY id)) FROM pomodoro_sessions p WHERE user_id=?";var before=jdbc.queryForObject(sql,String.class,a.id);
        statistics(a,"?period=MONTH&date=2026-10-28");statistics(a,"?period=WEEK&date=2026-10-28");assertThat(jdbc.queryForObject(sql,String.class,a.id)).isEqualTo(before);assertThat(jdbc.queryForObject("SELECT count(*) FROM pomodoro_preferences WHERE user_id=?",Integer.class,a.id)).isZero();
    }
    @Test void concurrentCompletionCannotProduceInternallyDifferentTotals()throws Exception {
        var a=account();var row=start(a,course(a));expire(row,Instant.parse("2026-10-27T18:00:00Z"));try(var executor=Executors.newVirtualThreadPerTaskExecutor()){var completion=executor.submit(()->change(a,row,"complete"));for(int i=0;i<6;i++){var value=statistics(a,"?period=MONTH&date=2026-10-28");assertThat(n(value,"completedSessions")).isIn(0L,1L);consistent(value);}assertThat(completion.get(15,TimeUnit.SECONDS).get("status")).isEqualTo("COMPLETED");}assertThat(n(statistics(a,"?period=MONTH&date=2026-10-28"),"completedSessions")).isEqualTo(1);
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershellReadsWeekAndMonthAndRevokesOnlyItsOwnLogin()throws Exception {
        var a=account();completed(a,course(a),"2026-10-27T18:00:00Z");for(String period:List.of("WEEK","month")){var output=runPowerShell(a,"-Period "+period+" -Date '2026-10-28' -TimeZone 'Asia/Ho_Chi_Minh'");assertThat(output).contains("Thống kê:","1 phiên","25 phút");}jdbc.update("UPDATE app_users SET time_zone='UTC' WHERE id=?",a.id);assertThat(runPowerShell(a,"-Date '2026-10-28'")).contains("UTC","25 phút");assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL",Integer.class,a.id)).isEqualTo(1);
    }
    String runPowerShell(Account a,String args)throws Exception {
        String ps=Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","powershell.exe").toString();
        String command="[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); function Read-Host { param([string]$Prompt,[switch]$AsSecureString); if($AsSecureString){ConvertTo-SecureString $env:STATS_TEST_PASSWORD -AsPlainText -Force}else{$env:STATS_TEST_EMAIL} }; & './scripts/Try-Pomodoro.ps1' -BaseUrl 'http://127.0.0.1:"+port+"' -Mode Statistics "+args;
        var builder=new ProcessBuilder(ps,"-NoProfile","-ExecutionPolicy","Bypass","-Command",command).redirectErrorStream(true);builder.environment().keySet().removeIf(n->n.equalsIgnoreCase("PSModulePath"));builder.environment().put("PSModulePath",Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","Modules").toString());builder.environment().put("STATS_TEST_EMAIL",a.email);builder.environment().put("STATS_TEST_PASSWORD",SECRET);
        var process=builder.start();var captured=CompletableFuture.supplyAsync(()->{try{return new String(process.getInputStream().readAllBytes(),StandardCharsets.UTF_8);}catch(java.io.IOException ex){throw new java.io.UncheckedIOException(ex);}});
        try{assertThat(process.waitFor(30,TimeUnit.SECONDS)).isTrue();var output=captured.get(5,TimeUnit.SECONDS);assertThat(process.exitValue()).as(output).isZero();assertThat(output).doesNotContain(SECRET,"accessToken","refreshToken");return output;}finally{if(process.isAlive())process.destroyForcibly();}
    }
}
