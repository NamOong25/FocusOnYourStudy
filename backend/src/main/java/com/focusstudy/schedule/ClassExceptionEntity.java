package com.focusstudy.schedule;

import com.focusstudy.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.time.*;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity @Table(name = "class_exceptions")
public class ClassExceptionEntity extends BaseEntity {
    public enum Kind { CANCELLED, CHANGED }
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(name = "schedule_id", nullable = false) private UUID scheduleId;
    @JdbcTypeCode(SqlTypes.LOCAL_DATE) @Column(name = "occurrence_date", nullable = false) private LocalDate date;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Kind kind;
    @JdbcTypeCode(SqlTypes.LOCAL_TIME) @Column(name = "start_time") private LocalTime startTime;
    @JdbcTypeCode(SqlTypes.LOCAL_TIME) @Column(name = "end_time") private LocalTime endTime;
    @Column(length = 100) private String room;
    @Column(length = 200) private String teacher;
    @Column(nullable = false, length = 1000) private String reason;
    protected ClassExceptionEntity() { }
    public static ClassExceptionEntity create(UUID owner, UUID scheduleId, LocalDate date) {
        var value = new ClassExceptionEntity(); value.userId = owner; value.scheduleId = scheduleId; value.date = date; return value;
    }
    public void change(ClassExceptionRequests.Save v) {
        kind = v.kind(); startTime = v.startTime() == null ? null : LocalTime.parse(v.startTime());
        endTime = v.endTime() == null ? null : LocalTime.parse(v.endTime()); room = v.room(); teacher = v.teacher(); reason = v.reason();
    }
    public UUID getScheduleId() { return scheduleId; }
    public LocalDate getDate() { return date; }
    public Kind getKind() { return kind; }
    public LocalTime getStartTime() { return startTime; }
    public LocalTime getEndTime() { return endTime; }
    public String getRoom() { return room; }
    public String getTeacher() { return teacher; }
    public String getReason() { return reason; }
}
