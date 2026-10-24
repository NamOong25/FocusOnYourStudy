package com.focusstudy.schedule;

import java.time.*;
import org.springframework.http.HttpStatus;

/** Validates a single effective occurrence, including inherited start/end values. */
final class ClassExceptionRules {
    private ClassExceptionRules() { }
    static boolean scheduled(ClassScheduleEntity s, LocalDate day) {
        return !day.isBefore(s.getStartsOn()) && !day.isAfter(s.getEndsOn()) && ClassScheduleValidator.matches(s.getWeekdayMask(), day);
    }
    static void validate(ClassScheduleEntity s, ClassExceptionEntity e) {
        boolean hasOverride = e.getStartTime() != null || e.getEndTime() != null || e.getRoom() != null || e.getTeacher() != null;
        if (e.getKind() == ClassExceptionEntity.Kind.CANCELLED) {
            if (hasOverride) throw invalid("Buổi nghỉ không có giờ, phòng hoặc giảng viên thay thế. Để các trường đó null.");
            return;
        }
        if (!hasOverride) throw invalid("Buổi đổi cần ít nhất một giờ, phòng hoặc giảng viên thay thế; null nghĩa là dùng giá trị chuỗi.");
        var start = e.getStartTime() == null ? s.getStartTime() : e.getStartTime();
        var end = e.getEndTime() == null ? s.getEndTime() : e.getEndTime();
        if (!end.isAfter(start)) throw invalid("Giờ kết thúc thực tế phải sau giờ bắt đầu, trước 24:00 cùng ngày.");
        var zone = ZoneId.of(s.getTimeZone()); var a = e.getDate().atTime(start); var b = e.getDate().atTime(end);
        if (zone.getRules().getValidOffsets(a).size() != 1 || zone.getRules().getValidOffsets(b).size() != 1)
            throw invalid("Giờ đổi không tồn tại hoặc có hai lần vào " + e.getDate() + " theo múi giờ của chuỗi.");
        var from = a.atZone(zone).toInstant(); var to = b.atZone(zone).toInstant();
        if (from.isBefore(ClassScheduleValidator.MIN) || !to.isBefore(ClassScheduleValidator.MAX) || !to.isAfter(from)) throw invalid("Buổi đổi cần nằm trong năm 1900–2099 và có giờ kết thúc sau giờ bắt đầu.");
    }
    static ClassScheduleApiException invalid(String message) { return new ClassScheduleApiException(HttpStatus.BAD_REQUEST, "INVALID_CLASS_EXCEPTION", message); }
}
