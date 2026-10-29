package com.focusstudy.focus;

import java.time.*;
import org.springframework.http.HttpStatus;

public record PomodoroStreakWindow(PomodoroWindow today, PomodoroStatisticsWindow calendar, Instant historyFrom) {
    public static PomodoroStreakWindow of(String month, String timeZone, Clock clock) {
        try {
            var snapshot = Clock.fixed(clock.instant(), ZoneOffset.UTC);
            var today = PomodoroWindow.day(null, timeZone, snapshot);
            if (month != null && !month.matches("[0-9]{4}-[0-9]{2}")) throw invalid();
            var selected = month == null ? YearMonth.from(today.date()) : YearMonth.parse(month);
            var calendar = PomodoroStatisticsWindow.of("MONTH", selected + "-01", timeZone, snapshot);
            return new PomodoroStreakWindow(today, calendar, LocalDate.of(1900, 1, 1).atStartOfDay(ZoneId.of(timeZone)).toInstant());
        } catch (PomodoroApiException | DateTimeException ex) { throw invalid(); }
    }
    public static PomodoroApiException invalid() {
        return new PomodoroApiException(HttpStatus.BAD_REQUEST, "INVALID_POMODORO_STREAK_FILTER",
                "Chọn tháng yyyy-MM trong 1900–2099 và múi giờ IANA hợp lệ.");
    }
}
