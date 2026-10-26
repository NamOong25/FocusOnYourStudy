package com.focusstudy.grades.attempts;

import com.focusstudy.academics.CourseEntity;
import com.focusstudy.academics.courses.*;
import com.focusstudy.academics.semesters.*;
import com.focusstudy.grades.configuration.*;
import com.focusstudy.grades.semester.SemesterGpaCalculator;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class CourseAttemptsService {
    private final SemesterRepository semesters;
    private final CourseRepository courses;
    private final GradeConfigurationRepository configurations;
    public CourseAttemptsService(SemesterRepository semesters, CourseRepository courses, GradeConfigurationRepository configurations) {
        this.semesters = semesters; this.courses = courses; this.configurations = configurations;
    }
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public CourseAttemptsResponse list(UUID owner) {
        return build(owner, null, courses.findByUserIdOrderByCodeAscIdAsc(owner));
    }
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public CourseAttemptsResponse get(UUID owner, UUID courseId) {
        var focus = courses.findByIdAndUserId(courseId, owner).orElseThrow(() ->
                new CourseApiException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy môn học."));
        // Return all credit variants of this code, kept as separate groups for review.
        var catalog = courses.findByUserIdOrderByCodeAscIdAsc(owner).stream().filter(c -> c.getCode().equals(focus.getCode())).toList();
        return build(owner, courseId, catalog);
    }
    private CourseAttemptsResponse build(UUID owner, UUID focus, List<CourseEntity> catalog) {
        if (catalog.isEmpty()) return CourseAttemptsTimeline.build(focus, List.of());
        var bySemester = semesters.findByUserIdOrderByStartYearDescTermDesc(owner).stream()
                .map(SemesterResponse::from).collect(Collectors.toMap(SemesterResponse::id, Function.identity()));
        var byCourse = new HashMap<UUID, GradeConfigurationEntity>();
        configurations.findForCourses(owner, catalog.stream().map(CourseEntity::getId).toList()).forEach(c -> byCourse.put(c.getCourseId(), c));
        var entries = catalog.stream().map(c -> new CourseAttemptsTimeline.Entry(
                Objects.requireNonNull(bySemester.get(c.getSemesterId()), "Missing owned semester in snapshot"),
                CourseAttemptsResponse.Course.from(SemesterGpaCalculator.course(c, byCourse.get(c.getId()))))).toList();
        return CourseAttemptsTimeline.build(focus, entries);
    }
}
