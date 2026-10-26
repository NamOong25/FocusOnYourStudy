package com.focusstudy.academics.semesters;

import com.focusstudy.academics.SemesterEntity;
import java.time.Instant;
import java.util.UUID;

public record SemesterResponse(UUID id, int term, int startYear, String name, String academicYear,
        SemesterEntity.Status status, String note, long version, Instant createdAt, Instant updatedAt) {
    public static SemesterResponse from(SemesterEntity s) {
        return new SemesterResponse(s.getId(), s.getTerm(), s.getStartYear(),
                s.getTerm() == 3 ? "Học kỳ 3 (Hè)" : "Học kỳ " + s.getTerm(),
                s.getStartYear() + " – " + (s.getStartYear() + 1), s.getStatus(), s.getNote(),
                s.getVersion(), s.getCreatedAt(), s.getUpdatedAt());
    }
}
