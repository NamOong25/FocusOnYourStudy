package com.focusstudy.grades.configuration;

import com.focusstudy.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.util.*;

@Entity @Table(name = "grade_configurations")
public class GradeConfigurationEntity extends BaseEntity {
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(name = "course_id", nullable = false) private UUID courseId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 12) private GradeConfigurationRequests.Assessment assessment;
    @Column(name = "update_revision", nullable = false) private long updateRevision;
    @OneToMany(mappedBy = "configuration", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC") private List<GradeColumnEntity> columns = new ArrayList<>();
    protected GradeConfigurationEntity() { }
    static GradeConfigurationEntity create(UUID owner, UUID course, GradeConfigurationRequests.Create input) {
        var config = new GradeConfigurationEntity(); config.userId = owner; config.courseId = course;
        config.assign(input); return config;
    }
    private void assign(GradeConfigurationRequests.Create input) {
        assessment = input.assessment;
        var existing = new HashMap<String, GradeColumnEntity>();
        columns.forEach(column -> existing.put(column.getKey(), column));
        var keys = new HashSet<String>(); input.parts.forEach(part -> keys.add(part.id));
        columns.removeIf(column -> !keys.contains(column.getKey()));
        for (int position = 0; position < input.parts.size(); position++) {
            var part = input.parts.get(position); var column = existing.get(part.id);
            if (column == null) { column = new GradeColumnEntity(this, part.id); columns.add(column); }
            column.change(part, position, assessment);
        }
        columns.sort(Comparator.comparingInt(GradeColumnEntity::getPosition));
    }
    void change(GradeConfigurationRequests.Create input) {
        assign(input);
        // Child-only and identical replacements must also consume the header version.
        updateRevision = Math.incrementExact(updateRevision);
    }
    public void changeScores(Map<String, GradeColumnEntity.Scores> scores) {
        columns.forEach(column -> column.changeScores(Objects.requireNonNull(scores.get(column.getKey()))));
        // Configuration and values share one concurrency token, including no-op PUTs.
        updateRevision = Math.incrementExact(updateRevision);
    }
    public boolean hasScores() { return columns.stream().anyMatch(GradeColumnEntity::hasScores); }
    UUID getUserId() { return userId; }
    public UUID getCourseId() { return courseId; }
    public GradeConfigurationRequests.Assessment getAssessment() { return assessment; }
    public List<GradeColumnEntity> getColumns() { return Collections.unmodifiableList(columns); }
}
