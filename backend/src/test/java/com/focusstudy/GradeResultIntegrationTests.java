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
class GradeResultIntegrationTests {
    private static final String SCHEMA = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
    private static final String URL = Objects.requireNonNull(System.getenv("TEST_DB_URL")), USER = System.getenv("TEST_DB_USER"), PASSWORD = System.getenv("TEST_DB_PASSWORD");
    private static final String SECRET = "ResultTest123!", PATH = "/api/v1/grade-configurations", COURSES = "/api/v1/courses";
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
    @Test void readIncludesSameSnapshotPolicyAndNullsWithoutChangingAnyVersion()throws Exception{
        var a=account();var row=book(a,"EMPTY");var response=send("GET",reportPath(row),a.token,null);var value=data(response);var r=calculation(value);
        assertThat(value.get("credits")).isEqualTo(3);assertThat(value.get("courseVersion")).isEqualTo(0);assertThat(value.get("scores")).isEqualTo(read(a,row));assertThat(((Map<?,?>)value.get("policy")).get("id")).isEqualTo("IUH_2023_REPORTED_V1");assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");assertThat(body(response).get("meta")).isNotNull();assertThat(r.get("status")).isEqualTo("INCOMPLETE_SCORES");assertThat(r.get("total")).isNull();assertThat(r.get("letter")).isNull();assertThat(r.get("passed")).isNull();assertThat(report(a,row)).isEqualTo(value);assertThat(data(send("GET",item(row),a.token,null)).get("version")).isEqualTo(0);assertThat(response.body()).doesNotContain("password","userId","refreshToken","gpa");
    }
    @Test void savedTheoryNumbersProduceExpectedTotalLetterAndRetakeFlag()throws Exception{
        var a=account();var row=book(a,"THEORY");save(a,row,values(row,8,8,8.5));var root=report(a,row);var r=calculation(root);assertThat(((Number)r.get("total")).doubleValue()).isEqualTo(8.3);assertThat(r.get("letter")).isEqualTo("B+");assertThat(((Number)r.get("gradePoint")).doubleValue()).isEqualTo(3.5);assertThat(r.get("passed")).isEqualTo(true);assertThat(r.get("needsRetake")).isEqualTo(false);assertThat(((Map<?,?>)root.get("scores")).get("version")).isEqualTo(1);
    }
    @Test void finalBelowThreeAndExactlyThreeSwitchBranchesFromSavedValues()throws Exception{
        var a=account();var row=book(a,"FINAL");var saved=save(a,row,values(row,10,10,2.9));var r=calculation(report(a,row));assertThat(((Number)r.get("total")).doubleValue()).isEqualTo(2.9);assertThat(r.get("reason")).isEqualTo("FINAL_BELOW_3");assertThat(r.get("letter")).isEqualTo("F");assertThat(r.get("needsRetake")).isEqualTo(true);save(a,row,values(saved,10,10,3));r=calculation(report(a,row));assertThat(((Number)r.get("total")).doubleValue()).isEqualTo(6.5);assertThat(r.get("status")).isEqualTo("PASSED");
    }
    @Test void zeroMidtermBlocksButMissingMidtermDoesNotBecomeZero()throws Exception{
        var a=account();var row=book(a,"MID");var saved=save(a,row,values(row,8,0,8));var r=calculation(report(a,row));assertThat(r.get("status")).isEqualTo("EXAM_BLOCKED");for(String key:List.of("total","letter","gradePoint","passed","needsRetake"))assertThat(r.get(key)).isNull();save(a,row,values(saved,8,null,8));r=calculation(report(a,row));assertThat(r.get("status")).isEqualTo("INCOMPLETE_SCORES");assertThat(r.get("examEligibility")).isEqualTo("UNKNOWN");
    }
    @Test void incompleteKnownFailedFinalHasNoInventedTotalOrGradePoint()throws Exception{
        var a=account();var row=book(a,"PARTIALFAIL");save(a,row,values(row,null,7,2.9));var r=calculation(report(a,row));assertThat(r.get("status")).isEqualTo("FAILED");assertThat(r.get("complete")).isEqualTo(false);assertThat(r.get("total")).isNull();assertThat(r.get("gradePoint")).isNull();assertThat(r.get("needsRetake")).isEqualTo(true);
    }
    @Test void splitRegularAverageRoundsAtComponentBoundaryBeforeWeighting()throws Exception{
        var a=account();var row=create(a,course(a,semester(a,1),"SPLIT"),input("THEORY",part("a","REGULAR"),part("b","REGULAR_TEST"),part("mid","MIDTERM"),part("final","FINAL")));save(a,row,values(row,7.9,8,7.5,8));var r=calculation(report(a,row));assertThat(((Number)r.get("regularAverage")).doubleValue()).isEqualTo(8);assertThat(((Number)r.get("total")).doubleValue()).isEqualTo(7.9);
    }
    @Test void partialFinalProjectCombinesScoresOnceAndListsMissingRemainder()throws Exception{
        var a=account();var row=create(a,course(a,semester(a,1),"BTL"),input("THEORY",part("tk","REGULAR"),part("mid","MIDTERM"),project("btl","FINAL",40)));var saved=save(a,row,customValues(row,mark("tk",8,null),mark("mid",8,null),mark("btl",8,6)));var r=calculation(report(a,row));assertThat(((Number)r.get("finalExamScore")).doubleValue()).isEqualTo(6.8);assertThat(((Number)r.get("total")).doubleValue()).isEqualTo(7.4);save(a,row,customValues(saved,mark("tk",8,null),mark("mid",8,null),mark("btl",8,null)));r=calculation(report(a,row));assertThat(r.get("total")).isNull();assertThat(r.get("missingScores")).isEqualTo(List.of(Map.of("columnId","btl","field","REMAINDER_SCORE")));
    }
    @Test void practicalProjectAndCustomColumnCountUseActualEqualAverage()throws Exception{
        var a=account();var c=course(a,semester(a,1),"REACT");var row=create(a,c,input("PRACTICAL",part("th1","PRACTICE_REGULAR"),part("th2","PRACTICE_TEST"),project("btl","PRACTICE",100)));save(a,row,values(row,6,8,10));var root=report(a,row);var r=calculation(root);assertThat(((Number)r.get("total")).doubleValue()).isEqualTo(8);assertThat(r.get("examEligibility")).isEqualTo("NOT_EVALUATED");assertThat(((List<?>)r.get("notices")).stream().map(x->((Map<?,?>)x).get("code").toString())).containsExactly("CUSTOM_PRACTICAL_COLUMN_COUNT");
    }
    @Test void changedCourseCreditsAreCapturedAlongsideDerivedResultWithoutChangingScoreVersion()throws Exception{
        var a=account();var c=course(a,semester(a,1),"CREDITS");var row=create(a,c,input("PRACTICAL",part("a","PRACTICE_REGULAR"),part("b","PRACTICE_REGULAR"),part("c","PRACTICE_TEST")));save(a,row,values(row,6,8,10));var change=courseUpdate(c);change.put("credits",2);data(send("PUT",COURSES+"/"+c.get("id"),a.token,change));var root=report(a,row);assertThat(root.get("credits")).isEqualTo(2);assertThat(root.get("courseVersion")).isEqualTo(1);assertThat(((Map<?,?>)root.get("scores")).get("version")).isEqualTo(1);assertThat((List<?>)calculation(root).get("notices")).isEmpty();
    }
    @Test void draftWithEnteredMarksCannotProduceAResultFromRemainingWeightsOnly()throws Exception{
        var a=account();var row=create(a,course(a,semester(a,1),"DRAFT"),input("THEORY",part("tk","REGULAR")));save(a,row,values(row,10));var r=calculation(report(a,row));assertThat(r.get("status")).isEqualTo("INCOMPLETE_CONFIGURATION");assertThat(r.get("total")).isNull();assertThat(r.get("missingGroups")).isEqualTo(List.of("MIDTERM","FINAL"));
    }
    @Test void clearingScoresRemovesOldDerivedPassWithoutStoringAResult()throws Exception{
        var a=account();var row=book(a,"CLEAR");var saved=save(a,row,values(row,8,8,8));assertThat(calculation(report(a,row)).get("status")).isEqualTo("PASSED");save(a,row,values(saved));var r=calculation(report(a,row));assertThat(r.get("status")).isEqualTo("INCOMPLETE_SCORES");assertThat(r.get("total")).isNull();
    }
    @Test void renameAndReorderChangeSnapshotWithoutChangingCalculatedTotal()throws Exception{
        var a=account();var row=book(a,"RENAME");save(a,row,values(row,8,8,8.5));var current=data(send("GET",item(row),a.token,null));var edit=update(current);var regular=part("regular","REGULAR");regular.put("name","Điểm thường kỳ mới");edit.put("parts",List.of(part("final","FINAL"),regular,part("mid","MIDTERM")));data(send("PUT",item(row),a.token,edit));var root=report(a,row);assertThat(((Number)calculation(root).get("total")).doubleValue()).isEqualTo(8.3);assertThat(((Map<?,?>)root.get("scores")).get("version")).isEqualTo(2);assertThat(parts((Map<?,?>)root.get("scores")).get(1).get("name")).isEqualTo("Điểm thường kỳ mới");
    }
    @Test void otherOwnersMissingAndDeletedConfigurationsReturnSame404()throws Exception{
        var a=account();var b=account();var row=book(a,"OWNER");for(String id:List.of(row.get("id").toString(),UUID.randomUUID().toString()))error(send("GET",PATH+"/"+id+"/result",b.token,null),404,"GRADE_CONFIGURATION_NOT_FOUND");assertThat(send("DELETE",item(row)+"?version=0",a.token,null).statusCode()).isEqualTo(204);error(send("GET",reportPath(row),a.token,null),404,"GRADE_CONFIGURATION_NOT_FOUND");
    }
    @Test void authenticationAndGetOnlyEndpointDoNotAcceptClientComputedResults()throws Exception{
        var a=account();var row=book(a,"AUTH");assertThat(send("GET",reportPath(row),null,null).statusCode()).isEqualTo(401);for(String method:List.of("POST","PUT","PATCH","DELETE"))assertThat(send(method,reportPath(row),a.token,Map.of("total",10,"passed",true)).statusCode()).isEqualTo(403);assertThat(send("GET",PATH+"/bad/result",a.token,null).statusCode()).isEqualTo(400);assertThat(read(a,row).get("version")).isEqualTo(0);
    }
    @Test void concurrentResultsAlwaysMatchTheVersionAndMarksReturnedInThatSnapshot()throws Exception{
        var a=account();var row=book(a,"SNAPSHOT");save(a,row,values(row,4,4,4));var results=concurrent(()->{HttpResponse<String> r=null;for(int version=2;version<=7;version++){var v=values(row,version+3,version+3,version+3);v.put("version",version-1);r=send("PUT",scores(row),a.token,v);data(r);}return r;},()->{HttpResponse<String> r=null;for(int i=0;i<24;i++){r=send("GET",reportPath(row),a.token,null);var root=data(r);var snapshot=(Map<?,?>)root.get("scores");int expected=((Number)snapshot.get("version")).intValue()+3;for(var p:parts(snapshot))assertThat(((Number)p.get("score")).intValue()).isEqualTo(expected);assertThat(((Number)calculation(root).get("total")).doubleValue()).isEqualTo(expected);}return r;});assertThat(results.stream().map(HttpResponse::statusCode)).containsOnly(200);
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershell51ReadsComputedResultInVietnameseAndClosesOnlyItsOwnSession()throws Exception{
        var a=account();var row=book(a,"PSRESULT");save(a,row,values(row,10,10,2.9));String email=jdbc.queryForObject("SELECT email FROM app_users WHERE id=?",String.class,a.id);
        String ps=Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","powershell.exe").toString();
        String script="[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); function Read-Host { param([string]$Prompt,[switch]$AsSecureString); if ($AsSecureString) { ConvertTo-SecureString $env:RESULT_TEST_PASSWORD -AsPlainText -Force } else { $env:RESULT_TEST_EMAIL } }; & './scripts/Try-GradeResults.ps1' -BaseUrl 'http://127.0.0.1:"+port+"' -ConfigurationId '"+row.get("id")+"'";
        var builder=new ProcessBuilder(ps,"-NoProfile","-ExecutionPolicy","Bypass","-Command",script).redirectErrorStream(true);builder.environment().keySet().removeIf(name->name.equalsIgnoreCase("PSModulePath"));builder.environment().put("PSModulePath",Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","Modules").toString());builder.environment().put("RESULT_TEST_EMAIL",email);builder.environment().put("RESULT_TEST_PASSWORD",SECRET);var process=builder.start(); var captured=CompletableFuture.supplyAsync(()->{try{return new String(process.getInputStream().readAllBytes(),StandardCharsets.UTF_8);}catch(java.io.IOException failure){throw new java.io.UncheckedIOException(failure);}});
        try{assertThat(process.waitFor(30,TimeUnit.SECONDS)).isTrue();String output=captured.get(5,TimeUnit.SECONDS);assertThat(process.exitValue()).as(output).isZero();assertThat(output).contains("Không đạt","FINAL_BELOW_3","2.9");assertThat(output).doesNotContain(SECRET,"accessToken","refreshToken");}finally{if(process.isAlive())process.destroyForcibly();}
        assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL",Integer.class,a.id)).isEqualTo(1);assertThat(read(a,row).get("version")).isEqualTo(1);
    }
}
