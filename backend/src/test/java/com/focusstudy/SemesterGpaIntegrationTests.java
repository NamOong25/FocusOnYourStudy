package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.sql.DriverManager;
import java.time.Duration;
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
class SemesterGpaIntegrationTests {
    private static final String SCHEMA = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
    private static final String URL = Objects.requireNonNull(System.getenv("TEST_DB_URL")), USER = System.getenv("TEST_DB_USER"), PASSWORD = System.getenv("TEST_DB_PASSWORD");
    private static final String SECRET = "GpaTest123!", PATH = "/api/v1/grade-configurations", COURSES = "/api/v1/courses";
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
        String email = "grade-" + UUID.randomUUID() + "@example.test";
        var user = data(send("POST", "/api/v1/auth/register", null, Map.of("email", email, "fullName", "Kiểm thử bảng điểm", "password", SECRET, "confirmPassword", SECRET)));
        return new Account(data(send("POST", "/api/v1/auth/login", null, Map.of("email", email, "password", SECRET))).get("accessToken").toString(), UUID.fromString(user.get("id").toString()));
    }
    Map<?, ?> semester(Account a, int term) throws Exception { return data(send("POST", "/api/v1/semesters", a.token, Map.of("term", term, "startYear", 2026, "status", "UPCOMING"))); }
    Map<?, ?> course(Account a, Map<?, ?> semester, String code) throws Exception { return data(send("POST", COURSES, a.token, Map.of("semesterId", semester.get("id"), "code", code, "name", "Môn " + code, "credits", 3))); }
    Map<String,Object> part(String id, String kind) { return new HashMap<>(Map.of("id",id,"name",kind,"kind",kind)); }
    Map<String,Object> project(String id, String target, Object share) { var p=part(id,"PROJECT");p.put("project",Map.of("target",target,"share",share));return p; }
    Map<String,Object> input(String assessment, Map<String,Object>... parts) { return new HashMap<>(Map.of("assessment",assessment,"parts",List.of(parts))); }
    Map<String,Object> theory() { return input("THEORY",part("regular","REGULAR"),part("mid","MIDTERM"),part("final","FINAL")); }
    Map<String,Object> update(Map<?, ?> row) {
        var parts=new ArrayList<Map<String,Object>>();
        for(var value:(List<?>)row.get("parts")) { var original=(Map<?,?>)value;var part=new HashMap<String,Object>();for(String key:List.of("id","name","kind","project"))part.put(key,original.get(key));parts.add(part); }
        return new HashMap<>(Map.of("assessment",row.get("assessment"),"parts",parts,"version",row.get("version")));
    }
    Map<String,Object> fields(Map<?,?> row,String... keys){var result=new HashMap<String,Object>();for(String key:keys)result.put(key,row.get(key));return result;}
    Map<String,Object> courseUpdate(Map<?,?> row){return fields(row,"semesterId","code","name","credits","teacher","room","status","color","description","version");}
    String courseConfig(Object id){return COURSES+"/"+id+"/grade-configuration";}
    String item(Map<?,?> row){return PATH+"/"+row.get("id");}
    Map<?,?> create(Account a,Map<?,?> c,Map<String,Object> input)throws Exception{return data(send("POST",courseConfig(c.get("id")),a.token,input));}
    List<Map<?,?>> parts(Map<?,?> row){return ((List<?>)row.get("parts")).stream().<Map<?,?>>map(p->(Map<?,?>)p).toList();}
    void error(HttpResponse<String> r,int status,String code){assertThat(r.statusCode()).as(r.body()).isEqualTo(status);assertThat(body(r).get("code")).isEqualTo(code);assertThat(r.body()).doesNotContain(SECRET,"password_hash","org.hibernate","SELECT ","INSERT ");}
    List<HttpResponse<String>> concurrent(Callable<HttpResponse<String>> first,Callable<HttpResponse<String>> second)throws Exception{
        var gate=new CountDownLatch(1);try(var pool=Executors.newVirtualThreadPerTaskExecutor()){var left=pool.submit(()->{gate.await();return first.call();});var right=pool.submit(()->{gate.await();return second.call();});gate.countDown();return List.of(left.get(20,TimeUnit.SECONDS),right.get(20,TimeUnit.SECONDS));}
    }
    String scores(Map<?,?> row){var id=row.get("id");if(id==null)id=row.get("configurationId");return PATH+"/"+id+"/scores";}
    Map<String,Object> mark(String id,Object score,Object remainder){var result=new HashMap<String,Object>();result.put("id",id);result.put("score",score);result.put("remainderScore",remainder);return result;}
    Map<String,Object> values(Map<?,?> row,Object... scores){var marks=new ArrayList<Map<String,Object>>();var parts=parts(row);for(int i=0;i<parts.size();i++)marks.add(mark(parts.get(i).get("id").toString(),i<scores.length?scores[i]:null,null));return new HashMap<>(Map.of("version",row.get("version"),"parts",marks));}
    Map<String,Object> customValues(Map<?,?> row,Map<String,Object>... marks){return new HashMap<>(Map.of("version",row.get("version"),"parts",List.of(marks)));}
    Map<?,?> read(Account a,Map<?,?> row)throws Exception{return data(send("GET",scores(row),a.token,null));}
    Map<?,?> save(Account a,Map<?,?> row,Map<String,Object> input)throws Exception{return data(send("PUT",scores(row),a.token,input));}
    Map<?,?> book(Account a,String code)throws Exception{return create(a,course(a,semester(a,1),code),theory());}
    String reportPath(Map<?,?> row){return scores(row).replace("/scores","/result");}
    Map<?,?> report(Account a,Map<?,?> row)throws Exception{return data(send("GET",reportPath(row),a.token,null));}
    Map<?,?> calculation(Map<?,?> report){return (Map<?,?>)report.get("result");}
    String gpaPath(Map<?,?> semester){return "/api/v1/semesters/"+semester.get("id")+"/gpa";}
    Map<?,?> gpa(Account a,Map<?,?> semester)throws Exception{return data(send("GET",gpaPath(semester),a.token,null));}
    Map<?,?> summary(Map<?,?> value){return (Map<?,?>)value.get("summary");}
    List<Map<?,?>> rows(Map<?,?> value){return ((List<?>)value.get("courses")).stream().<Map<?,?>>map(x->(Map<?,?>)x).toList();}
    Map<?,?> withCredits(Account a,Map<?,?> sem,String code,int credits)throws Exception{return data(send("POST",COURSES,a.token,Map.of("semesterId",sem.get("id"),"code",code,"name","Môn "+code,"credits",credits)));}
    record Scored(Map<?,?> course,Map<?,?> config,Map<?,?> marks){}
    Scored scored(Account a,Map<?,?> sem,String code,int credits,double grade)throws Exception{var c=withCredits(a,sem,code,credits);var config=create(a,c,theory());var marks=save(a,config,grade==0?values(config,8,8,0):values(config,grade,grade,grade));return new Scored(c,config,marks);}
    void number(Object value,String expected){assertThat(new java.math.BigDecimal(value.toString())).isEqualByComparingTo(expected);}
    @Test void emptyOwnedSemesterHasNullGpaAndDoesNotWriteAnyData()throws Exception{
        var a=account();var sem=semester(a,1);var response=send("GET",gpaPath(sem),a.token,null);var value=data(response);var s=summary(value);assertThat(s.get("state")).isEqualTo("EMPTY");assertThat(s.get("gpa")).isNull();assertThat(s.get("registeredCourses")).isEqualTo(0);assertThat(s.get("registeredCredits")).isEqualTo(0);assertThat(rows(value)).isEmpty();assertThat(((Map<?,?>)value.get("semester")).get("id")).isEqualTo(sem.get("id"));assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");assertThat(body(response).get("meta")).isNotNull();assertThat(gpa(a,sem)).isEqualTo(value);
    }
    @Test void coursesWithoutConfigurationAreListedAsExcludedRatherThanFailed()throws Exception{
        var a=account();var sem=semester(a,1);var c=withCredits(a,sem,"EMPTY",3);var value=gpa(a,sem);assertThat(summary(value).get("state")).isEqualTo("NO_RESULTS");assertThat(summary(value).get("gpa")).isNull();assertThat(rows(value).getFirst().get("id")).isEqualTo(c.get("id"));assertThat(rows(value).getFirst().get("exclusionReason")).isEqualTo("NO_CONFIGURATION");assertThat(rows(value).getFirst().get("gradePoint")).isNull();assertThat(summary(value).get("failedCourses")).isEqualTo(0);
    }
    @Test void weightsCreditCountsAndFMatchManualExample()throws Exception{
        var a=account();var sem=semester(a,1);scored(a,sem,"A",3,8);scored(a,sem,"B",2,8.5);scored(a,sem,"C",1,0);var value=gpa(a,sem);var s=summary(value);number(s.get("gpa"),"3.02");number(s.get("weightedGradePoints"),"18.1");assertThat(s.get("registeredCredits")).isEqualTo(6);assertThat(s.get("calculatedCredits")).isEqualTo(6);assertThat(s.get("earnedCredits")).isEqualTo(5);assertThat(s.get("failedCredits")).isEqualTo(1);assertThat(s.get("state")).isEqualTo("COMPLETE");assertThat(s.get("complete")).isEqualTo(true);assertThat(rows(value)).hasSize(3);assertThat(rows(value).getLast().get("letter")).isEqualTo("F");assertThat(rows(value).getLast().get("included")).isEqualTo(true);number(rows(value).getLast().get("weightedGradePoints"),"0");
    }
    @Test void allCompleteFsReturnZeroGpaInsteadOfNoResults()throws Exception{
        var a=account();var sem=semester(a,1);scored(a,sem,"F1",3,0);scored(a,sem,"F2",2,0);var s=summary(gpa(a,sem));number(s.get("gpa"),"0.00");assertThat(s.get("calculatedCourses")).isEqualTo(2);assertThat(s.get("earnedCredits")).isEqualTo(0);assertThat(s.get("failedCredits")).isEqualTo(5);assertThat(s.get("complete")).isEqualTo(true);
    }
    @Test void partialGpaExcludesEveryKindOfIncompleteResultWithExplicitReasons()throws Exception{
        var a=account();var sem=semester(a,1);scored(a,sem,"A-PASS",3,8);withCredits(a,sem,"B-NOCONFIG",2);
        var draft=create(a,withCredits(a,sem,"C-DRAFT",2),input("THEORY",part("tk","REGULAR")));save(a,draft,values(draft,10));
        var missing=create(a,withCredits(a,sem,"D-MISSING",2),theory());save(a,missing,values(missing,8,8,null));
        var blocked=create(a,withCredits(a,sem,"E-BLOCKED",2),theory());save(a,blocked,values(blocked,8,0,8));
        var knownFail=create(a,withCredits(a,sem,"F-INCOMPLETE-FAIL",2),theory());save(a,knownFail,values(knownFail,null,8,2.9));
        var value=gpa(a,sem);var s=summary(value);assertThat(s.get("state")).isEqualTo("PARTIAL");number(s.get("gpa"),"3.50");assertThat(s.get("registeredCredits")).isEqualTo(13);assertThat(s.get("calculatedCredits")).isEqualTo(3);assertThat(s.get("excludedCredits")).isEqualTo(10);assertThat(s.get("failedCourses")).isEqualTo(0);
        assertThat(rows(value).stream().map(r->(String)r.get("exclusionReason"))).containsExactly(null,"NO_CONFIGURATION","INCOMPLETE_CONFIGURATION","INCOMPLETE_SCORES","EXAM_BLOCKED","INCOMPLETE_SCORES");assertThat(rows(value).getLast().get("resultStatus")).isEqualTo("FAILED");assertThat(rows(value).getLast().get("included")).isEqualTo(false);
    }
    @Test void partialProjectWithoutRemainderDoesNotEnterGpa()throws Exception{
        var a=account();var sem=semester(a,1);var row=create(a,withCredits(a,sem,"BTL",3),input("THEORY",part("tk","REGULAR"),part("mid","MIDTERM"),project("btl","FINAL",40)));save(a,row,customValues(row,mark("tk",8,null),mark("mid",8,null),mark("btl",8,null)));var value=gpa(a,sem);assertThat(summary(value).get("gpa")).isNull();assertThat(rows(value).getFirst().get("exclusionReason")).isEqualTo("INCOMPLETE_SCORES");assertThat(rows(value).getFirst().get("missingScores")).isEqualTo(List.of(Map.of("columnId","btl","field","REMAINDER_SCORE")));
    }
    @Test void fullyEnteredProjectUsesExistingCourseCalculator()throws Exception{
        var a=account();var sem=semester(a,1);var row=create(a,withCredits(a,sem,"BTL",3),input("THEORY",part("tk","REGULAR"),part("mid","MIDTERM"),project("btl","FINAL",40)));save(a,row,customValues(row,mark("tk",8,null),mark("mid",8,null),mark("btl",8,6)));var value=gpa(a,sem);number(summary(value).get("gpa"),"3.00");number(rows(value).getFirst().get("total"),"7.4");assertThat(rows(value).getFirst().get("letter")).isEqualTo("B");
    }
    @Test void sameCourseCodeInOtherSemesterOrAccountDoesNotAffectSelectedGpa()throws Exception{
        var a=account();var b=account();var first=semester(a,1);var second=semester(a,2);var other=semester(b,1);scored(a,first,"SAME",3,9);scored(a,second,"SAME",3,0);scored(b,other,"SAME",3,0);var value=gpa(a,first);number(summary(value).get("gpa"),"4.00");assertThat(rows(value)).hasSize(1);assertThat(((Map<?,?>)value.get("semester")).get("id")).isEqualTo(first.get("id"));number(summary(gpa(a,second)).get("gpa"),"0.00");
    }
    @Test void duplicateDisplayNamesRemainSeparateCourses()throws Exception{
        var a=account();var sem=semester(a,1);var x=scored(a,sem,"X",3,8);var y=scored(a,sem,"Y",2,8.5);for(var c:List.of(x.course(),y.course())){var v=courseUpdate(c);v.put("name","Cùng tên môn");data(send("PUT",COURSES+"/"+c.get("id"),a.token,v));}var value=gpa(a,sem);assertThat(rows(value)).hasSize(2);number(summary(value).get("gpa"),"3.62");assertThat(rows(value).stream().map(r->r.get("id").toString())).doesNotHaveDuplicates();
    }
    @Test void roundsHalfUpToTwoDecimalsAfterCreditWeighting()throws Exception{
        var a=account();var sem=semester(a,1);scored(a,sem,"A",3,8);scored(a,sem,"B",1,8.5);number(summary(gpa(a,sem)).get("gpa"),"3.58");
    }
    @Test void manualCourseStatusDoesNotCreateOrHideGradeResults()throws Exception{
        var a=account();var sem=semester(a,1);var c=withCredits(a,sem,"NOPOINT",3);var v=courseUpdate(c);v.put("status","COMPLETED");data(send("PUT",COURSES+"/"+c.get("id"),a.token,v));assertThat(summary(gpa(a,sem)).get("state")).isEqualTo("NO_RESULTS");var graded=scored(a,sem,"GRADE",2,8);v=courseUpdate(graded.course());v.put("status","PLANNED");data(send("PUT",COURSES+"/"+graded.course().get("id"),a.token,v));var s=summary(gpa(a,sem));number(s.get("gpa"),"3.50");assertThat(s.get("calculatedCredits")).isEqualTo(2);
    }
    @Test void changingCreditsUpdatesGpaAndCapturesIndependentVersions()throws Exception{
        var a=account();var sem=semester(a,1);var x=scored(a,sem,"X",3,8);scored(a,sem,"Y",2,8.5);var v=courseUpdate(x.course());v.put("credits",1);data(send("PUT",COURSES+"/"+x.course().get("id"),a.token,v));var value=gpa(a,sem);number(summary(value).get("gpa"),"3.70");assertThat(rows(value).getFirst().get("courseVersion")).isEqualTo(1);assertThat(rows(value).getFirst().get("gradeVersion")).isEqualTo(1);assertThat(rows(value).getFirst().get("credits")).isEqualTo(1);
    }
    @Test void scoreChangesAndClearingNeverReuseOldGpa()throws Exception{
        var a=account();var sem=semester(a,1);var x=scored(a,sem,"X",3,8);number(summary(gpa(a,sem)).get("gpa"),"3.50");var updated=save(a,x.config(),values(x.marks(),8,8,0));number(summary(gpa(a,sem)).get("gpa"),"0.00");save(a,x.config(),values(updated));var value=gpa(a,sem);assertThat(summary(value).get("gpa")).isNull();assertThat(summary(value).get("state")).isEqualTo("NO_RESULTS");assertThat(rows(value).getFirst().get("gradeVersion")).isEqualTo(3);
    }
    @Test void deletingEmptyConfigurationOrCourseChangesExclusionsAndCounts()throws Exception{
        var a=account();var sem=semester(a,1);var c=withCredits(a,sem,"DELETE",3);var row=create(a,c,theory());assertThat(rows(gpa(a,sem)).getFirst().get("exclusionReason")).isEqualTo("INCOMPLETE_SCORES");assertThat(send("DELETE",item(row)+"?version=0",a.token,null).statusCode()).isEqualTo(204);assertThat(rows(gpa(a,sem)).getFirst().get("exclusionReason")).isEqualTo("NO_CONFIGURATION");assertThat(send("DELETE",COURSES+"/"+c.get("id")+"?version=0",a.token,null).statusCode()).isEqualTo(204);assertThat(summary(gpa(a,sem)).get("state")).isEqualTo("EMPTY");
    }
    @Test void summerTermIsExplicitAndWorksWithoutBecomingMandatory()throws Exception{
        var a=account();var sem=semester(a,3);scored(a,sem,"SUMMER",2,8.5);var value=gpa(a,sem);assertThat(((Map<?,?>)value.get("semester")).get("term")).isEqualTo(3);assertThat(((Map<?,?>)value.get("semester")).get("name")).isEqualTo("Học kỳ 3 (Hè)");number(summary(value).get("gpa"),"3.80");
    }
    @Test void missingForeignAndDeletedSemestersReturnSame404()throws Exception{
        var a=account();var b=account();var sem=semester(a,1);for(String id:List.of(sem.get("id").toString(),UUID.randomUUID().toString()))error(send("GET","/api/v1/semesters/"+id+"/gpa",b.token,null),404,"SEMESTER_NOT_FOUND");assertThat(send("DELETE","/api/v1/semesters/"+sem.get("id")+"?version=0",a.token,null).statusCode()).isEqualTo(204);error(send("GET",gpaPath(sem),a.token,null),404,"SEMESTER_NOT_FOUND");
    }
    @Test void authenticatedGetOnlyAndMalformedIdsAreEnforced()throws Exception{
        var a=account();var sem=semester(a,1);assertThat(send("GET",gpaPath(sem),null,null).statusCode()).isEqualTo(401);for(String method:List.of("POST","PUT","PATCH","DELETE"))assertThat(send(method,gpaPath(sem),a.token,Map.of("gpa",4)).statusCode()).isEqualTo(403);assertThat(send("GET","/api/v1/semesters/bad/gpa",a.token,null).statusCode()).isEqualTo(400);
    }
    @Test void repeatedReadsDoNotTouchSemesterCourseOrGradeVersions()throws Exception{
        var a=account();var sem=semester(a,1);var x=scored(a,sem,"READONLY",3,8);var first=gpa(a,sem);assertThat(gpa(a,sem)).isEqualTo(first);assertThat(((Map<?,?>)first.get("semester")).get("version")).isEqualTo(0);assertThat(data(send("GET",COURSES+"/"+x.course().get("id"),a.token,null)).get("version")).isEqualTo(0);assertThat(read(a,x.config()).get("version")).isEqualTo(1);
    }
    @Test void concurrentAtomicCreditAndScoreChangesStayInOneSnapshot()throws Exception{
        var a=account();var sem=semester(a,1);var x=scored(a,sem,"SNAPSHOT",1,4);var results=concurrent(()->{try(var c=DriverManager.getConnection(URL,USER,PASSWORD)){c.setSchema(SCHEMA);c.setAutoCommit(false);for(int version=1;version<=6;version++){try(var p=c.prepareStatement("UPDATE courses SET credits=?,version=? WHERE id=?")){p.setInt(1,version+1);p.setInt(2,version);p.setObject(3,UUID.fromString(x.course().get("id").toString()));p.executeUpdate();}try(var p=c.prepareStatement("UPDATE grade_columns SET score=? WHERE configuration_id=?")){p.setInt(1,version+4);p.setObject(2,UUID.fromString(x.config().get("id").toString()));p.executeUpdate();}try(var p=c.prepareStatement("UPDATE grade_configurations SET version=?,update_revision=? WHERE id=?")){p.setInt(1,version+1);p.setInt(2,version+1);p.setObject(3,UUID.fromString(x.config().get("id").toString()));p.executeUpdate();}c.commit();}}return send("GET",gpaPath(sem),a.token,null);},()->{HttpResponse<String> r=null;for(int i=0;i<25;i++){r=send("GET",gpaPath(sem),a.token,null);var value=data(r);var row=rows(value).getFirst();int v=((Number)row.get("courseVersion")).intValue();assertThat(row.get("credits")).isEqualTo(v+1);assertThat(row.get("gradeVersion")).isEqualTo(v+1);number(row.get("total"),Integer.toString(v+4));number(summary(value).get("gpa"),row.get("gradePoint").toString());assertThat(summary(value).get("calculatedCredits")).isEqualTo(v+1);}return r;});assertThat(results.stream().map(HttpResponse::statusCode)).containsOnly(200);
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershell51ReadsWeightedGpaInVietnameseAndOnlyClosesItsOwnSession()throws Exception{
        var a=account();var sem=semester(a,1);scored(a,sem,"A",3,8);scored(a,sem,"B",2,8.5);scored(a,sem,"F",1,0);var output=runGpaPowerShell(a,sem);assertThat(output).contains("GPA học kỳ: 3.02 / 4","đã đạt: 5");assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL",Integer.class,a.id)).isEqualTo(1);
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershell51DistinguishesRealZeroGpaFromNoResults()throws Exception{
        var a=account();var sem=semester(a,1);assertThat(runGpaPowerShell(a,sem)).contains("chưa có kết quả đủ điểm");scored(a,sem,"F",3,0);assertThat(runGpaPowerShell(a,sem)).contains("GPA học kỳ: 0.00 / 4");assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL",Integer.class,a.id)).isEqualTo(1);
    }
    String runGpaPowerShell(Account a,Map<?,?> sem)throws Exception{
        String email=jdbc.queryForObject("SELECT email FROM app_users WHERE id=?",String.class,a.id),ps=Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","powershell.exe").toString();
        String script="[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); function Read-Host { param([string]$Prompt,[switch]$AsSecureString); if ($AsSecureString) { ConvertTo-SecureString $env:GPA_TEST_PASSWORD -AsPlainText -Force } else { $env:GPA_TEST_EMAIL } }; & './scripts/Try-SemesterGpa.ps1' -BaseUrl 'http://127.0.0.1:"+port+"' -SemesterId '"+sem.get("id")+"'";
        var builder=new ProcessBuilder(ps,"-NoProfile","-ExecutionPolicy","Bypass","-Command",script).redirectErrorStream(true);builder.environment().keySet().removeIf(name->name.equalsIgnoreCase("PSModulePath"));builder.environment().put("PSModulePath",Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","Modules").toString());builder.environment().put("GPA_TEST_EMAIL",email);builder.environment().put("GPA_TEST_PASSWORD",SECRET);var process=builder.start();var captured=CompletableFuture.supplyAsync(()->{try{return new String(process.getInputStream().readAllBytes(),StandardCharsets.UTF_8);}catch(java.io.IOException failure){throw new java.io.UncheckedIOException(failure);}});
        try{assertThat(process.waitFor(30,TimeUnit.SECONDS)).isTrue();var output=captured.get(5,TimeUnit.SECONDS);assertThat(process.exitValue()).as(output).isZero();assertThat(output).doesNotContain(SECRET,"accessToken","refreshToken");return output;}finally{if(process.isAlive())process.destroyForcibly();}
    }
}
