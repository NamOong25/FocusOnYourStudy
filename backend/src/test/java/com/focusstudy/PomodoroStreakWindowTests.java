package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import com.focusstudy.focus.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class PomodoroStreakWindowTests {
    private final Clock clock=Clock.fixed(Instant.parse("2026-10-28T18:00:00Z"),ZoneOffset.UTC);
    @Test void omittedMonthAndTodayUseTheSelectedZone() {
        var asia=PomodoroStreakWindow.of(null,"Asia/Ho_Chi_Minh",clock);var utc=PomodoroStreakWindow.of(null,"UTC",clock);
        assertThat(asia.today().date()).isEqualTo("2026-10-29");assertThat(utc.today().date()).isEqualTo("2026-10-28");assertThat(asia.calendar().fromDate()).isEqualTo("2026-10-01");
    }
    @Test void choosingPastOrFutureMonthNeverChangesTheReferenceDayOrHistoryCutoff() {
        var past=PomodoroStreakWindow.of("2020-02","UTC",clock);var future=PomodoroStreakWindow.of("2099-12","UTC",clock);
        assertThat(past.today()).isEqualTo(future.today());assertThat(past.historyFrom()).isEqualTo(future.historyFrom());assertThat(past.calendar().days()).hasSize(29);assertThat(future.calendar().toDate()).isEqualTo("2099-12-31");
    }
    @Test void invalidMonthOrZoneHasItsOwnSafeClientError() {
        for(String month:List.of("","2026-1","2026-13","2026-00","2026-10-01","1899-12","2100-01","2026/10","+2026-10"))assertThatThrownBy(()->PomodoroStreakWindow.of(month,"UTC",clock)).isInstanceOfSatisfying(PomodoroApiException.class,e->assertThat(e.code()).isEqualTo("INVALID_POMODORO_STREAK_FILTER"));
        for(String zone:List.of("","Fake/Zone","+07:00"))assertThatThrownBy(()->PomodoroStreakWindow.of(null,zone,clock)).isInstanceOf(PomodoroApiException.class);
    }
    @Test void calendarDayBoundariesUseZoneRulesIncludingDstAndSkippedDates() {
        var spring=PomodoroStreakWindow.of("2026-03","America/New_York",clock).calendar().days().get(7);assertThat(Duration.between(spring.from(),spring.to())).isEqualTo(Duration.ofHours(23));
        var autumn=PomodoroStreakWindow.of("2025-11","America/New_York",clock).calendar().days().get(1);assertThat(Duration.between(autumn.from(),autumn.to())).isEqualTo(Duration.ofHours(25));
        var skipped=PomodoroStreakWindow.of("2011-12","Pacific/Apia",clock).calendar().days().get(29);assertThat(skipped.from()).isEqualTo(skipped.to());
    }
    @Test void historyLowerBoundUsesTheSameZoneAtTheFirstSupportedLocalDate() {
        assertThat(PomodoroStreakWindow.of("1900-01","Asia/Ho_Chi_Minh",clock).historyFrom()).isEqualTo(LocalDate.of(1900,1,1).atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant());
    }
    @Test void referenceDayAndDefaultMonthComeFromOneClockSnapshot() {
        var calls=new AtomicInteger();Clock changing=new Clock(){public ZoneId getZone(){return ZoneOffset.UTC;}public Clock withZone(ZoneId zone){return this;}public Instant instant(){return calls.getAndIncrement()==0?Instant.parse("2026-10-31T23:59:59Z"):Instant.parse("2026-11-01T00:00:00Z");}};
        var window=PomodoroStreakWindow.of(null,"UTC",changing);assertThat(calls.get()).isEqualTo(1);assertThat(window.today().date()).isEqualTo("2026-10-31");assertThat(window.calendar().fromDate()).isEqualTo("2026-10-01");
    }
}
