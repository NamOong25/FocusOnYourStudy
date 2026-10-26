package com.focusstudy.grades.results;

import com.focusstudy.grades.scores.GradeScoresResponse;
import java.util.List;

public record GradeResultResponse(GradeScoresResponse scores, int credits, long courseVersion, Policy policy, IuhCourseResult result) {
    public record Policy(String id, String sourceUrl, List<Integer> pdfPages, int totalDecimals, String rounding,
            String inputSemantics, String regularAverageRule) { }
    public static final Policy POLICY = new Policy("IUH_2023_REPORTED_V1",
            "https://fce.iuh.edu.vn/wp-content/uploads/2023/10/2023_FCE_faculty_manual.pdf", List.of(55, 56, 57, 58, 68), 1,
            "HALF_UP", "REPORTED_COMPONENT_SCORES", "ONE_REPORTED_AVERAGE_OR_ROUNDED_AVERAGE_OF_SEPARATE_TESTS");
}
