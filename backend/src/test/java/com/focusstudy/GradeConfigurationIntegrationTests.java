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
class GradeConfigurationIntegrationTests {
    private static final String SCHEMA = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
    private static final String URL = Objects.requireNonNull(System.getenv("TEST_DB_URL")), USER = System.getenv("TEST_DB_USER"), PASSWORD = System.getenv("TEST_DB_PASSWORD");
    private static final String SECRET = "GradeTest123!", PATH = "/api/v1/grade-configurations", COURSES = "/api/v1/courses";
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
    @Test void emptyAccountAndOwnedCourseDoNotSilentlyCreateSuggestedColumns()throws Exception{
        var a=account();var c=course(a,semester(a,1),"EMPTY");assertThat(list(a,"")).isEmpty();error(send("GET",courseConfig(c.get("id")),a.token,null),404,"GRADE_CONFIGURATION_NOT_FOUND");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM grade_configurations WHERE user_id=?",Integer.class,a.id)).isZero();
    }
    @Test void createReadPersistsTrimmedNamesExactWeightsAndNoScores()throws Exception{
        var a=account();var c=course(a,semester(a,1),"LT");var p=part("tk1","REGULAR");p.put("name","  Thường kỳ số 1  ");
        var response=send("POST",courseConfig(c.get("id")),a.token,input("THEORY",p,part("tk2","REGULAR_TEST"),part("mid","MIDTERM"),part("final","FINAL")));var row=data(response);
        assertThat(response.statusCode()).isEqualTo(201);assertThat(response.headers().firstValue("Location")).contains(item(row));assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");assertThat(body(response).get("meta")).isNotNull();
        assertThat(parts(row).stream().map(x->(Integer)x.get("weightNumerator"))).containsExactly(20,20,30,50);assertThat(parts(row).stream().map(x->(Integer)x.get("weightDenominator"))).containsExactly(2,2,1,1);
        assertThat(parts(row).getFirst().get("name")).isEqualTo("Thường kỳ số 1");assertThat(row.get("state")).isEqualTo("READY");assertThat(row.get("missingGroups")).isEqualTo(List.of());assertThat(row.get("version")).isEqualTo(0);
        assertThat(data(send("GET",item(row),a.token,null))).isEqualTo(row);assertThat(data(send("GET",courseConfig(c.get("id")),a.token,null))).isEqualTo(row);
        assertThat(response.body()).doesNotContain("score","remainderScore","gpa","passed","userId","updateRevision");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM grade_columns WHERE configuration_id=?",Integer.class,UUID.fromString(row.get("id").toString()))).isEqualTo(4);
    }
    @Test void incompleteAndEmptyConfigurationsAreDraftsWithoutRedistributingMissingWeight()throws Exception{
        var a=account();var c=course(a,semester(a,1),"DRAFT");var row=create(a,c,input("THEORY",part("tk","REGULAR")));
        assertThat(row.get("state")).isEqualTo("DRAFT");assertThat(row.get("missingGroups")).isEqualTo(List.of("MIDTERM","FINAL"));assertThat(((Number)parts(row).getFirst().get("weight")).doubleValue()).isEqualTo(20);
        var v=update(row);v.put("parts",List.of());row=data(send("PUT",item(row),a.token,v));assertThat(row.get("missingGroups")).isEqualTo(List.of("REGULAR","MIDTERM","FINAL"));assertThat(parts(row)).isEmpty();
        v=update(row);v.put("assessment","PRACTICAL");row=data(send("PUT",item(row),a.token,v));assertThat(row.get("state")).isEqualTo("DRAFT");assertThat(row.get("missingGroups")).isEqualTo(List.of("PRACTICAL_COLUMNS"));
    }
    @Test void practicalProjectReplacesOneEqualColumnWithoutBeingCountedTwice()throws Exception{
        var a=account();var c=course(a,semester(a,1),"REACT");var row=create(a,c,input("PRACTICAL",part("th1","PRACTICE_REGULAR"),part("th2","PRACTICE_TEST"),project("btl","PRACTICE",100)));
        assertThat(parts(row)).hasSize(3);for(var part:parts(row)){assertThat(part.get("weightNumerator")).isEqualTo(100);assertThat(part.get("weightDenominator")).isEqualTo(3);assertThat(((Number)part.get("weight")).doubleValue()).isCloseTo(100.0/3,within(1e-10));}assertThat(row.get("state")).isEqualTo("READY");
    }
    @Test void projectMayReplaceOrContributeToFinalInEitherAssessment()throws Exception{
        var a=account();var sem=semester(a,1);int number=0;
        for(String assessment:List.of("THEORY","PRACTICAL"))for(Object share:List.of(100,40,new java.math.BigDecimal("33.3333"))){var c=course(a,sem,"BTL"+(number++));var v=assessment.equals("THEORY")?input(assessment,part("tk","REGULAR"),part("mid","MIDTERM"),project("btl","FINAL",share)):input(assessment,part("th","PRACTICE_REGULAR"),project("btl","FINAL",share));var row=create(a,c,v);assertThat(parts(row).getLast().get("project")).isNotNull();assertThat(row.get("state")).isEqualTo("READY");assertThat(((Number)parts(row).getLast().get("weight")).doubleValue()).isEqualTo(50);}
    }
    @Test void customColumnCountIsEditableInsteadOfForcingThreeOrFive()throws Exception{
        var a=account();var c=course(a,semester(a,1),"CUSTOM");var ten=new ArrayList<Map<String,Object>>();for(int i=0;i<10;i++)ten.add(part("th"+i,"PRACTICE_REGULAR"));var v=input("PRACTICAL");v.put("parts",ten);var row=create(a,c,v);assertThat(parts(row)).hasSize(10);assertThat(parts(row).getFirst().get("weightDenominator")).isEqualTo(10);
        var changed=update(row);changed.put("parts",List.of(part("one","PRACTICE_TEST")));row=data(send("PUT",item(row),a.token,changed));assertThat(parts(row)).hasSize(1);assertThat(((Number)parts(row).getFirst().get("weight")).intValue()).isEqualTo(100);
    }
    @Test void reorderedRenamedAndRetainedColumnsKeepInternalIdentity()throws Exception{
        var a=account();var c=course(a,semester(a,1),"ORDER");var row=create(a,c,theory());var ids=jdbc.queryForList("SELECT id,column_key FROM grade_columns WHERE configuration_id=? ORDER BY column_key",UUID.fromString(row.get("id").toString()));
        var v=update(row);var p=part("mid","MIDTERM");p.put("name","Giữa kỳ mới");v.put("parts",List.of(part("final","FINAL"),p,part("regular","REGULAR")));var changed=data(send("PUT",item(row),a.token,v));
        assertThat(parts(changed).stream().map(x->(String)x.get("id"))).containsExactly("final","mid","regular");assertThat(parts(changed).get(1).get("name")).isEqualTo("Giữa kỳ mới");assertThat(changed.get("createdAt")).isEqualTo(row.get("createdAt"));assertThat(changed.get("version")).isEqualTo(1);
        assertThat(jdbc.queryForList("SELECT id,column_key FROM grade_columns WHERE configuration_id=? ORDER BY column_key",UUID.fromString(row.get("id").toString()))).isEqualTo(ids);assertThat(data(send("GET",item(row),a.token,null))).isEqualTo(changed);
    }
    @Test void replacingFinalWithNewProjectAndChangingAssessmentAreAtomic()throws Exception{
        var a=account();var c=course(a,semester(a,1),"REPLACE");var row=create(a,c,theory());var v=update(row);v.put("parts",List.of(part("regular","REGULAR"),part("mid","MIDTERM"),project("new-final","FINAL",40)));row=data(send("PUT",item(row),a.token,v));assertThat(parts(row).getLast().get("id")).isEqualTo("new-final");
        v=update(row);v.put("assessment","PRACTICAL");v.put("parts",List.of(part("regular","PRACTICE_REGULAR"),project("new-final","PRACTICE",100)));row=data(send("PUT",item(row),a.token,v));assertThat(row.get("assessment")).isEqualTo("PRACTICAL");assertThat(parts(row)).hasSize(2);assertThat(jdbc.queryForList("SELECT assessment FROM grade_columns WHERE configuration_id=?",String.class,UUID.fromString(row.get("id").toString()))).containsOnly("PRACTICAL");
    }
    @Test void requiredFieldsBoundsDuplicateKeysAndInvalidEnumsDoNotWrite()throws Exception{
        var a=account();var c=course(a,semester(a,1),"INVALID");
        var invalid=new ArrayList<Map<String,Object>>();for(String key:List.of("assessment","parts")){var v=theory();v.remove(key);invalid.add(v);}var v=theory();v.put("assessment","CUSTOM");invalid.add(v);v=theory();v.put("parts",Collections.nCopies(11,part("x","REGULAR")));invalid.add(v);v=theory();v.put("parts",Arrays.asList((Object)null));invalid.add(v);
        for(String key:List.of("id","name","kind")){var p=part("x","REGULAR");p.remove(key);invalid.add(input("THEORY",p));}
        for(var field:Map.of("id","bad key!","name","x".repeat(201),"kind","UNKNOWN").entrySet()){var p=part("x","REGULAR");p.put(field.getKey(),field.getValue());invalid.add(input("THEORY",p));}
        var blank=part("x","REGULAR");blank.put("name","  ");invalid.add(input("THEORY",blank));invalid.add(input("THEORY",part("x","REGULAR"),part("x","REGULAR_TEST")));
        for(var bad:invalid)assertThat(send("POST",courseConfig(c.get("id")),a.token,bad).statusCode()).as(bad.toString()).isEqualTo(400);assertThat(list(a,"")).isEmpty();
    }
    @Test void theoryPracticeKindsAreSeparatedAndDuplicateFinalOrTheoryMidtermRejected()throws Exception{
        var a=account();var c=course(a,semester(a,1),"ROLES");
        for(String kind:List.of("PRACTICE_REGULAR","PRACTICE_TEST"))error(send("POST",courseConfig(c.get("id")),a.token,input("THEORY",part("x",kind))),400,"INVALID_GRADE_CONFIGURATION");
        for(String kind:List.of("REGULAR","REGULAR_TEST"))error(send("POST",courseConfig(c.get("id")),a.token,input("PRACTICAL",part("x",kind))),400,"INVALID_GRADE_CONFIGURATION");
        for(String mode:List.of("THEORY","PRACTICAL"))for(var columns:List.of(input(mode,part("a","FINAL"),project("b","FINAL",100)),input(mode,project("a","FINAL",100),project("b","FINAL",40))))error(send("POST",courseConfig(c.get("id")),a.token,columns),400,"INVALID_GRADE_CONFIGURATION");
        error(send("POST",courseConfig(c.get("id")),a.token,input("THEORY",part("a","MIDTERM"),part("b","MIDTERM"))),400,"INVALID_GRADE_CONFIGURATION");assertThat(list(a,"")).isEmpty();
        assertThat(parts(create(a,c,input("PRACTICAL",part("a","MIDTERM"),part("b","MIDTERM"))))).hasSize(2);
    }
    @Test void projectRequiresExplicitDestinationAndValidShareNeverGuessedFromCourseName()throws Exception{
        var a=account();var c=course(a,semester(a,1),"WWWJAVA");var invalid=new ArrayList<Map<String,Object>>();invalid.add(input("THEORY",part("btl","PROJECT")));invalid.add(input("THEORY",project("btl","PRACTICE",100)));invalid.add(input("PRACTICAL",project("btl","PRACTICE",40)));
        for(Object share:List.of(0,-1,101,new java.math.BigDecimal("33.33333"),"NaN"))invalid.add(input("THEORY",project("btl","FINAL",share)));
        var p=part("btl","PROJECT");p.put("project",Map.of("target","FINAL"));invalid.add(input("THEORY",p));p=part("btl","PROJECT");p.put("project",Map.of("share",100));invalid.add(input("THEORY",p));p=part("tk","REGULAR");p.put("project",Map.of("target","FINAL","share",100));invalid.add(input("THEORY",p));
        for(var bad:invalid)assertThat(send("POST",courseConfig(c.get("id")),a.token,bad).statusCode()).as(bad.toString()).isEqualTo(400);assertThat(list(a,"")).isEmpty();
    }
    @Test void scoresWeightsOwnershipAndOtherUnknownFieldsAreRejectedRatherThanSilentlyLost()throws Exception{
        var a=account();var c=course(a,semester(a,1),"STRICT");for(String key:List.of("score","weight","userId","courseId","id","version")){var v=theory();v.put(key,0);assertThat(send("POST",courseConfig(c.get("id")),a.token,v).statusCode()).as(key).isEqualTo(400);}
        for(String key:List.of("score","weight","userId")){var p=part("tk","REGULAR");p.put(key,0);assertThat(send("POST",courseConfig(c.get("id")),a.token,input("THEORY",p)).statusCode()).as(key).isEqualTo(400);}
        var p=project("btl","FINAL",40);p.put("project",Map.of("target","FINAL","share",40,"remainderScore",0));assertThat(send("POST",courseConfig(c.get("id")),a.token,input("THEORY",p)).statusCode()).isEqualTo(400);assertThat(list(a,"")).isEmpty();
    }
    @Test void duplicateCreateIsConflictAndDoesNotResetExistingConfiguration()throws Exception{
        var a=account();var c=course(a,semester(a,1),"DUP");var row=create(a,c,theory());error(send("POST",courseConfig(c.get("id")),a.token,input("PRACTICAL")),409,"GRADE_CONFIGURATION_ALREADY_EXISTS");assertThat(data(send("GET",item(row),a.token,null))).isEqualTo(row);
    }
    @Test void otherOwnersAndMissingIdsHaveSame404WithNoMutation()throws Exception{
        var a=account();var b=account();var c=course(a,semester(a,1),"OWNER");var row=create(a,c,theory());
        for(String id:List.of(row.get("id").toString(),UUID.randomUUID().toString())){error(send("GET",PATH+"/"+id,b.token,null),404,"GRADE_CONFIGURATION_NOT_FOUND");error(send("PUT",PATH+"/"+id,b.token,update(row)),404,"GRADE_CONFIGURATION_NOT_FOUND");error(send("DELETE",PATH+"/"+id+"?version=0",b.token,null),404,"GRADE_CONFIGURATION_NOT_FOUND");}
        for(String id:List.of(c.get("id").toString(),UUID.randomUUID().toString())){error(send("GET",courseConfig(id),b.token,null),404,"COURSE_NOT_FOUND");error(send("POST",courseConfig(id),b.token,theory()),404,"COURSE_NOT_FOUND");error(send("GET",PATH+"?courseId="+id,b.token,null),404,"COURSE_NOT_FOUND");}
        assertThat(list(b,"")).isEmpty();assertThat(data(send("GET",item(row),a.token,null))).isEqualTo(row);
    }
    @Test void authenticationMethodAllowListAndMalformedIdsAreEnforced()throws Exception{
        var a=account();var c=course(a,semester(a,1),"AUTH");var row=create(a,c,theory());for(String method:List.of("GET","PUT","DELETE"))assertThat(send(method,item(row)+(method.equals("DELETE")?"?version=0":""),null,method.equals("PUT")?update(row):null).statusCode()).isEqualTo(401);assertThat(send("POST",courseConfig(c.get("id")),null,theory()).statusCode()).isEqualTo(401);assertThat(send("GET",PATH,null,null).statusCode()).isEqualTo(401);
        assertThat(send("PATCH",item(row),a.token,Map.of()).statusCode()).isEqualTo(403);for(String query:List.of("?courseId=bad","?semesterId=bad"))assertThat(send("GET",PATH+query,a.token,null).statusCode()).isEqualTo(400);assertThat(send("GET",PATH+"/bad",a.token,null).statusCode()).isEqualTo(400);
    }
    @Test void listFiltersUseAccountCourseAndSemesterTogether()throws Exception{
        var a=account();var b=account();var s1=semester(a,1);var s2=semester(a,2);var c=course(a,s1,"SAME");var d=course(a,s2,"SAME");var one=create(a,c,theory());var two=create(a,d,input("PRACTICAL",part("th","PRACTICE_REGULAR")));create(b,course(b,semester(b,1),"SAME"),theory());
        assertThat(list(a,"")).hasSize(2);assertThat(list(a,"?semesterId="+s1.get("id"))).isEqualTo(List.of(one));assertThat(list(a,"?courseId="+d.get("id"))).isEqualTo(List.of(two));assertThat(list(a,"?courseId="+c.get("id")+"&semesterId="+s2.get("id"))).isEmpty();error(send("GET",PATH+"?semesterId="+s1.get("id"),b.token,null),404,"SEMESTER_NOT_FOUND");
    }
    @Test void identicalAndChildOnlyUpdatesConsumeVersionAndRejectStaleEditsAndDeletes()throws Exception{
        var a=account();var c=course(a,semester(a,1),"VERSION");var row=create(a,c,theory());var next=data(send("PUT",item(row),a.token,update(row)));assertThat(next.get("version")).isEqualTo(1);error(send("PUT",item(row),a.token,update(row)),409,"GRADE_CONFIGURATION_VERSION_CONFLICT");error(send("DELETE",item(row)+"?version=0",a.token,null),409,"GRADE_CONFIGURATION_VERSION_CONFLICT");var v=update(next);v.put("parts",List.of(part("new","REGULAR")));assertThat(data(send("PUT",item(row),a.token,v)).get("version")).isEqualTo(2);
    }
    @Test void badReplacementRollsBackAllColumnsAssessmentAndVersion()throws Exception{
        var a=account();var c=course(a,semester(a,1),"ROLLBACK");var row=create(a,c,theory());var v=update(row);v.put("assessment","PRACTICAL");v.put("parts",List.of(part("new","PRACTICE_REGULAR"),project("a","FINAL",100),part("b","FINAL")));error(send("PUT",item(row),a.token,v),400,"INVALID_GRADE_CONFIGURATION");assertThat(data(send("GET",item(row),a.token,null))).isEqualTo(row);assertThat(jdbc.queryForList("SELECT column_key FROM grade_columns WHERE configuration_id=? ORDER BY position",String.class,UUID.fromString(row.get("id").toString()))).containsExactly("regular","mid","final");
    }
    @Test void versionMustBePresentNonNegativeIntegralAndWithinLongRange()throws Exception{
        var a=account();var c=course(a,semester(a,1),"BADVERSION");var row=create(a,c,theory());for(Object version:List.of(-1,1.5,"9223372036854775808")){var v=update(row);v.put("version",version);assertThat(send("PUT",item(row),a.token,v).statusCode()).isEqualTo(400);}var v=update(row);v.remove("version");assertThat(send("PUT",item(row),a.token,v).statusCode()).isEqualTo(400);for(String suffix:List.of("","?version=-1","?version=0.5","?version=9223372036854775808"))assertThat(send("DELETE",item(row)+suffix,a.token,null).statusCode()).isEqualTo(400);assertThat(data(send("GET",item(row),a.token,null))).isEqualTo(row);
    }
    @Test void deletingConfigurationRemovesOnlyItsColumnsAndRecreationUsesNewIdentity()throws Exception{
        var a=account();var c=course(a,semester(a,1),"DELETE");var row=create(a,c,theory());var second=create(a,course(a,semester(a,2),"OTHER"),theory());var response=send("DELETE",item(row)+"?version=0",a.token,null);assertThat(response.statusCode()).isEqualTo(204);assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");assertThat(response.body()).isEmpty();assertThat(data(send("GET",COURSES+"/"+c.get("id"),a.token,null)).get("id")).isEqualTo(c.get("id"));assertThat(data(send("GET",item(second),a.token,null))).isEqualTo(second);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM grade_columns WHERE configuration_id=?",Integer.class,UUID.fromString(row.get("id").toString()))).isZero();var recreated=create(a,c,theory());assertThat(recreated.get("id")).isNotEqualTo(row.get("id"));error(send("PUT",item(row),a.token,update(row)),404,"GRADE_CONFIGURATION_NOT_FOUND");assertThat(recreated.get("version")).isEqualTo(0);
    }
    @Test void courseDeleteAndSemesterMoveAreBlockedUntilConfigurationIsRemoved()throws Exception{
        var a=account();var c=course(a,semester(a,1),"GUARD");var target=semester(a,2);var row=create(a,c,input("THEORY"));var move=courseUpdate(c);move.put("semesterId",target.get("id"));error(send("DELETE",COURSES+"/"+c.get("id")+"?version=0",a.token,null),409,"COURSE_HAS_GRADE_CONFIGURATION");error(send("PUT",COURSES+"/"+c.get("id"),a.token,move),409,"COURSE_HAS_GRADE_CONFIGURATION");assertThat(send("DELETE",item(row)+"?version=0",a.token,null).statusCode()).isEqualTo(204);assertThat(data(send("PUT",COURSES+"/"+c.get("id"),a.token,move)).get("semesterId")).isEqualTo(target.get("id"));
    }
    @Test void courseDisplayChangesKeepConfigurationColumnsAndTheirIdentity()throws Exception{
        var a=account();var c=course(a,semester(a,1),"META");var row=create(a,c,theory());var change=courseUpdate(c);change.put("name","Tên môn mới");change.put("credits",4);data(send("PUT",COURSES+"/"+c.get("id"),a.token,change));assertThat(data(send("GET",item(row),a.token,null))).isEqualTo(row);
    }
    @Test void concurrentCreatesHaveOneWinnerWithoutDuplicateHeaders()throws Exception{
        var a=account();var c=course(a,semester(a,1),"RACEPOST");var result=concurrent(()->send("POST",courseConfig(c.get("id")),a.token,theory()),()->send("POST",courseConfig(c.get("id")),a.token,theory()));assertThat(result.stream().map(HttpResponse::statusCode)).containsExactlyInAnyOrder(201,409);assertThat(list(a,"")).hasSize(1);
    }
    @Test void concurrentIdenticalReplacementsHaveOneWinner()throws Exception{
        var a=account();var c=course(a,semester(a,1),"RACEPUT");var row=create(a,c,theory());var result=concurrent(()->send("PUT",item(row),a.token,update(row)),()->send("PUT",item(row),a.token,update(row)));assertThat(result.stream().map(HttpResponse::statusCode)).containsExactlyInAnyOrder(200,409);assertThat(data(send("GET",item(row),a.token,null)).get("version")).isEqualTo(1);
    }
    @Test void concurrentDeleteAndReplacementCannotResurrectOldConfig()throws Exception{
        var a=account();var c=course(a,semester(a,1),"RACEDELETE");var row=create(a,c,theory());var result=concurrent(()->send("DELETE",item(row)+"?version=0",a.token,null),()->send("PUT",item(row),a.token,update(row)));if(result.getFirst().statusCode()==204)error(result.getLast(),404,"GRADE_CONFIGURATION_NOT_FOUND");else{error(result.getFirst(),409,"GRADE_CONFIGURATION_VERSION_CONFLICT");assertThat(result.getLast().statusCode()).isEqualTo(200);}
    }
    @Test void concurrentCourseDeleteAndCreateCannotOrphanConfiguration()throws Exception{
        var a=account();var c=course(a,semester(a,1),"RACECOURSE");var result=concurrent(()->send("DELETE",COURSES+"/"+c.get("id")+"?version=0",a.token,null),()->send("POST",courseConfig(c.get("id")),a.token,theory()));if(result.getFirst().statusCode()==204)error(result.getLast(),404,"COURSE_NOT_FOUND");else{error(result.getFirst(),409,"COURSE_HAS_GRADE_CONFIGURATION");assertThat(result.getLast().statusCode()).isEqualTo(201);}
    }
    @Test void concurrentCourseMoveAndCreateStayInOneConfirmedSemester()throws Exception{
        var a=account();var s1=semester(a,1);var target=semester(a,2);var c=course(a,s1,"RACEMOVE");var move=courseUpdate(c);move.put("semesterId",target.get("id"));var result=concurrent(()->send("PUT",COURSES+"/"+c.get("id"),a.token,move),()->send("POST",courseConfig(c.get("id")),a.token,theory()));assertThat(result.getLast().statusCode()).isEqualTo(201);if(result.getFirst().statusCode()==200)assertThat(list(a,"?semesterId="+target.get("id"))).hasSize(1);else{error(result.getFirst(),409,"COURSE_HAS_GRADE_CONFIGURATION");assertThat(list(a,"?semesterId="+s1.get("id"))).hasSize(1);}
    }
    @Test void concurrentReadsKeepColumnNamesAndHeaderVersionFromOneSnapshot()throws Exception{
        var a=account();var c=course(a,semester(a,1),"READSNAPSHOT");var p=part("tk","REGULAR");p.put("name","Revision 0");var row=create(a,c,input("THEORY",p));
        var results=concurrent(()->{HttpResponse<String> response=null;for(int revision=1;revision<=12;revision++){var column=part("tk","REGULAR");column.put("name","Revision "+revision);var v=input("THEORY",column);v.put("version",revision-1);response=send("PUT",item(row),a.token,v);data(response);}return response;},()->{HttpResponse<String> response=null;for(int i=0;i<36;i++){response=send("GET",item(row),a.token,null);var read=data(response);assertThat(parts(read).getFirst().get("name")).isEqualTo("Revision "+read.get("version"));}return response;});
        assertThat(results.stream().map(HttpResponse::statusCode)).containsOnly(200);assertThat(data(send("GET",item(row),a.token,null)).get("version")).isEqualTo(12);
    }
    @Test void databaseConstraintsAlsoProtectOwnerRolesSharesAndDuplicateFinals()throws Exception{
        var a=account();var b=account();var c=course(a,semester(a,1),"DBCHECK");var row=create(a,c,theory());var id=UUID.fromString(row.get("id").toString());
        String sql="INSERT INTO grade_columns(id,configuration_id,user_id,assessment,column_key,position,name,kind,project_target,project_share) VALUES (?,?,?,?,?,?,?,?,?,?)";
        for(Object[] values:List.of(
                new Object[]{UUID.randomUUID(),id,b.id,"THEORY","foreign-owner",3,"Bad owner","REGULAR",null,null},
                new Object[]{UUID.randomUUID(),id,a.id,"THEORY","wrong-role",3,"Wrong role","PRACTICE_REGULAR",null,null},
                new Object[]{UUID.randomUUID(),id,a.id,"PRACTICAL","wrong-assessment",3,"Wrong assessment","PRACTICE_REGULAR",null,null},
                new Object[]{UUID.randomUUID(),id,a.id,"THEORY","second-final",3,"Duplicate final","PROJECT","FINAL",100},
                new Object[]{UUID.randomUUID(),id,a.id,"THEORY","regular",3,"Duplicate key","REGULAR",null,null},
                new Object[]{UUID.randomUUID(),id,a.id,"THEORY","outside-position",10,"Outside position","REGULAR",null,null},
                new Object[]{UUID.randomUUID(),id,a.id,"THEORY","missing-share",3,"Missing share","PROJECT","FINAL",null}))
            assertThatThrownBy(()->jdbc.update(sql,values)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThat(data(send("GET",item(row),a.token,null))).isEqualTo(row);
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershell51SamplesExerciseCrudAndOnlyCloseTheirOwnSession()throws Exception{
        var a=account();var sem=semester(a,1);var c=course(a,sem,"PS51");String email=jdbc.queryForObject("SELECT email FROM app_users WHERE id=?",String.class,a.id),id=null;long version=0;
        for(String mode:List.of("Create","List","Get","Update","GetCourse","Delete")){
            String arguments=" -Mode "+(mode.equals("GetCourse")?"Get":mode)+" -CourseId '"+c.get("id")+"'";
            if(List.of("Get","Update","Delete").contains(mode))arguments+=" -ConfigurationId '"+id+"' -Version "+version;
            if(mode.equals("List"))arguments+=" -SemesterId '"+sem.get("id")+"'";
            if(mode.equals("Create"))arguments+=" -InputFile './api/samples/grade-configurations/react-project-practice.json'";
            if(mode.equals("Update"))arguments+=" -InputFile './api/samples/grade-configurations/theory-project-partial-final.json'";
            var process=startPowerShell(a,email,"& './scripts/Try-GradeConfigurations.ps1' -BaseUrl 'http://127.0.0.1:"+port+"'"+arguments);
            try{assertThat(process.waitFor(30,TimeUnit.SECONDS)).isTrue();String output=new String(process.getInputStream().readAllBytes(),StandardCharsets.UTF_8);assertThat(process.exitValue()).as(output).isZero();assertThat(output).doesNotContain(SECRET,"accessToken","refreshToken");if(!mode.equals("Delete")){var current=jdbc.queryForMap("SELECT id,version,assessment FROM grade_configurations WHERE user_id=?",a.id);id=current.get("id").toString();version=((Number)current.get("version")).longValue();if(mode.equals("Update")){assertThat(current.get("assessment")).isEqualTo("THEORY");assertThat(output).contains("BTL góp vào cuối kỳ");}}}finally{if(process.isAlive())process.destroyForcibly();}
        }
        assertThat(list(a,"")).isEmpty();assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL",Integer.class,a.id)).isEqualTo(1);
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershellRejectsScoreFilesBeforeLoginAndShowsApiErrorsWithoutSecrets()throws Exception{
        var a=account();String email=jdbc.queryForObject("SELECT email FROM app_users WHERE id=?",String.class,a.id);var c=course(a,semester(a,1),"PSERROR");var row=create(a,c,theory());
        var file=Files.createTempFile("grade-config-scores-",".json");
        try{
            Files.writeString(file,"{\"assessment\":\"THEORY\",\"parts\":[{\"id\":\"tk\",\"name\":\"TK\",\"kind\":\"REGULAR\",\"score\":0}]}",StandardCharsets.UTF_8);
            String common="& './scripts/Try-GradeConfigurations.ps1' -BaseUrl 'http://127.0.0.1:"+port+"'";
            for(String command:List.of(common+" -Mode Create -CourseId '"+c.get("id")+"' -InputFile '"+file.toString().replace("'","''")+"'",common+" -Mode Delete -ConfigurationId '"+row.get("id")+"' -Version 9")){
                var process=startPowerShell(a,email,command);try{assertThat(process.waitFor(30,TimeUnit.SECONDS)).isTrue();String output=new String(process.getInputStream().readAllBytes(),StandardCharsets.UTF_8);assertThat(process.exitValue()).as(output).isNotZero();assertThat(output).doesNotContain(SECRET,"accessToken","refreshToken");if(command.contains("Delete"))assertThat(output).contains("GRADE_CONFIGURATION_VERSION_CONFLICT");}finally{if(process.isAlive())process.destroyForcibly();}
            }
        }finally{Files.deleteIfExists(file);}
        assertThat(data(send("GET",item(row),a.token,null))).isEqualTo(row);assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL",Integer.class,a.id)).isEqualTo(1);
    }
    Process startPowerShell(Account a,String email,String command)throws Exception{
        String ps=Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","powershell.exe").toString();
        String script="[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); function Read-Host { param([string]$Prompt,[switch]$AsSecureString); if ($AsSecureString) { ConvertTo-SecureString $env:GRADE_TEST_PASSWORD -AsPlainText -Force } else { $env:GRADE_TEST_EMAIL } }; "+command;
        var builder=new ProcessBuilder(ps,"-NoProfile","-ExecutionPolicy","Bypass","-Command",script).redirectErrorStream(true);builder.environment().keySet().removeIf(name->name.equalsIgnoreCase("PSModulePath"));builder.environment().put("PSModulePath",Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","Modules").toString());builder.environment().put("GRADE_TEST_EMAIL",email);builder.environment().put("GRADE_TEST_PASSWORD",SECRET);return builder.start();
    }
}
