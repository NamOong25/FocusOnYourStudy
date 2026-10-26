package com.focusstudy.grades.semester;

import com.focusstudy.academics.courses.CourseRepository;
import com.focusstudy.academics.semesters.*;
import com.focusstudy.grades.configuration.*;
import com.focusstudy.grades.results.GradeResultResponse;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class SemesterGpaService {
    private final SemesterRepository semesters;
    private final CourseRepository courses;
    private final GradeConfigurationRepository configurations;
    public SemesterGpaService(SemesterRepository semesters, CourseRepository courses, GradeConfigurationRepository configurations) {
        this.semesters = semesters; this.courses = courses; this.configurations = configurations;
    }
    private static final SemesterGpaResponse.Policy POLICY = new SemesterGpaResponse.Policy("IUH_2023_SEMESTER_V1", GradeResultResponse.POLICY.id(),
            GradeResultResponse.POLICY.sourceUrl(), 68, 2, "HALF_UP", "SUM(gradePoint * credits) / SUM(calculated credits)");
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public SemesterGpaResponse get(UUID owner, UUID semesterId) {
        var semester = semesters.findByIdAndUserId(semesterId, owner).orElseThrow(() -> new SemesterApiException(HttpStatus.NOT_FOUND, "SEMESTER_NOT_FOUND", "Không tìm thấy học kỳ."));
        var catalog = courses.findByUserIdAndSemesterIdOrderByCodeAscIdAsc(owner, semesterId);
        var byCourse = new HashMap<UUID, GradeConfigurationEntity>();
        if (!catalog.isEmpty()) configurations.findForCourses(owner, catalog.stream().map(c -> c.getId()).toList()).forEach(c -> byCourse.put(c.getCourseId(), c));
        var rows = catalog.stream().map(c -> SemesterGpaCalculator.course(c, byCourse.get(c.getId()))).toList();
        return new SemesterGpaResponse(SemesterResponse.from(semester), POLICY, SemesterGpaCalculator.summarize(rows), rows);
    }
}
