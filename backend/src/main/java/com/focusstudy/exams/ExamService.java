package com.focusstudy.exams;

import com.focusstudy.academics.CourseEntity;
import com.focusstudy.academics.courses.*;
import com.focusstudy.academics.semesters.*;
import com.focusstudy.users.UserRepository;
import jakarta.persistence.criteria.Predicate;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExamService {
    private final ExamRepository exams;
    private final CourseRepository courses;
    private final SemesterRepository semesters;
    private final UserRepository users;
    public ExamService(ExamRepository exams, CourseRepository courses, SemesterRepository semesters, UserRepository users) { this.exams = exams; this.courses = courses; this.semesters = semesters; this.users = users; }
    @Transactional(readOnly = true)
    public List<ExamResponse> list(UUID owner, UUID courseId, UUID semesterId, ExamEntity.Kind kind, ExamEntity.Format format, String from, String to) {
        if (courseId != null) ownedCourse(owner, courseId);
        if (semesterId != null) semesters.findByIdAndUserId(semesterId, owner).orElseThrow(() -> new SemesterApiException(HttpStatus.NOT_FOUND, "SEMESTER_NOT_FOUND", "Không tìm thấy học kỳ."));
        var lower = bound(from); var upper = bound(to);
        if (lower != null && upper != null && !lower.isBefore(upper)) throw new ExamApiException(HttpStatus.BAD_REQUEST, "INVALID_EXAM_RANGE", "Mốc từ phải trước mốc đến.");
        Specification<ExamEntity> filter = (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>(); predicates.add(cb.equal(root.get("userId"), owner));
            if (courseId != null) predicates.add(cb.equal(root.get("courseId"), courseId));
            if (kind != null) predicates.add(cb.equal(root.get("kind"), kind));
            if (format != null) predicates.add(cb.equal(root.get("format"), format));
            if (lower != null) predicates.add(cb.greaterThan(root.get("endsAt"), lower));
            if (upper != null) predicates.add(cb.lessThan(root.get("startsAt"), upper));
            if (semesterId != null) {
                var matching = query.subquery(UUID.class); var course = matching.from(CourseEntity.class);
                matching.select(course.get("id")).where(cb.equal(course.get("userId"), owner), cb.equal(course.get("semesterId"), semesterId));
                predicates.add(root.get("courseId").in(matching));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        return exams.findAll(filter, Sort.by("startsAt").ascending().and(Sort.by("id").ascending())).stream().map(ExamResponse::from).toList();
    }
    @Transactional(readOnly = true)
    public ExamResponse get(UUID owner, UUID id) { return ExamResponse.from(owned(owner, id)); }
    @Transactional
    public ExamResponse create(UUID owner, ExamRequests.Create input) { lockOwner(owner); ownedCourse(owner, input.courseId()); return ExamResponse.from(exams.saveAndFlush(ExamEntity.create(owner, input))); }
    @Transactional
    public ExamResponse update(UUID owner, UUID id, ExamRequests.Update input) {
        lockOwner(owner); var exam = owned(owner, id); checkVersion(exam, input.version()); ownedCourse(owner, input.courseId()); exam.change(input); exams.flush(); return ExamResponse.from(exam);
    }
    @Transactional
    public void delete(UUID owner, UUID id, long version) { lockOwner(owner); var exam = owned(owner, id); checkVersion(exam, version); exams.delete(exam); exams.flush(); }
    private Instant bound(String value) {
        if (value == null) return null;
        try { var instant = ExamSchedule.parse(value); if (value.length() > 40 || instant.isBefore(ExamSchedule.MIN) || instant.isAfter(ExamSchedule.MAX)) throw new DateTimeException("Out of range"); return instant; }
        catch (DateTimeException failure) { throw new ExamApiException(HttpStatus.BAD_REQUEST, "INVALID_EXAM_RANGE", "Khoảng lọc cần ngày giờ có offset trong năm 1900–2099; mốc đến có thể là đầu năm 2100."); }
    }
    private void lockOwner(UUID owner) { users.lockForAcademicChanges(owner).orElseThrow(() -> new ExamApiException(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "Cần đăng nhập lại để tiếp tục.")); }
    private void ownedCourse(UUID owner, UUID id) { courses.findByIdAndUserId(id, owner).orElseThrow(() -> new CourseApiException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy môn học.")); }
    private ExamEntity owned(UUID owner, UUID id) { return exams.findByIdAndUserId(id, owner).orElseThrow(() -> new ExamApiException(HttpStatus.NOT_FOUND, "EXAM_NOT_FOUND", "Không tìm thấy lịch thi.")); }
    private void checkVersion(ExamEntity exam, long version) { if (exam.getVersion() != version) throw new ExamApiException(HttpStatus.CONFLICT, "EXAM_VERSION_CONFLICT", "Lịch thi đã thay đổi ở nơi khác. Tải lại trước khi sửa hoặc xóa."); }
}
