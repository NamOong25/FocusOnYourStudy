package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import com.focusstudy.academics.courses.CourseRepository;
import com.focusstudy.academics.semesters.SemesterRepository;
import com.focusstudy.assignments.statistics.*;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.*;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.*;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(AssignmentStatisticsIntegrationTests.ClockFixture.class)
@DirtiesContext
class AssignmentStatisticsIntegrationTests {
    private static final String SCHEMA="backend_it_"+UUID.randomUUID().toString().replace("-","");
    private static final String URL=Objects.requireNonNull(System.getenv("TEST_DB_URL"),"Run Test-Local.ps1"),USER=System.getenv("TEST_DB_USER"),PASSWORD=System.getenv("TEST_DB_PASSWORD");
    private static final String SECRET="AssignmentStats7a1!",ROOT="/api/v1/assignment-statistics",ASSIGNMENTS="/api/v1/assignments";
    private static final Instant BASE=Instant.parse("2026-10-28T18:00:00Z");
    private static final AtomicReference<Instant> WHEN=new AtomicReference<>();
    // Do not change JWT/auth clocks or add a production test-time endpoint.
    @TestConfiguration(proxyBeanMethods=false) static class ClockFixture {
        @Bean @Primary AssignmentStatisticsService testedAssignmentStatisticsService(AssignmentStatisticsRepository assignments,
                SemesterRepository semesters,CourseRepository courses,UserRepository users) {
            var clock=new Clock(){public ZoneId getZone(){return ZoneOffset.UTC;}public Clock withZone(ZoneId zone){return Clock.fixed(instant(),zone);}public Instant instant(){return WHEN.get();}};
            return new AssignmentStatisticsService(assignments,semesters,courses,users,clock);
        }
    }
    @BeforeEach void clock(){WHEN.set(BASE);}
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
        if(!SCHEMA.matches("backend_it_[a-f0-9]{32}"))throw new IllegalStateException("Unsafe test schema");
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
    void error(HttpResponse<String> r,int status,String code){assertThat(r.statusCode()).as(r.body()).isEqualTo(status);assertThat(body(r).get("code")).isEqualTo(code);assertThat(r.body()).doesNotContain(SECRET,"password_hash","org.hibernate","SELECT ");}
    Account account()throws Exception {
        String email="assignment-stats-"+UUID.randomUUID()+"@example.test";
        var user=data(send("POST","/api/v1/auth/register",null,Map.of("email",email,"fullName","Kiểm thử thống kê bài tập","password",SECRET,"confirmPassword",SECRET)));
        var pair=data(send("POST","/api/v1/auth/login",null,Map.of("email",email,"password",SECRET)));
        return new Account(pair.get("accessToken").toString(),UUID.fromString(user.get("id").toString()),email);
    }
    Map<?,?> semester(Account a,int term)throws Exception{return data(send("POST","/api/v1/semesters",a.token,Map.of("term",term,"startYear",2026,"status","UPCOMING")));}
    Map<?,?> course(Account a,Map<?,?> s,String code)throws Exception{return data(send("POST","/api/v1/courses",a.token,Map.of("semesterId",s.get("id"),"code",code,"name","Tên môn trùng","credits",3)));}
    Map<?,?> task(Account a,Map<?,?> c,String status,Instant deadline)throws Exception {
        return data(send("POST",ASSIGNMENTS,a.token,Map.of("courseId",c.get("id"),"title","Bài cùng tên","notes","Không trả ghi chú này trong thống kê","status",status,"dueAt",deadline.toString())));
    }
    Map<String,Object> update(Map<?,?> row){var input=new HashMap<String,Object>();for(String key:List.of("courseId","title","dueAt","priority","status","notes","version"))input.put(key,row.get(key));return input;}
    Map<?,?> change(Account a,Map<?,?> row,String key,Object value)throws Exception {var input=update(row);input.put(key,value);return data(send("PUT",ASSIGNMENTS+"/"+row.get("id"),a.token,input));}
    String query(Map<?,?> s){return "?semesterId="+s.get("id");}
    Map<?,?> statistics(Account a,Map<?,?> s,String extra)throws Exception{return data(send("GET",ROOT+query(s)+extra,a.token,null));}
    void consistent(Map<?,?> v){assertThat(n(v,"todoAssignments")+n(v,"inProgressAssignments")+n(v,"completedAssignments")).isEqualTo(n(v,"totalAssignments"));assertThat(n(v,"pendingAssignments")+n(v,"completedAssignments")).isEqualTo(n(v,"totalAssignments"));assertThat(n(v,"overdueAssignments")+n(v,"notDueAssignments")).isEqualTo(n(v,"pendingAssignments"));assertThat(n(v,"dueSoonAssignments")).isBetween(0L,n(v,"notDueAssignments"));assertThat(n(v,"completionPercent")).isBetween(0L,100L);}
    void counts(Map<?,?> v,long total,long todo,long active,long completed,long overdue,long soon){consistent(v);assertThat(List.of(n(v,"totalAssignments"),n(v,"todoAssignments"),n(v,"inProgressAssignments"),n(v,"completedAssignments"),n(v,"overdueAssignments"),n(v,"dueSoonAssignments"))).containsExactly(total,todo,active,completed,overdue,soon);}

