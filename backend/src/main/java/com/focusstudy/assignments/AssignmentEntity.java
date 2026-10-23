package com.focusstudy.assignments;

import com.focusstudy.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "assignments")
public class AssignmentEntity extends BaseEntity {
    public enum Priority { MEDIUM, HIGH }
    public enum Status { TODO, IN_PROGRESS, COMPLETED }
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(name = "course_id", nullable = false) private UUID courseId;
    @Column(nullable = false, length = 200) private String title;
    @Column(name = "due_at", nullable = false) private Instant dueAt;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Priority priority;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Status status;
    @Column(nullable = false, columnDefinition = "text") private String notes;
    protected AssignmentEntity() { }
    public static AssignmentEntity create(UUID owner, UUID courseId, String title, Instant dueAt, Priority priority, Status status, String notes) {
        var assignment = new AssignmentEntity(); assignment.userId = owner;
        assignment.change(courseId, title, dueAt, priority, status, notes); return assignment;
    }
    public void change(UUID courseId, String title, Instant dueAt, Priority priority, Status status, String notes) {
        this.courseId = courseId; this.title = title; this.dueAt = dueAt; this.priority = priority; this.status = status; this.notes = notes;
    }
    public UUID getCourseId() { return courseId; }
    public String getTitle() { return title; }
    public Instant getDueAt() { return dueAt; }
    public Priority getPriority() { return priority; }
    public Status getStatus() { return status; }
    public String getNotes() { return notes; }
}
