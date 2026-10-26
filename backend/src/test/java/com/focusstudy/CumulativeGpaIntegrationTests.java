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
class CumulativeGpaIntegrationTests {
    private static final String SCHEMA = "backend_it_" + UUID.randomUUID().toString().replace("-", "");
    private static final String URL = Objects.requireNonNull(System.getenv("TEST_DB_URL")), USER = System.getenv("TEST_DB_USER"), PASSWORD = System.getenv("TEST_DB_PASSWORD");
    private static final String SECRET = "CumulativeTest123!", PATH = "/api/v1/grade-configurations", COURSES = "/api/v1/courses";
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
    static final String CUMULATIVE="/api/v1/gpa/cumulative";
    Map<?,?> cumulative(Account a)throws Exception{return data(send("GET",CUMULATIVE,a.token,null));}
    Map<?,?> source(Map<?,?> group){return (Map<?,?>)group.get("history");}
    Map<?,?> selected(Map<?,?> group){return attempts(source(group)).stream().filter(a->attemptCourse(a).get("id").equals(group.get("selectedCourseId"))).findFirst().orElseThrow();}
    Map<?,?> group(Map<?,?> report,String code){return groups(report).stream().filter(g->source(g).get("code").equals(code)).findFirst().orElseThrow();}
    List<Map<?,?>> decisions(Map<?,?> group){return ((List<?>)group.get("decisions")).stream().<Map<?,?>>map(x->(Map<?,?>)x).toList();}
    @Test void emptyAccountReturnsNullGpaAndNoWrites()throws Exception{
        var a=account();var response=send("GET",CUMULATIVE,a.token,null);var value=data(response);var s=summary(value);
        assertThat(s.get("state")).isEqualTo("EMPTY");assertThat(s.get("gpa")).isNull();assertThat(s.get("calculatedCredits")).isEqualTo(0);assertThat(groups(value)).isEmpty();assertThat(body(response).get("meta")).isNotNull();assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");assertThat(cumulative(a)).isEqualTo(value);assertThat(jdbc.queryForObject("SELECT count(*) FROM courses WHERE user_id=?",Integer.class,a.id)).isZero();
    }
    @Test void endpointRequiresActiveBearerAndRejectsWrites()throws Exception{
        var a=account();error(send("GET",CUMULATIVE,null,null),401,"AUTHENTICATION_REQUIRED");assertThat(send("GET",CUMULATIVE,"not-a-token",null).statusCode()).isEqualTo(401);error(send("POST",CUMULATIVE,a.token,Map.of()),403,"ACCESS_DENIED");error(send("PUT",CUMULATIVE,a.token,Map.of()),403,"ACCESS_DENIED");
    }
    @Test void weightsDifferentCoursesAndCompleteFUsingManualExample()throws Exception{
        var a=account();var sem=semester(a,1);scored(a,sem,"A",3,8);scored(a,sem,"B",2,8.5);scored(a,sem,"F",1,0);var value=cumulative(a);var s=summary(value);
        number(s.get("gpa"),"3.02");number(s.get("weightedGradePoints"),"18.1");assertThat(s.get("calculatedCredits")).isEqualTo(6);assertThat(s.get("earnedCredits")).isEqualTo(5);assertThat(s.get("failedCredits")).isEqualTo(1);assertThat(s.get("state")).isEqualTo("COMPLETE");assertThat(((Map<?,?>)value.get("policy")).get("authority")).isEqualTo("USER_CONFIRMED_APP_RULES");assertThat(((Map<?,?>)value.get("policy")).get("officialIuhCumulativeVerified")).isEqualTo(false);
    }
    @Test void repeatedFailuresProduceZeroAndSelectLatestCompleteFailure()throws Exception{
        var a=account();scored(a,semester(a,1),"F",3,3.9);var latest=scored(a,semester(a,2),"F",3,0);var value=cumulative(a);var g=groups(value).getFirst();
        number(summary(value).get("gpa"),"0.00");assertThat(summary(value).get("earnedCredits")).isEqualTo(0);assertThat(summary(value).get("failedCredits")).isEqualTo(3);assertThat(g.get("selectedCourseId")).isEqualTo(latest.course().get("id"));assertThat(g.get("reason")).isEqualTo("LATEST_COMPLETE_F");assertThat(attempts(source(g))).hasSize(2);number(attemptCourse(selected(g)).get("gradePoint"),"0");
    }
    @Test void highestPassingTotalWinsWithoutDoubleCountingCredits()throws Exception{
        var a=account();var high=scored(a,semester(a,1),"SAME",3,8);var low=scored(a,semester(a,2),"SAME",3,6);var value=cumulative(a);var g=groups(value).getFirst();
        assertThat(g.get("selectedCourseId")).isEqualTo(high.course().get("id"));number(summary(value).get("gpa"),"3.50");assertThat(summary(value).get("calculatedCredits")).isEqualTo(3);assertThat(summary(value).get("earnedCredits")).isEqualTo(3);assertThat(summary(value).get("recordedAttempts")).isEqualTo(2);assertThat(decisions(g)).contains(Map.of("courseId",low.course().get("id"),"use","NOT_SELECTED_LOWER_PASS"));
    }
    @Test void equalFourPointBandsStillSelectHigherTenPointTotal()throws Exception{
        var a=account();var high=scored(a,semester(a,1),"BAND",3,8.4);scored(a,semester(a,2),"BAND",3,8);var g=groups(cumulative(a)).getFirst();assertThat(g.get("selectedCourseId")).isEqualTo(high.course().get("id"));number(attemptCourse(selected(g)).get("total"),"8.4");number(attemptCourse(selected(g)).get("gradePoint"),"3.5");
    }
    @Test void equalTotalTiesUseAcademicChronologyIncludingSummer()throws Exception{
        var a=account();var next=scored(a,semesterYear(a,2027,1),"TIE",3,8);scored(a,semester(a,3),"TIE",3,8);scored(a,semester(a,1),"TIE",3,8);var g=groups(cumulative(a)).getFirst();assertThat(g.get("selectedCourseId")).isEqualTo(next.course().get("id"));assertThat(decisions(g).stream().filter(d->d.get("use").equals("NOT_SELECTED_OLDER_TIE"))).hasSize(2);
    }
    @Test void preservesAllFailuresAndPassesWhileCountingOneResultPerCourse()throws Exception{
        var a=account();var first=semester(a,1);var second=semester(a,2);var f=scored(a,first,"RETAKE",3,0);var pass=scored(a,second,"RETAKE",3,8);var oldPass=scored(a,first,"OLDPASS",3,8);var newF=scored(a,second,"OLDPASS",3,0);var value=cumulative(a);
        assertThat(group(value,"RETAKE").get("selectedCourseId")).isEqualTo(pass.course().get("id"));assertThat(group(value,"OLDPASS").get("selectedCourseId")).isEqualTo(oldPass.course().get("id"));assertThat(summary(value).get("earnedCredits")).isEqualTo(6);assertThat(summary(value).get("failedCredits")).isEqualTo(0);assertThat(summary(value).get("recordedAttempts")).isEqualTo(4);assertThat(decisions(group(value,"RETAKE"))).contains(Map.of("courseId",f.course().get("id"),"use","NOT_SELECTED_FAILED_ATTEMPT"));assertThat(decisions(group(value,"OLDPASS"))).contains(Map.of("courseId",newF.course().get("id"),"use","NOT_SELECTED_FAILED_ATTEMPT"));
    }
    @Test void missingBlockedAndPartialFailureAreNotInventedAsZero()throws Exception{
        var a=account();var sem=semester(a,1);scored(a,sem,"OK",2,8);withCredits(a,sem,"MISSING",3);var block=create(a,withCredits(a,sem,"BLOCK",3),theory());save(a,block,values(block,8,0,8));var partial=create(a,withCredits(a,sem,"PARTIAL",3),theory());save(a,partial,values(partial,8,null,0));var value=cumulative(a);var s=summary(value);
        number(s.get("gpa"),"3.50");assertThat(s.get("state")).isEqualTo("PARTIAL");assertThat(s.get("calculatedCredits")).isEqualTo(2);assertThat(s.get("excludedGroups")).isEqualTo(3);assertThat(s.get("pendingAttempts")).isEqualTo(3);assertThat(s.get("failedGroups")).isEqualTo(0);for(String code:List.of("MISSING","BLOCK","PARTIAL")){var g=group(value,code);assertThat(g.get("selectedCourseId")).isNull();assertThat(g.get("reason")).isEqualTo("NO_COMPLETE_RESULT");assertThat(decisions(g).getFirst().get("use")).isEqualTo("PENDING_RESULT");}
    }
    @Test void knownPassWithPendingLaterAttemptRemainsAvailableButPartial()throws Exception{
        var a=account();var known=scored(a,semester(a,1),"PENDING",3,8);withCredits(a,semester(a,2),"PENDING",3);var value=cumulative(a);
        assertThat(group(value,"PENDING").get("selectedCourseId")).isEqualTo(known.course().get("id"));assertThat(summary(value).get("state")).isEqualTo("PARTIAL");assertThat(summary(value).get("excludedGroups")).isEqualTo(0);assertThat(summary(value).get("pendingAttempts")).isEqualTo(1);number(summary(value).get("gpa"),"3.50");
    }
    @Test void creditAndAssessmentVariantsAreExcludedWithTheirHistory()throws Exception{
        var a=account();var first=semester(a,1);var second=semester(a,2);scored(a,first,"VALID",2,8);scored(a,first,"CREDITS",3,8);scored(a,second,"CREDITS",4,9);scored(a,first,"MODE",3,8);var p=create(a,withCredits(a,second,"MODE",3),input("PRACTICAL",part("p","PRACTICE_REGULAR")));save(a,p,values(p,8));var value=cumulative(a);
        assertThat(summary(value).get("reviewGroups")).isEqualTo(3);assertThat(summary(value).get("excludedGroups")).isEqualTo(3);assertThat(summary(value).get("calculatedCredits")).isEqualTo(2);number(summary(value).get("gpa"),"3.50");assertThat(groups(value).stream().filter(g->g.get("reason").equals("REVIEW_REQUIRED"))).allSatisfy(g->{assertThat(g.get("selectedCourseId")).isNull();assertThat(attempts(source(g))).isNotEmpty();assertThat(decisions(g)).allSatisfy(d->assertThat(d.get("use")).isEqualTo("GROUP_REQUIRES_REVIEW"));});
    }
    @Test void updatedScoresRecomputeSelectionWithSourceVersions()throws Exception{
        var a=account();var old=scored(a,semester(a,1),"EDIT",3,8);var later=scored(a,semester(a,2),"EDIT",3,6);assertThat(groups(cumulative(a)).getFirst().get("selectedCourseId")).isEqualTo(old.course().get("id"));var saved=save(a,later.config(),values(read(a,later.config()),9,9,9));var value=cumulative(a);var g=groups(value).getFirst();assertThat(g.get("selectedCourseId")).isEqualTo(later.course().get("id"));assertThat(attemptCourse(selected(g)).get("gradeVersion")).isEqualTo(saved.get("version"));number(summary(value).get("gpa"),"4.00");
    }
    @Test void updatedCodesAndCreditsRebuildGroupingRatherThanPersistingOldSelection()throws Exception{
        var a=account();scored(a,semester(a,1),"GROUP",3,8);var later=scored(a,semester(a,2),"GROUP",3,9);var v=courseUpdate(later.course());v.put("credits",4);var changed=data(send("PUT",COURSES+"/"+later.course().get("id"),a.token,v));assertThat(summary(cumulative(a)).get("gpa")).isNull();v=courseUpdate(changed);v.put("code","OTHER");data(send("PUT",COURSES+"/"+later.course().get("id"),a.token,v));var value=cumulative(a);number(summary(value).get("gpa"),"3.79");assertThat(summary(value).get("earnedCredits")).isEqualTo(7);assertThat(summary(value).get("reviewGroups")).isEqualTo(0);
    }
    @Test void separateOwnersNeverAffectEachOthersReportsEvenWithQueryInjection()throws Exception{
        var a=account();var b=account();scored(a,semester(a,1),"SAME",3,8);scored(b,semester(b,1),"SAME",3,0);var own=cumulative(a);number(summary(own).get("gpa"),"3.50");number(summary(cumulative(b)).get("gpa"),"0.00");assertThat(data(send("GET",CUMULATIVE+"?userId="+b.id,a.token,null))).isEqualTo(own);assertThat(summary(own).get("recordedAttempts")).isEqualTo(1);
    }
    @Test void repeatedReadsDoNotWriteGradesVersionsOrChangeSemesterGpa()throws Exception{
        var a=account();var sem=semester(a,1);var x=scored(a,sem,"READONLY",3,8);var beforeMarks=read(a,x.config());var beforeGpa=gpa(a,sem);var beforeHistory=history(a);var value=cumulative(a);for(int i=0;i<3;i++)assertThat(cumulative(a)).isEqualTo(value);assertThat(read(a,x.config())).isEqualTo(beforeMarks);assertThat(gpa(a,sem)).isEqualTo(beforeGpa);assertThat(history(a)).isEqualTo(beforeHistory);assertThat(groups(value).stream().map(g->source(g)).toList()).isEqualTo(groups(beforeHistory));
    }
    @Test void semesterCreditsGradeVersionAndResultShareOneSnapshotDuringAtomicWrites()throws Exception{
        var a=account();var sem=semester(a,1);var x=scored(a,sem,"SNAPSHOT",1,4);var responses=concurrent(()->{try(var c=DriverManager.getConnection(URL,USER,PASSWORD)){c.setSchema(SCHEMA);c.setAutoCommit(false);for(int v=1;v<=6;v++){
            try(var p=c.prepareStatement("UPDATE courses SET credits=?,version=? WHERE id=?")){p.setInt(1,v+1);p.setInt(2,v);p.setObject(3,UUID.fromString(x.course().get("id").toString()));p.executeUpdate();}Thread.sleep(12);
            try(var p=c.prepareStatement("UPDATE semesters SET start_year=?,version=? WHERE id=?")){p.setInt(1,2026+v);p.setInt(2,v);p.setObject(3,UUID.fromString(sem.get("id").toString()));p.executeUpdate();}
            try(var p=c.prepareStatement("UPDATE grade_columns SET score=? WHERE configuration_id=?")){p.setInt(1,v+4);p.setObject(2,UUID.fromString(x.config().get("id").toString()));p.executeUpdate();}
            try(var p=c.prepareStatement("UPDATE grade_configurations SET version=?,update_revision=? WHERE id=?")){p.setInt(1,v+1);p.setInt(2,v+1);p.setObject(3,UUID.fromString(x.config().get("id").toString()));p.executeUpdate();}c.commit();}}return send("GET",CUMULATIVE,a.token,null);
        },()->{HttpResponse<String> response=null;for(int i=0;i<25;i++){response=send("GET",CUMULATIVE,a.token,null);var value=data(response);var g=groups(value).getFirst();var row=selected(g);var course=attemptCourse(row);var semester=(Map<?,?>)row.get("semester");int v=((Number)course.get("version")).intValue();assertThat(source(g).get("credits")).isEqualTo(v+1);assertThat(course.get("gradeVersion")).isEqualTo(v+1);assertThat(semester.get("version")).isEqualTo(v);assertThat(semester.get("startYear")).isEqualTo(2026+v);number(course.get("total"),Integer.toString(v+4));number(summary(value).get("gpa"),course.get("gradePoint").toString());assertThat(summary(value).get("calculatedCredits")).isEqualTo(v+1);assertThat(g.get("weightedGradePoints")).isEqualTo(summary(value).get("weightedGradePoints"));}return response;});assertThat(responses).allSatisfy(r->assertThat(r.statusCode()).isEqualTo(200));
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershellReadsManualExampleAndClosesOnlyItsOwnSession()throws Exception{
        var a=account();var sem=semester(a,1);scored(a,sem,"A",3,8);scored(a,sem,"B",2,8.5);scored(a,sem,"F",1,0);var output=runCumulativePowerShell(a);assertThat(output).contains("GPA tích lũy trong app: 3.02 / 4","đã đạt: 5","USER_CONFIRMED_APP_RULES");assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL",Integer.class,a.id)).isEqualTo(1);
    }
    @Test @EnabledOnOs(OS.WINDOWS) void powershellDistinguishesNoResultsFromZeroGpa()throws Exception{
        var a=account();assertThat(runCumulativePowerShell(a)).contains("Chưa có nhóm môn đủ kết quả để tính");scored(a,semester(a,1),"F",3,0);assertThat(runCumulativePowerShell(a)).contains("GPA tích lũy trong app: 0.00 / 4");assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_sessions WHERE user_id=? AND revoked_at IS NULL",Integer.class,a.id)).isEqualTo(1);
    }
    String runCumulativePowerShell(Account a)throws Exception{
        String email=jdbc.queryForObject("SELECT email FROM app_users WHERE id=?",String.class,a.id),ps=Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","powershell.exe").toString();
        String script="[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); function Read-Host { param([string]$Prompt,[switch]$AsSecureString); if ($AsSecureString) { ConvertTo-SecureString $env:CUMULATIVE_TEST_PASSWORD -AsPlainText -Force } else { $env:CUMULATIVE_TEST_EMAIL } }; & './scripts/Try-CumulativeGpa.ps1' -BaseUrl 'http://127.0.0.1:"+port+"' -Mode Get";
        var builder=new ProcessBuilder(ps,"-NoProfile","-ExecutionPolicy","Bypass","-Command",script).redirectErrorStream(true);builder.environment().keySet().removeIf(n->n.equalsIgnoreCase("PSModulePath"));builder.environment().put("PSModulePath",Path.of(System.getenv("SystemRoot"),"System32","WindowsPowerShell","v1.0","Modules").toString());builder.environment().put("CUMULATIVE_TEST_EMAIL",email);builder.environment().put("CUMULATIVE_TEST_PASSWORD",SECRET);var process=builder.start();var captured=CompletableFuture.supplyAsync(()->{try{return new String(process.getInputStream().readAllBytes(),StandardCharsets.UTF_8);}catch(java.io.IOException e){throw new java.io.UncheckedIOException(e);}});
        try{assertThat(process.waitFor(30,TimeUnit.SECONDS)).isTrue();var output=captured.get(5,TimeUnit.SECONDS);assertThat(process.exitValue()).as(output).isZero();assertThat(output).doesNotContain(SECRET,"accessToken","refreshToken");return output;}finally{if(process.isAlive())process.destroyForcibly();}
    }
}

