package com.focusstudy.schedule;

import com.focusstudy.users.UserRepository;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class ClassExceptionService {
    private final ClassExceptionRepository exceptions;
    private final ClassScheduleRepository schedules;
    private final UserRepository users;
    private final ScheduleConflictService conflicts;
    public ClassExceptionService(ClassExceptionRepository exceptions, ClassScheduleRepository schedules, UserRepository users, ScheduleConflictService conflicts) { this.exceptions = exceptions; this.schedules = schedules; this.users = users; this.conflicts = conflicts; }
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public List<ClassExceptionResponse> list(UUID owner, UUID scheduleId) {
        var s = owned(owner, scheduleId);
        return exceptions.findByScheduleIdAndUserIdOrderByDateAsc(scheduleId, owner).stream().map(e -> ClassExceptionResponse.from(e, s.getVersion())).toList();
    }
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public ClassExceptionResponse get(UUID owner, UUID scheduleId, String date) {
        var s = owned(owner, scheduleId); var day = occurrence(s, date);
        return ClassExceptionResponse.from(exception(owner, scheduleId, day), s.getVersion());
    }
    @Transactional
    public ClassExceptionResponse save(UUID owner, UUID scheduleId, String date, ClassExceptionRequests.Save input) {
        lockOwner(owner); var s = owned(owner, scheduleId); checkVersion(s, input.scheduleVersion()); var day = occurrence(s, date);
        var candidate = ClassExceptionEntity.create(owner, scheduleId, day); candidate.change(input); ClassExceptionRules.validate(s, candidate);
        conflicts.checkOccurrence(owner, s, day, candidate);
        var value = exceptions.findByScheduleIdAndUserIdAndDate(scheduleId, owner, day).orElseGet(() -> ClassExceptionEntity.create(owner, scheduleId, day));
        value.change(input);
        exceptions.saveAndFlush(value); s.markExceptionChange(); schedules.flush();
        return ClassExceptionResponse.from(value, s.getVersion());
    }
    @Transactional
    public void restore(UUID owner, UUID scheduleId, String date, long scheduleVersion) {
        lockOwner(owner); var s = owned(owner, scheduleId); checkVersion(s, scheduleVersion); var day = occurrence(s, date);
        var value = exception(owner, scheduleId, day); conflicts.checkOccurrence(owner, s, day, null);
        exceptions.delete(value); exceptions.flush(); s.markExceptionChange(); schedules.flush();
    }
    private ClassScheduleEntity owned(UUID owner, UUID id) { return schedules.findByIdAndUserId(id, owner).orElseThrow(() -> new ClassScheduleApiException(HttpStatus.NOT_FOUND, "CLASS_SCHEDULE_NOT_FOUND", "Không tìm thấy lịch học.")); }
    private ClassExceptionEntity exception(UUID owner, UUID id, LocalDate day) { return exceptions.findByScheduleIdAndUserIdAndDate(id, owner, day).orElseThrow(() -> new ClassScheduleApiException(HttpStatus.NOT_FOUND, "CLASS_EXCEPTION_NOT_FOUND", "Buổi này không có thay đổi riêng để đọc hoặc khôi phục.")); }
    private LocalDate occurrence(ClassScheduleEntity s, String date) {
        LocalDate day;
        try { day = ClassScheduleValidator.date(date); } catch (DateTimeException failure) { throw new ClassScheduleApiException(HttpStatus.BAD_REQUEST, "INVALID_CLASS_DATE", "Ngày buổi học cần là YYYY-MM-DD hợp lệ trong năm 1900–2099."); }
        if (!ClassExceptionRules.scheduled(s, day)) throw new ClassScheduleApiException(HttpStatus.NOT_FOUND, "CLASS_OCCURRENCE_NOT_FOUND", "Ngày này không thuộc các buổi của chuỗi lịch.");
        return day;
    }
    private void checkVersion(ClassScheduleEntity s, long version) { if (s.getVersion() != version) throw new ClassScheduleApiException(HttpStatus.CONFLICT, "CLASS_SCHEDULE_VERSION_CONFLICT", "Lịch hoặc một buổi đã được sửa ở nơi khác. Tải lại trước khi đổi hoặc khôi phục."); }
    private void lockOwner(UUID owner) { users.lockForAcademicChanges(owner).orElseThrow(() -> new ClassScheduleApiException(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "Cần đăng nhập lại để tiếp tục.")); }
}
