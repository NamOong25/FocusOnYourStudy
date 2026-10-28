package com.focusstudy.focus;

import com.focusstudy.users.UserRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PomodoroGoalService {
    public record Goal(int dailySessions, long version, boolean persisted) {
        static Goal from(PomodoroPreferenceEntity row) { return new Goal(row.getDailySessions(), row.getVersion() + 1, true); }
    }
    private final PomodoroPreferenceRepository preferences;
    private final UserRepository users;
    public PomodoroGoalService(PomodoroPreferenceRepository preferences, UserRepository users) { this.preferences = preferences; this.users = users; }
    @Transactional(readOnly = true)
    public Goal get(UUID owner) { return preferences.findByUserId(owner).map(Goal::from).orElse(new Goal(4, 0, false)); }
    @Transactional
    public Goal save(UUID owner, PomodoroRequests.Goal input) {
        users.lockForAcademicChanges(owner).orElseThrow(() -> new PomodoroApiException(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "Cần đăng nhập lại để tiếp tục."));
        var existing = preferences.findByUserId(owner);
        long expected = existing.map(row -> row.getVersion() + 1).orElse(0L);
        if (input.version() != expected) throw new PomodoroApiException(HttpStatus.CONFLICT, "POMODORO_GOAL_VERSION_CONFLICT", "Mục tiêu đã thay đổi ở nơi khác. Đọc lại trước khi lưu.");
        var row = existing.orElseGet(() -> PomodoroPreferenceEntity.create(owner, input.dailySessions()));
        if (existing.isEmpty()) preferences.saveAndFlush(row);
        else if (row.getDailySessions() != input.dailySessions()) { row.setDailySessions(input.dailySessions()); preferences.flush(); }
        return Goal.from(row);
    }
}
