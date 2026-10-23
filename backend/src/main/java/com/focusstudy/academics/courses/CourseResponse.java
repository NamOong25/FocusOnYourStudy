package com.focusstudy.academics.courses;

import com.focusstudy.academics.CourseEntity;
import java.time.Instant;
import java.util.UUID;

public record CourseResponse(UUID id, UUID semesterId, String code, String name, int credits, String teacher,
        String room, CourseEntity.Status status, String color, String description, long version, Instant createdAt, Instant updatedAt) {
    static CourseResponse from(CourseEntity c) {
        return new CourseResponse(c.getId(), c.getSemesterId(), c.getCode(), c.getName(), c.getCredits(), c.getTeacher(), c.getRoom(),
                c.getStatus(), c.getColor(), c.getDescription(), c.getVersion(), c.getCreatedAt(), c.getUpdatedAt());
    }
}
