package com.focusstudy.schedule;

import java.time.*;
import java.util.UUID;

public record ClassExceptionResponse(UUID id, UUID scheduleId, LocalDate date, ClassExceptionEntity.Kind kind,
        String startTime, String endTime, String room, String teacher, String reason, long scheduleVersion, Instant createdAt, Instant updatedAt) {
    static ClassExceptionResponse from(ClassExceptionEntity e, long scheduleVersion) {
        return new ClassExceptionResponse(e.getId(), e.getScheduleId(), e.getDate(), e.getKind(),
                e.getStartTime() == null ? null : ClassScheduleResponse.time(e.getStartTime()), e.getEndTime() == null ? null : ClassScheduleResponse.time(e.getEndTime()),
                e.getRoom(), e.getTeacher(), e.getReason(), scheduleVersion, e.getCreatedAt(), e.getUpdatedAt());
    }
}
