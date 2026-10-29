package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import com.focusstudy.assignments.AssignmentApiException;
import com.focusstudy.assignments.statistics.AssignmentStatisticsWindow;
import java.time.*;
import java.util.Arrays;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class AssignmentStatisticsWindowTests {
    AssignmentStatisticsWindow at(String instant, String zone) {
        return AssignmentStatisticsWindow.of(zone, Clock.fixed(Instant.parse(instant), ZoneOffset.UTC));
    }
    @Test void zoneDeterminesReferenceDateAndSevenCalendarDays() {
        var asia = at("2026-10-28T18:15:00Z", "Asia/Ho_Chi_Minh");
        var utc = at("2026-10-28T18:15:00Z", "UTC");
        assertThat(asia.date()).isEqualTo(LocalDate.of(2026,10,29));
        assertThat(utc.date()).isEqualTo(LocalDate.of(2026,10,28));
        assertThat(asia.asOf()).isEqualTo(utc.asOf());
        assertThat(asia.dueSoonThrough()).isEqualTo(Instant.parse("2026-11-04T18:15:00Z"));
    }
    @Test void springDstIs167HoursRatherThanFixed168() {
        var window = at("2026-03-04T15:00:00Z", "America/New_York");
        assertThat(window.dueSoonThrough()).isEqualTo(Instant.parse("2026-03-11T14:00:00Z"));
        assertThat(Duration.between(window.asOf(), window.dueSoonThrough())).isEqualTo(Duration.ofHours(167));
    }
    @Test void autumnDstIs169HoursRatherThanFixed168() {
        var window = at("2026-10-28T14:00:00Z", "America/New_York");
        assertThat(window.dueSoonThrough()).isEqualTo(Instant.parse("2026-11-04T15:00:00Z"));
        assertThat(Duration.between(window.asOf(), window.dueSoonThrough())).isEqualTo(Duration.ofHours(169));
    }
    @Test void halfHourDstTransitionKeepsLocalDeadlineTime() {
        var window = at("2026-09-30T23:30:00Z", "Australia/Lord_Howe");
        assertThat(Duration.between(window.asOf(), window.dueSoonThrough())).isEqualTo(Duration.ofMinutes(7*24*60-30));
    }
    @Test void skippedCalendarDateUsesActualZoneRules() {
        var window = at("2011-12-27T20:00:00Z", "Pacific/Apia");
        assertThat(window.dueSoonThrough()).isEqualTo(Instant.parse("2012-01-02T20:00:00Z"));
    }
    @Test void invalidBlankOffsetAndUnknownZonesAreRejected() {
        for (String zone : Arrays.asList(null,""," ","+07:00","UTC+07:00","Bad/Zone","utc"))
            assertThatThrownBy(() -> at("2026-10-29T00:00:00Z",zone)).isInstanceOfSatisfying(AssignmentApiException.class,
                    e -> { assertThat(e.status().value()).isEqualTo(400); assertThat(e.code()).isEqualTo("INVALID_ASSIGNMENT_STATISTICS_FILTER"); });
    }
    @Test void oneClockSnapshotPreventsMidnightFromSplittingDateAndDeadline() {
        var calls = new AtomicInteger();
        var clock = new Clock() {
            public ZoneId getZone() { return ZoneOffset.UTC; }
            public Clock withZone(ZoneId zone) { return this; }
            public Instant instant() { return calls.getAndIncrement()==0 ? Instant.parse("2026-10-31T23:59:59.999999999Z") : Instant.parse("2026-11-01T00:00:00Z"); }
        };
        var window = AssignmentStatisticsWindow.of("UTC",clock);
        assertThat(calls).hasValue(1);
        assertThat(window.asOf()).isEqualTo(Instant.parse("2026-10-31T23:59:59.999999Z"));
        assertThat(window.date()).isEqualTo(LocalDate.of(2026,10,31));
        assertThat(window.dueSoonThrough()).isEqualTo(Instant.parse("2026-11-07T23:59:59.999999Z"));
    }
    @Test void leapDayAndYearBoundaryAreCalendarBased() {
        assertThat(at("2024-02-25T10:00:00Z","UTC").dueSoonThrough()).isEqualTo(Instant.parse("2024-03-03T10:00:00Z"));
        assertThat(at("2099-12-29T10:00:00Z","UTC").dueSoonThrough()).isEqualTo(Instant.parse("2100-01-05T10:00:00Z"));
    }
}
