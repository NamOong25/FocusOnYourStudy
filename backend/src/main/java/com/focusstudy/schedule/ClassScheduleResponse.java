package com.focusstudy.schedule;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.focusstudy.schedule.ClassScheduleRequests.LessonType;
import com.focusstudy.schedule.ClassScheduleRequests.MeetingPlatform;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

public record ClassScheduleResponse(UUID id, UUID courseId, List<Integer> weekdays, LocalDate startsOn, LocalDate endsOn,
        String startTime, String endTime, String timeZone, String room, String teacher, int reminderMinutes, String notes,
        LessonType lessonType, MeetingPlatform meetingPlatform, String meetingId,
        @JsonInclude(JsonInclude.Include.NON_NULL) String meetingPasscode,
        long version, Instant createdAt, Instant updatedAt) {
    static String time(LocalTime value) { return value.format(DateTimeFormatter.ofPattern("HH:mm")); }
    public static ClassScheduleResponse from(ClassScheduleEntity s) {
        return from(s, null);
    }
    public static ClassScheduleResponse detail(ClassScheduleEntity s) {
        return from(s, s.getMeetingPlatform() == MeetingPlatform.ZOOM ? s.getMeetingPasscode() : null);
    }
    private static ClassScheduleResponse from(ClassScheduleEntity s, String passcode) {
        return new ClassScheduleResponse(s.getId(), s.getCourseId(), ClassScheduleValidator.weekdays(s.getWeekdayMask()), s.getStartsOn(), s.getEndsOn(),
                time(s.getStartTime()), time(s.getEndTime()), s.getTimeZone(), s.getRoom(), s.getTeacher(), s.getReminderMinutes(), s.getNotes(),
                s.getLessonType(), s.getMeetingPlatform(), s.getMeetingId(), passcode, s.getVersion(), s.getCreatedAt(), s.getUpdatedAt());
    }
    @Override public String toString() { return "ClassScheduleResponse[id=" + id + ", version=" + version + "]"; }
}
