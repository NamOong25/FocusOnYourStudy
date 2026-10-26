package com.focusstudy.grades.cumulative;

import com.focusstudy.grades.attempts.CourseAttemptsResponse;
import com.focusstudy.grades.results.GradeResultResponse;
import java.math.BigDecimal;
import java.util.*;

public record CumulativeGpaResponse(Policy policy, Summary summary, List<Group> groups) {
    public enum State { EMPTY, NO_RESULTS, PARTIAL, COMPLETE }
    public enum Reason { HIGHEST_PASS, LATEST_COMPLETE_F, NO_COMPLETE_RESULT, REVIEW_REQUIRED }
    public enum Use { SELECTED, PENDING_RESULT, GROUP_REQUIRES_REVIEW,
        NOT_SELECTED_LOWER_PASS, NOT_SELECTED_OLDER_TIE, NOT_SELECTED_FAILED_ATTEMPT, NOT_SELECTED_OLDER_F }
    public record Policy(String id, String authority, boolean officialIuhCumulativeVerified, String scope,
            String coursePolicyId, String historyPolicyId, String selection, String tieBreak, String noPassRule,
            int decimals, String rounding) { }
    public static final Policy POLICY = new Policy("APP_CUMULATIVE_HIGHEST_PASS_V1", "USER_CONFIRMED_APP_RULES", false,
            "RECORDED_NUMERIC_THEORY_PRACTICAL_COURSES", GradeResultResponse.POLICY.id(), CourseAttemptsResponse.POLICY.id(),
            "HIGHEST_PASSED_TOTAL_10", "LATEST_ACADEMIC_YEAR_THEN_TERM", "LATEST_COMPLETE_F_WITH_ZERO_POINTS_AND_FULL_CREDITS", 2, "HALF_UP");
    public record Summary(State state, boolean complete, BigDecimal gpa, BigDecimal weightedGradePoints,
            long calculatedCredits, long earnedCredits, long failedCredits,
            int registeredGroups, int recordedAttempts, int repeatedGroups, int calculatedGroups,
            int passedGroups, int failedGroups, int excludedGroups, int reviewGroups, int pendingAttempts) { }
    public record Decision(UUID courseId, Use use) { }
    public record Group(CourseAttemptsResponse.Group history, boolean included, UUID selectedCourseId,
            Reason reason, BigDecimal weightedGradePoints, int pendingAttempts, List<Decision> decisions) { }
}
