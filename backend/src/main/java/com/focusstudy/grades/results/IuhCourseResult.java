package com.focusstudy.grades.results;

import java.math.BigDecimal;
import java.util.List;

public record IuhCourseResult(Status status, String reason, boolean complete, boolean allScoresEntered,
        Boolean passed, Boolean needsRetake, ExamEligibility examEligibility,
        BigDecimal regularAverage, BigDecimal finalExamScore, BigDecimal weightedTotal, BigDecimal rawTotal,
        BigDecimal total, String letter, BigDecimal gradePoint,
        int enteredColumns, int columnCount, List<String> missingGroups,
        List<MissingScore> missingScores, List<Column> columns, List<Notice> notices) {
    public enum Status { INCOMPLETE_CONFIGURATION, INCOMPLETE_SCORES, EXAM_BLOCKED, FAILED, PASSED }
    public enum ExamEligibility { UNKNOWN, ELIGIBLE_BY_MIDTERM, BLOCKED_BY_MIDTERM_ZERO, NOT_EVALUATED }
    public enum ValueField { SCORE, REMAINDER_SCORE }
    public record MissingScore(String columnId, ValueField field) { }
    public record Column(String id, BigDecimal effectiveScore) { }
    public record Notice(String code, String message) { }
}
