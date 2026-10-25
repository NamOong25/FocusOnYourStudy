package com.focusstudy.exams;

import java.time.Instant;
import java.util.*;

public record ExamResponse(UUID id, UUID courseId, ExamEntity.Kind kind, ExamEntity.Format format, Instant startsAt, Instant endsAt,
                           String timeZone, String room, boolean reminder, List<Integer> reminderMinutes, String notes,
                           long version, Instant createdAt, Instant updatedAt) {
    public static ExamResponse from(ExamEntity value) { return new ExamResponse(value.getId(), value.getCourseId(), value.getKind(), value.getFormat(), value.getStartsAt(), value.getEndsAt(),
            value.getTimeZone(), value.getRoom(), value.isReminder(), value.getReminderMinutes(), value.getNotes(), value.getVersion(), value.getCreatedAt(), value.getUpdatedAt()); }
}
