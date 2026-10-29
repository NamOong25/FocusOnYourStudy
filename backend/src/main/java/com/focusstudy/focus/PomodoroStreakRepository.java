package com.focusstudy.focus;

import java.sql.ResultSet;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Repository;

@Repository
public class PomodoroStreakRepository {
    public record StudyDay(LocalDate date, long completedSessions, long studyMillis) { }
    private static class Count {
        long sessions, millis;
        void add(long elapsed) { sessions = Math.addExact(sessions, 1); millis = Math.addExact(millis, elapsed); }
    }
    private final JdbcTemplate jdbc;
    public PomodoroStreakRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** Stream two scalar columns; retain only one aggregate per local date, never all session entities. */
    public List<StudyDay> days(UUID owner, ZoneId zone, Instant from, Instant to) {
        var counts = new TreeMap<LocalDate, Count>();
        jdbc.query(connection -> {
            var statement = connection.prepareStatement("""
                    SELECT ended_at, elapsed_millis FROM pomodoro_sessions
                    WHERE user_id = ? AND status = 'COMPLETED' AND ended_at >= ? AND ended_at < ?
                    ORDER BY ended_at, id
                    """, ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY);
            statement.setFetchSize(256);
            statement.setObject(1, owner);
            statement.setObject(2, from.atOffset(ZoneOffset.UTC));
            statement.setObject(3, to.atOffset(ZoneOffset.UTC));
            return statement;
        }, (RowCallbackHandler) row -> {
            var date = row.getObject(1, OffsetDateTime.class).toInstant().atZone(zone).toLocalDate();
            counts.computeIfAbsent(date, key -> new Count()).add(row.getLong(2));
        });
        return counts.entrySet().stream().map(e -> new StudyDay(e.getKey(), e.getValue().sessions, e.getValue().millis)).toList();
    }
}
