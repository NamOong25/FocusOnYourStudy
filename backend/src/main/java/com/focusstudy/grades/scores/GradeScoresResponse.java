package com.focusstudy.grades.scores;

import com.focusstudy.grades.configuration.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

public record GradeScoresResponse(UUID configurationId, UUID courseId, GradeConfigurationRequests.Assessment assessment,
        List<Part> parts, GradeConfigurationResponse.State configurationState, List<String> missingGroups,
        boolean hasScores, long version, Instant createdAt, Instant updatedAt) {
    public record Part(String id, String name, GradeConfigurationRequests.Kind kind, GradeConfigurationResponse.Project project,
            int weightNumerator, int weightDenominator, BigDecimal weight, BigDecimal score, BigDecimal remainderScore) { }
    static GradeScoresResponse from(GradeConfigurationEntity entity) {
        var config = GradeConfigurationResponse.from(entity);
        var columns = new HashMap<String, GradeColumnEntity>(); entity.getColumns().forEach(column -> columns.put(column.getKey(), column));
        var parts = config.parts().stream().map(part -> {
            var column = columns.get(part.id());
            return new Part(part.id(), part.name(), part.kind(), part.project(), part.weightNumerator(), part.weightDenominator(), part.weight(),
                    decimal(column.getScore()), decimal(column.getRemainderScore()));
        }).toList();
        return new GradeScoresResponse(config.id(), config.courseId(), config.assessment(), parts, config.state(), config.missingGroups(),
                entity.hasScores(), config.version(), config.createdAt(), config.updatedAt());
    }
    private static BigDecimal decimal(BigDecimal value) {
        if (value == null) return null;
        var result = value.stripTrailingZeros(); return result.scale() < 0 ? result.setScale(0) : result;
    }
}
