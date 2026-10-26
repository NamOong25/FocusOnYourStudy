package com.focusstudy.grades.semester;

import com.focusstudy.academics.CourseEntity;
import com.focusstudy.academics.semesters.SemesterResponse;
import com.focusstudy.grades.configuration.GradeConfigurationRequests.Assessment;
import com.focusstudy.grades.results.IuhCourseResult;
import java.math.BigDecimal;
import java.util.*;

public record SemesterGpaResponse(SemesterResponse semester, Policy policy, Summary summary, List<Course> courses) {
    public enum State { EMPTY, NO_RESULTS, PARTIAL, COMPLETE }
    public enum Exclusion { NO_CONFIGURATION, INCOMPLETE_CONFIGURATION, EXAM_BLOCKED, INCOMPLETE_SCORES }
    public record Policy(String id, String coursePolicyId, String sourceUrl, int pdfPage, int decimals, String rounding, String formula) { }
    public record Summary(State state, boolean complete, BigDecimal gpa, BigDecimal weightedGradePoints,
            long registeredCredits, long calculatedCredits, long earnedCredits, long failedCredits, long excludedCredits,
            int registeredCourses, int calculatedCourses, int passedCourses, int failedCourses, int excludedCourses) { }
    public record Course(UUID id, String code, String name, int credits, CourseEntity.Status courseStatus, long courseVersion,
            UUID configurationId, Long gradeVersion, Assessment assessment,
            boolean included, Exclusion exclusionReason, IuhCourseResult.Status resultStatus, String resultReason,
            boolean complete, Boolean passed, BigDecimal total, String letter, BigDecimal gradePoint, BigDecimal weightedGradePoints,
            List<String> missingGroups, List<IuhCourseResult.MissingScore> missingScores, List<IuhCourseResult.Notice> notices) { }
}
