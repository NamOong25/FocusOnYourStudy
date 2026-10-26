package com.focusstudy.grades.results;

import com.focusstudy.academics.courses.*;
import com.focusstudy.grades.configuration.*;
import com.focusstudy.grades.scores.GradeScoresResponse;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class GradeResultService {
    private final GradeConfigurationRepository configurations;
    private final CourseRepository courses;
    public GradeResultService(GradeConfigurationRepository configurations, CourseRepository courses) { this.configurations = configurations; this.courses = courses; }
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public GradeResultResponse get(UUID owner, UUID id) {
        var config = configurations.findByIdAndUserId(id, owner).orElseThrow(() -> new GradeConfigurationApiException(HttpStatus.NOT_FOUND, "GRADE_CONFIGURATION_NOT_FOUND", "Không tìm thấy cấu hình điểm."));
        var course = courses.findByIdAndUserId(config.getCourseId(), owner).orElseThrow(() -> new CourseApiException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy môn học."));
        var snapshot = GradeScoresResponse.from(config);
        return new GradeResultResponse(snapshot, course.getCredits(), course.getVersion(), GradeResultResponse.POLICY, IuhCourseCalculator.calculate(snapshot, course.getCredits()));
    }
}
