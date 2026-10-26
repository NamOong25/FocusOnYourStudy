package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import com.focusstudy.academics.CourseEntity;
import com.focusstudy.grades.configuration.GradeConfigurationRequests.Assessment;
import com.focusstudy.grades.results.IuhCourseResult;
import com.focusstudy.grades.semester.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;

class SemesterGpaCalculatorTests {
    SemesterGpaResponse.Course course(int credits,String point,boolean included) {
        var value=point==null?null:new BigDecimal(point);boolean passed=included&&value.signum()>0;
        return new SemesterGpaResponse.Course(UUID.randomUUID(),UUID.randomUUID().toString(),"Môn thử",credits,CourseEntity.Status.STUDYING,0,
                null,null,Assessment.THEORY,included,included?null:SemesterGpaResponse.Exclusion.INCOMPLETE_SCORES,
                included?(passed?IuhCourseResult.Status.PASSED:IuhCourseResult.Status.FAILED):IuhCourseResult.Status.INCOMPLETE_SCORES,
                "TEST",included,included?passed:null,null,null,value,included?value.multiply(BigDecimal.valueOf(credits)):null,List.of(),List.of(),List.of());
    }
    @Test void emptySemesterHasNoGpa(){var s=SemesterGpaCalculator.summarize(List.of());assertThat(s.state()).isEqualTo(SemesterGpaResponse.State.EMPTY);assertThat(s.gpa()).isNull();assertThat(s.registeredCredits()).isZero();assertThat(s.complete()).isFalse();}
    @Test void noCompletedGradesDoNotBecomeZeroGpa(){var s=SemesterGpaCalculator.summarize(List.of(course(3,null,false),course(2,null,false)));assertThat(s.state()).isEqualTo(SemesterGpaResponse.State.NO_RESULTS);assertThat(s.gpa()).isNull();assertThat(s.calculatedCredits()).isZero();assertThat(s.excludedCredits()).isEqualTo(5);}
    @Test void creditWeightsAndCompletedFUseCorrectDenominator(){var s=SemesterGpaCalculator.summarize(List.of(course(3,"3.5",true),course(2,"3.8",true),course(1,"0",true)));assertThat(s.gpa()).isEqualByComparingTo("3.02");assertThat(s.weightedGradePoints()).isEqualByComparingTo("18.1");assertThat(s.calculatedCredits()).isEqualTo(6);assertThat(s.earnedCredits()).isEqualTo(5);assertThat(s.failedCredits()).isEqualTo(1);assertThat(s.complete()).isTrue();}
    @Test void allCompletedFsProduceRealZeroWithNoEarnedCredits(){var s=SemesterGpaCalculator.summarize(List.of(course(3,"0",true),course(2,"0",true)));assertThat(s.gpa()).isEqualByComparingTo("0.00");assertThat(s.state()).isEqualTo(SemesterGpaResponse.State.COMPLETE);assertThat(s.earnedCredits()).isZero();assertThat(s.failedCredits()).isEqualTo(5);assertThat(s.failedCourses()).isEqualTo(2);}
    @Test void partialSemesterUsesKnownResultsAndLabelsMissingCourses(){var s=SemesterGpaCalculator.summarize(List.of(course(3,"3.5",true),course(2,null,false)));assertThat(s.state()).isEqualTo(SemesterGpaResponse.State.PARTIAL);assertThat(s.gpa()).isEqualByComparingTo("3.50");assertThat(s.complete()).isFalse();assertThat(s.registeredCredits()).isEqualTo(5);assertThat(s.calculatedCredits()).isEqualTo(3);assertThat(s.excludedCredits()).isEqualTo(2);}
    @Test void exactHalfTieRoundsUpAtTwoDecimals(){var s=SemesterGpaCalculator.summarize(List.of(course(30,"2.5",true),course(30,"2.5",true),course(30,"2.5",true),course(9,"2.5",true),course(1,"3.0",true)));assertThat(s.weightedGradePoints()).isEqualByComparingTo("250.5");assertThat(s.gpa()).isEqualByComparingTo("2.51");}
    @Test void repeatingCreditDivisionRoundsOnlyAtTheEnd(){var s=SemesterGpaCalculator.summarize(List.of(course(2,"3.8",true),course(1,"3.0",true)));assertThat(s.gpa()).isEqualByComparingTo("3.53");assertThat(s.weightedGradePoints()).isEqualByComparingTo("10.6");}
    @Test void creditsAndCountsPartitionWithoutLosingFailedOrMissingCourses(){var s=SemesterGpaCalculator.summarize(List.of(course(3,"3.5",true),course(2,"0",true),course(4,null,false),course(1,null,false)));assertThat(s.registeredCredits()).isEqualTo(s.calculatedCredits()+s.excludedCredits());assertThat(s.calculatedCredits()).isEqualTo(s.earnedCredits()+s.failedCredits());assertThat(s.registeredCourses()).isEqualTo(s.calculatedCourses()+s.excludedCourses());assertThat(s.calculatedCourses()).isEqualTo(s.passedCourses()+s.failedCourses());}
}
