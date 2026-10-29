package com.focusstudy.assignments.statistics;

import com.focusstudy.academics.courses.CourseApiException;
import com.focusstudy.academics.courses.CourseRepository;
import com.focusstudy.academics.semesters.SemesterApiException;
import com.focusstudy.academics.semesters.SemesterRepository;
import com.focusstudy.assignments.AssignmentApiException;
import com.focusstudy.users.UserRepository;
import java.math.*;
import java.time.*;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class AssignmentStatisticsService {
    public record Statistics(UUID semesterId, UUID courseId, Instant asOf, LocalDate date, String timeZone,
            Instant dueSoonThrough, long totalAssignments, long todoAssignments, long inProgressAssignments,
            long completedAssignments, long pendingAssignments, long overdueAssignments, long notDueAssignments,
            long dueSoonAssignments, int completionPercent) { }

    private final AssignmentStatisticsRepository assignments;
    private final SemesterRepository semesters;
    private final CourseRepository courses;
    private final UserRepository users;
    private final Clock clock;
    public AssignmentStatisticsService(AssignmentStatisticsRepository assignments, SemesterRepository semesters,
            CourseRepository courses, UserRepository users, Clock clock) {
        this.assignments = assignments; this.semesters = semesters; this.courses = courses; this.users = users; this.clock = clock;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Statistics get(UUID owner, UUID semesterId, UUID courseId, String timeZone) {
        if (semesterId == null) throw AssignmentStatisticsWindow.invalid("Chọn học kỳ cần thống kê bằng semesterId.");
        semesters.findByIdAndUserId(semesterId, owner).orElseThrow(() -> new SemesterApiException(
                HttpStatus.NOT_FOUND, "SEMESTER_NOT_FOUND", "Không tìm thấy học kỳ."));
        if (courseId != null) courses.findByIdAndUserId(courseId, owner).orElseThrow(() -> new CourseApiException(
                HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy môn học."));
        String zone = timeZone == null ? users.findById(owner).orElseThrow(() -> new AssignmentApiException(
                HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "Cần đăng nhập lại để tiếp tục.")).getTimeZone() : timeZone;
        var window = AssignmentStatisticsWindow.of(zone, clock);
        var totals = assignments.count(owner, semesterId, courseId, window);
        long pending = totals.todo() + totals.inProgress();
        int percent = totals.total() == 0 ? 0 : BigDecimal.valueOf(totals.completed()).multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(totals.total()), 0, RoundingMode.HALF_UP).intValueExact();
        return new Statistics(semesterId, courseId, window.asOf(), window.date(), window.timeZone(), window.dueSoonThrough(),
                totals.total(), totals.todo(), totals.inProgress(), totals.completed(), pending, totals.overdue(),
                pending - totals.overdue(), totals.dueSoon(), percent);
    }
}
