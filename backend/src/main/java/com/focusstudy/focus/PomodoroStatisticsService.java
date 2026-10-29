package com.focusstudy.focus;

import com.focusstudy.users.UserRepository;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class PomodoroStatisticsService {
    public record Filters(UUID courseId, UUID semesterId) { }
    public record Day(LocalDate date, Instant from, Instant to, long completedSessions, long studyMillis, long studySeconds) { }
    public record Course(UUID courseId, String courseCode, String courseName, UUID semesterId,
            short semesterTerm, int semesterStartYear, long completedSessions, long studyMillis, long studySeconds) { }
    public record Statistics(PomodoroStatisticsWindow.Period period, LocalDate date, String timeZone,
            LocalDate fromDate, LocalDate toDate, Instant from, Instant to, Filters filters,
            long completedSessions, long studyMillis, long studySeconds, List<Day> days, List<Course> courses) { }
    private record CourseKey(UUID courseId, UUID semesterId) { }
    private static class Count {
        long sessions, millis;
        void add(long value) { sessions = Math.addExact(sessions, 1); millis = Math.addExact(millis, value); }
    }
    private static class CourseCount extends Count {
        PomodoroStatisticsRow label;
        CourseCount(PomodoroStatisticsRow row) { label = row; }
        void accept(PomodoroStatisticsRow row) {
            if (LATEST.compare(row, label) > 0) label = row;
            add(row.studyMillis());
        }
        Course response() { return new Course(label.courseId(), label.courseCode(), label.courseName(),
                label.semesterId(), label.semesterTerm(), label.semesterStartYear(), sessions, millis, millis / 1000); }
    }
    private static final Comparator<PomodoroStatisticsRow> LATEST = Comparator.comparing(PomodoroStatisticsRow::endedAt)
            .thenComparing(row -> row.id().toString());
    private final PomodoroStatisticsRepository sessions;
    private final UserRepository users;
    private final Clock clock;
    public PomodoroStatisticsService(PomodoroStatisticsRepository sessions, UserRepository users, Clock clock) {
        this.sessions = sessions; this.users = users; this.clock = clock;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Statistics get(UUID owner, String period, String date, String timeZone, UUID courseId, UUID semesterId) {
        String zoneText = timeZone == null ? users.findById(owner)
                .orElseThrow(() -> new PomodoroApiException(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "Cần đăng nhập lại để tiếp tục."))
                .getTimeZone() : timeZone;
        var window = PomodoroStatisticsWindow.of(period, date, zoneText, clock);
        var zone = ZoneId.of(window.timeZone());
        var totals = new Count();
        var daily = new LinkedHashMap<LocalDate, Count>();
        window.days().forEach(day -> daily.put(day.date(), new Count()));
        var courses = new HashMap<CourseKey, CourseCount>();
        for (var row : sessions.completed(owner, window, courseId, semesterId)) {
            totals.add(row.studyMillis());
            daily.get(row.endedAt().atZone(zone).toLocalDate()).add(row.studyMillis());
            // Preserve semester attempts when a source course has moved semesters.
            courses.computeIfAbsent(new CourseKey(row.courseId(), row.semesterId()), key -> new CourseCount(row)).accept(row);
        }
        var days = window.days().stream().map(day -> {
            var value = daily.get(day.date());
            return new Day(day.date(), day.from(), day.to(), value.sessions, value.millis, value.millis / 1000);
        }).toList();
        var byCourse = courses.values().stream().map(CourseCount::response)
                .sorted(Comparator.comparingLong(Course::studyMillis).reversed()
                        .thenComparing(c -> c.courseId().toString()).thenComparing(c -> c.semesterId().toString()))
                .toList();
        return new Statistics(window.period(), window.date(), window.timeZone(), window.fromDate(), window.toDate(),
                window.from(), window.to(), new Filters(courseId, semesterId), totals.sessions, totals.millis, totals.millis / 1000, days, byCourse);
    }
}
