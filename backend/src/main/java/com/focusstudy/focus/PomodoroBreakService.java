package com.focusstudy.focus;

import com.focusstudy.users.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PomodoroBreakService {
    public enum Kind {
        SHORT(300_000), LONG(900_000);
        final int duration;
        Kind(int duration) { this.duration = duration; }
    }
    public enum State { IDLE, RUNNING, PAUSED, ELAPSED }
    public enum Action { START, PAUSE, RESUME, RESET }
    public record Snapshot(Kind kind, State state, int remainingMs, long version) {
        boolean active() { return state == State.RUNNING || state == State.PAUSED; }
    }

    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final PomodoroRepository sessions;
    private final Clock clock;

    public PomodoroBreakService(JdbcTemplate jdbc, UserRepository users, PomodoroRepository sessions, Clock clock) {
        this.jdbc = jdbc;
        this.users = users;
        this.sessions = sessions;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Snapshot get(UUID owner) { return read(owner, clock.instant()); }

    private Snapshot read(UUID owner, Instant now) {
        return jdbc.query("SELECT kind, state, remaining_ms, ends_at, version FROM pomodoro_breaks WHERE user_id = ?",
                (row, index) -> {
                    var kind = Kind.valueOf(row.getString("kind"));
                    var state = State.valueOf(row.getString("state"));
                    int remaining = row.getInt("remaining_ms");
                    if (state == State.RUNNING) {
                        var deadline = row.getObject("ends_at", OffsetDateTime.class).toInstant();
                        remaining = (int) Math.clamp(deadline.toEpochMilli() - now.toEpochMilli(), 0, kind.duration);
                        if (remaining == 0) state = State.ELAPSED;
                    }
                    return new Snapshot(kind, state, remaining, row.getLong("version"));
                }, owner).stream().findFirst().orElse(new Snapshot(Kind.SHORT, State.IDLE, Kind.SHORT.duration, 0));
    }

    @Transactional
    public Snapshot change(UUID owner, Action action, Kind kind, long version) {
        users.lockForAcademicChanges(owner).orElseThrow(() ->
                new PomodoroApiException(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "Cần đăng nhập lại để tiếp tục."));
        Instant now = clock.instant();
        var current = read(owner, now);
        if (current.version() != version) throw conflict("POMODORO_BREAK_CHANGED", "Giờ nghỉ đã thay đổi. Hãy kiểm tra lại.");
        var next = switch (action) {
            case START -> {
                if (current.active() || sessions.active(owner).isPresent())
                    throw conflict("POMODORO_BREAK_ACTIVE", "Hãy kết thúc phiên học hoặc giờ nghỉ đang chạy trước.");
                if (kind == null) throw new PomodoroApiException(HttpStatus.BAD_REQUEST, "INVALID_BREAK_KIND", "Chọn nghỉ ngắn hoặc nghỉ dài.");
                yield new Snapshot(kind, State.RUNNING, kind.duration, version + 1);
            }
            case PAUSE -> {
                requireState(current, State.RUNNING);
                yield new Snapshot(current.kind(), State.PAUSED, current.remainingMs(), version + 1);
            }
            case RESUME -> {
                requireState(current, State.PAUSED);
                yield new Snapshot(current.kind(), State.RUNNING, current.remainingMs(), version + 1);
            }
            case RESET -> new Snapshot(current.kind(), State.IDLE, current.kind().duration, version + 1);
        };
        var deadline = next.state() == State.RUNNING ? now.plusMillis(next.remainingMs()).atOffset(ZoneOffset.UTC) : null;
        jdbc.update("""
                INSERT INTO pomodoro_breaks (user_id, kind, state, remaining_ms, ends_at, version) VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (user_id) DO UPDATE SET kind = excluded.kind, state = excluded.state,
                    remaining_ms = excluded.remaining_ms, ends_at = excluded.ends_at, version = excluded.version
                """, owner, next.kind().name(), next.state().name(), next.remainingMs(), deadline, next.version());
        return next;
    }

    private void requireState(Snapshot current, State expected) {
        if (current.state() != expected) throw conflict("POMODORO_BREAK_CHANGED", "Trạng thái giờ nghỉ đã đổi. Hãy kiểm tra lại.");
    }
    private PomodoroApiException conflict(String code, String message) {
        return new PomodoroApiException(HttpStatus.CONFLICT, code, message);
    }
}
