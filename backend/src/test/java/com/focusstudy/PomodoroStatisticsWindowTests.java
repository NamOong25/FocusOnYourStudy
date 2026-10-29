package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import com.focusstudy.focus.*;
import java.time.*;
import org.junit.jupiter.api.Test;

class PomodoroStatisticsWindowTests {
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-27T18:00:00Z"), ZoneOffset.UTC);
    @Test void defaultsUseAccountCalendarAndIsoMondayWeek() {
        var value = PomodoroStatisticsWindow.of(null, null, "Asia/Ho_Chi_Minh", clock);
        assertThat(value.period()).isEqualTo(PomodoroStatisticsWindow.Period.WEEK);
        assertThat(value.date()).isEqualTo(LocalDate.of(2026, 10, 28));
        assertThat(value.fromDate()).isEqualTo(LocalDate.of(2026, 10, 26));
        assertThat(value.toDate()).isEqualTo(LocalDate.of(2026, 11, 1));
        assertThat(value.days()).hasSize(7);
        assertThat(PomodoroStatisticsWindow.of(null, null, "UTC", clock).date()).isEqualTo(LocalDate.of(2026, 10, 27));
    }
    @Test void weekCanSpanYearsWithoutLosingOrRepeatingDates() {
        var value = PomodoroStatisticsWindow.of("WEEK", "2025-01-01", "UTC", clock);
        assertThat(value.fromDate()).isEqualTo(LocalDate.of(2024, 12, 30));
        assertThat(value.toDate()).isEqualTo(LocalDate.of(2025, 1, 5));
        assertThat(value.days().stream().map(PomodoroWindow::date).distinct()).hasSize(7);
    }
    @Test void monthUsesRealCalendarLengthIncludingLeapYears() {
        for (var pair : new String[][]{{"2024-02-17", "29"}, {"2026-02-17", "28"}, {"2026-04-17", "30"}, {"2026-10-17", "31"}}) {
            var value = PomodoroStatisticsWindow.of("MONTH", pair[0], "UTC", clock);
            assertThat(value.days()).hasSize(Integer.parseInt(pair[1]));
            assertThat(value.fromDate().getDayOfMonth()).isEqualTo(1);
            assertThat(value.to()).isEqualTo(value.toDate().plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant());
        }
    }
    @Test void springWeekHas167HoursAndAutumnWeek169Hours() {
        var spring = PomodoroStatisticsWindow.of("WEEK", "2026-03-08", "America/New_York", clock);
        var autumn = PomodoroStatisticsWindow.of("WEEK", "2025-11-02", "America/New_York", clock);
        assertThat(Duration.between(spring.from(), spring.to())).isEqualTo(Duration.ofHours(167));
        assertThat(Duration.between(autumn.from(), autumn.to())).isEqualTo(Duration.ofHours(169));
        assertThat(Duration.between(spring.days().getLast().from(), spring.days().getLast().to())).isEqualTo(Duration.ofHours(23));
        assertThat(Duration.between(autumn.days().getLast().from(), autumn.days().getLast().to())).isEqualTo(Duration.ofHours(25));
    }
    @Test void aSkippedLocalDateStillHasAnEmptyCalendarBucket() {
        var value = PomodoroStatisticsWindow.of("WEEK", "2011-12-30", "Pacific/Apia", clock);
        var skipped = value.days().stream().filter(d -> d.date().equals(LocalDate.of(2011,12,30))).findFirst().orElseThrow();
        assertThat(value.days()).hasSize(7);
        assertThat(skipped.from()).isEqualTo(skipped.to());
    }
    @Test void invalidPeriodsAreClientErrors() {
        for (String input : new String[]{"", "week", "DAY", "YEAR", " MONTH", "MONTH "})
            assertThatThrownBy(() -> PomodoroStatisticsWindow.of(input,"2026-10-28","UTC",clock))
                    .isInstanceOfSatisfying(PomodoroApiException.class, e -> assertThat(e.code()).isEqualTo("INVALID_POMODORO_STATISTICS_FILTER"));
    }
    @Test void invalidDaysAndZonesUseTheStatisticsErrorContract() {
        for (String date : new String[]{"2026-02-30", "28/10/2026", "2026-1-01", "", "1899-12-31", "2100-01-01"})
            assertThatThrownBy(() -> PomodoroStatisticsWindow.of("MONTH",date,"UTC",clock)).isInstanceOf(PomodoroApiException.class);
        for (String zone : new String[]{null, "", "Fake/Zone", "+07:00"})
            assertThatThrownBy(() -> PomodoroStatisticsWindow.of("WEEK","2026-10-28",zone,clock))
                    .isInstanceOfSatisfying(PomodoroApiException.class, e -> assertThat(e.code()).isEqualTo("INVALID_POMODORO_STATISTICS_FILTER"));
    }
    @Test void rejectsWeekSpillBeyondSupportedYearsButAllowsLastSupportedMonth() {
        assertThatThrownBy(() -> PomodoroStatisticsWindow.of("WEEK","2099-12-31","UTC",clock)).isInstanceOf(PomodoroApiException.class);
        assertThat(PomodoroStatisticsWindow.of("MONTH","2099-12-31","UTC",clock).to()).isEqualTo(Instant.parse("2100-01-01T00:00:00Z"));
        assertThat(PomodoroStatisticsWindow.of("WEEK","1900-01-01","UTC",clock).days()).hasSize(7);
    }
}
