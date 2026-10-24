package com.focusstudy.schedule;

import com.focusstudy.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.time.*;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity @Table(name = "class_schedules")
public class ClassScheduleEntity extends BaseEntity {
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(name = "course_id", nullable = false) private UUID courseId;
    @Column(name = "weekday_mask", nullable = false) private int weekdayMask;
    // Bind wall-clock values directly, bypassing java.sql.Time/Date and the UTC
    // JDBC Calendar used for absolute timestamps elsewhere in the application.
    @JdbcTypeCode(SqlTypes.LOCAL_DATE) @Column(name = "starts_on", nullable = false) private LocalDate startsOn;
    @JdbcTypeCode(SqlTypes.LOCAL_DATE) @Column(name = "ends_on", nullable = false) private LocalDate endsOn;
    @JdbcTypeCode(SqlTypes.LOCAL_TIME) @Column(name = "start_time", nullable = false) private LocalTime startTime;
    @JdbcTypeCode(SqlTypes.LOCAL_TIME) @Column(name = "end_time", nullable = false) private LocalTime endTime;
    @Column(name = "time_zone", nullable = false, length = 100) private String timeZone;
    @Column(nullable = false, length = 100) private String room;
    @Column(nullable = false, length = 200) private String teacher;
    @Column(name = "reminder_minutes", nullable = false) private int reminderMinutes;
    @Column(nullable = false, columnDefinition = "text") private String notes;
    protected ClassScheduleEntity() { }
    public static ClassScheduleEntity create(UUID owner, ClassScheduleRequests.Rule input) { var rule = new ClassScheduleEntity(); rule.userId = owner; rule.change(input); return rule; }
    public void change(ClassScheduleRequests.Rule v) {
        courseId = v.courseId(); weekdayMask = ClassScheduleValidator.mask(v.weekdays()); startsOn = LocalDate.parse(v.startsOn()); endsOn = LocalDate.parse(v.endsOn());
        startTime = LocalTime.parse(v.startTime()); endTime = LocalTime.parse(v.endTime()); timeZone = v.timeZone(); room = v.room(); teacher = v.teacher(); reminderMinutes = v.reminderMinutes(); notes = v.notes();
    }
    public UUID getCourseId() { return courseId; }
    public int getWeekdayMask() { return weekdayMask; }
    public LocalDate getStartsOn() { return startsOn; }
    public LocalDate getEndsOn() { return endsOn; }
    public LocalTime getStartTime() { return startTime; }
    public LocalTime getEndTime() { return endTime; }
    public String getTimeZone() { return timeZone; }
    public String getRoom() { return room; }
    public String getTeacher() { return teacher; }
    public int getReminderMinutes() { return reminderMinutes; }
    public String getNotes() { return notes; }
}
