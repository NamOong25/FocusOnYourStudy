package com.focusstudy.focus;

import java.time.*;
import org.springframework.http.HttpStatus;

public record PomodoroWindow(LocalDate date, String timeZone, Instant from, Instant to) {
    private static final Instant MIN = Instant.parse("1900-01-01T00:00:00Z"), MAX = Instant.parse("2100-01-01T00:00:00Z");
    public static PomodoroWindow day(String dateText, String zoneText, Clock clock) {
        try {
            if (zoneText == null || !ZoneId.getAvailableZoneIds().contains(zoneText)) throw new DateTimeException("Invalid zone");
            var zone = ZoneId.of(zoneText);
            if (dateText != null && !dateText.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) throw new DateTimeException("Invalid date");
            var date = dateText == null ? LocalDate.now(clock.withZone(zone)) : LocalDate.parse(dateText);
            if (date.getYear() < 1900 || date.getYear() > 2099) throw new DateTimeException("Out of range");
            return new PomodoroWindow(date, zoneText, date.atStartOfDay(zone).toInstant(), date.plusDays(1).atStartOfDay(zone).toInstant());
        } catch (DateTimeException ex) { throw invalid("Ngày cần dạng yyyy-MM-dd trong 1900–2099 và múi giờ IANA hợp lệ."); }
    }
    public static Instant bound(String text) {
        if (text == null) return null;
        try {
            if (text.length() > 40) throw new DateTimeException("Too long");
            var value = OffsetDateTime.parse(text).toInstant();
            if (value.isBefore(MIN) || value.isAfter(MAX)) throw new DateTimeException("Out of range");
            return value;
        } catch (DateTimeException ex) { throw invalid("Mốc lọc cần ngày giờ có múi giờ trong 1900–2099; mốc đến có thể là đầu năm 2100."); }
    }
    public static PomodoroApiException invalid(String detail) { return new PomodoroApiException(HttpStatus.BAD_REQUEST, "INVALID_POMODORO_HISTORY_FILTER", detail); }
}
