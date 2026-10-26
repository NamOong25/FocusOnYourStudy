package com.focusstudy.grades.attempts;

import com.focusstudy.academics.CourseEntity;
import com.focusstudy.academics.semesters.SemesterResponse;
import com.focusstudy.grades.configuration.GradeConfigurationRequests.Assessment;
import com.focusstudy.grades.results.*;
import com.focusstudy.grades.semester.SemesterGpaResponse;
import java.math.BigDecimal;
import java.util.*;

public record CourseAttemptsResponse(UUID focusCourseId, Policy policy, Summary summary, List<Group> groups) {
    public record Policy(String id, String matching, String ordering, String resultPolicyId,
            String cumulativeSelection, String registrationSourceUrl, String ruleVerification) { }
    public static final Policy POLICY = new Policy("COURSE_ATTEMPTS_V1", "EXACT_NORMALIZED_CODE_AND_CREDITS",
            "ACADEMIC_START_YEAR_THEN_TERM", GradeResultResponse.POLICY.id(), "NOT_IMPLEMENTED",
            "https://camnang.iuh.edu.vn/quy-che-dao-tao-theo-he-thong-tin-chi.php",
            "SAME_COURSE_IMPROVEMENT_SELECTION_NOT_CONFIRMED");
    public enum Relation {
        FIRST_RECORDED, RETAKE_AFTER_FAILED_RESULT, FOLLOWUP_AFTER_PASSED_RESULT,
        FOLLOWUP_PREVIOUS_UNRESOLVED, AMBIGUOUS_PERIOD, AMBIGUOUS_PREDECESSOR
    }
    public enum Issue { CREDIT_VARIANTS, ASSESSMENT_VARIANTS, AMBIGUOUS_PERIOD }
    public record Summary(int groups, int attempts, int repeatedGroups, int reviewGroups) { }
    public record CreditVariant(int credits, List<UUID> courseIds) { }
    public record Group(String code, int credits, boolean needsReview, List<Issue> issues,
            List<CreditVariant> otherCreditVariants, List<Attempt> attempts) { }
    public record Attempt(Integer recordedAttemptNumber, UUID previousCourseId, List<UUID> previousCandidates,
            Relation relation, SemesterResponse semester, Course course) { }
    // Result fields are reused from 5A/5B.1, without a cumulative inclusion flag.
    public record Course(UUID id, String code, String name, int credits, CourseEntity.Status status, long version,
            UUID configurationId, Long gradeVersion, Assessment assessment, boolean complete, Boolean passed,
            IuhCourseResult.Status resultStatus, String resultReason, BigDecimal total, String letter, BigDecimal gradePoint,
            SemesterGpaResponse.Exclusion incompleteReason, List<String> missingGroups,
            List<IuhCourseResult.MissingScore> missingScores, List<IuhCourseResult.Notice> notices) {
        public static Course from(SemesterGpaResponse.Course c) {
            return new Course(c.id(), c.code(), c.name(), c.credits(), c.courseStatus(), c.courseVersion(),
                    c.configurationId(), c.gradeVersion(), c.assessment(), c.complete(), c.passed(), c.resultStatus(),
                    c.resultReason(), c.total(), c.letter(), c.gradePoint(), c.exclusionReason(),
                    c.missingGroups(), c.missingScores(), c.notices());
        }
    }
}
