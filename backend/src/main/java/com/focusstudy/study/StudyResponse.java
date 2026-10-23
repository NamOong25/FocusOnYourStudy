package com.focusstudy.study;

import java.time.Instant;
import java.util.UUID;

public record StudyResponse(UUID id, UUID courseId, UUID assignmentId, String title, Instant startsAt, Instant endsAt,
                            String timeZone, int durationMinutes, StudySessionEntity.Status status, String notes,
                            long version, Instant createdAt, Instant updatedAt) {
    public static StudyResponse from(StudySessionEntity session) {
        return new StudyResponse(session.getId(), session.getCourseId(), session.getAssignmentId(), session.getTitle(),
                session.getStartsAt(), session.getEndsAt(), session.getTimeZone(), session.getDurationMinutes(), session.getStatus(),
                session.getNotes(), session.getVersion(), session.getCreatedAt(), session.getUpdatedAt());
    }
}
