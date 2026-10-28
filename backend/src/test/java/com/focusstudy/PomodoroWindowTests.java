package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import com.focusstudy.focus.*;
import java.time.*;
import org.junit.jupiter.api.Test;

class PomodoroWindowTests {
    private final Clock clock=Clock.fixed(Instant.parse("2026-10-27T18:00:00Z"),ZoneOffset.UTC);
    @Test void defaultDateUsesRequestedZoneInsteadOfServerLocalDate() {
        var v=PomodoroWindow.day(null,"Asia/Ho_Chi_Minh",clock);assertThat(v.date()).isEqualTo(LocalDate.of(2026,10,28));assertThat(v.from()).isEqualTo(Instant.parse("2026-10-27T17:00:00Z"));assertThat(v.to()).isEqualTo(Instant.parse("2026-10-28T17:00:00Z"));
        assertThat(PomodoroWindow.day(null,"UTC",clock).date()).isEqualTo(LocalDate.of(2026,10,27));
    }
    @Test void springDstDayHas23Hours() {
        var v=PomodoroWindow.day("2026-03-08","America/New_York",clock);assertThat(Duration.between(v.from(),v.to())).isEqualTo(Duration.ofHours(23));
    }
    @Test void autumnDstDayHas25Hours() {
        var v=PomodoroWindow.day("2025-11-02","America/New_York",clock);assertThat(Duration.between(v.from(),v.to())).isEqualTo(Duration.ofHours(25));
    }
    @Test void rejectsInvalidAndOutOfRangeDatesAndZones() {
        for(String value:new String[]{"2026-02-30","28/10/2026","2026-1-01","1899-12-31","2100-01-01",""})assertThatThrownBy(()->PomodoroWindow.day(value,"UTC",clock)).isInstanceOf(PomodoroApiException.class);
        for(String zone:new String[]{null,"","Fake/Zone","+07:00"})assertThatThrownBy(()->PomodoroWindow.day("2026-10-28",zone,clock)).isInstanceOf(PomodoroApiException.class);
    }
    @Test void offsetHistoryBoundsRepresentSameInstantAndKeepMilliseconds() {
        assertThat(PomodoroWindow.bound("2026-10-28T00:00:00.123+07:00")).isEqualTo(Instant.parse("2026-10-27T17:00:00.123Z"));assertThat(PomodoroWindow.bound(null)).isNull();assertThat(PomodoroWindow.bound("2100-01-01T00:00:00Z")).isEqualTo(Instant.parse("2100-01-01T00:00:00Z"));
    }
    @Test void malformedAndOutOfRangeBoundsAreClientErrors() {
        for(String value:new String[]{"2026-10-28","infinity","","1899-01-01T00:00:00Z","2100-01-01T00:00:01Z","x".repeat(41)})assertThatThrownBy(()->PomodoroWindow.bound(value)).isInstanceOf(PomodoroApiException.class);
    }
}
