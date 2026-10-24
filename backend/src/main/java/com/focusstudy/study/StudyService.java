package com.focusstudy.study;

import com.focusstudy.academics.CourseEntity;
import com.focusstudy.academics.courses.*;
import com.focusstudy.academics.semesters.*;
import com.focusstudy.assignments.*;
import com.focusstudy.users.UserRepository;
import com.focusstudy.schedule.ScheduleConflictService;
import jakarta.persistence.criteria.Predicate;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudyService {
    private final StudySessionRepository sessions;
    private final CourseRepository courses;
    private final SemesterRepository semesters;
    private final AssignmentRepository assignments;
    private final UserRepository users;
    private final ScheduleConflictService conflicts;
    public StudyService(StudySessionRepository sessions, CourseRepository courses, SemesterRepository semesters, AssignmentRepository assignments, UserRepository users, ScheduleConflictService conflicts) {
        this.sessions = sessions; this.courses = courses; this.semesters = semesters; this.assignments = assignments; this.users = users; this.conflicts = conflicts;
    }
    @Transactional(readOnly = true)
    public List<StudyResponse> list(UUID owner, UUID courseId, UUID semesterId, UUID assignmentId, StudySessionEntity.Status status, String from, String to) {
        if (courseId != null) ownedCourse(owner, courseId);
        if (semesterId != null) semesters.findByIdAndUserId(semesterId, owner).orElseThrow(() -> new SemesterApiException(HttpStatus.NOT_FOUND, "SEMESTER_NOT_FOUND", "Không tìm thấy học kỳ."));
        if (assignmentId != null) ownedAssignment(owner, assignmentId);
        var lower = bound(from); var upper = bound(to);
        if (lower != null && upper != null && !lower.isBefore(upper)) throw new StudyApiException(HttpStatus.BAD_REQUEST, "INVALID_STUDY_RANGE", "Mốc từ phải trước mốc đến.");
        Specification<StudySessionEntity> filter = (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>(); predicates.add(cb.equal(root.get("userId"), owner));
            if (courseId != null) predicates.add(cb.equal(root.get("courseId"), courseId));
            if (assignmentId != null) predicates.add(cb.equal(root.get("assignmentId"), assignmentId));
            if (status != null) predicates.add(cb.equal(root.get("status"), status));
            // Intersecting half-open intervals [from,to): touching an edge is not an intersection.
            if (lower != null) predicates.add(cb.greaterThan(root.get("endsAt"), lower));
            if (upper != null) predicates.add(cb.lessThan(root.get("startsAt"), upper));
            if (semesterId != null) {
                var matching = query.subquery(UUID.class); var course = matching.from(CourseEntity.class);
                matching.select(course.get("id")).where(cb.equal(course.get("userId"), owner), cb.equal(course.get("semesterId"), semesterId));
                predicates.add(root.get("courseId").in(matching));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        return sessions.findAll(filter, Sort.by("startsAt").ascending().and(Sort.by("id").ascending())).stream().map(StudyResponse::from).toList();
    }
    @Transactional(readOnly = true)
    public StudyResponse get(UUID owner, UUID id) { return StudyResponse.from(owned(owner, id)); }
    @Transactional
    public StudyResponse create(UUID owner, StudyRequests.Create input) {
        lockOwner(owner); validateLinksAndTime(owner, input, null);
        return StudyResponse.from(sessions.saveAndFlush(StudySessionEntity.create(owner, input)));
    }
    @Transactional
    public StudyResponse update(UUID owner, UUID id, StudyRequests.Update input) {
        lockOwner(owner); var session = owned(owner, id); checkVersion(session, input.version()); validateLinksAndTime(owner, input, id);
        session.change(input); sessions.flush(); return StudyResponse.from(session);
    }
    @Transactional
    public void delete(UUID owner, UUID id, long version) {
        lockOwner(owner); var session = owned(owner, id); checkVersion(session, version); sessions.delete(session); sessions.flush();
    }
    private void validateLinksAndTime(UUID owner, StudyRequests.Schedule input, UUID excluded) {
        ownedCourse(owner, input.courseId());
        var start = StudySchedule.parse(input.startsAt()); var end = start.plusSeconds(input.durationMinutes() * 60L);
        if (input.assignmentId() != null) {
            var assignment = ownedAssignment(owner, input.assignmentId());
            if (!assignment.getCourseId().equals(input.courseId())) throw new StudyApiException(HttpStatus.CONFLICT, "STUDY_ASSIGNMENT_COURSE_MISMATCH", "Bài tập cần thuộc đúng môn của buổi tự học.");
            if (end.isAfter(assignment.getDueAt())) throw new StudyApiException(HttpStatus.CONFLICT, "STUDY_AFTER_DEADLINE", "Buổi học cần kết thúc không sau hạn nộp bài. Điều chỉnh giờ học hoặc bỏ liên kết bài tập.");
        }
        boolean overlaps = excluded == null ? sessions.overlaps(owner, start, end) : sessions.overlapsExcept(owner, start, end, excluded);
        if (overlaps) throw new StudyApiException(HttpStatus.CONFLICT, "STUDY_TIME_CONFLICT", "Khung giờ trùng một buổi tự học khác. Chọn giờ khác hoặc điều chỉnh buổi đã lưu.");
        conflicts.checkStudy(owner, start, end);
    }
    private Instant bound(String value) {
        if (value == null) return null;
        try {
            var instant = StudySchedule.parse(value);
            if (value.length() > 40 || instant.isBefore(StudySchedule.MIN) || instant.isAfter(StudySchedule.MAX)) throw new DateTimeException("Out of range");
            return instant;
        } catch (DateTimeException failure) { throw new StudyApiException(HttpStatus.BAD_REQUEST, "INVALID_STUDY_RANGE", "Khoảng lọc cần ngày giờ có múi giờ trong năm 1900–2099; mốc đến có thể là đầu năm 2100."); }
    }
    private void lockOwner(UUID owner) {
        // Same first lock as semester/course/assignment writes. Validation and commit
        // serialize per account, including the case where no overlapping row exists yet.
        users.lockForAcademicChanges(owner).orElseThrow(() -> new StudyApiException(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "Cần đăng nhập lại để tiếp tục."));
    }
    private void ownedCourse(UUID owner, UUID id) {
        courses.findByIdAndUserId(id, owner).orElseThrow(() -> new CourseApiException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy môn học."));
    }
    private AssignmentEntity ownedAssignment(UUID owner, UUID id) {
        return assignments.findByIdAndUserId(id, owner).orElseThrow(() -> new AssignmentApiException(HttpStatus.NOT_FOUND, "ASSIGNMENT_NOT_FOUND", "Không tìm thấy bài tập."));
    }
    private StudySessionEntity owned(UUID owner, UUID id) {
        return sessions.findByIdAndUserId(id, owner).orElseThrow(() -> new StudyApiException(HttpStatus.NOT_FOUND, "STUDY_SESSION_NOT_FOUND", "Không tìm thấy buổi tự học."));
    }
    private void checkVersion(StudySessionEntity session, long version) {
        if (session.getVersion() != version) throw new StudyApiException(HttpStatus.CONFLICT, "STUDY_SESSION_VERSION_CONFLICT", "Buổi tự học đã thay đổi ở nơi khác. Tải lại trước khi sửa hoặc xóa.");
    }
}
