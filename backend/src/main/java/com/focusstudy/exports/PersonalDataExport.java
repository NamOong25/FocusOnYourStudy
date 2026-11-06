package com.focusstudy.exports;

import com.focusstudy.academics.courses.CourseResponse;
import com.focusstudy.academics.semesters.SemesterResponse;
import com.focusstudy.assignments.AssignmentResponse;
import com.focusstudy.exams.ExamResponse;
import com.focusstudy.focus.PomodoroGoalService;
import com.focusstudy.focus.PomodoroResponse;
import com.focusstudy.grades.scores.GradeScoresResponse;
import com.focusstudy.notifications.NotificationPreferences;
import com.focusstudy.schedule.ClassExceptionResponse;
import com.focusstudy.schedule.ClassScheduleResponse;
import com.focusstudy.study.StudyResponse;
import com.focusstudy.users.UserProfile;
import java.time.Instant;
import java.util.List;

public record PersonalDataExport(
        String format, int formatVersion, Instant exportedAt, UserProfile profile,
        List<SemesterResponse> semesters, List<CourseResponse> courses, List<AssignmentResponse> assignments,
        List<StudyResponse> studySessions, List<ClassScheduleResponse> classSchedules,
        List<ClassExceptionResponse> classExceptions, List<ExamResponse> exams,
        List<GradeScoresResponse> gradeConfigurations, List<PomodoroResponse> pomodoroSessions,
        PomodoroGoalService.Goal pomodoroGoal, NotificationPreferences notificationPreferences) { }
