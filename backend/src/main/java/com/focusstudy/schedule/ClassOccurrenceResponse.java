package com.focusstudy.schedule;

import java.time.*;
import java.util.UUID;

public record ClassOccurrenceResponse(UUID scheduleId, UUID courseId, LocalDate date, String startTime, String endTime, String timeZone,
        Instant startsAt, Instant endsAt, String room, String teacher, int reminderMinutes, String notes, long scheduleVersion) {
    public static ClassOccurrenceResponse from(ClassScheduleEntity s, LocalDate day) {
        var zone = ZoneId.of(s.getTimeZone());
        return new ClassOccurrenceResponse(s.getId(), s.getCourseId(), day, ClassScheduleResponse.time(s.getStartTime()), ClassScheduleResponse.time(s.getEndTime()), s.getTimeZone(),
                day.atTime(s.getStartTime()).atZone(zone).toInstant(), day.atTime(s.getEndTime()).atZone(zone).toInstant(), s.getRoom(), s.getTeacher(), s.getReminderMinutes(), s.getNotes(), s.getVersion());
    }
}
