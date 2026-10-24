package com.focusstudy.schedule;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

public record ClassScheduleResponse(UUID id, UUID courseId, List<Integer> weekdays, LocalDate startsOn, LocalDate endsOn,
        String startTime, String endTime, String timeZone, String room, String teacher, int reminderMinutes, String notes,
        long version, Instant createdAt, Instant updatedAt) {
    static String time(LocalTime value) { return value.format(DateTimeFormatter.ofPattern("HH:mm")); }
    public static ClassScheduleResponse from(ClassScheduleEntity s) {
        return new ClassScheduleResponse(s.getId(), s.getCourseId(), ClassScheduleValidator.weekdays(s.getWeekdayMask()), s.getStartsOn(), s.getEndsOn(),
                time(s.getStartTime()), time(s.getEndTime()), s.getTimeZone(), s.getRoom(), s.getTeacher(), s.getReminderMinutes(), s.getNotes(), s.getVersion(), s.getCreatedAt(), s.getUpdatedAt());
    }
}
