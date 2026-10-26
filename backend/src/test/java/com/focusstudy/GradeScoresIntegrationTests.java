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
class GradeScoresIntegrationTests {
    private static final String SCHEMA = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
    private static final String URL = Objects.requireNonNull(System.getenv("TEST_DB_URL")), USER = System.getenv("TEST_DB_USER"), PASSWORD = System.getenv("TEST_DB_PASSWORD");
    private static final String SECRET = "ScoreTest123!", PATH = "/api/v1/grade-configurations", COURSES = "/api/v1/courses";
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
    @Test void freshConfigurationExposesNullValuesNotImplicitZeros()throws Exception{
        var a=account();var row=book(a,"EMPTY");var response=send("GET",scores(row),a.token,null);var actual=data(response);
        assertThat(actual.get("configurationId")).isEqualTo(row.get("id"));assertThat(actual.get("version")).isEqualTo(0);assertThat(actual.get("hasScores")).isEqualTo(false);assertThat(actual.get("configurationState")).isEqualTo("READY");assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");assertThat(body(response).get("meta")).isNotNull();
        for(var part:parts(actual)){assertThat(part.containsKey("score")).isTrue();assertThat(part.get("score")).isNull();assertThat(part.get("remainderScore")).isNull();}
        assertThat(response.body()).doesNotContain("gpa","passed","failed","total","userId","password","updateRevision");
    }
    @Test void zeroAndUnenteredRemainDifferentInResponseAndPostgres()throws Exception{
        var a=account();var row=book(a,"ZERO");var response=send("PUT",scores(row),a.token,values(row,0,null,10));var saved=data(response);
        assertThat(saved.get("version")).isEqualTo(1);assertThat(saved.get("hasScores")).isEqualTo(true);assertThat(parts(saved).get(0).get("score")).isEqualTo(0);assertThat(parts(saved).get(1).get("score")).isNull();assertThat(parts(saved).get(2).get("score")).isEqualTo(10);assertThat(read(a,row)).isEqualTo(saved);
        assertThat(jdbc.queryForObject("SELECT score IS NULL FROM grade_columns WHERE configuration_id=? AND column_key='mid'",Boolean.class,UUID.fromString(row.get("id").toString()))).isTrue();assertThat(jdbc.queryForObject("SELECT score FROM grade_columns WHERE configuration_id=? AND column_key='regular'",java.math.BigDecimal.class,UUID.fromString(row.get("id").toString()))).isEqualByComparingTo("0");
    }
    @Test void decimalPrecisionIsPreservedAndJsonIsStableAfterRead()throws Exception{
        var a=account();var row=book(a,"PRECISION");var saved=save(a,row,values(row,new java.math.BigDecimal("8.1234"),new java.math.BigDecimal("0.0001"),new java.math.BigDecimal("10.0000")));assertThat(read(a,row)).isEqualTo(saved);assertThat(((Number)parts(saved).getFirst().get("score")).doubleValue()).isEqualTo(8.1234);assertThat(parts(saved).getLast().get("score")).isEqualTo(10);
    }
    @Test void eachProjectDestinationStoresScoresAndPartialFinalStoresRemainder()throws Exception{
        var a=account();var sem=semester(a,1);int sequence=0;
        for(String mode:List.of("THEORY","PRACTICAL"))for(int share:List.of(40,100)){var c=course(a,sem,"P"+(sequence++));var row=create(a,c,input(mode,project("btl","FINAL",share)));var saved=save(a,row,customValues(row,mark("btl",8,share==40?7:null)));assertThat(parts(saved).getFirst().get("score")).isEqualTo(8);assertThat(parts(saved).getFirst().get("remainderScore")).isEqualTo(share==40?7:null);assertThat(read(a,row)).isEqualTo(saved);}
        var row=create(a,course(a,sem,"REACT"),input("PRACTICAL",project("btl","PRACTICE",100)));assertThat(parts(save(a,row,values(row,9))).getFirst().get("score")).isEqualTo(9);
    }
    @Test void remainderCanBeEnteredBeforeProjectMarkAndZeroStillCountsAsData()throws Exception{
        var a=account();var row=create(a,course(a,semester(a,1),"REMAINDER"),input("THEORY",project("btl","FINAL",40)));var saved=save(a,row,customValues(row,mark("btl",null,0)));assertThat(saved.get("hasScores")).isEqualTo(true);assertThat(parts(saved).getFirst().get("score")).isNull();assertThat(parts(saved).getFirst().get("remainderScore")).isEqualTo(0);assertThat(read(a,row)).isEqualTo(saved);
    }
    @Test void ordinaryAndWholeProjectColumnsCannotStoreRemainder()throws Exception{
        var a=account();var sem=semester(a,1);int sequence=0;
        for(var v:List.of(input("THEORY",part("x","REGULAR")),input("THEORY",project("x","FINAL",100)),input("PRACTICAL",project("x","PRACTICE",100)))){var row=create(a,course(a,sem,"NOREM"+(sequence++)),v);error(send("PUT",scores(row),a.token,customValues(row,mark("x",8,0))),400,"INVALID_GRADE_SCORES");assertThat(read(a,row).get("hasScores")).isEqualTo(false);assertThat(read(a,row).get("version")).isEqualTo(0);}
    }
    @Test void missingNullValueFieldsAreRejectedInsteadOfClearingExistingMarks()throws Exception{
        var a=account();var row=book(a,"PRESENCE");var saved=save(a,row,values(row,8,7,6));
        for(String key:List.of("score","remainderScore")){var v=values(saved,9,9,9);var marks=(List<Map<String,Object>>)v.get("parts");marks.get(0).remove(key);error(send("PUT",scores(row),a.token,v),400,"INVALID_GRADE_SCORES");assertThat(read(a,row)).isEqualTo(saved);}
    }
    @Test void duplicateUnknownForeignAndMissingColumnKeysRejectWholeReplacement()throws Exception{
        var a=account();var row=book(a,"KEYS");var foreign=create(a,course(a,semester(a,2),"OTHER"),input("THEORY",part("other-column","REGULAR")));var saved=save(a,row,values(row,5,6,7));
        for(var v:List.of(customValues(saved,mark("regular",9,null),mark("regular",8,null),mark("final",7,null)),customValues(saved,mark("other-column",9,null),mark("mid",8,null),mark("final",7,null)),customValues(saved,mark("unknown",9,null),mark("mid",8,null),mark("final",7,null)),customValues(saved,mark("regular",9,null),mark("mid",8,null)))){error(send("PUT",scores(row),a.token,v),400,"INVALID_GRADE_SCORES");assertThat(read(a,row)).isEqualTo(saved);}assertThat(read(a,foreign).get("hasScores")).isEqualTo(false);
    }
    @Test void invalidScoreRangePrecisionAndTypesDoNotPartiallyWrite()throws Exception{
        var a=account();var row=book(a,"BOUNDS");var saved=save(a,row,values(row,8,7,6));
        for(Object invalid:List.of(-1,10.0001,new java.math.BigDecimal("0.12345"),"bad","NaN",Map.of("value",8),List.of(8),true)){var r=send("PUT",scores(row),a.token,values(saved,9,invalid,9));assertThat(r.statusCode()).as(invalid.toString()).isEqualTo(400);assertThat(read(a,row)).isEqualTo(saved);}
        var c=course(a,semester(a,2),"PARTIAL");var partial=create(a,c,input("THEORY",project("btl","FINAL",40)));for(Object invalid:List.of(-1,10.1,new java.math.BigDecimal("8.12345"),"bad"))assertThat(send("PUT",scores(partial),a.token,customValues(partial,mark("btl",8,invalid))).statusCode()).isEqualTo(400);
    }
    @Test void requiredVersionListSizeAndNullPartsAreValidated()throws Exception{
        var a=account();var row=book(a,"INPUT");var invalid=new ArrayList<Map<String,Object>>();for(String key:List.of("version","parts")){var v=values(row,1,2,3);v.remove(key);invalid.add(v);}for(Object version:List.of(-1,0.5,"9223372036854775808")){var v=values(row,1,2,3);v.put("version",version);invalid.add(v);}var v=values(row);v.put("parts",Arrays.asList((Object)null));invalid.add(v);v=values(row);v.put("parts",Collections.nCopies(11,mark("regular",1,null)));invalid.add(v);v=values(row);v.put("parts",List.of(Map.of("score",1,"remainderScore",1)));invalid.add(v);
        for(var bad:invalid)assertThat(send("PUT",scores(row),a.token,bad).statusCode()).isEqualTo(400);assertThat(read(a,row).get("version")).isEqualTo(0);
    }
    @Test void unknownFieldsCannotForgeConfigurationWeightsOrValuePresence()throws Exception{
        var a=account();var row=book(a,"STRICT");for(String key:List.of("userId","assessment","courseId","configurationId","hasScores","total")){var v=values(row);v.put(key,0);assertThat(send("PUT",scores(row),a.token,v).statusCode()).as(key).isEqualTo(400);}
        for(String key:List.of("weight","kind","project","name","scorePresent","remainderPresent")){var m=mark("regular",8,null);m.put(key,true);assertThat(send("PUT",scores(row),a.token,customValues(row,m,mark("mid",7,null),mark("final",6,null))).statusCode()).as(key).isEqualTo(400);}assertThat(read(a,row).get("hasScores")).isEqualTo(false);
    }
    @Test void emptyAndDraftConfigurationsCanStoreOnlyTheirExactColumnSet()throws Exception{
        var a=account();var c=course(a,semester(a,1),"DRAFT");var row=create(a,c,input("THEORY"));var saved=save(a,row,values(row));assertThat(saved.get("version")).isEqualTo(1);assertThat(saved.get("configurationState")).isEqualTo("DRAFT");assertThat(parts(saved)).isEmpty();var change=update(data(send("GET",item(row),a.token,null)));change.put("parts",List.of(part("tk","REGULAR")));row=data(send("PUT",item(row),a.token,change));saved=save(a,row,values(row,0));assertThat(saved.get("configurationState")).isEqualTo("DRAFT");assertThat(saved.get("missingGroups")).isEqualTo(List.of("MIDTERM","FINAL"));assertThat(parts(saved).getFirst().get("score")).isEqualTo(0);
    }
    @Test void explicitNullClearsMarksAndDoesNotDeleteConfiguration()throws Exception{
        var a=account();var row=book(a,"CLEAR");var saved=save(a,row,values(row,0,7,9));var cleared=save(a,row,values(saved));assertThat(cleared.get("hasScores")).isEqualTo(false);assertThat(cleared.get("version")).isEqualTo(2);assertThat(data(send("GET",item(row),a.token,null)).get("id")).isEqualTo(row.get("id"));for(var p:parts(cleared))assertThat(p.get("score")).isNull();
    }
    @Test void identicalWritesConsumeSharedVersionAndStaleCopiesCannotClearMarks()throws Exception{
        var a=account();var row=book(a,"VERSION");var v=values(row,8,0,null);var saved=save(a,row,v);error(send("PUT",scores(row),a.token,values(row)),409,"GRADE_CONFIGURATION_VERSION_CONFLICT");var identical=save(a,row,values(saved,8,0,null));assertThat(identical.get("version")).isEqualTo(2);error(send("PUT",item(row),a.token,update(row)),409,"GRADE_CONFIGURATION_VERSION_CONFLICT");assertThat(read(a,row)).isEqualTo(identical);
    }
    @Test void staleScoreInputAfterConfigurationChangeCannotApplyToNewColumns()throws Exception{
        var a=account();var row=book(a,"STALE");var edit=update(row);edit.put("parts",List.of(part("new","REGULAR")));data(send("PUT",item(row),a.token,edit));error(send("PUT",scores(row),a.token,values(row,8,7,6)),409,"GRADE_CONFIGURATION_VERSION_CONFLICT");assertThat(read(a,row).get("hasScores")).isEqualTo(false);
    }
    @Test void ownedAccessAndMissingConfigurationIdsReturnSame404()throws Exception{
        var a=account();var b=account();var row=book(a,"OWNER");var saved=save(a,row,values(row,8,7,6));for(String id:List.of(row.get("id").toString(),UUID.randomUUID().toString())){error(send("GET",PATH+"/"+id+"/scores",b.token,null),404,"GRADE_CONFIGURATION_NOT_FOUND");error(send("PUT",PATH+"/"+id+"/scores",b.token,values(saved,1,2,3)),404,"GRADE_CONFIGURATION_NOT_FOUND");}assertThat(read(a,row)).isEqualTo(saved);
    }
    @Test void authenticationAllowedMethodsAndMalformedPathsAreEnforced()throws Exception{
        var a=account();var row=book(a,"AUTH");for(String method:List.of("GET","PUT"))assertThat(send(method,scores(row),null,method.equals("PUT")?values(row):null).statusCode()).isEqualTo(401);for(String method:List.of("POST","PATCH","DELETE"))assertThat(send(method,scores(row),a.token,Map.of()).statusCode()).isEqualTo(403);assertThat(send("GET",PATH+"/bad/scores",a.token,null).statusCode()).isEqualTo(400);
    }
    @Test void renameAndReorderRetainValuesIncludingZeroAndInternalColumnIds()throws Exception{
        var a=account();var row=book(a,"RENAME");save(a,row,values(row,0,7,9));var current=data(send("GET",item(row),a.token,null));var before=jdbc.queryForList("SELECT id,column_key,score FROM grade_columns WHERE configuration_id=? ORDER BY column_key",UUID.fromString(row.get("id").toString()));var edit=update(current);var regular=part("regular","REGULAR");regular.put("name","Tên cột mới");edit.put("parts",List.of(part("final","FINAL"),regular,part("mid","MIDTERM")));data(send("PUT",item(row),a.token,edit));var saved=read(a,row);assertThat(parts(saved).stream().map(p->(String)p.get("id"))).containsExactly("final","regular","mid");assertThat(parts(saved).get(1).get("name")).isEqualTo("Tên cột mới");assertThat(parts(saved).get(1).get("score")).isEqualTo(0);assertThat(jdbc.queryForList("SELECT id,column_key,score FROM grade_columns WHERE configuration_id=? ORDER BY column_key",UUID.fromString(row.get("id").toString()))).isEqualTo(before);
    }
    @Test void deletingOrRekeyingScoredColumnIsBlockedUntilThatColumnIsCleared()throws Exception{
        var a=account();var row=book(a,"PROTECT");save(a,row,values(row,0,7,8));var current=data(send("GET",item(row),a.token,null));for(var remaining:List.of(List.of(part("mid","MIDTERM"),part("final","FINAL")),List.of(part("new-tk","REGULAR"),part("mid","MIDTERM"),part("final","FINAL")))){var edit=update(current);edit.put("parts",remaining);error(send("PUT",item(row),a.token,edit),409,"GRADE_COLUMN_HAS_SCORES");}var cleared=save(a,row,values(current,null,7,8));var edit=update(data(send("GET",item(row),a.token,null)));edit.put("parts",List.of(part("mid","MIDTERM"),part("final","FINAL")));data(send("PUT",item(row),a.token,edit));assertThat(parts(read(a,row))).hasSize(2);assertThat(parts(read(a,row)).getFirst().get("score")).isEqualTo(7);
    }
    @Test void changingKindOrAssessmentOfScoredColumnsDoesNotReinterpretMarks()throws Exception{
        var a=account();var row=book(a,"KIND");var saved=save(a,row,values(row,0,null,null));var current=data(send("GET",item(row),a.token,null));var edit=update(current);edit.put("parts",List.of(part("regular","REGULAR_TEST"),part("mid","MIDTERM"),part("final","FINAL")));error(send("PUT",item(row),a.token,edit),409,"GRADE_COLUMN_HAS_SCORES");edit=update(current);edit.put("assessment","PRACTICAL");edit.put("parts",List.of(part("regular","PRACTICE_REGULAR"),part("mid","MIDTERM"),part("final","FINAL")));error(send("PUT",item(row),a.token,edit),409,"GRADE_COLUMN_HAS_SCORES");assertThat(read(a,row)).isEqualTo(saved);
    }
    @Test void projectShareOrTargetChangeIsBlockedEvenWhenOnlyRemainderIsZero()throws Exception{
        var a=account();var row=create(a,course(a,semester(a,1),"BTLGUARD"),input("PRACTICAL",project("btl","FINAL",40)));var saved=save(a,row,customValues(row,mark("btl",null,0)));var current=data(send("GET",item(row),a.token,null));for(var p:List.of(project("btl","FINAL",100),project("btl","PRACTICE",100))){var edit=update(current);edit.put("parts",List.of(p));error(send("PUT",item(row),a.token,edit),409,"GRADE_COLUMN_HAS_SCORES");}assertThat(read(a,row)).isEqualTo(saved);
    }
    @Test void equivalentProjectShareRepresentationAndNameChangePreserveMarks()throws Exception{
        var a=account();var row=create(a,course(a,semester(a,1),"SHARE"),input("THEORY",project("btl","FINAL",40)));save(a,row,customValues(row,mark("btl",8,7)));var edit=update(data(send("GET",item(row),a.token,null)));var p=project("btl","FINAL",new java.math.BigDecimal("40.0000"));p.put("name","Đổi tên BTL");edit.put("parts",List.of(p));data(send("PUT",item(row),a.token,edit));var read=read(a,row);assertThat(parts(read).getFirst().get("score")).isEqualTo(8);assertThat(parts(read).getFirst().get("remainderScore")).isEqualTo(7);
    }
    @Test void addingAndRemovingUnscoredColumnsKeepsOtherColumnValues()throws Exception{
        var a=account();var row=book(a,"UNSCORED");save(a,row,values(row,8,null,null));var edit=update(data(send("GET",item(row),a.token,null)));edit.put("parts",List.of(part("regular","REGULAR"),part("new-tk","REGULAR_TEST"),part("final","FINAL")));data(send("PUT",item(row),a.token,edit));var read=read(a,row);assertThat(parts(read).getFirst().get("score")).isEqualTo(8);assertThat(parts(read).get(1).get("score")).isNull();assertThat(parts(read).getFirst().get("weightDenominator")).isEqualTo(2);
    }
    @Test void deleteConfigurationWithScoresRequiresExplicitClearingFirst()throws Exception{
        var a=account();var row=book(a,"DELETE");var saved=save(a,row,values(row,0));error(send("DELETE",item(row)+"?version=1",a.token,null),409,"GRADE_CONFIGURATION_HAS_SCORES");assertThat(read(a,row)).isEqualTo(saved);var cleared=save(a,row,values(saved));assertThat(send("DELETE",item(row)+"?version="+cleared.get("version"),a.token,null).statusCode()).isEqualTo(204);error(send("GET",scores(row),a.token,null),404,"GRADE_CONFIGURATION_NOT_FOUND");
    }
    @Test void deleteAndRecreateCannotAcceptStaleScoresForPreviousIdentity()throws Exception{
        var a=account();var c=course(a,semester(a,1),"RECREATE");var row=create(a,c,theory());assertThat(send("DELETE",item(row)+"?version=0",a.token,null).statusCode()).isEqualTo(204);var next=create(a,c,theory());error(send("PUT",scores(row),a.token,values(row,8)),404,"GRADE_CONFIGURATION_NOT_FOUND");assertThat(read(a,next).get("hasScores")).isEqualTo(false);
    }
    @Test void databaseRejectsOutOfRangeAndInapplicableRemainderWithoutChangingValues()throws Exception{
        var a=account();var row=book(a,"DB");var saved=save(a,row,values(row,8,7,6));var id=UUID.fromString(row.get("id").toString());for(String assignment:List.of("score=-0.01","score=10.0001","remainder_score=0","score='NaN'"))assertThatThrownBy(()->jdbc.update("UPDATE grade_columns SET "+assignment+" WHERE configuration_id=? AND column_key='regular'",id)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);assertThat(read(a,row)).isEqualTo(saved);
    }
    @Test void concurrentIdenticalScoreWritesHaveOnlyOneWinner()throws Exception{
        var a=account();var row=book(a,"RACE");var v=values(row,0,8,9);var results=concurrent(()->send("PUT",scores(row),a.token,v),()->send("PUT",scores(row),a.token,v));assertThat(results.stream().map(HttpResponse::statusCode)).containsExactlyInAnyOrder(200,409);assertThat(read(a,row).get("version")).isEqualTo(1);
    }
    @Test void concurrentConfigurationAndScoreWritesUseSameVersion()throws Exception{
        var a=account();var row=book(a,"RACECONFIG");var edit=update(row);edit.put("parts",List.of(part("new","REGULAR")));var results=concurrent(()->send("PUT",item(row),a.token,edit),()->send("PUT",scores(row),a.token,values(row,0,8,9)));assertThat(results.stream().map(HttpResponse::statusCode)).containsExactlyInAnyOrder(200,409);if(results.getLast().statusCode()==200){assertThat(parts(read(a,row))).hasSize(3);assertThat(parts(read(a,row)).getFirst().get("score")).isEqualTo(0);}else assertThat(parts(read(a,row))).hasSize(1);
    }
    @Test void concurrentConfigurationDeleteAndScoresCannotLoseConfirmedMarks()throws Exception{
        var a=account();var row=book(a,"RACEDELETE");var results=concurrent(()->send("DELETE",item(row)+"?version=0",a.token,null),()->send("PUT",scores(row),a.token,values(row,0)));if(results.getFirst().statusCode()==204)error(results.getLast(),404,"GRADE_CONFIGURATION_NOT_FOUND");else{error(results.getFirst(),409,"GRADE_CONFIGURATION_VERSION_CONFLICT");assertThat(results.getLast().statusCode()).isEqualTo(200);assertThat(read(a,row).get("hasScores")).isEqualTo(true);}
    }
    @Test void concurrentReadsSeeValuesAndVersionFromOneSnapshot()throws Exception{
        var a=account();var row=book(a,"SNAPSHOT");save(a,row,values(row,1,1,1));var results=concurrent(()->{HttpResponse<String> r=null;for(int version=2;version<=9;version++){var v=values(row,version,version,version);v.put("version",version-1);r=send("PUT",scores(row),a.token,v);data(r);}return r;},()->{HttpResponse<String> r=null;for(int i=0;i<30;i++){r=send("GET",scores(row),a.token,null);var read=data(r);for(var p:parts(read))assertThat(p.get("score")).isEqualTo(read.get("version"));}return r;});assertThat(results.stream().map(HttpResponse::statusCode)).containsOnly(200);
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershell51ExportsCurrentMarksUpdatesAndRejectsStaleFileWithoutClosingOtherSession()throws Exception{
        var a=account();var c=course(a,semester(a,1),"PS51");var regular=part("regular","REGULAR");regular.put("name","Điểm thường kỳ");var row=create(a,c,input("THEORY",regular,part("mid","MIDTERM"),project("btl","FINAL",40)));save(a,row,values(row,0,null,null));
        String email=jdbc.queryForObject("SELECT email FROM app_users WHERE id=?",String.class,a.id),common="& './scripts/Try-GradeScores.ps1' -BaseUrl 'http://127.0.0.1:"+port+"' -ConfigurationId '"+row.get("id")+"'";
        Path file=Path.of(System.getProperty("java.io.tmpdir"),"qa-grade-scores-"+UUID.randomUUID()+".json");String quoted=file.toString().replace("'","''");
        try{
            String exported=runPowerShell(email,common+" -Mode Export -OutputFile '"+quoted+"'",0);assertThat(exported).contains("Đã xuất");var input=json.readValue(Files.readString(file),Map.class);assertThat(input.get("version")).isEqualTo(1);var marks=(List<Map<String,Object>>)input.get("parts");assertThat(marks.get(0).get("score")).isEqualTo(0);assertThat(marks.get(1).get("score")).isNull();marks.get(2).put("score",8.125);marks.get(2).put("remainderScore",7);Files.writeString(file,json.writeValueAsString(input),StandardCharsets.UTF_8);
            assertThat(runPowerShell(email,common+" -Mode Update -InputFile '"+quoted+"'",0)).contains("Điểm thường kỳ");var saved=read(a,row);assertThat(saved.get("version")).isEqualTo(2);assertThat(((Number)parts(saved).getLast().get("score")).doubleValue()).isEqualTo(8.125);assertThat(parts(saved).getLast().get("remainderScore")).isEqualTo(7);assertThat(runPowerShell(email,common+" -Mode Get",0)).contains("Điểm thường kỳ");
            assertThat(runPowerShell(email,common+" -Mode Update -InputFile '"+quoted+"'",1)).contains("GRADE_CONFIGURATION_VERSION_CONFLICT");assertThat(read(a,row)).isEqualTo(saved);
            String before=Files.readString(file);runPowerShell(email,common+" -Mode Export -OutputFile '"+quoted+"'",1);assertThat(Files.readString(file)).isEqualTo(before);
        }finally{Files.deleteIfExists(file);}
        assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL",Integer.class,a.id)).isEqualTo(1);
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershellRejectsIncompleteFilesBeforeSendingAnyMarks()throws Exception{
        var a=account();var row=book(a,"PSINVALID");String email=jdbc.queryForObject("SELECT email FROM app_users WHERE id=?",String.class,a.id);var file=Files.createTempFile("qa-incomplete-scores-",".json");
        try{Files.writeString(file,"{\"version\":0,\"parts\":[{\"id\":\"regular\",\"score\":8}]}");runPowerShell(email,"& './scripts/Try-GradeScores.ps1' -BaseUrl 'http://127.0.0.1:"+port+"' -ConfigurationId '"+row.get("id")+"' -Mode Update -InputFile '"+file.toString().replace("'","''")+"'",1);}finally{Files.deleteIfExists(file);}
        assertThat(read(a,row).get("version")).isEqualTo(0);assertThat(read(a,row).get("hasScores")).isEqualTo(false);assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL",Integer.class,a.id)).isEqualTo(1);
    }
    String runPowerShell(String email,String command,int expectedExit)throws Exception{
        String ps=Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","powershell.exe").toString();
        String script="[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); function Read-Host { param([string]$Prompt,[switch]$AsSecureString); if ($AsSecureString) { ConvertTo-SecureString $env:SCORE_TEST_PASSWORD -AsPlainText -Force } else { $env:SCORE_TEST_EMAIL } }; "+command;
        var builder=new ProcessBuilder(ps,"-NoProfile","-ExecutionPolicy","Bypass","-Command",script).redirectErrorStream(true);builder.environment().keySet().removeIf(name->name.equalsIgnoreCase("PSModulePath"));builder.environment().put("PSModulePath",Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","Modules").toString());builder.environment().put("SCORE_TEST_EMAIL",email);builder.environment().put("SCORE_TEST_PASSWORD",SECRET);var process=builder.start();
        try{assertThat(process.waitFor(30,TimeUnit.SECONDS)).isTrue();var output=new String(process.getInputStream().readAllBytes(),StandardCharsets.UTF_8);if(expectedExit==0)assertThat(process.exitValue()).as(output).isZero();else assertThat(process.exitValue()).as(output).isNotZero();assertThat(output).doesNotContain(SECRET,"accessToken","refreshToken");return output;}finally{if(process.isAlive())process.destroyForcibly();}
    }
}
