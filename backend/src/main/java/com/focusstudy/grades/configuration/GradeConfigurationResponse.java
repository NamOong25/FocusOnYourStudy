package com.focusstudy.grades.configuration;

import java.math.*;
import java.time.Instant;
import java.util.*;
import static com.focusstudy.grades.configuration.GradeConfigurationRequests.*;

public record GradeConfigurationResponse(UUID id, UUID courseId, Assessment assessment, List<Part> parts,
        State state, List<String> missingGroups, long version, Instant createdAt, Instant updatedAt) {
    public enum State { DRAFT, READY }
    public record Project(Target target, BigDecimal share) { }
    public record Part(String id, String name, Kind kind, Project project, int weightNumerator, int weightDenominator, BigDecimal weight) { }
    static GradeConfigurationResponse from(GradeConfigurationEntity config) {
        var columns = config.getColumns(); var missing = new ArrayList<String>();
        int regular = (int) columns.stream().filter(c -> c.getKind() == Kind.REGULAR || c.getKind() == Kind.REGULAR_TEST).count();
        if (config.getAssessment() == Assessment.THEORY) {
            if (regular == 0) missing.add("REGULAR");
            if (columns.stream().noneMatch(c -> c.getKind() == Kind.MIDTERM)) missing.add("MIDTERM");
            if (columns.stream().noneMatch(GradeColumnEntity::isFinal)) missing.add("FINAL");
        } else if (columns.isEmpty()) missing.add("PRACTICAL_COLUMNS");
        var parts = columns.stream().map(c -> {
            int numerator = config.getAssessment() == Assessment.PRACTICAL ? 100 : c.isFinal() ? 50 : c.getKind() == Kind.MIDTERM ? 30 : 20;
            int denominator = config.getAssessment() == Assessment.PRACTICAL ? columns.size() : (c.getKind() == Kind.REGULAR || c.getKind() == Kind.REGULAR_TEST) ? regular : 1;
            var share = c.getProjectShare() == null ? null : c.getProjectShare().stripTrailingZeros();
            if (share != null && share.scale() < 0) share = share.setScale(0);
            var project = c.getProjectTarget() == null ? null : new Project(c.getProjectTarget(), share);
            // Percentage is display-only. Keep the exact ratio for later score
            // computation; never use rounded 33.333... percentages as inputs.
            var weight = BigDecimal.valueOf(numerator).divide(BigDecimal.valueOf(denominator), 12, RoundingMode.HALF_UP);
            return new Part(c.getKey(), c.getName(), c.getKind(), project, numerator, denominator, weight);
        }).toList();
        return new GradeConfigurationResponse(config.getId(), config.getCourseId(), config.getAssessment(), parts,
                missing.isEmpty() ? State.READY : State.DRAFT, List.copyOf(missing), config.getVersion(), config.getCreatedAt(), config.getUpdatedAt());
    }
}