    @Test void emptySemesterHasZeroCountsMetadataNoStoreAndNoPrivateFields()throws Exception {
        var a=account();var s=semester(a,1);var r=send("GET",ROOT+query(s),a.token,null);var v=data(r);
        counts(v,0,0,0,0,0,0);assertThat(n(v,"completionPercent")).isZero();assertThat(v.get("courseId")).isNull();
        assertThat(v.get("semesterId")).isEqualTo(s.get("id"));assertThat(body(r).get("meta")).isNotNull();assertThat(r.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
        assertThat(v.keySet().stream().map(Object::toString)).containsExactlyInAnyOrder("semesterId","courseId","asOf","date","timeZone","dueSoonThrough","totalAssignments","todoAssignments","inProgressAssignments","completedAssignments","pendingAssignments","overdueAssignments","notDueAssignments","dueSoonAssignments","completionPercent");
    }
    @Test void fiveTasksAcrossCoursesHave40PercentAndCompletedPastDeadlineIsNotOverdue()throws Exception {
        var a=account();var s=semester(a,1);var c=course(a,s,"JAVA");var d=course(a,s,"REACT");
        task(a,c,"TODO",BASE.minusSeconds(1));task(a,c,"IN_PROGRESS",BASE.plusSeconds(3600));task(a,d,"TODO",BASE.plusSeconds(8*86400));task(a,d,"COMPLETED",BASE.minusSeconds(100));task(a,c,"COMPLETED",BASE.plusSeconds(100));
        var v=statistics(a,s,"");counts(v,5,2,1,2,1,1);assertThat(n(v,"notDueAssignments")).isEqualTo(2);assertThat(n(v,"completionPercent")).isEqualTo(40);
        assertThat(v.toString()).doesNotContain("Bài cùng tên","Không trả ghi chú","Tên môn trùng");
    }
    @Test void exactMicrosecondBoundsAreStrictForOverdueAndInclusiveForSoon()throws Exception {
        var a=account();var s=semester(a,1);var c=course(a,s,"JAVA");var end=BASE.plusSeconds(7*86400);
        task(a,c,"TODO",BASE.minusNanos(1000));task(a,c,"TODO",BASE);task(a,c,"IN_PROGRESS",end);task(a,c,"TODO",end.plusNanos(1000));task(a,c,"COMPLETED",BASE.minusSeconds(10));task(a,c,"COMPLETED",BASE);
        counts(statistics(a,s,"&timeZone=UTC"),6,3,1,2,1,2);
    }
    @Test void profileZoneAndExplicitZoneUseSameClockButDifferentCalendarDate()throws Exception {
        var a=account();var s=semester(a,1);var asia=statistics(a,s,"");
        assertThat(asia.get("timeZone")).isEqualTo("Asia/Ho_Chi_Minh");assertThat(asia.get("date")).isEqualTo("2026-10-29");
        jdbc.update("UPDATE app_users SET time_zone='UTC' WHERE id=?",a.id);var utc=statistics(a,s,"");
        assertThat(utc.get("date")).isEqualTo("2026-10-28");assertThat(utc.get("asOf")).isEqualTo(asia.get("asOf"));
        assertThat(statistics(a,s,"&timeZone=Asia%2FHo_Chi_Minh").get("date")).isEqualTo("2026-10-29");
    }
    @Test void springDstWindowEndsAfter167HoursInDatabaseQuery()throws Exception {
        WHEN.set(Instant.parse("2026-03-04T15:00:00Z"));var a=account();var s=semester(a,1);var c=course(a,s,"JAVA");
        task(a,c,"TODO",Instant.parse("2026-03-11T14:00:00Z"));task(a,c,"IN_PROGRESS",Instant.parse("2026-03-11T14:00:00.000001Z"));
        var v=statistics(a,s,"&timeZone=America%2FNew_York");counts(v,2,1,1,0,0,1);assertThat(v.get("dueSoonThrough")).isEqualTo("2026-03-11T14:00:00Z");
    }
    @Test void autumnDstWindowIncludes169thHour()throws Exception {
        WHEN.set(Instant.parse("2026-10-28T14:00:00Z"));var a=account();var s=semester(a,1);var c=course(a,s,"JAVA");
        task(a,c,"TODO",Instant.parse("2026-11-04T15:00:00Z"));task(a,c,"TODO",Instant.parse("2026-11-04T15:00:00.000001Z"));
        var v=statistics(a,s,"&timeZone=America%2FNew_York");counts(v,2,2,0,0,0,1);assertThat(v.get("dueSoonThrough")).isEqualTo("2026-11-04T15:00:00Z");
    }
    @Test void semesterAndCourseFiltersIntersectWithoutMergingSameCodeOrTitle()throws Exception {
        var a=account();var s=semester(a,1);var t=semester(a,2);var c=course(a,s,"JAVA");var d=course(a,s,"REACT");var other=course(a,t,"JAVA");var empty=course(a,s,"EMPTY");
        task(a,c,"TODO",BASE.minusSeconds(1));task(a,d,"COMPLETED",BASE);task(a,other,"IN_PROGRESS",BASE);
        counts(statistics(a,s,""),2,1,0,1,1,0);counts(statistics(a,s,"&courseId="+c.get("id")),1,1,0,0,1,0);
        counts(statistics(a,s,"&courseId="+other.get("id")),0,0,0,0,0,0);counts(statistics(a,s,"&courseId="+empty.get("id")),0,0,0,0,0,0);counts(statistics(a,t,""),1,0,1,0,0,1);
    }
    @Test void anotherAccountCannotReadForeignSemesterCourseOrOverrideOwner()throws Exception {
        var a=account();var b=account();var s=semester(a,1);var t=semester(b,1);var c=course(a,s,"JAVA");task(a,c,"TODO",BASE.minusSeconds(1));
        error(send("GET",ROOT+query(s),b.token,null),404,"SEMESTER_NOT_FOUND");error(send("GET",ROOT+query(t)+"&courseId="+c.get("id"),b.token,null),404,"COURSE_NOT_FOUND");
        counts(statistics(b,t,"&userId="+a.id),0,0,0,0,0,0);counts(statistics(a,s,"&userId="+b.id),1,1,0,0,1,0);
    }
    @Test void missingDeletedAndForeignFiltersUseSame404Codes()throws Exception {
        var a=account();var s=semester(a,1);var c=course(a,s,"EMPTY");
        error(send("GET",ROOT+"?semesterId="+UUID.randomUUID(),a.token,null),404,"SEMESTER_NOT_FOUND");error(send("GET",ROOT+query(s)+"&courseId="+UUID.randomUUID(),a.token,null),404,"COURSE_NOT_FOUND");
        assertThat(send("DELETE","/api/v1/courses/"+c.get("id")+"?version=0",a.token,null).statusCode()).isEqualTo(204);
        error(send("GET",ROOT+query(s)+"&courseId="+c.get("id"),a.token,null),404,"COURSE_NOT_FOUND");
        assertThat(send("DELETE","/api/v1/semesters/"+s.get("id")+"?version=0",a.token,null).statusCode()).isEqualTo(204);error(send("GET",ROOT+query(s),a.token,null),404,"SEMESTER_NOT_FOUND");
    }
    @Test void authenticationAndHttpMethodsAreProtected()throws Exception {
        var a=account();var s=semester(a,1);error(send("GET",ROOT+query(s),null,null),401,"AUTHENTICATION_REQUIRED");
        assertThat(send("GET",ROOT+query(s),"not-a-token",null).statusCode()).isEqualTo(401);
        for(String method:List.of("POST","PUT","DELETE"))error(send(method,ROOT+query(s),a.token,null),403,"ACCESS_DENIED");
    }
    @Test void malformedMissingAndBlankFiltersFailInsteadOfReturningZero()throws Exception {
        var a=account();var s=semester(a,1);
        for(String query:List.of("","?semesterId=","?semesterId=bad",query(s)+"&courseId=bad"))error(send("GET",ROOT+query,a.token,null),400,"INVALID_REQUEST");
        for(String zone:List.of("","Bad%2FZone","%2B07%3A00","UTC%2B07%3A00","%20UTC%20"))error(send("GET",ROOT+query(s)+"&timeZone="+zone,a.token,null),400,"INVALID_ASSIGNMENT_STATISTICS_FILTER");
    }
    @Test void readsNeverChangeVersionsTimestampsOrCreateSettings()throws Exception {
        var a=account();var s=semester(a,1);var c=course(a,s,"JAVA");var task=task(a,c,"TODO",BASE.minusSeconds(1));
        var before=jdbc.queryForList("SELECT * FROM assignments WHERE user_id=? ORDER BY id",a.id);
        var user=jdbc.queryForMap("SELECT * FROM app_users WHERE id=?",a.id);var count=jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=?",Long.class,a.id);
        for(int i=0;i<3;i++)counts(statistics(a,s,""),1,1,0,0,1,0);
        assertThat(jdbc.queryForList("SELECT * FROM assignments WHERE user_id=? ORDER BY id",a.id)).isEqualTo(before);assertThat(jdbc.queryForMap("SELECT * FROM app_users WHERE id=?",a.id)).isEqualTo(user);assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=?",Long.class,a.id)).isEqualTo(count);
        assertThat(data(send("GET",ASSIGNMENTS+"/"+task.get("id"),a.token,null))).isEqualTo(task);
    }
    @Test void statusDeadlineAndDeletionImmediatelyUpdateFreshStatistics()throws Exception {
        var a=account();var s=semester(a,1);var c=course(a,s,"JAVA");var row=task(a,c,"TODO",BASE.minusSeconds(1));counts(statistics(a,s,""),1,1,0,0,1,0);
        row=change(a,row,"status","IN_PROGRESS");counts(statistics(a,s,""),1,0,1,0,1,0);
        row=change(a,row,"status","COMPLETED");var v=statistics(a,s,"");counts(v,1,0,0,1,0,0);assertThat(n(v,"completionPercent")).isEqualTo(100);
        row=change(a,row,"status","TODO");row=change(a,row,"dueAt",BASE.plusSeconds(3600).toString());counts(statistics(a,s,""),1,1,0,0,0,1);
        row=change(a,row,"dueAt",BASE.plusSeconds(8*86400).toString());counts(statistics(a,s,""),1,1,0,0,0,0);
        assertThat(send("DELETE",ASSIGNMENTS+"/"+row.get("id")+"?version="+row.get("version"),a.token,null).statusCode()).isEqualTo(204);counts(statistics(a,s,""),0,0,0,0,0,0);
    }
    @Test void reassigningTaskMovesCountsToCurrentCourseAndSemesterOnly()throws Exception {
        var a=account();var s=semester(a,1);var t=semester(a,2);var c=course(a,s,"JAVA");var d=course(a,t,"JAVA");var row=task(a,c,"TODO",BASE);
        change(a,row,"courseId",d.get("id"));counts(statistics(a,s,""),0,0,0,0,0,0);counts(statistics(a,t,""),1,1,0,0,0,1);counts(statistics(a,s,"&courseId="+c.get("id")),0,0,0,0,0,0);
    }
    @Test void countsAgreeWithCanonicalAssignmentListAndNeverTreatLateDoneAsFailed()throws Exception {
        var a=account();var s=semester(a,1);var c=course(a,s,"JAVA");for(String status:List.of("TODO","IN_PROGRESS","COMPLETED"))for(long seconds:List.of(-60L,0L,3600L,8*86400L))task(a,c,status,BASE.plusSeconds(seconds));
        var r=send("GET",ASSIGNMENTS+query(s),a.token,null);assertThat(r.statusCode()).isEqualTo(200);var rows=(List<?>)body(r).get("data");var v=statistics(a,s,"");
        assertThat(n(v,"totalAssignments")).isEqualTo(rows.size());for(var e:Map.of("TODO","todoAssignments","IN_PROGRESS","inProgressAssignments","COMPLETED","completedAssignments").entrySet())assertThat(n(v,e.getValue())).isEqualTo(rows.stream().map(Map.class::cast).filter(row->row.get("status").equals(e.getKey())).count());
        counts(v,12,4,4,4,2,4);assertThat(n(v,"completionPercent")).isEqualTo(33);
    }
    @Test void advancingServerClockMovesDeadlineBucketsWithoutWritingTaskStatus()throws Exception {
        var a=account();var s=semester(a,1);var c=course(a,s,"JAVA");var row=task(a,c,"TODO",BASE.plusSeconds(1));counts(statistics(a,s,""),1,1,0,0,0,1);
        WHEN.set(BASE.plusSeconds(2));counts(statistics(a,s,""),1,1,0,0,1,0);assertThat(data(send("GET",ASSIGNMENTS+"/"+row.get("id"),a.token,null))).isEqualTo(row);
        assertThat(statistics(a,s,"&asOf=1900-01-01T00%3A00%3A00Z").get("asOf")).isEqualTo(BASE.plusSeconds(2).toString());
    }
    @Test void concurrentAtomicStatusChangesCannotProduceMixedTotals()throws Exception {
        var a=account();var s=semester(a,1);var c=course(a,s,"JAVA");for(int i=0;i<4;i++)task(a,c,"TODO",BASE.minusSeconds(1));
        try(var executor=Executors.newVirtualThreadPerTaskExecutor()) {
            var writer=executor.submit(()->{for(int i=0;i<20;i++)jdbc.update("UPDATE assignments SET status=? WHERE user_id=?",i%2==0?"COMPLETED":"TODO",a.id);});
            for(int i=0;i<10;i++){var v=statistics(a,s,"");consistent(v);assertThat(n(v,"totalAssignments")).isEqualTo(4);assertThat(n(v,"completedAssignments")).isIn(0L,4L);assertThat(n(v,"overdueAssignments")).isEqualTo(4-n(v,"completedAssignments"));}
            writer.get(15,TimeUnit.SECONDS);
        }
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershell51ReadsUtf8AndRevokesOnlyItsOwnLogin()throws Exception {
        var a=account();var s=semester(a,1);task(a,course(a,s,"JAVA"),"COMPLETED",BASE.minusSeconds(1));
        assertThat(runPowerShell(a,"-SemesterId '"+s.get("id")+"'",0)).contains("Bài tập: 1/1 hoàn thành","100%","Asia/Ho_Chi_Minh");
        assertThat(runPowerShell(a,"-SemesterId '"+s.get("id")+"' -TimeZone UTC",0)).contains("UTC","Tính tại:");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL",Long.class,a.id)).isEqualTo(1);
        assertThat(data(send("GET",ROOT+query(s),a.token,null)).get("completionPercent")).isEqualTo(100);
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershell51FailureIsNotZeroAndStillClosesOwnLogin()throws Exception {
        var a=account();var s=semester(a,1);
        assertThat(runPowerShell(a,"-SemesterId '"+s.get("id")+"' -TimeZone 'Bad/Zone'",1)).contains("INVALID_ASSIGNMENT_STATISTICS_FILTER").doesNotContain("Bài tập: 0/0");
        assertThat(runPowerShell(a,"-SemesterId '"+UUID.randomUUID()+"'",1)).contains("SEMESTER_NOT_FOUND");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL",Long.class,a.id)).isEqualTo(1);
    }
    String runPowerShell(Account a,String args,int expectedExit)throws Exception {
        String ps=Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","powershell.exe").toString();
        String command="[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); function Read-Host { param([string]$Prompt,[switch]$AsSecureString); if($AsSecureString){ConvertTo-SecureString $env:ASSIGNMENT_STATS_PASSWORD -AsPlainText -Force}else{$env:ASSIGNMENT_STATS_EMAIL} }; & './scripts/Try-AssignmentStatistics.ps1' -BaseUrl 'http://127.0.0.1:"+port+"' "+args;
        var builder=new ProcessBuilder(ps,"-NoProfile","-ExecutionPolicy","Bypass","-Command",command).redirectErrorStream(true);builder.environment().keySet().removeIf(n->n.equalsIgnoreCase("PSModulePath"));builder.environment().put("PSModulePath",Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","Modules").toString());builder.environment().put("ASSIGNMENT_STATS_EMAIL",a.email);builder.environment().put("ASSIGNMENT_STATS_PASSWORD",SECRET);
        var process=builder.start();var output=CompletableFuture.supplyAsync(()->{try{return new String(process.getInputStream().readAllBytes(),StandardCharsets.UTF_8);}catch(java.io.IOException e){throw new java.io.UncheckedIOException(e);}});
        try{assertThat(process.waitFor(30,TimeUnit.SECONDS)).isTrue();String value=output.get(5,TimeUnit.SECONDS);assertThat(process.exitValue()).as(value).isEqualTo(expectedExit);assertThat(value).doesNotContain(SECRET,"accessToken","refreshToken");return value;}finally{if(process.isAlive())process.destroyForcibly();}
    }
}
