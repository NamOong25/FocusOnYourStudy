package com.focusstudy.focus;

import java.time.Instant;
import java.util.UUID;

/** Internal scalar projection; never serialized as the public statistics response. */
public record PomodoroStatisticsRow(UUID id, UUID courseId, String courseCode, String courseName,
        UUID semesterId, short semesterTerm, int semesterStartYear, Instant endedAt, long studyMillis) { }
