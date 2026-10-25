package com.focusstudy.academics.courses;

import com.focusstudy.academics.CourseEntity;
import com.focusstudy.academics.semesters.SemesterRepository;
import com.focusstudy.academics.semesters.SemesterApiException;
import com.focusstudy.users.UserRepository;
import com.focusstudy.assignments.AssignmentRepository;
import com.focusstudy.study.StudySessionRepository;
import com.focusstudy.schedule.ClassScheduleRepository;
import com.focusstudy.exams.ExamRepository;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CourseService {
    private final CourseRepository courses;
    private final SemesterRepository semesters;
    private final UserRepository users;
    private final AssignmentRepository assignments;
    private final StudySessionRepository studySessions;
    private final ClassScheduleRepository classSchedules;
    private final ExamRepository exams;
    public CourseService(CourseRepository courses, SemesterRepository semesters, UserRepository users, AssignmentRepository assignments, StudySessionRepository studySessions, ClassScheduleRepository classSchedules, ExamRepository exams) {
        this.courses = courses; this.semesters = semesters; this.users = users; this.assignments = assignments; this.studySessions = studySessions; this.classSchedules = classSchedules; this.exams = exams;
    }
    @Transactional(readOnly = true)
    public List<CourseResponse> list(UUID owner, UUID semesterId) {
        if (semesterId == null) return courses.findByUserIdOrderByCodeAscIdAsc(owner).stream().map(CourseResponse::from).toList();
        ownedSemester(owner, semesterId);
        return courses.findByUserIdAndSemesterIdOrderByCodeAscIdAsc(owner, semesterId).stream().map(CourseResponse::from).toList();
    }
    @Transactional(readOnly = true)
    public CourseResponse get(UUID owner, UUID id) { return CourseResponse.from(owned(owner, id)); }
    @Transactional
    public CourseResponse create(UUID owner, CourseRequests.Create input) {
        lockOwner(owner); ownedSemester(owner, input.semesterId());
        if (courses.existsByUserIdAndSemesterIdAndCode(owner, input.semesterId(), input.code())) throw duplicate();
        return CourseResponse.from(courses.saveAndFlush(CourseEntity.create(owner, input.semesterId(), input.code(), input.name(), input.credits(),
                input.teacher(), input.room(), input.status(), input.color(), input.description())));
    }
    @Transactional
    public CourseResponse update(UUID owner, UUID id, CourseRequests.Update input) {
        lockOwner(owner); var course = owned(owner, id); checkVersion(course, input.version()); ownedSemester(owner, input.semesterId());
        if (!course.getSemesterId().equals(input.semesterId())) requireNoLearningData(owner, id);
        if (courses.existsByUserIdAndSemesterIdAndCodeAndIdNot(owner, input.semesterId(), input.code(), id)) throw duplicate();
        course.change(input.semesterId(), input.code(), input.name(), input.credits(), input.teacher(), input.room(), input.status(), input.color(), input.description());
        courses.flush(); return CourseResponse.from(course);
    }
    @Transactional
    public void delete(UUID owner, UUID id, long version) {
        lockOwner(owner); var course = owned(owner, id); checkVersion(course, version);
        requireNoLearningData(owner, id);
        courses.delete(course); courses.flush();
    }
    private void requireNoLearningData(UUID owner, UUID courseId) {
        if (assignments.existsByUserIdAndCourseId(owner, courseId)) throw new CourseApiException(HttpStatus.CONFLICT,
                "COURSE_HAS_ASSIGNMENTS", "Môn còn bài tập. Hãy xử lý các bài tập trước khi xóa hoặc chuyển học kỳ.");
        if (studySessions.existsByUserIdAndCourseId(owner, courseId)) throw new CourseApiException(HttpStatus.CONFLICT,
                "COURSE_HAS_STUDY_SESSIONS", "Môn còn buổi tự học đã lưu. Xử lý các buổi trước khi xóa hoặc chuyển học kỳ.");
        if (classSchedules.existsByUserIdAndCourseId(owner, courseId)) throw new CourseApiException(HttpStatus.CONFLICT,
                "COURSE_HAS_CLASS_SCHEDULES", "Môn còn lịch học đã lưu. Xử lý các chuỗi lịch trước khi xóa hoặc chuyển học kỳ.");
        if (exams.existsByUserIdAndCourseId(owner, courseId)) throw new CourseApiException(HttpStatus.CONFLICT,
                "COURSE_HAS_EXAMS", "Môn còn lịch thi đã lưu. Xử lý các lịch thi trước khi xóa hoặc chuyển học kỳ.");
    }
    private void lockOwner(UUID owner) {
        // Same first lock as semester writes: create/move cannot race deletion of
        // the target semester, including when that semester is currently empty.
        users.lockForAcademicChanges(owner).orElseThrow(() -> new CourseApiException(HttpStatus.UNAUTHORIZED,
                "AUTHENTICATION_REQUIRED", "Cần đăng nhập lại để tiếp tục."));
    }
    private void ownedSemester(UUID owner, UUID id) {
        semesters.findByIdAndUserId(id, owner).orElseThrow(() -> new SemesterApiException(HttpStatus.NOT_FOUND,
                "SEMESTER_NOT_FOUND", "Không tìm thấy học kỳ."));
    }
    private CourseEntity owned(UUID owner, UUID id) {
        return courses.findByIdAndUserId(id, owner).orElseThrow(() -> new CourseApiException(HttpStatus.NOT_FOUND,
                "COURSE_NOT_FOUND", "Không tìm thấy môn học."));
    }
    private void checkVersion(CourseEntity course, long version) {
        if (course.getVersion() != version) throw new CourseApiException(HttpStatus.CONFLICT, "COURSE_VERSION_CONFLICT",
                "Môn học đã thay đổi ở nơi khác. Tải lại trước khi sửa hoặc xóa.");
    }
    private CourseApiException duplicate() {
        return new CourseApiException(HttpStatus.CONFLICT, "COURSE_ALREADY_EXISTS", "Mã môn này đã có trong học kỳ đã chọn.");
    }
}
