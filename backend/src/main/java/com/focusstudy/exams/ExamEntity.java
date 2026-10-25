package com.focusstudy.exams;

import com.focusstudy.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity @Table(name = "exams")
public class ExamEntity extends BaseEntity {
    public enum Kind { MIDTERM, FINAL, OTHER }
    public enum Format { WRITTEN, MULTIPLE_CHOICE, PRACTICAL, ORAL, ONLINE }
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(name = "course_id", nullable = false) private UUID courseId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Kind kind;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 24) private Format format;
    @Column(name = "starts_at", nullable = false) private Instant startsAt;
    @Column(name = "ends_at", nullable = false) private Instant endsAt;
    @Column(name = "time_zone", nullable = false, length = 100) private String timeZone;
    @Column(nullable = false, length = 100) private String room;
    @Column(nullable = false) private boolean reminder;
    @JdbcTypeCode(SqlTypes.ARRAY) @Column(name = "reminder_minutes", nullable = false, columnDefinition = "integer[]") private Integer[] reminderMinutes;
    @Column(nullable = false, columnDefinition = "text") private String notes;
    @Column(name = "update_revision", nullable = false) private long updateRevision;
    protected ExamEntity() { }
    public static ExamEntity create(UUID owner, ExamRequests.Schedule input) { var exam = new ExamEntity(); exam.userId = owner; exam.assign(input); return exam; }
    private void assign(ExamRequests.Schedule input) {
        courseId = input.courseId(); kind = input.kind(); format = input.format(); startsAt = ExamSchedule.parse(input.startsAt()); endsAt = ExamSchedule.parse(input.endsAt());
        timeZone = input.timeZone(); room = input.room(); reminder = input.reminder(); reminderMinutes = input.reminderMinutes().toArray(Integer[]::new); notes = input.notes();
    }
    public void change(ExamRequests.Schedule input) {
        assign(input);
        // Always consume a version, even for an identical PUT. A stale second
        // editor must not keep succeeding merely because no field was dirty.
        updateRevision = Math.incrementExact(updateRevision);
    }
    public UUID getCourseId() { return courseId; }
    public Kind getKind() { return kind; }
    public Format getFormat() { return format; }
    public Instant getStartsAt() { return startsAt; }
    public Instant getEndsAt() { return endsAt; }
    public String getTimeZone() { return timeZone; }
    public String getRoom() { return room; }
    public boolean isReminder() { return reminder; }
    public List<Integer> getReminderMinutes() { return Arrays.stream(reminderMinutes).sorted(Comparator.reverseOrder()).toList(); }
    public String getNotes() { return notes; }
}
