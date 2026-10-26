package com.focusstudy.grades.semester;

import com.focusstudy.academics.CourseEntity;
import com.focusstudy.grades.configuration.GradeConfigurationEntity;
import com.focusstudy.grades.results.*;
import com.focusstudy.grades.scores.GradeScoresResponse;
import java.math.*;
import java.util.*;
import static com.focusstudy.grades.semester.SemesterGpaResponse.*;

public final class SemesterGpaCalculator {
    private SemesterGpaCalculator() { }
    public static Course course(CourseEntity course, GradeConfigurationEntity config) {
        if (config == null) return new Course(course.getId(), course.getCode(), course.getName(), course.getCredits(), course.getStatus(), course.getVersion(),
                null, null, null, false, Exclusion.NO_CONFIGURATION, null, "NO_CONFIGURATION", false, null, null, null, null, null, List.of(), List.of(), List.of());
        var scores = GradeScoresResponse.from(config); var result = IuhCourseCalculator.calculate(scores, course.getCredits());
        Exclusion exclusion = !scores.missingGroups().isEmpty() ? Exclusion.INCOMPLETE_CONFIGURATION
                : result.examEligibility() == IuhCourseResult.ExamEligibility.BLOCKED_BY_MIDTERM_ZERO ? Exclusion.EXAM_BLOCKED
                : !result.complete() || result.gradePoint() == null ? Exclusion.INCOMPLETE_SCORES : null;
        var weighted = exclusion == null ? result.gradePoint().multiply(BigDecimal.valueOf(course.getCredits())) : null;
        return new Course(course.getId(), course.getCode(), course.getName(), course.getCredits(), course.getStatus(), course.getVersion(),
                config.getId(), config.getVersion(), config.getAssessment(), exclusion == null, exclusion,
                result.status(), result.reason(), result.complete(), result.passed(), result.total(), result.letter(), result.gradePoint(), weighted,
                result.missingGroups(), result.missingScores(), result.notices());
    }
    public static Summary summarize(List<Course> courses) {
        long registered = 0, calculated = 0, earned = 0, failed = 0, excluded = 0;
        int calculatedCount = 0, passedCount = 0, failedCount = 0, excludedCount = 0;
        BigDecimal weighted = BigDecimal.ZERO;
        for (var course : courses) {
            registered = Math.addExact(registered, course.credits());
            if (!course.included()) { excluded = Math.addExact(excluded, course.credits()); excludedCount++; continue; }
            // A completed F is included, with zero numerator contribution but
            // its full credit count in the denominator.
            calculated = Math.addExact(calculated, course.credits()); calculatedCount++;
            weighted = weighted.add(course.weightedGradePoints());
            if (Boolean.TRUE.equals(course.passed())) { earned = Math.addExact(earned, course.credits()); passedCount++; }
            else { failed = Math.addExact(failed, course.credits()); failedCount++; }
        }
        var state = courses.isEmpty() ? State.EMPTY : calculatedCount == 0 ? State.NO_RESULTS : excludedCount > 0 ? State.PARTIAL : State.COMPLETE;
        var gpa = calculated == 0 ? null : weighted.divide(BigDecimal.valueOf(calculated), 2, RoundingMode.HALF_UP);
        return new Summary(state, state == State.COMPLETE, gpa, weighted, registered, calculated, earned, failed, excluded,
                courses.size(), calculatedCount, passedCount, failedCount, excludedCount);
    }
}
