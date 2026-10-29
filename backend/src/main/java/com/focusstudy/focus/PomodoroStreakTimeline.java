package com.focusstudy.focus;

import java.time.*;
import java.util.*;

public final class PomodoroStreakTimeline {
    private PomodoroStreakTimeline() { }
    public record Summary(long currentStreakDays, long longestStreakDays, long totalStudiedDays, boolean studiedToday,
            LocalDate firstStudyDate, LocalDate lastStudyDate, LocalDate currentStreakStartDate, LocalDate currentStreakEndDate,
            LocalDate longestStreakStartDate, LocalDate longestStreakEndDate) { }

    public static Summary summarize(Collection<LocalDate> input, LocalDate today, ZoneId zone) {
        var dates = new TreeSet<LocalDate>();
        input.stream().filter(d -> d.getYear() >= 1900 && !d.isAfter(today)).forEach(dates::add);
        long run = 0, best = 0;
        LocalDate previous = null, runStart = null, bestStart = null, bestEnd = null;
        for (var date : dates) {
            if (previous != null && previousDate(date, zone).equals(previous)) run++;
            else { run = 1; runStart = date; }
            // On equal length, retain the most recent completed run.
            if (run >= best) { best = run; bestStart = runStart; bestEnd = date; }
            previous = date;
        }
        boolean active = previous != null && (previous.equals(today) || previous.equals(previousDate(today, zone)));
        return new Summary(active ? run : 0, best, dates.size(), dates.contains(today),
                dates.isEmpty() ? null : dates.first(), previous, active ? runStart : null, active ? previous : null, bestStart, bestEnd);
    }

    private static LocalDate previousDate(LocalDate date, ZoneId zone) {
        var previous = date.minusDays(1);
        // A date skipped by a zone change offers no chance to study and does not break a run.
        while (previous.atStartOfDay(zone).toInstant().equals(previous.plusDays(1).atStartOfDay(zone).toInstant())) previous = previous.minusDays(1);
        return previous;
    }
}
