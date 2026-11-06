package com.focusstudy.exports;

import com.focusstudy.academics.CourseEntity;
import com.focusstudy.academics.SemesterEntity;
import com.focusstudy.academics.courses.CourseResponse;
import com.focusstudy.academics.semesters.SemesterResponse;
import com.focusstudy.assignments.AssignmentEntity;
import com.focusstudy.assignments.AssignmentResponse;
import com.focusstudy.auth.AuthApiException;
import com.focusstudy.exams.ExamEntity;
import com.focusstudy.exams.ExamResponse;
import com.focusstudy.focus.PomodoroEntity;
import com.focusstudy.focus.PomodoroGoalService;
import com.focusstudy.focus.PomodoroResponse;
import com.focusstudy.grades.configuration.GradeConfigurationEntity;
import com.focusstudy.grades.scores.GradeScoresResponse;
import com.focusstudy.notifications.NotificationPreferencesService;
import com.focusstudy.schedule.ClassExceptionEntity;
import com.focusstudy.schedule.ClassExceptionResponse;
import com.focusstudy.schedule.ClassScheduleEntity;
import com.focusstudy.schedule.ClassScheduleResponse;
import com.focusstudy.study.StudyResponse;
import com.focusstudy.study.StudySessionEntity;
import com.focusstudy.users.UserProfile;
import com.focusstudy.users.UserRepository;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PersonalDataExportService {
    private static final int MAX_ROWS = 10_000;
    private final EntityManager entities;
    private final UserRepository users;
    private final PomodoroGoalService goals;
    private final NotificationPreferencesService notifications;
    private final Clock clock;

    public PersonalDataExportService(EntityManager entities, UserRepository users, PomodoroGoalService goals,
            NotificationPreferencesService notifications, Clock clock) {
        this.entities = entities;
        this.users = users;
        this.goals = goals;
        this.notifications = notifications;
        this.clock = clock;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ, timeout = 30)
    public PersonalDataExport snapshot(UUID owner) {
        var exportedAt = clock.instant();
        var profile = UserProfile.from(users.findById(owner).orElseThrow(AuthApiException::invalidToken));
        var rows = new ExportRows(owner);
        var semesters = rows.load(SemesterEntity.class).stream().map(SemesterResponse::from).toList();
        var courses = rows.load(CourseEntity.class).stream().map(CourseResponse::from).toList();
        var assignments = rows.load(AssignmentEntity.class).stream().map(AssignmentResponse::from).toList();
        var study = rows.load(StudySessionEntity.class).stream().map(StudyResponse::from).toList();
        var schedules = rows.load(ClassScheduleEntity.class).stream().map(ClassScheduleResponse::from).toList();
        Map<UUID, Long> scheduleVersions = schedules.stream().collect(Collectors.toMap(ClassScheduleResponse::id, ClassScheduleResponse::version));
        var exceptions = rows.load(ClassExceptionEntity.class).stream()
                .map(exception -> ClassExceptionResponse.from(exception, scheduleVersions.get(exception.getScheduleId()))).toList();
        var exams = rows.load(ExamEntity.class).stream().map(ExamResponse::from).toList();
        var grades = rows.load(GradeConfigurationEntity.class).stream().map(GradeScoresResponse::from).toList();
        var focus = rows.load(PomodoroEntity.class).stream().map(session -> PomodoroResponse.from(session, exportedAt)).toList();
        return new PersonalDataExport("focusyourstudy-personal-data", 1, exportedAt, profile,
                semesters, courses, assignments, study, schedules, exceptions, exams, grades, focus,
                goals.get(owner), notifications.get(owner));
    }

    /** Bounds the entire export while every query uses the authenticated owner and the same snapshot. */
    private class ExportRows {
        private final UUID owner;
        private int remaining = MAX_ROWS;

        ExportRows(UUID owner) { this.owner = owner; }

        <T> List<T> load(Class<T> type) {
            var builder = entities.getCriteriaBuilder();
            var query = builder.createQuery(type);
            var row = query.from(type);
            query.select(row).where(builder.equal(row.get("userId"), owner)).orderBy(builder.asc(row.get("id")));
            var found = entities.createQuery(query).setMaxResults(remaining + 1).getResultList();
            if (found.size() > remaining) throw new PersonalDataExportException();
            remaining -= found.size();
            return found;
        }
    }
}
