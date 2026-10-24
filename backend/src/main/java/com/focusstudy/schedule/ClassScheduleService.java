package com.focusstudy.schedule;

import com.focusstudy.academics.CourseEntity;
import com.focusstudy.academics.courses.*;
import com.focusstudy.academics.semesters.*;
import com.focusstudy.users.UserRepository;
import jakarta.persistence.criteria.Predicate;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;

@Service
public class ClassScheduleService {
    private final ClassScheduleRepository schedules;
    private final CourseRepository courses;
    private final SemesterRepository semesters;
    private final UserRepository users;
    private final ClassExceptionRepository exceptions;
    private final ScheduleConflictService conflicts;
    public ClassScheduleService(ClassScheduleRepository schedules, CourseRepository courses, SemesterRepository semesters, UserRepository users, ClassExceptionRepository exceptions, ScheduleConflictService conflicts) {
        this.schedules = schedules; this.courses = courses; this.semesters = semesters; this.users = users; this.exceptions = exceptions; this.conflicts = conflicts;
    }
    private List<ClassScheduleEntity> rows(UUID owner, UUID courseId, UUID semesterId, LocalDate from, LocalDate to) {
        if (courseId != null) ownedCourse(owner, courseId);
        if (semesterId != null) semesters.findByIdAndUserId(semesterId, owner).orElseThrow(() -> new SemesterApiException(HttpStatus.NOT_FOUND, "SEMESTER_NOT_FOUND", "Không tìm thấy học kỳ."));
        Specification<ClassScheduleEntity> filter = (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>(); predicates.add(cb.equal(root.get("userId"), owner));
            if (courseId != null) predicates.add(cb.equal(root.get("courseId"), courseId));
            if (from != null) predicates.add(cb.greaterThanOrEqualTo(root.get("endsOn"), from));
            if (to != null) predicates.add(cb.lessThanOrEqualTo(root.get("startsOn"), to));
            if (semesterId != null) {
                var matching = query.subquery(UUID.class); var course = matching.from(CourseEntity.class);
                matching.select(course.get("id")).where(cb.equal(course.get("userId"), owner), cb.equal(course.get("semesterId"), semesterId));
                predicates.add(root.get("courseId").in(matching));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        return schedules.findAll(filter, Sort.by("startsOn").ascending().and(Sort.by("startTime").ascending()).and(Sort.by("id").ascending()));
    }
    @Transactional(readOnly = true)
    public List<ClassScheduleResponse> list(UUID owner, UUID courseId, UUID semesterId, String from, String to) {
        var a = bound(from); var b = bound(to); requireRange(a, b);
        return rows(owner, courseId, semesterId, a, b).stream().map(ClassScheduleResponse::from).toList();
    }
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public List<ClassOccurrenceResponse> occurrences(UUID owner, UUID courseId, UUID semesterId, String from, String to) {
        var a = bound(from); var b = bound(to); requireRange(a, b);
        if (a == null || b == null || ChronoUnit.DAYS.between(a, b) > 91) throw range("Chọn đủ from/to; mỗi lần xem tối đa 92 ngày gồm cả hai đầu.");
        var result = new ArrayList<ClassOccurrenceResponse>();
        var rules = rows(owner, courseId, semesterId, a, b);
        var overrides = new HashMap<UUID, Map<LocalDate, ClassExceptionEntity>>();
        if (!rules.isEmpty()) for (var e : exceptions.findByUserIdAndScheduleIdInAndDateBetween(owner, rules.stream().map(ClassScheduleEntity::getId).toList(), a, b))
            overrides.computeIfAbsent(e.getScheduleId(), ignored -> new HashMap<>()).put(e.getDate(), e);
        for (var schedule : rules) {
            var start = schedule.getStartsOn().isAfter(a) ? schedule.getStartsOn() : a;
            var end = schedule.getEndsOn().isBefore(b) ? schedule.getEndsOn() : b;
            for (var day = start; !day.isAfter(end); day = day.plusDays(1)) if (ClassScheduleValidator.matches(schedule.getWeekdayMask(), day)) result.add(ClassOccurrenceResponse.from(schedule, day, overrides.getOrDefault(schedule.getId(), Map.of()).get(day)));
        }
        result.sort(Comparator.comparing(ClassOccurrenceResponse::startsAt).thenComparing(ClassOccurrenceResponse::scheduleId));
        return result;
    }
    @Transactional(readOnly = true) public ClassScheduleResponse get(UUID owner, UUID id) { return ClassScheduleResponse.from(owned(owner, id)); }
    @Transactional public ClassScheduleResponse create(UUID owner, ClassScheduleRequests.Create v) {
        lockOwner(owner); ownedCourse(owner, v.courseId()); var candidate = ClassScheduleEntity.create(owner, v);
        conflicts.checkRule(owner, candidate, List.of(), null);
        return ClassScheduleResponse.from(schedules.saveAndFlush(candidate));
    }
    @Transactional public ClassScheduleResponse update(UUID owner, UUID id, ClassScheduleRequests.Update v) {
        lockOwner(owner); var schedule = owned(owner, id); checkVersion(schedule, v.version()); ownedCourse(owner, v.courseId());
        var existing = exceptions.findByScheduleIdAndUserIdOrderByDateAsc(id, owner);
        if (!existing.isEmpty() && !schedule.getCourseId().equals(v.courseId())) throw exceptionConflict("Khôi phục các buổi đã đổi/nghỉ trước khi chuyển chuỗi sang môn khác.");
        var candidate = ClassScheduleEntity.create(owner, v);
        for (var e : existing) {
            if (!ClassExceptionRules.scheduled(candidate, e.getDate())) throw exceptionConflict("Ngày " + e.getDate() + " đang có thay đổi riêng. Khôi phục buổi đó trước khi bỏ ngày/thứ khỏi chuỗi.");
            try { ClassExceptionRules.validate(candidate, e); } catch (ClassScheduleApiException failure) { throw exceptionConflict("Thay đổi chuỗi làm buổi " + e.getDate() + " không hợp lệ: " + failure.getMessage()); }
        }
        conflicts.checkRule(owner, candidate, existing, id);
        schedule.change(v); schedules.flush(); return ClassScheduleResponse.from(schedule);
    }
    @Transactional public void delete(UUID owner, UUID id, long version) {
        lockOwner(owner); var schedule = owned(owner, id); checkVersion(schedule, version); schedules.delete(schedule); schedules.flush();
    }
    private LocalDate bound(String value) {
        if (value == null) return null;
        try { return ClassScheduleValidator.date(value); } catch (DateTimeException failure) { throw range("from/to cần là YYYY-MM-DD hợp lệ trong năm 1900–2099."); }
    }
    private void requireRange(LocalDate a, LocalDate b) { if (a != null && b != null && b.isBefore(a)) throw range("Ngày đến không được trước ngày bắt đầu."); }
    private ClassScheduleApiException range(String message) { return new ClassScheduleApiException(HttpStatus.BAD_REQUEST, "INVALID_CLASS_RANGE", message); }
    private ClassScheduleApiException exceptionConflict(String message) { return new ClassScheduleApiException(HttpStatus.CONFLICT, "CLASS_SCHEDULE_HAS_EXCEPTIONS", message); }
    private void lockOwner(UUID owner) { users.lockForAcademicChanges(owner).orElseThrow(() -> new ClassScheduleApiException(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "Cần đăng nhập lại để tiếp tục.")); }
    private void ownedCourse(UUID owner, UUID id) { courses.findByIdAndUserId(id, owner).orElseThrow(() -> new CourseApiException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy môn học.")); }
    private ClassScheduleEntity owned(UUID owner, UUID id) { return schedules.findByIdAndUserId(id, owner).orElseThrow(() -> new ClassScheduleApiException(HttpStatus.NOT_FOUND, "CLASS_SCHEDULE_NOT_FOUND", "Không tìm thấy lịch học.")); }
    private void checkVersion(ClassScheduleEntity schedule, long version) { if (schedule.getVersion() != version) throw new ClassScheduleApiException(HttpStatus.CONFLICT, "CLASS_SCHEDULE_VERSION_CONFLICT", "Lịch đã thay đổi ở nơi khác. Tải lại trước khi sửa hoặc xóa."); }
}
