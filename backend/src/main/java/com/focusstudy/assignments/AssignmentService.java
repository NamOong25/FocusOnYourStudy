package com.focusstudy.assignments;

import com.focusstudy.academics.CourseEntity;
import com.focusstudy.academics.courses.CourseApiException;
import com.focusstudy.academics.courses.CourseRepository;
import com.focusstudy.academics.semesters.SemesterApiException;
import com.focusstudy.academics.semesters.SemesterRepository;
import com.focusstudy.assignments.validation.DeadlineValidator;
import com.focusstudy.users.UserRepository;
import com.focusstudy.study.StudySessionRepository;
import jakarta.persistence.criteria.Predicate;
import java.util.*;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AssignmentService {
    private final AssignmentRepository assignments;
    private final CourseRepository courses;
    private final SemesterRepository semesters;
    private final UserRepository users;
    private final StudySessionRepository studySessions;
    public AssignmentService(AssignmentRepository assignments, CourseRepository courses, SemesterRepository semesters, UserRepository users, StudySessionRepository studySessions) {
        this.assignments = assignments; this.courses = courses; this.semesters = semesters; this.users = users; this.studySessions = studySessions;
    }
    @Transactional(readOnly = true)
    public List<AssignmentResponse> list(UUID owner, UUID courseId, UUID semesterId, AssignmentEntity.Status status) {
        if (courseId != null) ownedCourse(owner, courseId);
        if (semesterId != null) semesters.findByIdAndUserId(semesterId, owner).orElseThrow(() -> new SemesterApiException(
                HttpStatus.NOT_FOUND, "SEMESTER_NOT_FOUND", "Không tìm thấy học kỳ."));
        Specification<AssignmentEntity> filter = (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>(); predicates.add(cb.equal(root.get("userId"), owner));
            if (courseId != null) predicates.add(cb.equal(root.get("courseId"), courseId));
            if (status != null) predicates.add(cb.equal(root.get("status"), status));
            if (semesterId != null) {
                var matching = query.subquery(UUID.class); var course = matching.from(CourseEntity.class);
                matching.select(course.get("id")).where(cb.equal(course.get("userId"), owner), cb.equal(course.get("semesterId"), semesterId));
                predicates.add(root.get("courseId").in(matching));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        return assignments.findAll(filter, Sort.by("dueAt").ascending().and(Sort.by("id").ascending())).stream().map(AssignmentResponse::from).toList();
    }
    @Transactional(readOnly = true)
    public AssignmentResponse get(UUID owner, UUID id) { return AssignmentResponse.from(owned(owner, id)); }
    @Transactional
    public AssignmentResponse create(UUID owner, AssignmentRequests.Create input) {
        lockOwner(owner); ownedCourse(owner, input.courseId());
        return AssignmentResponse.from(assignments.saveAndFlush(AssignmentEntity.create(owner, input.courseId(), input.title(),
                DeadlineValidator.parse(input.dueAt()), input.priority(), input.status(), input.notes())));
    }
    @Transactional
    public AssignmentResponse update(UUID owner, UUID id, AssignmentRequests.Update input) {
        lockOwner(owner); var assignment = owned(owner, id); checkVersion(assignment, input.version()); ownedCourse(owner, input.courseId());
        if (!assignment.getCourseId().equals(input.courseId()) && studySessions.existsByUserIdAndAssignmentId(owner, id))
            throw new AssignmentApiException(HttpStatus.CONFLICT, "ASSIGNMENT_HAS_STUDY_SESSIONS", "Bài tập còn buổi tự học liên kết. Gỡ liên kết các buổi trước khi đổi môn.");
        var deadline = DeadlineValidator.parse(input.dueAt());
        if (studySessions.existsByUserIdAndAssignmentIdAndEndsAtAfter(owner, id, deadline))
            throw new AssignmentApiException(HttpStatus.CONFLICT, "ASSIGNMENT_DEADLINE_CONFLICT", "Hạn nộp mới đang trước lúc kết thúc buổi tự học liên kết. Điều chỉnh buổi học hoặc gỡ liên kết trước.");
        assignment.change(input.courseId(), input.title(), deadline, input.priority(), input.status(), input.notes());
        assignments.flush(); return AssignmentResponse.from(assignment);
    }
    @Transactional
    public void delete(UUID owner, UUID id, long version) {
        lockOwner(owner); var assignment = owned(owner, id); checkVersion(assignment, version);
        // Keep plans, detach links and increment their versions before the FK parent is removed.
        studySessions.findByUserIdAndAssignmentId(owner, id).forEach(session -> session.detachAssignment());
        studySessions.flush();
        assignments.delete(assignment); assignments.flush();
    }
    private void lockOwner(UUID owner) {
        // All assignment/course/semester writes share the same first lock. A course
        // cannot move or disappear between ownership/dependency checks and commit.
        users.lockForAcademicChanges(owner).orElseThrow(() -> new AssignmentApiException(HttpStatus.UNAUTHORIZED,
                "AUTHENTICATION_REQUIRED", "Cần đăng nhập lại để tiếp tục."));
    }
    private void ownedCourse(UUID owner, UUID id) {
        courses.findByIdAndUserId(id, owner).orElseThrow(() -> new CourseApiException(HttpStatus.NOT_FOUND,
                "COURSE_NOT_FOUND", "Không tìm thấy môn học."));
    }
    private AssignmentEntity owned(UUID owner, UUID id) {
        return assignments.findByIdAndUserId(id, owner).orElseThrow(() -> new AssignmentApiException(HttpStatus.NOT_FOUND,
                "ASSIGNMENT_NOT_FOUND", "Không tìm thấy bài tập."));
    }
    private void checkVersion(AssignmentEntity assignment, long version) {
        if (assignment.getVersion() != version) throw new AssignmentApiException(HttpStatus.CONFLICT, "ASSIGNMENT_VERSION_CONFLICT",
                "Bài tập đã thay đổi ở nơi khác. Tải lại trước khi sửa hoặc xóa.");
    }
}
