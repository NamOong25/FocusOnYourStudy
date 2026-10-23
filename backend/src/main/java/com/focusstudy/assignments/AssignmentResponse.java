package com.focusstudy.assignments;

import java.time.Instant;
import java.util.UUID;

public record AssignmentResponse(UUID id, UUID courseId, String title, Instant dueAt, AssignmentEntity.Priority priority,
        AssignmentEntity.Status status, String notes, long version, Instant createdAt, Instant updatedAt) {
    static AssignmentResponse from(AssignmentEntity a) {
        return new AssignmentResponse(a.getId(), a.getCourseId(), a.getTitle(), a.getDueAt(), a.getPriority(), a.getStatus(),
                a.getNotes(), a.getVersion(), a.getCreatedAt(), a.getUpdatedAt());
    }
}
