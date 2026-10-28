package com.focusstudy.focus;

import com.focusstudy.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;

@Entity @Table(name = "pomodoro_sessions")
public class PomodoroEntity extends BaseEntity {
    public enum Status { RUNNING, PAUSED }
    public record Context(UUID courseId, String courseCode, String courseName, UUID semesterId,
                          short semesterTerm, int semesterStartYear, UUID assignmentId, String assignmentTitle,
                          UUID studySessionId, String studyTitle) { }
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(name = "client_request_id", nullable = false) private UUID clientRequestId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Status status;
    @Column(name = "duration_seconds", nullable = false) private int durationSeconds = 1500;
    @Column(name = "started_at", nullable = false) private Instant startedAt;
    @Column(name = "state_changed_at", nullable = false) private Instant stateChangedAt;
    @Column(name = "run_started_at") private Instant runStartedAt;
    @Column(name = "elapsed_millis", nullable = false) private long elapsedMillis;
    @Column(name = "paused_millis", nullable = false) private long pausedMillis;
    @Column(name = "time_zone", nullable = false, length = 100) private String timeZone;
    @Column(name = "course_id", nullable = false) private UUID courseId;
    @Column(name = "course_code", nullable = false, length = 64) private String courseCode;
    @Column(name = "course_name", nullable = false, length = 200) private String courseName;
    @Column(name = "semester_id", nullable = false) private UUID semesterId;
    @Column(name = "semester_term", nullable = false) private short semesterTerm;
    @Column(name = "semester_start_year", nullable = false) private int semesterStartYear;
    @Column(name = "assignment_id") private UUID assignmentId;
    @Column(name = "assignment_title", length = 200) private String assignmentTitle;
    @Column(name = "study_session_id") private UUID studySessionId;
    @Column(name = "study_title", length = 200) private String studyTitle;
    protected PomodoroEntity() { }
    public static PomodoroEntity start(UUID owner, PomodoroRequests.Start input, Context context, Instant now) {
        var row = new PomodoroEntity(); row.userId = owner; row.clientRequestId = input.clientRequestId();
        row.status = Status.RUNNING; row.startedAt = now; row.stateChangedAt = now; row.runStartedAt = now; row.timeZone = input.timeZone();
        row.courseId = context.courseId(); row.courseCode = context.courseCode(); row.courseName = context.courseName();
        row.semesterId = context.semesterId(); row.semesterTerm = context.semesterTerm(); row.semesterStartYear = context.semesterStartYear();
        row.assignmentId = context.assignmentId(); row.assignmentTitle = context.assignmentTitle();
        row.studySessionId = context.studySessionId(); row.studyTitle = context.studyTitle(); return row;
    }
    public boolean matches(PomodoroRequests.Start input) {
        return courseId.equals(input.courseId()) && Objects.equals(assignmentId, input.assignmentId())
                && Objects.equals(studySessionId, input.studySessionId()) && timeZone.equals(input.timeZone());
    }
    public PomodoroTimeline.Reading read(Instant now) {
        return PomodoroTimeline.read(status == Status.RUNNING, durationSeconds, elapsedMillis, pausedMillis, stateChangedAt, now);
    }
    public void pause(PomodoroTimeline.Reading reading) {
        elapsedMillis = reading.elapsedMillis(); pausedMillis = reading.pausedMillis(); status = Status.PAUSED;
        stateChangedAt = reading.serverTime(); runStartedAt = null;
    }
    public void resume(PomodoroTimeline.Reading reading) {
        pausedMillis = reading.pausedMillis(); status = Status.RUNNING; stateChangedAt = reading.serverTime(); runStartedAt = stateChangedAt;
    }
    public UUID getClientRequestId() { return clientRequestId; }
    public Status getStatus() { return status; }
    public int getDurationSeconds() { return durationSeconds; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getStateChangedAt() { return stateChangedAt; }
    public String getTimeZone() { return timeZone; }
    public Context getContext() { return new Context(courseId, courseCode, courseName, semesterId, semesterTerm, semesterStartYear, assignmentId, assignmentTitle, studySessionId, studyTitle); }
}
