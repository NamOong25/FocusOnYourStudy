package com.focusstudy.focus;

import com.focusstudy.users.UserRepository;
import java.time.*;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class PomodoroStreakService {
    public record Day(LocalDate date, Instant from, Instant to, boolean studied, long completedSessions, long studyMillis, long studySeconds) { }
    public record Calendar(String month, LocalDate fromDate, LocalDate toDate, Instant from, Instant to,
            long studiedDays, long completedSessions, long studyMillis, long studySeconds, List<Day> days) { }
    public record Streak(LocalDate today, String timeZone, long currentStreakDays, long longestStreakDays, long totalStudiedDays,
            boolean studiedToday, LocalDate firstStudyDate, LocalDate lastStudyDate,
            LocalDate currentStreakStartDate, LocalDate currentStreakEndDate, LocalDate longestStreakStartDate, LocalDate longestStreakEndDate, Calendar calendar) { }
    private final PomodoroStreakRepository sessions;
    private final UserRepository users;
    private final Clock clock;
    public PomodoroStreakService(PomodoroStreakRepository sessions, UserRepository users, Clock clock) {
        this.sessions = sessions; this.users = users; this.clock = clock;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Streak get(UUID owner, String month, String timeZone) {
        String zoneText = timeZone == null ? users.findById(owner)
                .orElseThrow(() -> new PomodoroApiException(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "Cần đăng nhập lại để tiếp tục."))
                .getTimeZone() : timeZone;
        var window = PomodoroStreakWindow.of(month, zoneText, clock);
        var zone = ZoneId.of(zoneText);
        var rows = sessions.days(owner, zone, window.historyFrom(), window.today().to());
        var summary = PomodoroStreakTimeline.summarize(rows.stream().map(PomodoroStreakRepository.StudyDay::date).toList(), window.today().date(), zone);
        var byDate = rows.stream().collect(Collectors.toMap(PomodoroStreakRepository.StudyDay::date, Function.identity()));
        var selected = window.calendar();
        var days = selected.days().stream().map(day -> {
            var row = byDate.get(day.date());
            return new Day(day.date(), day.from(), day.to(), row != null, row == null ? 0 : row.completedSessions(),
                    row == null ? 0 : row.studyMillis(), row == null ? 0 : row.studyMillis() / 1000);
        }).toList();
        var calendar = new Calendar(YearMonth.from(selected.date()).toString(), selected.fromDate(), selected.toDate(), selected.from(), selected.to(),
                days.stream().filter(Day::studied).count(), days.stream().mapToLong(Day::completedSessions).sum(),
                days.stream().mapToLong(Day::studyMillis).sum(), days.stream().mapToLong(Day::studySeconds).sum(), days);
        return new Streak(window.today().date(), zoneText, summary.currentStreakDays(), summary.longestStreakDays(), summary.totalStudiedDays(), summary.studiedToday(),
                summary.firstStudyDate(), summary.lastStudyDate(), summary.currentStreakStartDate(), summary.currentStreakEndDate(),
                summary.longestStreakStartDate(), summary.longestStreakEndDate(), calendar);
    }
}
