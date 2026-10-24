package com.focusstudy.schedule;

import java.time.*;
import java.util.UUID;

public record ClassOccurrenceResponse(UUID scheduleId, UUID courseId, LocalDate date, String startTime, String endTime, String timeZone,
        Instant startsAt, Instant endsAt, String room, String teacher, int reminderMinutes, String notes, long scheduleVersion,
        boolean cancelled, boolean changed, String reason, UUID exceptionId) {
    public static ClassOccurrenceResponse from(ClassScheduleEntity s, LocalDate day) {
        return from(s, day, null);
    }
    public static ClassOccurrenceResponse from(ClassScheduleEntity s, LocalDate day, ClassExceptionEntity e) {
        var zone = ZoneId.of(s.getTimeZone());
        var start = e == null || e.getStartTime() == null ? s.getStartTime() : e.getStartTime();
        var end = e == null || e.getEndTime() == null ? s.getEndTime() : e.getEndTime();
        return new ClassOccurrenceResponse(s.getId(), s.getCourseId(), day, ClassScheduleResponse.time(start), ClassScheduleResponse.time(end), s.getTimeZone(),
                day.atTime(start).atZone(zone).toInstant(), day.atTime(end).atZone(zone).toInstant(),
                e == null || e.getRoom() == null ? s.getRoom() : e.getRoom(), e == null || e.getTeacher() == null ? s.getTeacher() : e.getTeacher(), s.getReminderMinutes(), s.getNotes(), s.getVersion(),
                e != null && e.getKind() == ClassExceptionEntity.Kind.CANCELLED, e != null && e.getKind() == ClassExceptionEntity.Kind.CHANGED, e == null ? "" : e.getReason(), e == null ? null : e.getId());
    }
}
