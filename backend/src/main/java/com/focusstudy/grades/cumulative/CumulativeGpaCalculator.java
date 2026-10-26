package com.focusstudy.grades.cumulative;

import com.focusstudy.grades.attempts.CourseAttemptsResponse;
import com.focusstudy.grades.configuration.GradeConfigurationRequests.Assessment;
import java.math.*;
import java.util.*;
import static com.focusstudy.grades.cumulative.CumulativeGpaResponse.*;

public final class CumulativeGpaCalculator {
    private CumulativeGpaCalculator() { }
    private static final Comparator<CourseAttemptsResponse.Attempt> CHRONOLOGY = Comparator
            .comparingInt((CourseAttemptsResponse.Attempt a) -> a.semester().startYear())
            .thenComparingInt(a -> a.semester().term());
    private static final Comparator<CourseAttemptsResponse.Attempt> PASS_ORDER = Comparator
            .comparing((CourseAttemptsResponse.Attempt a) -> a.course().total()).thenComparing(CHRONOLOGY);

    public static CumulativeGpaResponse calculate(CourseAttemptsResponse history) {
        var groups = new ArrayList<Group>();
        long calculatedCredits = 0, earnedCredits = 0, failedCredits = 0;
        int calculated = 0, passed = 0, failed = 0, excluded = 0, review = 0, pending = 0;
        BigDecimal weighted = BigDecimal.ZERO;
        for (var source : history.groups()) {
            int missing = (int) source.attempts().stream().filter(a -> !eligible(a.course())).count();
            pending = Math.addExact(pending, missing);
            CourseAttemptsResponse.Attempt selected = null;
            Reason reason;
            if (source.needsReview()) { reason = Reason.REVIEW_REQUIRED; review++; }
            else {
                var complete = source.attempts().stream().filter(a -> eligible(a.course())).toList();
                selected = complete.stream().filter(a -> Boolean.TRUE.equals(a.course().passed())).max(PASS_ORDER).orElse(null);
                if (selected != null) reason = Reason.HIGHEST_PASS;
                else {
                    selected = complete.stream().filter(a -> Boolean.FALSE.equals(a.course().passed())).max(CHRONOLOGY).orElse(null);
                    reason = selected == null ? Reason.NO_COMPLETE_RESULT : Reason.LATEST_COMPLETE_F;
                }
            }
            BigDecimal contribution = null;
            if (selected == null) excluded++;
            else {
                calculated++; calculatedCredits = Math.addExact(calculatedCredits, source.credits());
                contribution = selected.course().gradePoint().multiply(BigDecimal.valueOf(source.credits()));
                weighted = weighted.add(contribution);
                if (Boolean.TRUE.equals(selected.course().passed())) { passed++; earnedCredits = Math.addExact(earnedCredits, source.credits()); }
                else { failed++; failedCredits = Math.addExact(failedCredits, source.credits()); }
            }
            var decisions = new ArrayList<Decision>();
            for (var attempt : source.attempts()) decisions.add(new Decision(attempt.course().id(), use(source, attempt, selected)));
            groups.add(new Group(source, selected != null, selected == null ? null : selected.course().id(), reason, contribution,
                    missing, List.copyOf(decisions)));
        }
        var state = groups.isEmpty() ? State.EMPTY : calculated == 0 ? State.NO_RESULTS
                : excluded > 0 || pending > 0 ? State.PARTIAL : State.COMPLETE;
        var gpa = calculatedCredits == 0 ? null : weighted.divide(BigDecimal.valueOf(calculatedCredits), 2, RoundingMode.HALF_UP);
        return new CumulativeGpaResponse(POLICY, new Summary(state, state == State.COMPLETE, gpa, weighted,
                calculatedCredits, earnedCredits, failedCredits, history.summary().groups(), history.summary().attempts(),
                history.summary().repeatedGroups(), calculated, passed, failed, excluded, review, pending), List.copyOf(groups));
    }
    private static boolean eligible(CourseAttemptsResponse.Course c) {
        return c.complete() && c.incompleteReason() == null && c.total() != null && c.gradePoint() != null && c.passed() != null
                && (c.assessment() == Assessment.THEORY || c.assessment() == Assessment.PRACTICAL);
    }
    private static Use use(CourseAttemptsResponse.Group group, CourseAttemptsResponse.Attempt a, CourseAttemptsResponse.Attempt selected) {
        if (group.needsReview()) return Use.GROUP_REQUIRES_REVIEW;
        if (!eligible(a.course())) return Use.PENDING_RESULT;
        if (selected != null && a.course().id().equals(selected.course().id())) return Use.SELECTED;
        if (Boolean.TRUE.equals(a.course().passed())) return a.course().total().compareTo(selected.course().total()) == 0
                ? Use.NOT_SELECTED_OLDER_TIE : Use.NOT_SELECTED_LOWER_PASS;
        return selected != null && Boolean.TRUE.equals(selected.course().passed()) ? Use.NOT_SELECTED_FAILED_ATTEMPT : Use.NOT_SELECTED_OLDER_F;
    }
}
