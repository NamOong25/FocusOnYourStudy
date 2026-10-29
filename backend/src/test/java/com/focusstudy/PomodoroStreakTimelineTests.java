package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import com.focusstudy.focus.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class PomodoroStreakTimelineTests {
    private final LocalDate today = LocalDate.parse("2026-10-29");
    private final ZoneId zone = ZoneId.of("Asia/Ho_Chi_Minh");
    PomodoroStreakTimeline.Summary read(String... dates) { return PomodoroStreakTimeline.summarize(Arrays.stream(dates).map(LocalDate::parse).toList(), today, zone); }
    @Test void emptyHasZeroCountsAndNullBoundaries() {
        var s=read();assertThat(s.currentStreakDays()).isZero();assertThat(s.longestStreakDays()).isZero();assertThat(s.totalStudiedDays()).isZero();
        assertThat(s.studiedToday()).isFalse();assertThat(s.firstStudyDate()).isNull();assertThat(s.lastStudyDate()).isNull();assertThat(s.currentStreakStartDate()).isNull();assertThat(s.longestStreakEndDate()).isNull();
    }
    @Test void oneDayTodayCountsOnceDespiteManyCompletions() {
        var s=read("2026-10-29","2026-10-29","2026-10-29");assertThat(s.currentStreakDays()).isEqualTo(1);assertThat(s.totalStudiedDays()).isEqualTo(1);assertThat(s.studiedToday()).isTrue();
    }
    @Test void consecutiveDatesIncludeTodayAndHaveCorrectBoundaries() {
        var s=read("2026-10-27","2026-10-28","2026-10-29");assertThat(s.currentStreakDays()).isEqualTo(3);assertThat(s.currentStreakStartDate()).isEqualTo("2026-10-27");assertThat(s.currentStreakEndDate()).isEqualTo(today);
    }
    @Test void yesterdayRunRemainsCurrentUntilTodayEnds() {
        var s=read("2026-10-27","2026-10-28");assertThat(s.currentStreakDays()).isEqualTo(2);assertThat(s.studiedToday()).isFalse();assertThat(s.currentStreakEndDate()).isEqualTo(today.minusDays(1));
    }
    @Test void missingYesterdayBreaksCurrentWithoutErasingPersonalBest() {
        var s=read("2026-10-25","2026-10-26","2026-10-27");assertThat(s.currentStreakDays()).isZero();assertThat(s.longestStreakDays()).isEqualTo(3);assertThat(s.currentStreakStartDate()).isNull();assertThat(s.currentStreakEndDate()).isNull();
    }
    @Test void aGapSeparatesRunsAndOlderBestIsPreserved() {
        var s=read("2026-09-28","2026-09-29","2026-09-30","2026-10-01","2026-10-28","2026-10-29");assertThat(s.currentStreakDays()).isEqualTo(2);assertThat(s.longestStreakDays()).isEqualTo(4);assertThat(s.longestStreakEndDate()).isEqualTo("2026-10-01");
    }
    @Test void equalPersonalBestsSelectTheMostRecentRun() {
        var s=read("2026-09-28","2026-09-29","2026-10-28","2026-10-29");assertThat(s.longestStreakDays()).isEqualTo(2);assertThat(s.longestStreakStartDate()).isEqualTo("2026-10-28");
    }
    @Test void unorderedDuplicateDatesDoNotCreateArtificialDays() {
        var s=read("2026-10-29","2026-10-27","2026-10-28","2026-10-27");assertThat(s.currentStreakDays()).isEqualTo(3);assertThat(s.totalStudiedDays()).isEqualTo(3);assertThat(s.firstStudyDate()).isEqualTo("2026-10-27");
    }
    @Test void futureDatesCannotExtendTheRunOrItsBest() {
        var s=read("2026-10-28","2026-10-29","2026-10-30","2026-10-31");assertThat(s.currentStreakDays()).isEqualTo(2);assertThat(s.totalStudiedDays()).isEqualTo(2);assertThat(s.lastStudyDate()).isEqualTo(today);
    }
    @Test void leapDayAndYearBoundariesRemainConsecutive() {
        for(var pair:List.of(List.of("2024-02-28","2024-02-29","2024-03-01"),List.of("2025-12-31","2026-01-01","2026-01-02"))) {
            var dates=pair.stream().map(LocalDate::parse).toList();assertThat(PomodoroStreakTimeline.summarize(dates,dates.getLast(),zone).currentStreakDays()).isEqualTo(3);
        }
    }
    @Test void daylightSavingCalendarDatesCountDaysRatherThanHours() {
        var ny=ZoneId.of("America/New_York");for(String end:List.of("2026-03-09","2025-11-03")) {
            var last=LocalDate.parse(end);var dates=List.of(last.minusDays(2),last.minusDays(1),last);assertThat(PomodoroStreakTimeline.summarize(dates,last,ny).currentStreakDays()).isEqualTo(3);
        }
    }
    @Test void aSkippedLocalDateOffersNoStudyOpportunityAndDoesNotBreakTheRun() {
        var dates=List.of(LocalDate.parse("2011-12-29"),LocalDate.parse("2011-12-31"));var s=PomodoroStreakTimeline.summarize(dates,LocalDate.parse("2012-01-01"),ZoneId.of("Pacific/Apia"));assertThat(s.currentStreakDays()).isEqualTo(2);assertThat(s.totalStudiedDays()).isEqualTo(2);assertThat(s.studiedToday()).isFalse();
    }
    @Test void skippingARealDayStillBreaksTheRunInTheSameZone() {
        var dates=List.of(LocalDate.parse("2011-12-28"),LocalDate.parse("2011-12-31"));assertThat(PomodoroStreakTimeline.summarize(dates,LocalDate.parse("2011-12-31"),ZoneId.of("Pacific/Apia")).longestStreakDays()).isEqualTo(1);
    }
    @Test void earliestSupportedDateDoesNotOverflowTheCurrentRunCheck() {
        var day=LocalDate.of(1900,1,1);assertThat(PomodoroStreakTimeline.summarize(List.of(day),day,zone).currentStreakDays()).isEqualTo(1);
    }
}
