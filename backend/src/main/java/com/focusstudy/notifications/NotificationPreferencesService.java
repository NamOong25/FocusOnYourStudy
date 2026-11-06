package com.focusstudy.notifications;

import java.time.LocalTime;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationPreferencesService {
    private static final Set<Integer> REMINDER_MINUTES = Set.of(5, 15, 30, 60);
    private static final String FIELDS = "assignments, classes, exams, reminder_minutes, quiet, quiet_start, quiet_end, version";
    private static final String INSERT = """
            INSERT INTO notification_preferences (user_id, %s)
            VALUES (:owner, :assignments, :classes, :exams, :minutes, :quiet, :start, :end, 1)
            ON CONFLICT (user_id) DO NOTHING
            RETURNING %s
            """.formatted(FIELDS, FIELDS);
    private static final String UPDATE = """
            UPDATE notification_preferences
            SET assignments = :assignments, classes = :classes, exams = :exams, reminder_minutes = :minutes,
                quiet = :quiet, quiet_start = :start, quiet_end = :end, version = version + 1
            WHERE user_id = :owner AND version = :version AND version < 9007199254740991
            RETURNING %s
            """.formatted(FIELDS);
    private static final RowMapper<NotificationPreferences> MAPPER = (row, index) -> new NotificationPreferences(
            row.getBoolean("assignments"), row.getBoolean("classes"), row.getBoolean("exams"),
            row.getInt("reminder_minutes"), row.getBoolean("quiet"), row.getObject("quiet_start", LocalTime.class).toString(),
            row.getObject("quiet_end", LocalTime.class).toString(), row.getLong("version"));

    private final NamedParameterJdbcTemplate jdbc;

    public NotificationPreferencesService(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public NotificationPreferences get(UUID owner) {
        return jdbc.query("SELECT " + FIELDS + " FROM notification_preferences WHERE user_id = :owner",
                Map.of("owner", owner), MAPPER).stream().findFirst().orElse(NotificationPreferences.DEFAULT);
    }

    @Transactional
    public NotificationPreferences update(UUID owner, NotificationPreferences.Update input) {
        if (!REMINDER_MINUTES.contains(input.reminderMinutes())) {
            throw new NotificationApiException(HttpStatus.BAD_REQUEST, "INVALID_REMINDER_MINUTES", "Chọn nhắc trước 5, 15, 30 hoặc 60 phút.");
        }
        var start = LocalTime.parse(input.quietStart());
        var end = LocalTime.parse(input.quietEnd());
        if (input.quiet() && start.equals(end)) {
            throw new NotificationApiException(HttpStatus.BAD_REQUEST, "INVALID_QUIET_HOURS", "Giờ bắt đầu và kết thúc cần khác nhau.");
        }
        var parameters = Map.of("owner", owner, "assignments", input.assignments(), "classes", input.classes(),
                "exams", input.exams(), "minutes", input.reminderMinutes(), "quiet", input.quiet(),
                "start", start, "end", end, "version", input.version());
        // A single write compares the version in PostgreSQL, including two first saves racing at version zero.
        return jdbc.query(input.version() == 0 ? INSERT : UPDATE, parameters, MAPPER).stream().findFirst()
                .orElseThrow(() -> new NotificationApiException(HttpStatus.CONFLICT, "NOTIFICATION_PREFERENCES_VERSION_CONFLICT",
                        "Tùy chọn đã thay đổi. Tải lại và đối chiếu trước khi lưu."));
    }
}
