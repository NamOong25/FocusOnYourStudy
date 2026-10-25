package com.focusstudy.grades.configuration;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity @Table(name = "grade_columns")
public class GradeColumnEntity {
    @Id private UUID id = UUID.randomUUID();
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "configuration_id", nullable = false)
    private GradeConfigurationEntity configuration;
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 12) private GradeConfigurationRequests.Assessment assessment;
    @Column(name = "column_key", nullable = false, length = 80) private String key;
    @Column(nullable = false) private int position;
    @Column(nullable = false, length = 200) private String name;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 24) private GradeConfigurationRequests.Kind kind;
    @Enumerated(EnumType.STRING) @Column(name = "project_target", length = 12) private GradeConfigurationRequests.Target projectTarget;
    @Column(name = "project_share", precision = 7, scale = 4) private BigDecimal projectShare;
    protected GradeColumnEntity() { }
    GradeColumnEntity(GradeConfigurationEntity configuration, String key) {
        this.configuration = configuration; this.userId = configuration.getUserId(); this.key = key;
    }
    void change(GradeConfigurationRequests.Part part, int position, GradeConfigurationRequests.Assessment assessment) {
        this.assessment = assessment; this.position = position; name = part.name.strip(); kind = part.kind;
        projectTarget = part.project == null ? null : part.project.target;
        projectShare = part.project == null ? null : part.project.share;
    }
    public String getKey() { return key; }
    public int getPosition() { return position; }
    public String getName() { return name; }
    public GradeConfigurationRequests.Kind getKind() { return kind; }
    public GradeConfigurationRequests.Target getProjectTarget() { return projectTarget; }
    public BigDecimal getProjectShare() { return projectShare; }
    public boolean isFinal() { return kind == GradeConfigurationRequests.Kind.FINAL || projectTarget == GradeConfigurationRequests.Target.FINAL; }
}
