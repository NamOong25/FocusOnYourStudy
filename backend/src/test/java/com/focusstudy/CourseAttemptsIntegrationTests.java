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
class CourseAttemptsIntegrationTests {
    private static final String SCHEMA = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
    private static final String URL = Objects.requireNonNull(System.getenv("TEST_DB_URL")), USER = System.getenv("TEST_DB_USER"), PASSWORD = System.getenv("TEST_DB_PASSWORD");
    private static final String SECRET = "AttemptTest123!", PATH = "/api/v1/grade-configurations", COURSES = "/api/v1/courses";
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
    String historyPath(Map<?,?> course){return COURSES+"/"+course.get("id")+"/attempts";}
    Map<?,?> history(Account a){try{return data(send("GET","/api/v1/course-attempts",a.token,null));}catch(Exception e){throw new RuntimeException(e);}}
    Map<?,?> history(Account a,Map<?,?> course)throws Exception{return data(send("GET",historyPath(course),a.token,null));}
    List<Map<?,?>> groups(Map<?,?> value){return ((List<?>)value.get("groups")).stream().<Map<?,?>>map(x->(Map<?,?>)x).toList();}
    List<Map<?,?>> attempts(Map<?,?> group){return ((List<?>)group.get("attempts")).stream().<Map<?,?>>map(x->(Map<?,?>)x).toList();}
    Map<?,?> attemptCourse(Map<?,?> attempt){return (Map<?,?>)attempt.get("course");}
    Map<?,?> semesterYear(Account a,int year,int term)throws Exception{return data(send("POST","/api/v1/semesters",a.token,Map.of("term",term,"startYear",year,"status","UPCOMING")));}

