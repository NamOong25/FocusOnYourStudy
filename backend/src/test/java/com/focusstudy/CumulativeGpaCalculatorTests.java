package com.focusstudy;

import com.focusstudy.academics.*;
import com.focusstudy.academics.semesters.SemesterResponse;
import com.focusstudy.grades.attempts.*;
import com.focusstudy.grades.configuration.GradeConfigurationRequests.Assessment;
import com.focusstudy.grades.cumulative.*;
import com.focusstudy.grades.results.IuhCourseResult;
import com.focusstudy.grades.semester.SemesterGpaResponse.Exclusion;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import static com.focusstudy.grades.cumulative.CumulativeGpaResponse.*;
import static org.assertj.core.api.Assertions.*;

class CumulativeGpaCalculatorTests {
    CourseAttemptsTimeline.Entry entry(String code,int credits,int year,int term,Double total,Double point,Boolean passed) {
        boolean complete=total!=null&&point!=null&&passed!=null;
        var s=new SemesterResponse(UUID.randomUUID(),term,year,"Kỳ "+term,year+" – "+(year+1),SemesterEntity.Status.UPCOMING,null,0,null,null);
        String letter=point==null?null:switch(BigDecimal.valueOf(point).stripTrailingZeros().toPlainString()){
            case "4"->"A+";case "3.8"->"A";case "3.5"->"B+";case "3"->"B";case "2.5"->"C+";case "2"->"C";case "1.5"->"D+";case "1"->"D";default->"F";};
        var c=new CourseAttemptsResponse.Course(UUID.randomUUID(),code,"Trùng tên môn",credits,CourseEntity.Status.COMPLETED,0,
                UUID.randomUUID(),1L,Assessment.THEORY,complete,passed,
                !complete?IuhCourseResult.Status.INCOMPLETE_SCORES:passed?IuhCourseResult.Status.PASSED:IuhCourseResult.Status.FAILED,
                "TEST",total==null?null:BigDecimal.valueOf(total),letter,point==null?null:BigDecimal.valueOf(point),
                complete?null:Exclusion.INCOMPLETE_SCORES,List.of(),List.of(),List.of());
        return new CourseAttemptsTimeline.Entry(s,c);
    }
    CourseAttemptsTimeline.Entry pass(String code,int credits,int term,double total,double point){return entry(code,credits,2026,term,total,point,true);}
    CourseAttemptsTimeline.Entry fail(String code,int credits,int term,double total){return entry(code,credits,2026,term,total,0.0,false);}
    CourseAttemptsTimeline.Entry pending(String code,int credits,int term){return entry(code,credits,2026,term,null,null,null);}
    CumulativeGpaResponse report(CourseAttemptsTimeline.Entry... entries){return CumulativeGpaCalculator.calculate(CourseAttemptsTimeline.build(null,List.of(entries)));}
    void number(BigDecimal value,String expected){assertThat(value).isEqualByComparingTo(expected);}
    @Test void emptyAndNoResultsHaveNullGpaRatherThanZero(){
        var empty=report();assertThat(empty.summary().state()).isEqualTo(State.EMPTY);assertThat(empty.summary().gpa()).isNull();assertThat(empty.groups()).isEmpty();
        var draft=report(pending("A",3,1));assertThat(draft.summary().state()).isEqualTo(State.NO_RESULTS);assertThat(draft.summary().gpa()).isNull();assertThat(draft.summary().calculatedCredits()).isZero();assertThat(draft.summary().pendingAttempts()).isEqualTo(1);assertThat(draft.groups().getFirst().reason()).isEqualTo(Reason.NO_COMPLETE_RESULT);
    }
    @Test void creditWeightingIncludesCompleteFInDenominator(){
        var s=report(pass("A",3,1,8,3.5),pass("B",2,1,8.5,3.8),fail("C",1,1,0)).summary();
        number(s.gpa(),"3.02");number(s.weightedGradePoints(),"18.1");assertThat(s.calculatedCredits()).isEqualTo(6);assertThat(s.earnedCredits()).isEqualTo(5);assertThat(s.failedCredits()).isEqualTo(1);assertThat(s.state()).isEqualTo(State.COMPLETE);
    }
    @Test void highestPassingTotalWinsEvenWhenLaterPassIsLower(){
        var high=pass("A",3,1,8,3.5);var low=pass("A",3,2,6,2.5);var value=report(low,high);var g=value.groups().getFirst();
        assertThat(g.selectedCourseId()).isEqualTo(high.course().id());assertThat(g.reason()).isEqualTo(Reason.HIGHEST_PASS);assertThat(g.decisions()).contains(new Decision(low.course().id(),Use.NOT_SELECTED_LOWER_PASS));number(value.summary().gpa(),"3.50");assertThat(value.summary().earnedCredits()).isEqualTo(3);assertThat(value.summary().recordedAttempts()).isEqualTo(2);
    }
    @Test void comparesTenPointTotalBeforeLatestWhenFourPointBandsAreEqual(){
        var high=pass("A",3,1,8.4,3.5);var recent=pass("A",3,2,8,3.5);var g=report(recent,high).groups().getFirst();
        assertThat(g.selectedCourseId()).isEqualTo(high.course().id());assertThat(g.decisions()).contains(new Decision(recent.course().id(),Use.NOT_SELECTED_LOWER_PASS));
    }
    @Test void equalTotalsPreferLatestAcademicYearThenSummerTerm(){
        var old=pass("A",3,1,8,3.5);var summer=pass("A",3,3,8,3.5);var next=entry("A",3,2027,1,8.0,3.5,true);
        assertThat(report(summer,old).groups().getFirst().selectedCourseId()).isEqualTo(summer.course().id());
        var g=report(next,summer,old).groups().getFirst();assertThat(g.selectedCourseId()).isEqualTo(next.course().id());assertThat(g.decisions()).contains(new Decision(summer.course().id(),Use.NOT_SELECTED_OLDER_TIE));
    }
    @Test void failedThenPassedCountsCreditsOnceAndRetainsFailedHistory(){
        var f=fail("A",3,1,0);var p=pass("A",3,2,8,3.5);var value=report(f,p);var g=value.groups().getFirst();
        assertThat(g.history().attempts()).hasSize(2);assertThat(g.decisions()).contains(new Decision(f.course().id(),Use.NOT_SELECTED_FAILED_ATTEMPT));assertThat(value.summary().calculatedCredits()).isEqualTo(3);assertThat(value.summary().earnedCredits()).isEqualTo(3);assertThat(value.summary().failedCredits()).isZero();
    }
    @Test void laterFailureDoesNotEraseEarlierPassUnderAppPolicy(){
        var p=pass("A",3,1,8,3.5);var f=fail("A",3,2,0);var value=report(p,f);
        assertThat(value.groups().getFirst().selectedCourseId()).isEqualTo(p.course().id());number(value.summary().gpa(),"3.50");assertThat(value.groups().getFirst().history().attempts()).hasSize(2);
    }
    @Test void noPassUsesLatestCompleteFWithZeroGpaAndNoEarnedCredits(){
        var earlier=fail("A",3,1,3.9);var recent=fail("A",3,2,0);var value=report(recent,earlier);var g=value.groups().getFirst();
        assertThat(g.selectedCourseId()).isEqualTo(recent.course().id());assertThat(g.reason()).isEqualTo(Reason.LATEST_COMPLETE_F);assertThat(g.decisions()).contains(new Decision(earlier.course().id(),Use.NOT_SELECTED_OLDER_F));number(value.summary().gpa(),"0.00");assertThat(value.summary().calculatedCredits()).isEqualTo(3);assertThat(value.summary().failedCredits()).isEqualTo(3);assertThat(value.summary().earnedCredits()).isZero();
    }
    @Test void pendingAttemptDoesNotBecomeZeroOrRemoveKnownResultButMarksPartial(){
        var known=pass("A",3,1,8,3.5);var missing=pending("A",3,2);var value=report(known,missing);var g=value.groups().getFirst();
        assertThat(g.selectedCourseId()).isEqualTo(known.course().id());assertThat(g.decisions()).contains(new Decision(missing.course().id(),Use.PENDING_RESULT));assertThat(value.summary().state()).isEqualTo(State.PARTIAL);assertThat(value.summary().complete()).isFalse();assertThat(value.summary().pendingAttempts()).isEqualTo(1);number(value.summary().gpa(),"3.50");
    }
    @Test void incompleteKnownFailureDoesNotInventACompleteF(){
        var value=report(entry("A",3,2026,1,null,null,false));assertThat(value.summary().gpa()).isNull();assertThat(value.summary().failedGroups()).isZero();assertThat(value.summary().failedCredits()).isZero();assertThat(value.groups().getFirst().included()).isFalse();
    }
    @Test void differentCreditsExcludeEveryVariantAndKeepExplicitReferences(){
        var value=report(pass("A",3,1,8,3.5),pass("A",4,2,9,4));assertThat(value.summary().gpa()).isNull();assertThat(value.summary().reviewGroups()).isEqualTo(2);assertThat(value.summary().calculatedCredits()).isZero();
        assertThat(value.groups()).allSatisfy(g->{assertThat(g.reason()).isEqualTo(Reason.REVIEW_REQUIRED);assertThat(g.included()).isFalse();assertThat(g.selectedCourseId()).isNull();assertThat(g.history().otherCreditVariants()).hasSize(1);assertThat(g.decisions()).allSatisfy(d->assertThat(d.use()).isEqualTo(Use.GROUP_REQUIRES_REVIEW));});
    }
    @Test void ambiguousPeriodExcludesGroupInsteadOfChoosingByUuid(){
        var value=report(pass("A",3,1,8,3.5),pass("A",3,1,9,4));assertThat(value.groups().getFirst().reason()).isEqualTo(Reason.REVIEW_REQUIRED);assertThat(value.summary().gpa()).isNull();
    }
    @Test void validGroupsRemainPartialWhenOtherGroupsAreExcluded(){
        var value=report(pass("A",3,1,8,3.5),pass("B",3,1,8,3.5),pass("B",4,2,9,4),pending("C",2,1));
        assertThat(value.summary().state()).isEqualTo(State.PARTIAL);number(value.summary().gpa(),"3.50");assertThat(value.summary().calculatedGroups()).isEqualTo(1);assertThat(value.summary().excludedGroups()).isEqualTo(3);assertThat(value.summary().calculatedCredits()).isEqualTo(3);
    }
    @Test void distinctCodesRemainSeparateDespiteMatchingNames(){
        var value=report(pass("A",3,1,8,3.5),pass("B",3,2,8,3.5));assertThat(value.summary().calculatedGroups()).isEqualTo(2);assertThat(value.summary().calculatedCredits()).isEqualTo(6);
    }
    @Test void roundsOnlyFinalWeightedDivisionAndLabelsPolicyAsAppDefined(){
        var value=report(pass("A",3,1,8,3.5),pass("B",1,1,8.5,3.8));number(value.summary().gpa(),"3.58");number(value.summary().weightedGradePoints(),"14.3");
        assertThat(value.policy().authority()).isEqualTo("USER_CONFIRMED_APP_RULES");assertThat(value.policy().officialIuhCumulativeVerified()).isFalse();assertThat(value.policy().selection()).isEqualTo("HIGHEST_PASSED_TOTAL_10");
    }
}
