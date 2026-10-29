package com.focusstudy.focus;

import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import org.springframework.http.HttpStatus;

/** Calendar windows come from Java's zone rules, just like the existing daily API. */
public record PomodoroStatisticsWindow(Period period, LocalDate date, String timeZone,
        LocalDate fromDate, LocalDate toDate, Instant from, Instant to, List<PomodoroWindow> days) {
    public enum Period { WEEK, MONTH }

    public static PomodoroStatisticsWindow of(String periodText, String dateText, String zoneText, Clock clock) {
        try {
            var period = periodText == null ? Period.WEEK : Period.valueOf(periodText);
            var anchor = PomodoroWindow.day(dateText, zoneText, clock);
            var first = period == Period.WEEK ? anchor.date().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                    : anchor.date().withDayOfMonth(1);
            var end = period == Period.WEEK ? first.plusWeeks(1) : first.plusMonths(1);
            if (first.getYear() < 1900 || end.minusDays(1).getYear() > 2099)
                throw invalid("Cả tuần/tháng cần nằm trong các năm 1900–2099.");
            var days = first.datesUntil(end).map(d -> PomodoroWindow.day(d.toString(), zoneText, clock)).toList();
            return new PomodoroStatisticsWindow(period, anchor.date(), zoneText, first, end.minusDays(1),
                    days.getFirst().from(), days.getLast().to(), days);
        } catch (PomodoroApiException ex) {
            if (ex.code().equals("INVALID_POMODORO_STATISTICS_FILTER")) throw ex;
            throw invalid(ex.getMessage());
        } catch (IllegalArgumentException | DateTimeException ex) {
            throw invalid("Chọn period WEEK hoặc MONTH, ngày yyyy-MM-dd trong 1900–2099 và múi giờ IANA hợp lệ.");
        }
    }

    public static PomodoroApiException invalid(String detail) {
        return new PomodoroApiException(HttpStatus.BAD_REQUEST, "INVALID_POMODORO_STATISTICS_FILTER", detail);
    }
}
