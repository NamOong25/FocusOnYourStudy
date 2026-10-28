package com.focusstudy.focus;

import com.focusstudy.users.UserRepository;
import jakarta.persistence.criteria.Predicate;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class PomodoroReadService {
    public record History(List<PomodoroResponse> items, int page, int size, long totalElements, int totalPages) { }
    public record Daily(LocalDate date, String timeZone, Instant from, Instant to, PomodoroGoalService.Goal goal,
                        long completedSessions, long studyMillis, long studySeconds, long remainingSessions,
                        int progressPercent, boolean goalReached) { }
    private final PomodoroRepository sessions;
    private final PomodoroGoalService goals;
    private final UserRepository users;
    private final Clock clock;
    public PomodoroReadService(PomodoroRepository sessions, PomodoroGoalService goals, UserRepository users, Clock clock) { this.sessions = sessions; this.goals = goals; this.users = users; this.clock = clock; }
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public History history(UUID owner, PomodoroEntity.Status status, UUID courseId, UUID semesterId, UUID assignmentId,
            UUID studySessionId, String from, String to, int page, int size) {
        if (page < 0 || size < 1 || size > 100 || (long) page * size > Integer.MAX_VALUE)
            throw PomodoroWindow.invalid("Trang từ 0, số dòng mỗi trang từ 1 đến 100; vị trí bắt đầu không vượt 2.147.483.647 dòng.");
        if (status != null && status != PomodoroEntity.Status.COMPLETED && status != PomodoroEntity.Status.CANCELLED) throw PomodoroWindow.invalid("Lịch sử chỉ gồm COMPLETED hoặc CANCELLED.");
        var lower = PomodoroWindow.bound(from); var upper = PomodoroWindow.bound(to);
        if (lower != null && upper != null && !lower.isBefore(upper)) throw PomodoroWindow.invalid("Mốc từ phải trước mốc đến.");
        Specification<PomodoroEntity> filter = (root, query, cb) -> {
            var terms = new ArrayList<Predicate>(); terms.add(cb.equal(root.get("userId"), owner));
            if (status == null) terms.add(root.get("status").in(PomodoroEntity.Status.COMPLETED, PomodoroEntity.Status.CANCELLED)); else terms.add(cb.equal(root.get("status"), status));
            if (courseId != null) terms.add(cb.equal(root.get("courseId"), courseId));
            if (semesterId != null) terms.add(cb.equal(root.get("semesterId"), semesterId));
            if (assignmentId != null) terms.add(cb.equal(root.get("assignmentId"), assignmentId));
            if (studySessionId != null) terms.add(cb.equal(root.get("studySessionId"), studySessionId));
            if (lower != null) terms.add(cb.greaterThanOrEqualTo(root.get("endedAt"), lower));
            if (upper != null) terms.add(cb.lessThan(root.get("endedAt"), upper));
            return cb.and(terms.toArray(Predicate[]::new));
        };
        var rows = sessions.findAll(filter, PageRequest.of(page, size, Sort.by(Sort.Order.desc("endedAt"), Sort.Order.desc("id"))));
        var time = clock.instant();
        return new History(rows.getContent().stream().map(row -> PomodoroResponse.from(row, time)).toList(), page, size, rows.getTotalElements(), rows.getTotalPages());
    }
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Daily daily(UUID owner, String date, String timeZone) {
        String zone = timeZone == null ? users.findById(owner).orElseThrow(() -> new PomodoroApiException(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "Cần đăng nhập lại để tiếp tục.")).getTimeZone() : timeZone;
        var window = PomodoroWindow.day(date, zone, clock); var goal = goals.get(owner);
        var totals = sessions.totals(owner, PomodoroEntity.Status.COMPLETED, window.from(), window.to());
        long count = totals.getSessionCount(), millis = totals.getStudyMillis();
        return new Daily(window.date(), window.timeZone(), window.from(), window.to(), goal, count, millis, millis / 1000,
                Math.max(0, goal.dailySessions() - count), (int) Math.min(100, count * 100 / goal.dailySessions()), count >= goal.dailySessions());
    }
}
