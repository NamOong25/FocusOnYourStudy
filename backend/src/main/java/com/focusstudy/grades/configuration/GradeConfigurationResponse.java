package com.focusstudy.grades.configuration;

import java.math.*;
import java.time.Instant;
import java.util.*;
import static com.focusstudy.grades.configuration.GradeConfigurationRequests.*;

public record GradeConfigurationResponse(UUID id, UUID courseId, Assessment assessment, Integer theoryCredits, Integer practiceCredits, List<Part> parts,
        State state, List<String> missingGroups, long version, Instant createdAt, Instant updatedAt) {
    public enum State { DRAFT, READY }
    public record Project(Target target, BigDecimal share) { }
    public record Part(String id, String name, Kind kind, Project project, int weightNumerator, int weightDenominator, BigDecimal weight) { }
    public static GradeConfigurationResponse from(GradeConfigurationEntity config) {
        var columns = config.getColumns(); var missing = new ArrayList<String>();
        int regular = (int) columns.stream().filter(c -> c.getKind() == Kind.REGULAR || c.getKind() == Kind.REGULAR_TEST).count();
        boolean integrated = config.getAssessment() == Assessment.INTEGRATED;
        boolean practical = config.getAssessment() == Assessment.PRACTICAL;
        int practice = (int) columns.stream().filter(GradeColumnEntity::isPractice).count();
        if (!practical) {
            if (regular == 0) missing.add("REGULAR");
            if (columns.stream().noneMatch(c -> c.getKind() == Kind.MIDTERM)) missing.add("MIDTERM");
            if (columns.stream().noneMatch(GradeColumnEntity::isFinal)) missing.add("FINAL");
        }
        if ((practical && columns.isEmpty()) || (integrated && practice == 0)) missing.add("PRACTICAL_COLUMNS");
        var parts = columns.stream().map(c -> {
            boolean practicePart = integrated && c.isPractice();
            int numerator = practical || practicePart ? 100 : c.isFinal() ? 50 : c.getKind() == Kind.MIDTERM ? 30 : 20;
            int denominator = practical ? columns.size() : practicePart ? practice : (c.getKind() == Kind.REGULAR || c.getKind() == Kind.REGULAR_TEST) ? regular : 1;
            if (integrated) {
                numerator *= practicePart ? config.getPracticeCredits() : config.getTheoryCredits();
                denominator *= config.getTheoryCredits() + config.getPracticeCredits();
            }
            var share = c.getProjectShare() == null ? null : c.getProjectShare().stripTrailingZeros();
            if (share != null && share.scale() < 0) share = share.setScale(0);
            var project = c.getProjectTarget() == null ? null : new Project(c.getProjectTarget(), share);
            // Percentage is display-only. Keep the exact ratio for later score
            // computation; never use rounded 33.333... percentages as inputs.
            var weight = BigDecimal.valueOf(numerator).divide(BigDecimal.valueOf(denominator), 12, RoundingMode.HALF_UP);
            return new Part(c.getKey(), c.getName(), c.getKind(), project, numerator, denominator, weight);
        }).toList();
        return new GradeConfigurationResponse(config.getId(), config.getCourseId(), config.getAssessment(), config.getTheoryCredits(), config.getPracticeCredits(), parts,
                missing.isEmpty() ? State.READY : State.DRAFT, List.copyOf(missing), config.getVersion(), config.getCreatedAt(), config.getUpdatedAt());
    }
}
