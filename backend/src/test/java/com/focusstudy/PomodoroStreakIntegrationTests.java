package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import com.focusstudy.focus.*;
import com.focusstudy.users.UserRepository;
import java.net.*;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.*;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.*;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(PomodoroStreakIntegrationTests.ClockFixture.class)
@DirtiesContext
class PomodoroStreakIntegrationTests {
    private static final String SCHEMA="backend_it_"+UUID.randomUUID().toString().replace("-","");
    private static final String URL=Objects.requireNonNull(System.getenv("TEST_DB_URL"),"Run Test-Local.ps1"),USER=System.getenv("TEST_DB_USER"),PASSWORD=System.getenv("TEST_DB_PASSWORD");
    private static final String SECRET="Streak6c3aTest!",ROOT="/api/v1/pomodoro-streak",SESSIONS="/api/v1/pomodoro-sessions";
    private static final AtomicReference<Instant> WHEN=new AtomicReference<>();
    // Only the streak service has a test clock. JWT issuance/validation and mutation clocks remain real.
    @TestConfiguration(proxyBeanMethods=false) static class ClockFixture {
        @Bean @Primary PomodoroStreakService testedStreakService(PomodoroStreakRepository repository,UserRepository users) {
            var clock=new Clock(){public ZoneId getZone(){return ZoneOffset.UTC;}public Clock withZone(ZoneId zone){return Clock.fixed(instant(),zone);}public Instant instant(){return WHEN.get();}};
            return new PomodoroStreakService(repository,users,clock);
        }
    }
    @BeforeEach void referenceDay(){WHEN.set(Instant.parse("2026-10-29T01:00:00Z"));}
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
    long n(Map<?,?> value,String key){return ((Number)value.get(key)).longValue();}
    @SuppressWarnings("unchecked") List<Map<?,?>> days(Map<?,?> calendar){return (List<Map<?,?>>)calendar.get("days");}
    Map<?,?> calendar(Map<?,?> value){return (Map<?,?>)value.get("calendar");}
    Map<?,?> day(Map<?,?> value,String date){return days(calendar(value)).stream().filter(d->d.get("date").equals(date)).findFirst().orElseThrow();}
    Map<?,?> streak(Account a,String query)throws Exception{return data(send("GET",ROOT+query,a.token,null));}
    Account account()throws Exception {
        String email="streak-"+UUID.randomUUID()+"@example.test";
        var user=data(send("POST","/api/v1/auth/register",null,Map.of("email",email,"fullName","Kiểm thử chuỗi ngày","password",SECRET,"confirmPassword",SECRET)));
        var pair=data(send("POST","/api/v1/auth/login",null,Map.of("email",email,"password",SECRET)));
        return new Account(pair.get("accessToken").toString(),UUID.fromString(user.get("id").toString()),email);
    }
    Map<?,?> course(Account a)throws Exception {
        var semester=data(send("POST","/api/v1/semesters",a.token,Map.of("term",1,"startYear",2026,"status","CURRENT")));
        return data(send("POST","/api/v1/courses",a.token,Map.of("semesterId",semester.get("id"),"code","JAVA","name","Java gốc","credits",3)));
    }
    Map<?,?> start(Account a,Map<?,?> c)throws Exception{return data(send("POST",SESSIONS,a.token,Map.of("clientRequestId",UUID.randomUUID().toString(),"courseId",c.get("id"),"timeZone","Asia/Ho_Chi_Minh")));}
    Map<?,?> change(Account a,Map<?,?> row,String action)throws Exception{return data(send("POST",SESSIONS+"/"+row.get("id")+"/"+action,a.token,Map.of("version",row.get("version"))));}
    void expire(Map<?,?> row,String end){var anchor=OffsetDateTime.ofInstant(Instant.parse(end).minusSeconds(1500),ZoneOffset.UTC);jdbc.update("UPDATE pomodoro_sessions SET started_at=?,state_changed_at=?,run_started_at=? WHERE id=?",anchor,anchor,anchor,UUID.fromString(row.get("id").toString()));}
    Map<?,?> completed(Account a,Map<?,?> c,String end)throws Exception{var row=start(a,c);expire(row,end);return change(a,row,"complete");}
    void consistent(Map<?,?> value){var c=calendar(value);for(String field:List.of("completedSessions","studyMillis","studySeconds"))assertThat(days(c).stream().mapToLong(d->n(d,field)).sum()).isEqualTo(n(c,field));assertThat(days(c).stream().filter(d->Boolean.TRUE.equals(d.get("studied"))).count()).isEqualTo(n(c,"studiedDays"));assertThat(n(value,"currentStreakDays")).isLessThanOrEqualTo(n(value,"longestStreakDays"));}

