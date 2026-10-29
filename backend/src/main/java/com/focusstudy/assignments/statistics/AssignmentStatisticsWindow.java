package com.focusstudy.assignments.statistics;

import com.focusstudy.assignments.AssignmentApiException;
import java.time.*;
import java.time.temporal.ChronoUnit;
import org.springframework.http.HttpStatus;

/** One server-clock snapshot; seven local calendar days, including the upper bound. */
public record AssignmentStatisticsWindow(Instant asOf, LocalDate date, String timeZone, Instant dueSoonThrough) {
    public static AssignmentStatisticsWindow of(String zoneText, Clock clock) {
        if (zoneText == null || !ZoneId.getAvailableZoneIds().contains(zoneText))
            throw invalid("Chọn múi giờ IANA hợp lệ, ví dụ Asia/Ho_Chi_Minh hoặc UTC.");
        var zone = ZoneId.of(zoneText);
        // PostgreSQL deadlines are stored with microsecond precision.
        var now = clock.instant().truncatedTo(ChronoUnit.MICROS);
        var local = now.atZone(zone);
        return new AssignmentStatisticsWindow(now, local.toLocalDate(), zoneText, local.plusDays(7).toInstant());
    }

    public static AssignmentApiException invalid(String message) {
        return new AssignmentApiException(HttpStatus.BAD_REQUEST, "INVALID_ASSIGNMENT_STATISTICS_FILTER", message);
    }
}
