package com.focusstudy.notifications;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.*;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.ObjectMapper;
import static com.focusstudy.notifications.NotificationRequests.*;

@Repository
public class NotificationReadRepository {
    private static final LocalDate SINGLE = LocalDate.of(1970, 1, 1);
    private final NamedParameterJdbcTemplate jdbc;
    private final ObjectMapper json;
    public NotificationReadRepository(NamedParameterJdbcTemplate jdbc, ObjectMapper json) { this.jdbc = jdbc; this.json = json; }

    // One bounded set query, even for several dates belonging to the same rule.
    // Parent/exception versions are deliberately absent from CLASS content: a
    // change on Monday must not make an unchanged Tuesday reminder unread.
    private static final String LOOKUP = """
        WITH requested AS (
            SELECT * FROM jsonb_to_recordset(CAST(:targets AS jsonb))
                AS r(kind text, source_id uuid, occurrence_date date)
        )
        SELECT r.kind, r.source_id, r.occurrence_date,
            a.status AS assignment_status, e.ends_at AS exam_end, e.reminder AS exam_reminder,
            s.starts_on, s.ends_on, s.weekday_mask, s.time_zone,
            coalesce(x.end_time,s.end_time) AS class_end, x.kind AS exception_kind,
            c.id AS course_id,coalesce(a.version,e.version,s.version) AS source_version,
            c.version AS course_version,sem.version AS semester_version,
            jsonb_build_array('notification-content-v1',r.kind,r.source_id,r.occurrence_date,
                c.id,c.name,c.code,sem.id,sem.term,sem.start_year,
                CASE r.kind
                    WHEN 'ASSIGNMENT' THEN jsonb_build_array(a.title,extract(epoch FROM a.due_at),a.version)
                    WHEN 'EXAM' THEN jsonb_build_array(extract(epoch FROM e.starts_at),extract(epoch FROM e.ends_at),
                        e.time_zone,e.room,e.kind,e.format,e.reminder,e.reminder_minutes,e.version)
                    WHEN 'CLASS' THEN jsonb_build_array(coalesce(x.start_time,s.start_time),coalesce(x.end_time,s.end_time),
                        s.time_zone,coalesce(x.room,s.room),coalesce(x.teacher,s.teacher),s.reminder_minutes,x.kind,coalesce(x.reason,''))
                END)::text AS content,
            n.revision AS saved_revision,n.read_at
        FROM requested r
        LEFT JOIN assignments a ON r.kind='ASSIGNMENT' AND a.id=r.source_id AND a.user_id=:owner
        LEFT JOIN exams e ON r.kind='EXAM' AND e.id=r.source_id AND e.user_id=:owner
        LEFT JOIN class_schedules s ON r.kind='CLASS' AND s.id=r.source_id AND s.user_id=:owner
        LEFT JOIN class_exceptions x ON x.schedule_id=s.id AND x.user_id=:owner AND x.occurrence_date=r.occurrence_date
        LEFT JOIN courses c ON c.id=coalesce(a.course_id,e.course_id,s.course_id) AND c.user_id=:owner
        LEFT JOIN semesters sem ON sem.id=c.semester_id AND sem.user_id=:owner
        LEFT JOIN notification_read_states n ON n.user_id=:owner AND n.kind=r.kind
            AND n.source_id=r.source_id AND n.occurrence_date=r.occurrence_date
        """;

    public List<NotificationState> lookup(UUID owner, List<Target> targets, Instant now) {
        if (targets.isEmpty()) return List.of();
        var refs = targets.stream().map(t -> Map.of("kind",t.kind().name(),"source_id",t.sourceId().toString(),
                "occurrence_date", day(t).toString())).toList();
        var found = new HashMap<Target,NotificationState>();
        jdbc.query(LOOKUP, Map.of("targets", json.writeValueAsString(refs), "owner", owner), (rs, row) -> {
            Kind kind = Kind.valueOf(rs.getString("kind"));
            LocalDate date = rs.getObject("occurrence_date", LocalDate.class);
            var target = new Target(kind, rs.getObject("source_id",UUID.class), kind == Kind.CLASS ? date.toString() : null);
            boolean available = rs.getObject("course_id") != null && switch (kind) {
                case ASSIGNMENT -> !"COMPLETED".equals(rs.getString("assignment_status"));
                case EXAM -> rs.getBoolean("exam_reminder") && rs.getTimestamp("exam_end").toInstant().isAfter(now);
                case CLASS -> scheduled(rs, date) && !"CANCELLED".equals(rs.getString("exception_kind"))
                        && date.atTime(rs.getObject("class_end",LocalTime.class)).atZone(ZoneId.of(rs.getString("time_zone"))).toInstant().isAfter(now);
            };
            String revision = available ? hash(rs.getString("content")) : null;
            boolean read = available && revision.equals(rs.getString("saved_revision"));
            var basis = available ? new NotificationState.Basis(rs.getLong("source_version"),rs.getLong("course_version"),rs.getLong("semester_version")) : null;
            var state = new NotificationState(target,available,revision,basis,read,read ? rs.getTimestamp("read_at").toInstant() : null);
            found.put(target,state);
            return state;
        });
        return targets.stream().map(found::get).toList();
    }

    private boolean scheduled(ResultSet rs, LocalDate date) throws SQLException {
        return !date.isBefore(rs.getObject("starts_on",LocalDate.class)) && !date.isAfter(rs.getObject("ends_on",LocalDate.class))
                && (rs.getInt("weekday_mask") & (1 << (date.getDayOfWeek().getValue()-1))) != 0;
    }
    private String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException ex) { throw new IllegalStateException("SHA-256 unavailable",ex); }
    }
    private LocalDate day(Target t) { return t.kind() == Kind.CLASS ? LocalDate.parse(t.occurrenceDate()) : SINGLE; }

    public void mark(UUID owner, NotificationState state, Instant now) {
        var target = state.target();
        var params = new HashMap<String,Object>();
        params.put("owner",owner); params.put("kind",target.kind().name()); params.put("source",target.sourceId());
        params.put("day",java.sql.Date.valueOf(day(target))); params.put("revision",state.revision()); params.put("now",Timestamp.from(now));
        params.put("assignment",target.kind() == Kind.ASSIGNMENT ? target.sourceId() : null);
        params.put("exam",target.kind() == Kind.EXAM ? target.sourceId() : null);
        params.put("schedule",target.kind() == Kind.CLASS ? target.sourceId() : null);
        jdbc.update("""
            INSERT INTO notification_read_states(user_id,kind,source_id,occurrence_date,assignment_id,exam_id,schedule_id,revision,read_at)
            VALUES (:owner,:kind,:source,:day,:assignment,:exam,:schedule,:revision,:now)
            ON CONFLICT (user_id,kind,source_id,occurrence_date) DO UPDATE
                SET revision=excluded.revision,read_at=excluded.read_at
                WHERE notification_read_states.revision<>excluded.revision
            """,params);
    }
}
