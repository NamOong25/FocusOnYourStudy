package com.focusstudy.study;

import com.focusstudy.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "study_sessions")
public class StudySessionEntity extends BaseEntity {
    public enum Status { PLANNED, IN_PROGRESS, COMPLETED }
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(name = "course_id", nullable = false) private UUID courseId;
    @Column(name = "assignment_id") private UUID assignmentId;
    @Column(nullable = false, length = 200) private String title;
    @Column(name = "starts_at", nullable = false) private Instant startsAt;
    @Column(name = "ends_at", nullable = false) private Instant endsAt;
    @Column(name = "time_zone", nullable = false, length = 100) private String timeZone;
    @Column(name = "duration_minutes", nullable = false) private int durationMinutes;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Status status;
    @Column(nullable = false, columnDefinition = "text") private String notes;
    protected StudySessionEntity() { }
    public static StudySessionEntity create(UUID owner, StudyRequests.Schedule input) {
        var session = new StudySessionEntity(); session.userId = owner; session.change(input); return session;
    }
    public void change(StudyRequests.Schedule input) {
        courseId = input.courseId(); assignmentId = input.assignmentId(); title = input.title();
        startsAt = StudySchedule.parse(input.startsAt()); durationMinutes = input.durationMinutes();
        endsAt = startsAt.plusSeconds(durationMinutes * 60L); timeZone = input.timeZone(); status = input.status(); notes = input.notes();
    }
    public void detachAssignment() { assignmentId = null; }
    public UUID getCourseId() { return courseId; }
    public UUID getAssignmentId() { return assignmentId; }
    public String getTitle() { return title; }
    public Instant getStartsAt() { return startsAt; }
    public Instant getEndsAt() { return endsAt; }
    public String getTimeZone() { return timeZone; }
    public int getDurationMinutes() { return durationMinutes; }
    public Status getStatus() { return status; }
    public String getNotes() { return notes; }
}
