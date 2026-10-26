package com.focusstudy;

import com.focusstudy.academics.*;
import com.focusstudy.academics.semesters.SemesterResponse;
import com.focusstudy.grades.attempts.*;
import com.focusstudy.grades.configuration.GradeConfigurationRequests.Assessment;
import com.focusstudy.grades.results.IuhCourseResult;
import com.focusstudy.grades.semester.SemesterGpaResponse.Exclusion;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import static com.focusstudy.grades.attempts.CourseAttemptsResponse.*;
import static org.assertj.core.api.Assertions.*;

class CourseAttemptsTimelineTests {
    CourseAttemptsTimeline.Entry entry(String code, int credits, int year, int term, boolean complete, Boolean passed, Assessment assessment) {
        var semester = new SemesterResponse(UUID.randomUUID(), term, year, "Kỳ " + term, "Năm " + year,
                SemesterEntity.Status.UPCOMING, null, 0, null, null);
        var course = new Course(UUID.randomUUID(), code, "Cùng tên môn", credits, CourseEntity.Status.COMPLETED, 0,
                null, null, assessment, complete, passed,
                complete ? Boolean.TRUE.equals(passed) ? IuhCourseResult.Status.PASSED : IuhCourseResult.Status.FAILED : null,
                "TEST", complete ? BigDecimal.valueOf(Boolean.TRUE.equals(passed) ? 8 : 0) : null,
                complete ? Boolean.TRUE.equals(passed) ? "B+" : "F" : null,
                complete ? BigDecimal.valueOf(Boolean.TRUE.equals(passed) ? 3.5 : 0) : null,
                complete ? null : Exclusion.INCOMPLETE_SCORES, List.of(), List.of(), List.of());
        return new CourseAttemptsTimeline.Entry(semester, course);
    }
    @Test void emptyHistoryHasNoCumulativeSelectionOrInventedAttempts() {
        var result = CourseAttemptsTimeline.build(null, List.of());
        assertThat(result.summary()).isEqualTo(new Summary(0, 0, 0, 0));
        assertThat(result.groups()).isEmpty(); assertThat(result.policy().cumulativeSelection()).isEqualTo("NOT_IMPLEMENTED");
    }
    @Test void academicChronologyIncludesSummerAndDoesNotUseInputOrderOrSemesterStatus() {
        var next = entry("WEB",3,2027,1,false,null,null);
        var summer = entry("WEB",3,2026,3,true,true,Assessment.THEORY);
        var first = entry("WEB",3,2026,1,true,false,Assessment.THEORY);
        var second = entry("WEB",3,2026,2,true,true,Assessment.THEORY);
        var result = CourseAttemptsTimeline.build(next.course().id(), List.of(next,summer,second,first));
        var rows = result.groups().getFirst().attempts();
        assertThat(rows).extracting(a -> a.course().id()).containsExactly(first.course().id(),second.course().id(),summer.course().id(),next.course().id());
        assertThat(rows).extracting(Attempt::relation).containsExactly(Relation.FIRST_RECORDED,Relation.RETAKE_AFTER_FAILED_RESULT,Relation.FOLLOWUP_AFTER_PASSED_RESULT,Relation.FOLLOWUP_AFTER_PASSED_RESULT);
        assertThat(rows).extracting(Attempt::recordedAttemptNumber).containsExactly(1,2,3,4);
        assertThat(rows.getLast().previousCourseId()).isEqualTo(summer.course().id());
        assertThat(result.summary()).isEqualTo(new Summary(1,4,1,0));
    }
    @Test void equalNamesNeverMergeDifferentCodes() {
        var result=CourseAttemptsTimeline.build(null,List.of(entry("WEB-A",3,2026,1,true,true,null),entry("WEB-B",3,2026,2,true,false,null)));
        assertThat(result.groups()).hasSize(2); assertThat(result.summary().repeatedGroups()).isZero();
        assertThat(result.groups()).allSatisfy(g -> assertThat(g.attempts().getFirst().relation()).isEqualTo(Relation.FIRST_RECORDED));
    }
    @Test void creditVariantsRemainSeparateAndReferenceOnlyOtherVariants() {
        var three=entry("WEB",3,2026,1,true,false,null); var four=entry("WEB",4,2026,2,true,true,null);
        var result=CourseAttemptsTimeline.build(null,List.of(four,three));
        assertThat(result.summary()).isEqualTo(new Summary(2,2,0,2));
        assertThat(result.groups()).allSatisfy(g -> {assertThat(g.issues()).containsExactly(Issue.CREDIT_VARIANTS);assertThat(g.attempts().getFirst().previousCourseId()).isNull();});
        assertThat(result.groups().getFirst().otherCreditVariants()).containsExactly(new CreditVariant(4,List.of(four.course().id())));
    }
    @Test void missingAndKnownPartialFailureDoNotBecomeConfirmedPriorFailures() {
        for(Boolean passed:Arrays.asList(null,false)) {
            var previous=entry("WEB",3,2026,1,false,passed,Assessment.THEORY);
            var next=entry("WEB",3,2026,2,false,null,null);
            var row=CourseAttemptsTimeline.build(null,List.of(next,previous)).groups().getFirst().attempts().getLast();
            assertThat(row.relation()).isEqualTo(Relation.FOLLOWUP_PREVIOUS_UNRESOLVED);
            assertThat(row.previousCourseId()).isEqualTo(previous.course().id());
        }
    }
    @Test void immediateIncompleteAttemptIsNotSkippedToReachAnOlderPass() {
        var rows=List.of(entry("WEB",3,2026,1,true,true,null),entry("WEB",3,2026,2,false,null,null),entry("WEB",3,2026,3,false,null,null));
        var result=CourseAttemptsTimeline.build(null,rows).groups().getFirst().attempts();
        assertThat(result.getLast().relation()).isEqualTo(Relation.FOLLOWUP_PREVIOUS_UNRESOLVED);
        assertThat(result.getLast().previousCourseId()).isEqualTo(rows.get(1).course().id());
    }
    @Test void conflictingAssessmentTypesRequireReviewButKeepEveryRecord() {
        var group=CourseAttemptsTimeline.build(null,List.of(entry("WEB",3,2026,1,true,true,Assessment.THEORY),entry("WEB",3,2026,2,true,true,Assessment.PRACTICAL))).groups().getFirst();
        assertThat(group.needsReview()).isTrue(); assertThat(group.issues()).containsExactly(Issue.ASSESSMENT_VARIANTS); assertThat(group.attempts()).hasSize(2);
    }
    @Test void ambiguousPeriodNeverUsesUuidToInventAPredecessor() {
        var first=entry("WEB",3,2026,1,true,true,null);var tied=entry("WEB",3,2026,1,true,false,null);var next=entry("WEB",3,2026,2,false,null,null);
        var group=CourseAttemptsTimeline.build(null,List.of(next,tied,first)).groups().getFirst();
        assertThat(group.issues()).containsExactly(Issue.AMBIGUOUS_PERIOD);
        assertThat(group.attempts().subList(0,2)).allSatisfy(a->{assertThat(a.recordedAttemptNumber()).isNull();assertThat(a.previousCourseId()).isNull();assertThat(a.relation()).isEqualTo(Relation.AMBIGUOUS_PERIOD);});
        assertThat(group.attempts().getLast().relation()).isEqualTo(Relation.AMBIGUOUS_PREDECESSOR);
        assertThat(group.attempts().getLast().previousCourseId()).isNull();
        assertThat(group.attempts().getLast().previousCandidates()).containsExactlyInAnyOrder(first.course().id(),tied.course().id());
    }
}
