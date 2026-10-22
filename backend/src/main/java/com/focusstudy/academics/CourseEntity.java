package com.focusstudy.academics;

import com.focusstudy.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.util.UUID;

@Entity @Table(name = "courses")
public class CourseEntity extends BaseEntity {
    public enum Status { STUDYING, COMPLETED, PLANNED }
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(name = "semester_id", nullable = false) private UUID semesterId;
    @Column(nullable = false, length = 64) private String code;
    @Column(nullable = false, length = 200) private String name;
    @Column(nullable = false) private int credits;
    @Column(nullable = false, length = 200) private String teacher = "";
    @Column(nullable = false, length = 100) private String room = "";
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Status status = Status.STUDYING;
    @Column(nullable = false, length = 20) private String color = "lavender";
    @Column(nullable = false, columnDefinition = "text") private String description = "";
    protected CourseEntity() { }
}