    @Test void emptyAccountReturnsEmptyHistoryWithoutCreatingCoursesOrGrades()throws Exception{
        var a=account();var response=send("GET","/api/v1/course-attempts",a.token,null);var value=data(response);
        assertThat(summary(value)).isEqualTo(Map.of("groups",0,"attempts",0,"repeatedGroups",0,"reviewGroups",0));
        assertThat(groups(value)).isEmpty();assertThat(value.get("focusCourseId")).isNull();
        assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
        assertThat(body(response).get("meta")).isNotNull();assertThat(history(a)).isEqualTo(value);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM courses WHERE user_id=?",Integer.class,a.id)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM grade_configurations WHERE user_id=?",Integer.class,a.id)).isZero();
    }
    @Test void requiresBearerForBothReadRoutesAndRejectsWrites()throws Exception{
        var a=account();var c=withCredits(a,semester(a,1),"SECURITY",3);
        error(send("GET","/api/v1/course-attempts",null,null),401,"AUTHENTICATION_REQUIRED");
        error(send("GET",historyPath(c),null,null),401,"AUTHENTICATION_REQUIRED");
        error(send("POST","/api/v1/course-attempts",a.token,Map.of()),403,"ACCESS_DENIED");
        error(send("PUT",historyPath(c),a.token,Map.of()),403,"ACCESS_DENIED");
    }
    @Test void normalizesCodesAndOrdersByAcademicYearAndSummerRatherThanCreation()throws Exception{
        var a=account();var next=semesterYear(a,2027,1);var summer=semester(a,3);var first=semester(a,1);var second=semester(a,2);
        var c4=withCredits(a,next,"WEB101",3);var c3=scored(a,summer,"WEB101",3,7);var c2=scored(a,second,"WEB101",3,8);var c1=scored(a,first," web101 ",3,0);
        var changed=courseUpdate(c3.course());changed.put("name","Tên học phần đã đổi");data(send("PUT",COURSES+"/"+c3.course().get("id"),a.token,changed));
        var result=history(a);var rows=attempts(groups(result).getFirst());assertThat(summary(result)).isEqualTo(Map.of("groups",1,"attempts",4,"repeatedGroups",1,"reviewGroups",0));
        assertThat(rows.stream().<Object>map(r->attemptCourse(r).get("id"))).containsExactly(c1.course().get("id"),c2.course().get("id"),c3.course().get("id"),c4.get("id"));
        assertThat(rows.stream().map(r->r.get("relation").toString())).containsExactly("FIRST_RECORDED","RETAKE_AFTER_FAILED_RESULT","FOLLOWUP_AFTER_PASSED_RESULT","FOLLOWUP_AFTER_PASSED_RESULT");
        assertThat(rows.get(1).get("previousCourseId")).isEqualTo(c1.course().get("id"));assertThat(rows.getLast().get("previousCourseId")).isEqualTo(c3.course().get("id"));
        assertThat(((Map<?,?>)rows.get(2).get("semester")).get("name")).isEqualTo("Học kỳ 3 (Hè)");number(attemptCourse(rows.getFirst()).get("gradePoint"),"0");
    }
    @Test void namesAloneNeverLinkDistinctCodes()throws Exception{
        var a=account();var first=withCredits(a,semester(a,1),"A",3);var second=withCredits(a,semester(a,2),"B",3);
        for(var c:List.of(first,second)){var v=courseUpdate(c);v.put("name","Công nghệ phần mềm");data(send("PUT",COURSES+"/"+c.get("id"),a.token,v));}
        var result=history(a);assertThat(groups(result)).hasSize(2);assertThat(summary(result).get("repeatedGroups")).isEqualTo(0);
        assertThat(groups(result)).allSatisfy(g->assertThat(attempts(g).getFirst().get("relation")).isEqualTo("FIRST_RECORDED"));
    }
    @Test void differentCreditsStaySeparateWithExplicitReviewReferences()throws Exception{
        var a=account();var first=scored(a,semester(a,1),"WEB",3,0);var second=scored(a,semester(a,2),"WEB",4,8);
        var result=history(a,first.course());var gs=groups(result);assertThat(gs).hasSize(2);assertThat(summary(result).get("reviewGroups")).isEqualTo(2);
        assertThat(gs).allSatisfy(g->{assertThat(g.get("needsReview")).isEqualTo(true);assertThat(g.get("issues")).isEqualTo(List.of("CREDIT_VARIANTS"));assertThat(attempts(g).getFirst().get("previousCourseId")).isNull();});
        assertThat(gs.getFirst().get("otherCreditVariants")).isEqualTo(List.of(Map.of("credits",4,"courseIds",List.of(second.course().get("id")))));
    }
    @Test void focusedHistoryIncludesAllCreditVariantsButExcludesOtherCodes()throws Exception{
        var a=account();var first=semester(a,1);var second=semester(a,2);var c=withCredits(a,first,"FOCUS",3);withCredits(a,second,"FOCUS",4);withCredits(a,first,"OTHER",3);
        var result=history(a,c);assertThat(result.get("focusCourseId")).isEqualTo(c.get("id"));assertThat(groups(result)).extracting(g->g.get("code").toString()).containsOnly("FOCUS");
        assertThat(summary(result).get("attempts")).isEqualTo(2);assertThat(summary(history(a)).get("attempts")).isEqualTo(3);
    }
    @Test void ownerIsolationAndForeignOrUnknownCourseAreIndistinguishable()throws Exception{
        var a=account();var b=account();var own=scored(a,semester(a,1),"SAME",3,8);var foreign=scored(b,semester(b,1),"SAME",3,0);
        var result=history(a);assertThat(summary(result).get("attempts")).isEqualTo(1);assertThat(attemptCourse(attempts(groups(result).getFirst()).getFirst()).get("id")).isEqualTo(own.course().get("id"));
        var forbidden=send("GET",historyPath(foreign.course()),a.token,null);var missing=send("GET",COURSES+"/"+UUID.randomUUID()+"/attempts",a.token,null);
        error(forbidden,404,"COURSE_NOT_FOUND");error(missing,404,"COURSE_NOT_FOUND");assertThat(body(forbidden).get("detail")).isEqualTo(body(missing).get("detail"));assertThat(forbidden.body()).doesNotContain(foreign.course().get("code").toString(),b.id.toString());
    }
    @Test void malformedCourseIdIsAClientError()throws Exception{
        var a=account();assertThat(send("GET",COURSES+"/not-a-uuid/attempts",a.token,null).statusCode()).isEqualTo(400);
    }
    @Test void missingBlockedAndPartialFailedPreviousResultsRemainUnresolved()throws Exception{
        var a=account();var first=semester(a,1);var second=semester(a,2);
        var missing=withCredits(a,first,"MISSING",3);var update=courseUpdate(missing);update.put("status","COMPLETED");data(send("PUT",COURSES+"/"+missing.get("id"),a.token,update));
        var blocked=create(a,withCredits(a,first,"BLOCKED",3),theory());save(a,blocked,values(blocked,8,0,8));
        var partial=create(a,withCredits(a,first,"PARTIAL-F",3),theory());save(a,partial,values(partial,8,null,0));
        for(var code:List.of("MISSING","BLOCKED","PARTIAL-F"))withCredits(a,second,code,3);
        for(var group:groups(history(a))){var rows=attempts(group);assertThat(attemptCourse(rows.getFirst()).get("complete")).isEqualTo(false);assertThat(attemptCourse(rows.getFirst()).get("gradePoint")).isNull();assertThat(rows.getLast().get("relation")).isEqualTo("FOLLOWUP_PREVIOUS_UNRESOLVED");}
    }
    @Test void changedPreviousScoresUpdateContextAndKeepSharedGradeVersion()throws Exception{
        var a=account();var first=scored(a,semester(a,1),"EDIT",3,0);var next=withCredits(a,semester(a,2),"EDIT",3);
        var before=attempts(groups(history(a,next)).getFirst());assertThat(before.getLast().get("relation")).isEqualTo("RETAKE_AFTER_FAILED_RESULT");
        var saved=save(a,first.config(),values(read(a,first.config()),8,8,8));var after=attempts(groups(history(a,next)).getFirst());
        assertThat(after.getLast().get("relation")).isEqualTo("FOLLOWUP_AFTER_PASSED_RESULT");assertThat(after.getLast().get("previousCourseId")).isEqualTo(first.course().get("id"));
        assertThat(attemptCourse(after.getFirst()).get("gradeVersion")).isEqualTo(saved.get("version"));number(attemptCourse(after.getFirst()).get("total"),"8");
    }
    @Test void laterLowerGradeDoesNotDiscardAnEarlierHigherGradeOrSelectEither()throws Exception{
        var a=account();scored(a,semester(a,1),"LOWER",3,9);scored(a,semester(a,2),"LOWER",3,4);
        var value=history(a);var group=groups(value).getFirst();var rows=attempts(group);number(attemptCourse(rows.getFirst()).get("gradePoint"),"4");number(attemptCourse(rows.getLast()).get("gradePoint"),"1");
        assertThat(((Map<?,?>)value.get("policy")).get("cumulativeSelection")).isEqualTo("NOT_IMPLEMENTED");
        assertThat(value.containsKey("gpa")).isFalse();assertThat(group.containsKey("selectedCourseId")).isFalse();assertThat(summary(value).containsKey("earnedCredits")).isFalse();
    }
    @Test void changedCodeAndCreditsRebuildGroupsWithoutPersistentLinks()throws Exception{
        var a=account();var first=scored(a,semester(a,1),"MOVE",3,0);var second=withCredits(a,semester(a,2),"MOVE",3);
        assertThat(summary(history(a)).get("groups")).isEqualTo(1);var v=courseUpdate(second);v.put("credits",4);var saved=data(send("PUT",COURSES+"/"+second.get("id"),a.token,v));
        assertThat(summary(history(a)).get("reviewGroups")).isEqualTo(2);v=courseUpdate(saved);v.put("code","OTHER");data(send("PUT",COURSES+"/"+second.get("id"),a.token,v));
        var result=history(a);assertThat(summary(result).get("groups")).isEqualTo(2);assertThat(summary(result).get("reviewGroups")).isEqualTo(0);assertThat(summary(history(a,first.course())).get("attempts")).isEqualTo(1);
    }
    @Test void semesterYearEditReordersAcademicHistory()throws Exception{
        var a=account();var first=semester(a,1);var second=semester(a,2);var c1=scored(a,first,"YEAR",3,0);var c2=scored(a,second,"YEAR",3,8);
        var update=fields(first,"term","startYear","status","note","version");update.put("startYear",2027);var saved=data(send("PUT","/api/v1/semesters/"+first.get("id"),a.token,update));
        var rows=attempts(groups(history(a)).getFirst());assertThat(attemptCourse(rows.getFirst()).get("id")).isEqualTo(c2.course().get("id"));assertThat(attemptCourse(rows.getLast()).get("id")).isEqualTo(c1.course().get("id"));assertThat(rows.getLast().get("relation")).isEqualTo("FOLLOWUP_AFTER_PASSED_RESULT");assertThat(((Map<?,?>)rows.getLast().get("semester")).get("version")).isEqualTo(saved.get("version"));
    }
    @Test void partialProjectReusesResultCalculatorAndResolvesAfterRemainderIsEntered()throws Exception{
        var a=account();var first=semester(a,1);var second=semester(a,2);var old=withCredits(a,first,"BTL",3);var next=withCredits(a,second,"BTL",3);
        var config=create(a,old,input("THEORY",part("tk","REGULAR"),part("mid","MIDTERM"),project("btl","FINAL",40)));
        var saved=save(a,config,customValues(config,mark("tk",8,null),mark("mid",8,null),mark("btl",8,null)));
        assertThat(attempts(groups(history(a,next)).getFirst()).getLast().get("relation")).isEqualTo("FOLLOWUP_PREVIOUS_UNRESOLVED");
        save(a,config,customValues(saved,mark("tk",8,null),mark("mid",8,null),mark("btl",8,6)));
        var rows=attempts(groups(history(a,next)).getFirst());number(attemptCourse(rows.getFirst()).get("total"),"7.4");assertThat(rows.getLast().get("relation")).isEqualTo("FOLLOWUP_AFTER_PASSED_RESULT");
    }
    @Test void conflictingAssessmentConfigurationRequiresReview()throws Exception{
        var a=account();scored(a,semester(a,1),"TYPE",3,8);var practical=create(a,withCredits(a,semester(a,2),"TYPE",3),input("PRACTICAL",part("p","PRACTICE_REGULAR")));save(a,practical,values(practical,8));
        var group=groups(history(a)).getFirst();assertThat(group.get("needsReview")).isEqualTo(true);assertThat(group.get("issues")).isEqualTo(List.of("ASSESSMENT_VARIANTS"));assertThat(attempts(group)).hasSize(2);
    }
    @Test void readsPreserveScoresVersionsAndSemesterGpa()throws Exception{
        var a=account();var sem=semester(a,1);var scored=scored(a,sem,"READONLY",3,8);var marks=read(a,scored.config());var priorGpa=gpa(a,sem);var priorCourse=data(send("GET",COURSES+"/"+scored.course().get("id"),a.token,null));var snapshot=history(a);
        for(int i=0;i<3;i++){assertThat(history(a)).isEqualTo(snapshot);var focused=send("GET",historyPath(scored.course()),a.token,null);data(focused);assertThat(focused.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");}
        assertThat(read(a,scored.config())).isEqualTo(marks);assertThat(gpa(a,sem)).isEqualTo(priorGpa);assertThat(data(send("GET",COURSES+"/"+scored.course().get("id"),a.token,null))).isEqualTo(priorCourse);
    }
    @Test void semesterCourseAndScoreReadsShareOneSnapshotDuringAtomicUpdates()throws Exception{
        var a=account();var sem=semester(a,1);var x=scored(a,sem,"SNAPSHOT",1,4);
        var responses=concurrent(()->{
            try(var c=DriverManager.getConnection(URL,USER,PASSWORD)){c.setSchema(SCHEMA);c.setAutoCommit(false);
                for(int version=1;version<=6;version++){
                    try(var p=c.prepareStatement("UPDATE courses SET credits=?,version=? WHERE id=?")){p.setInt(1,version+1);p.setInt(2,version);p.setObject(3,UUID.fromString(x.course().get("id").toString()));p.executeUpdate();}
                    Thread.sleep(12);
                    try(var p=c.prepareStatement("UPDATE semesters SET start_year=?,version=? WHERE id=?")){p.setInt(1,2026+version);p.setInt(2,version);p.setObject(3,UUID.fromString(sem.get("id").toString()));p.executeUpdate();}
                    try(var p=c.prepareStatement("UPDATE grade_columns SET score=? WHERE configuration_id=?")){p.setInt(1,version+4);p.setObject(2,UUID.fromString(x.config().get("id").toString()));p.executeUpdate();}
                    try(var p=c.prepareStatement("UPDATE grade_configurations SET version=?,update_revision=? WHERE id=?")){p.setInt(1,version+1);p.setInt(2,version+1);p.setObject(3,UUID.fromString(x.config().get("id").toString()));p.executeUpdate();}c.commit();
                }
            }return send("GET",historyPath(x.course()),a.token,null);
        },()->{HttpResponse<String> response=null;for(int i=0;i<25;i++){
            response=send("GET",historyPath(x.course()),a.token,null);var group=groups(data(response)).getFirst();var row=attempts(group).getFirst();var course=attemptCourse(row);var semester=(Map<?,?>)row.get("semester");int version=((Number)course.get("version")).intValue();
            assertThat(course.get("credits")).isEqualTo(version+1);assertThat(group.get("credits")).isEqualTo(version+1);assertThat(course.get("gradeVersion")).isEqualTo(version+1);number(course.get("total"),Integer.toString(version+4));assertThat(semester.get("version")).isEqualTo(version);assertThat(semester.get("startYear")).isEqualTo(2026+version);
        }return response;});assertThat(responses).allSatisfy(r->assertThat(r.statusCode()).isEqualTo(200));
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershellListReadsEmptyAccountAndRevokesOnlyItsOwnSession()throws Exception{
        var a=account();var output=runAttemptsPowerShell(a,null);assertThat(output).contains("Lịch sử: 0 nhóm, 0 lần học","Chưa chọn điểm hoặc tính GPA tích lũy");assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL",Integer.class,a.id)).isEqualTo(1);
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershellGetReadsBothAttemptsAndPreservesUnicodeAndScores()throws Exception{
        var a=account();var first=scored(a,semester(a,1),"SCRIPT",3,0);var next=withCredits(a,semester(a,2),"SCRIPT",3);var output=runAttemptsPowerShell(a,next);
        assertThat(output).contains("Lịch sử: 1 nhóm, 2 lần học","RETAKE_AFTER_FAILED_RESULT","Môn SCRIPT","Học kỳ 1");assertThat(read(a,first.config())).isEqualTo(first.marks());assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL",Integer.class,a.id)).isEqualTo(1);
    }
    String runAttemptsPowerShell(Account a,Map<?,?> course)throws Exception{
        String email=jdbc.queryForObject("SELECT email FROM app_users WHERE id=?",String.class,a.id),ps=Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","powershell.exe").toString();
        String mode=course==null?"-Mode List":"-Mode Get -CourseId '"+course.get("id")+"'";
        String script="[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); function Read-Host { param([string]$Prompt,[switch]$AsSecureString); if ($AsSecureString) { ConvertTo-SecureString $env:ATTEMPT_TEST_PASSWORD -AsPlainText -Force } else { $env:ATTEMPT_TEST_EMAIL } }; & './scripts/Try-CourseAttempts.ps1' -BaseUrl 'http://127.0.0.1:"+port+"' "+mode;
        var builder=new ProcessBuilder(ps,"-NoProfile","-ExecutionPolicy","Bypass","-Command",script).redirectErrorStream(true);builder.environment().keySet().removeIf(name->name.equalsIgnoreCase("PSModulePath"));builder.environment().put("PSModulePath",Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","Modules").toString());builder.environment().put("ATTEMPT_TEST_EMAIL",email);builder.environment().put("ATTEMPT_TEST_PASSWORD",SECRET);
        var process=builder.start();var captured=CompletableFuture.supplyAsync(()->{try{return new String(process.getInputStream().readAllBytes(),StandardCharsets.UTF_8);}catch(java.io.IOException failure){throw new java.io.UncheckedIOException(failure);}});
        try{assertThat(process.waitFor(30,TimeUnit.SECONDS)).isTrue();var output=captured.get(5,TimeUnit.SECONDS);assertThat(process.exitValue()).as(output).isZero();assertThat(output).doesNotContain(SECRET,"accessToken","refreshToken");return output;}finally{if(process.isAlive())process.destroyForcibly();}
    }
}