    @Test void emptyAccountUsesProfileZoneWithoutInventingActivity()throws Exception {
        var a=account();jdbc.update("UPDATE app_users SET time_zone='UTC' WHERE id=?",a.id);var value=streak(a,"");
        assertThat(value.get("today")).isEqualTo("2026-10-29");assertThat(value.get("timeZone")).isEqualTo("UTC");assertThat(value.get("studiedToday")).isEqualTo(false);assertThat(n(value,"currentStreakDays")).isZero();assertThat(n(value,"longestStreakDays")).isZero();assertThat(n(value,"totalStudiedDays")).isZero();
        for(String field:List.of("firstStudyDate","lastStudyDate","currentStreakStartDate","currentStreakEndDate","longestStreakStartDate","longestStreakEndDate"))assertThat(value.get(field)).isNull();assertThat(days(calendar(value))).hasSize(31);consistent(value);
    }
    @Test void multipleCompletionsAndReplayStillCountOnlyOneStudyDay()throws Exception {
        var a=account();var c=course(a);completed(a,c,"2026-10-27T00:30:00Z");completed(a,c,"2026-10-28T00:30:00Z");completed(a,c,"2026-10-28T01:00:00Z");var last=completed(a,c,"2026-10-29T00:30:00Z");change(a,last,"complete");
        var value=streak(a,"");assertThat(n(value,"currentStreakDays")).isEqualTo(3);assertThat(n(value,"totalStudiedDays")).isEqualTo(3);assertThat(n(calendar(value),"completedSessions")).isEqualTo(4);assertThat(n(day(value,"2026-10-28"),"completedSessions")).isEqualTo(2);assertThat(value.get("studiedToday")).isEqualTo(true);consistent(value);
    }
    @Test void yesterdayGraceExpiresAfterAFullUnstudiedDay()throws Exception {
        var a=account();var c=course(a);completed(a,c,"2026-10-27T00:30:00Z");completed(a,c,"2026-10-28T00:30:00Z");var before=streak(a,"");assertThat(n(before,"currentStreakDays")).isEqualTo(2);assertThat(before.get("studiedToday")).isEqualTo(false);
        WHEN.set(Instant.parse("2026-10-30T01:00:00Z"));var after=streak(a,"");assertThat(n(after,"currentStreakDays")).isZero();assertThat(n(after,"longestStreakDays")).isEqualTo(2);assertThat(after.get("currentStreakStartDate")).isNull();
    }
    @Test void currentAndBestAreIndependentOfCalendarMonth()throws Exception {
        var a=account();var c=course(a);for(int d=10;d<=14;d++)completed(a,c,"2026-09-"+d+"T00:30:00Z");completed(a,c,"2026-10-28T00:30:00Z");completed(a,c,"2026-10-29T00:30:00Z");
        for(String month:List.of("2026-09","2026-10","2026-11")){var value=streak(a,"?month="+month);assertThat(n(value,"currentStreakDays")).isEqualTo(2);assertThat(n(value,"longestStreakDays")).isEqualTo(5);assertThat(n(value,"totalStudiedDays")).isEqualTo(7);assertThat(n(calendar(value),"studiedDays")).isEqualTo(month.endsWith("09")?5:month.endsWith("10")?2:0);consistent(value);}
    }
    @Test void equalBestRunsPreferTheMostRecentEnd()throws Exception {
        var a=account();var c=course(a);for(String day:List.of("2026-09-29","2026-09-30","2026-10-28","2026-10-29"))completed(a,c,day+"T00:30:00Z");var value=streak(a,"");assertThat(value.get("longestStreakStartDate")).isEqualTo("2026-10-28");assertThat(value.get("longestStreakEndDate")).isEqualTo("2026-10-29");
    }
    @Test void cancelledPausedAndExpiredUnconfirmedSessionsDoNotMarkAStudyDay()throws Exception {
        var a=account();var c=course(a);change(a,start(a,c),"cancel");change(a,start(a,c),"pause");var value=streak(a,"");assertThat(n(value,"totalStudiedDays")).isZero();assertThat(n(calendar(value),"completedSessions")).isZero();
        var b=account();var running=start(b,course(b));expire(running,"2026-10-28T00:30:00Z");assertThat(n(streak(b,""),"totalStudiedDays")).isZero();assertThat(jdbc.queryForObject("SELECT status FROM pomodoro_sessions WHERE id=?",String.class,UUID.fromString(running.get("id").toString()))).isEqualTo("RUNNING");
    }
    @Test void lateFinalizationUsesEndedAtAndTheChosenZone()throws Exception {
        var a=account();completed(a,course(a),"2026-09-30T17:00:00Z");var asia=streak(a,"?month=2026-10&timeZone=Asia%2FHo_Chi_Minh");var utc=streak(a,"?month=2026-09&timeZone=UTC");assertThat(day(asia,"2026-10-01").get("studied")).isEqualTo(true);assertThat(day(utc,"2026-09-30").get("studied")).isEqualTo(true);assertThat(n(calendar(streak(a,"?month=2026-10&timeZone=UTC")),"studiedDays")).isZero();
    }
    @Test void accountsCannotSeeEachOthersDaysAndResponsesRequireBearer()throws Exception {
        var a=account();completed(a,course(a),"2026-10-29T00:30:00Z");var b=account();var response=send("GET",ROOT,b.token,null);var value=data(response);assertThat(n(value,"totalStudiedDays")).isZero();assertThat(response.body()).doesNotContain(a.id.toString(),a.email,"courseId","userId",SECRET,"accessToken","refreshToken");
        assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");assertThat(body(response).get("meta")).isInstanceOf(Map.class);assertThat(send("GET",ROOT,null,null).statusCode()).isEqualTo(401);assertThat(send("GET",ROOT+"?month=bad",null,null).statusCode()).isEqualTo(401);assertThat(send("POST",ROOT,a.token,Map.of()).statusCode()).isEqualTo(403);
        var cookie=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+ROOT)).header("Cookie","FOCUS_REFRESH=test-only-cookie").GET().build();assertThat(client.send(cookie,HttpResponse.BodyHandlers.ofString()).statusCode()).isEqualTo(401);
    }
    @Test void deletingARenamedCourseDoesNotEraseItsStudyDays()throws Exception {
        var a=account();var c=course(a);completed(a,c,"2026-10-28T00:30:00Z");var renamed=data(send("PUT","/api/v1/courses/"+c.get("id"),a.token,Map.of("semesterId",c.get("semesterId"),"code","JAVA","name","Java đổi tên","credits",3,"version",c.get("version"))));completed(a,renamed,"2026-10-29T00:30:00Z");assertThat(send("DELETE","/api/v1/courses/"+c.get("id")+"?version="+renamed.get("version"),a.token,null).statusCode()).isEqualTo(204);assertThat(n(streak(a,""),"currentStreakDays")).isEqualTo(2);
    }
    @Test void referenceDateAndLocalGroupingFollowZoneAcrossMidnight()throws Exception {
        WHEN.set(Instant.parse("2026-10-28T18:00:00Z"));var a=account();var c=course(a);completed(a,c,"2026-10-28T16:50:00Z");completed(a,c,"2026-10-28T17:10:00Z");var asia=streak(a,"?timeZone=Asia%2FHo_Chi_Minh");var utc=streak(a,"?timeZone=UTC");assertThat(asia.get("today")).isEqualTo("2026-10-29");assertThat(utc.get("today")).isEqualTo("2026-10-28");assertThat(n(asia,"currentStreakDays")).isEqualTo(2);assertThat(n(utc,"currentStreakDays")).isEqualTo(1);
    }
    @Test void springDstDayHas23HoursButCountsAsOneDay()throws Exception {
        WHEN.set(Instant.parse("2026-03-09T17:00:00Z"));var a=account();var c=course(a);for(String end:List.of("2026-03-07T17:00:00Z","2026-03-08T06:30:00Z","2026-03-08T07:30:00Z"))completed(a,c,end);var value=streak(a,"?month=2026-03&timeZone=America%2FNew_York");assertThat(n(value,"currentStreakDays")).isEqualTo(2);var d=day(value,"2026-03-08");assertThat(n(d,"completedSessions")).isEqualTo(2);assertThat(Duration.between(Instant.parse(d.get("from").toString()),Instant.parse(d.get("to").toString()))).isEqualTo(Duration.ofHours(23));
    }
    @Test void repeatedAutumnHourStillHasOneStudyDate()throws Exception {
        WHEN.set(Instant.parse("2025-11-03T17:00:00Z"));var a=account();var c=course(a);completed(a,c,"2025-11-02T05:30:00Z");completed(a,c,"2025-11-02T06:30:00Z");var value=streak(a,"?month=2025-11&timeZone=America%2FNew_York");assertThat(n(value,"currentStreakDays")).isEqualTo(1);var d=day(value,"2025-11-02");assertThat(n(d,"completedSessions")).isEqualTo(2);assertThat(Duration.between(Instant.parse(d.get("from").toString()),Instant.parse(d.get("to").toString()))).isEqualTo(Duration.ofHours(25));
    }
    @Test void skippedDateIsZeroWithoutBreakingAnOtherwiseConsecutiveRun()throws Exception {
        WHEN.set(Instant.parse("2011-12-31T08:00:00Z"));var a=account();var c=course(a);completed(a,c,"2011-12-29T20:00:00Z");completed(a,c,"2011-12-30T20:00:00Z");var value=streak(a,"?month=2011-12&timeZone=Pacific%2FApia");assertThat(n(value,"currentStreakDays")).isEqualTo(2);assertThat(n(value,"totalStudiedDays")).isEqualTo(2);assertThat(day(value,"2011-12-30").get("studied")).isEqualTo(false);assertThat(day(value,"2011-12-30").get("from")).isEqualTo(day(value,"2011-12-30").get("to"));
    }
    @Test void allJavaSupportedZonesDoNotDependOnPostgresqlZoneAliases()throws Exception {
        var a=account();completed(a,course(a),"2026-10-28T23:00:00Z");var value=streak(a,"?timeZone=SystemV%2FEST5EDT");assertThat(value.get("timeZone")).isEqualTo("SystemV/EST5EDT");assertThat(n(value,"totalStudiedDays")).isEqualTo(1);
    }
    @Test void invalidQueryHasSafeStreakSpecificErrors()throws Exception {
        var a=account();for(String query:List.of("?month=","?month=2026-13","?month=2026-1","?month=2026-10-01","?month=1899-12","?month=2100-01","?timeZone=Fake%2FZone","?timeZone=%2B07%3A00")){var response=send("GET",ROOT+query,a.token,null);assertThat(response.statusCode()).isEqualTo(400);assertThat(body(response).get("code")).isEqualTo("INVALID_POMODORO_STREAK_FILTER");assertThat(response.body()).doesNotContain(SECRET,"SELECT ","org.hibernate");}
    }
    @Test void readsDoNotChangeSessionsGoalsOrDatabaseTimeZone()throws Exception {
        var a=account();completed(a,course(a),"2026-10-29T00:30:00Z");String sql="SELECT md5(string_agg(row_to_json(p)::text,'|' ORDER BY id)) FROM pomodoro_sessions p WHERE user_id=?";var before=jdbc.queryForObject(sql,String.class,a.id);var zone=jdbc.queryForObject("SHOW TimeZone",String.class);streak(a,"");streak(a,"?month=2020-02&timeZone=America%2FNew_York");assertThat(jdbc.queryForObject(sql,String.class,a.id)).isEqualTo(before);assertThat(jdbc.queryForObject("SHOW TimeZone",String.class)).isEqualTo(zone);assertThat(jdbc.queryForObject("SELECT count(*) FROM pomodoro_preferences WHERE user_id=?",Integer.class,a.id)).isZero();
    }
    @Test void calendarMatchesExistingMonthStatisticsAndDailyTotals()throws Exception {
        var a=account();var c=course(a);for(String end:List.of("2026-09-29T00:30:00Z","2026-10-28T00:30:00Z","2026-10-29T00:30:00Z"))completed(a,c,end);var value=streak(a,"");var stats=data(send("GET","/api/v1/pomodoro-statistics?period=MONTH&date=2026-10-29&timeZone=Asia%2FHo_Chi_Minh",a.token,null));for(String field:List.of("completedSessions","studyMillis","studySeconds"))assertThat(n(calendar(value),field)).isEqualTo(n(stats,field));var daily=data(send("GET",SESSIONS+"/daily?date=2026-10-29&timeZone=Asia%2FHo_Chi_Minh",a.token,null));assertThat(n(day(value,"2026-10-29"),"studyMillis")).isEqualTo(n(daily,"studyMillis"));consistent(value);
    }
    @Test void concurrentCompletionKeepsCalendarAndStreakInOneSnapshot()throws Exception {
        var a=account();var row=start(a,course(a));expire(row,"2026-10-29T00:30:00Z");try(var executor=Executors.newVirtualThreadPerTaskExecutor()){var complete=executor.submit(()->change(a,row,"complete"));for(int i=0;i<6;i++){var value=streak(a,"");assertThat(n(value,"currentStreakDays")).isIn(0L,1L);assertThat(n(calendar(value),"studiedDays")).isEqualTo(n(value,"totalStudiedDays"));consistent(value);}assertThat(complete.get(15,TimeUnit.SECONDS).get("status")).isEqualTo("COMPLETED");}assertThat(n(streak(a,""),"currentStreakDays")).isEqualTo(1);
    }
    @Test void streamingMoreThanOneFetchBatchStillCountsOneUniqueDate()throws Exception {
        var a=account();var row=completed(a,course(a),"2026-10-29T00:30:00Z");jdbc.update("INSERT INTO pomodoro_sessions SELECT (jsonb_populate_record(NULL::pomodoro_sessions, to_jsonb(p) || jsonb_build_object('id',gen_random_uuid(),'client_request_id',gen_random_uuid()))).* FROM pomodoro_sessions p CROSS JOIN generate_series(1,300) WHERE p.id=?",UUID.fromString(row.get("id").toString()));var value=streak(a,"");assertThat(n(value,"totalStudiedDays")).isEqualTo(1);assertThat(n(calendar(value),"completedSessions")).isEqualTo(301);assertThat(n(calendar(value),"studyMillis")).isEqualTo(301L*1500000);consistent(value);
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershellSupportsProfileZoneAndCalendarChoiceAndRevokesOnlyItsLogin()throws Exception {
        var a=account();jdbc.update("UPDATE app_users SET time_zone='UTC' WHERE id=?",a.id);var c=course(a);completed(a,c,"2026-09-30T00:30:00Z");completed(a,c,"2026-10-29T00:30:00Z");assertThat(runPowerShell(a,"")).contains("Chuỗi hiện tại: 1 ngày","Dài nhất: 1 ngày","UTC","Lịch tháng 2026-10");assertThat(runPowerShell(a,"-Month '2026-09' -TimeZone 'Asia/Ho_Chi_Minh'")).contains("Lịch tháng 2026-09","1 ngày học","Chuỗi hiện tại: 1 ngày");assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL",Integer.class,a.id)).isEqualTo(1);
    }
    String runPowerShell(Account a,String args)throws Exception {
        String ps=Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","powershell.exe").toString();
        String command="[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); function Read-Host { param([string]$Prompt,[switch]$AsSecureString); if($AsSecureString){ConvertTo-SecureString $env:STREAK_TEST_PASSWORD -AsPlainText -Force}else{$env:STREAK_TEST_EMAIL} }; & './scripts/Try-Pomodoro.ps1' -BaseUrl 'http://127.0.0.1:"+port+"' -Mode Streak "+args;
        var builder=new ProcessBuilder(ps,"-NoProfile","-ExecutionPolicy","Bypass","-Command",command).redirectErrorStream(true);builder.environment().keySet().removeIf(n->n.equalsIgnoreCase("PSModulePath"));builder.environment().put("PSModulePath",Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","Modules").toString());builder.environment().put("STREAK_TEST_EMAIL",a.email);builder.environment().put("STREAK_TEST_PASSWORD",SECRET);
        var process=builder.start();var captured=CompletableFuture.supplyAsync(()->{try{return new String(process.getInputStream().readAllBytes(),StandardCharsets.UTF_8);}catch(java.io.IOException ex){throw new java.io.UncheckedIOException(ex);}});
        try{assertThat(process.waitFor(30,TimeUnit.SECONDS)).isTrue();var output=captured.get(5,TimeUnit.SECONDS);assertThat(process.exitValue()).as(output).isZero();assertThat(output).doesNotContain(SECRET,"accessToken","refreshToken");return output;}finally{if(process.isAlive())process.destroyForcibly();}
    }
}
