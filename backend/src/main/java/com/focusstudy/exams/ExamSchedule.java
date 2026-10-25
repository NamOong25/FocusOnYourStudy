package com.focusstudy.exams;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;

public class ExamSchedule implements ConstraintValidator<ValidExamSchedule, ExamRequests.Schedule> {
    static final Instant MIN = Instant.parse("1900-01-01T00:00:00Z"), MAX = Instant.parse("2100-01-01T00:00:00Z");
    public static Instant parse(String value) { return OffsetDateTime.parse(value, DateTimeFormatter.ISO_OFFSET_DATE_TIME).toInstant(); }
    private boolean error(ConstraintValidatorContext context, String field, String message) {
        context.disableDefaultConstraintViolation(); context.buildConstraintViolationWithTemplate(message).addPropertyNode(field).addConstraintViolation(); return false;
    }
    @Override public boolean isValid(ExamRequests.Schedule value, ConstraintValidatorContext context) {
        if (value == null) return true;
        var minutes = value.reminderMinutes();
        if (minutes != null && (new HashSet<>(minutes).size() != minutes.size() || Boolean.TRUE.equals(value.reminder()) == minutes.isEmpty()))
            return error(context, "reminderMinutes", "Bật nhắc cần ít nhất một mốc không trùng; tắt nhắc cần danh sách rỗng.");
        if (value.startsAt() == null || value.startsAt().isBlank() || value.endsAt() == null || value.endsAt().isBlank() || value.timeZone() == null || value.timeZone().isBlank()) return true;
        if (!ZoneId.getAvailableZoneIds().contains(value.timeZone())) return error(context, "timeZone", "Múi giờ chưa hợp lệ, ví dụ Asia/Ho_Chi_Minh hoặc UTC.");
        try {
            var start = parse(value.startsAt()); var end = parse(value.endsAt()); var zone = ZoneId.of(value.timeZone());
            var localStart = start.atZone(zone); var localEnd = end.atZone(zone);
            if (start.isBefore(MIN) || !end.isBefore(MAX) || localStart.getYear() < 1900 || localStart.getYear() > 2099)
                return error(context, "startsAt", "Lịch thi cần nằm trong khoảng năm 1900–2099.");
            if (!start.isBefore(end)) return error(context, "endsAt", "Giờ kết thúc thi phải sau giờ bắt đầu.");
            if (localStart.getSecond() != 0 || localStart.getNano() != 0 || localEnd.getSecond() != 0 || localEnd.getNano() != 0)
                return error(context, "startsAt", "Chọn giờ bắt đầu và kết thúc đến phút; giây/phần lẻ phải bằng 0.");
            if (!localStart.toLocalDate().equals(localEnd.toLocalDate())) return error(context, "endsAt", "Lịch thi phải kết thúc trước 24:00 cùng ngày theo múi giờ đã chọn.");
            return true;
        } catch (DateTimeException failure) { return error(context, "startsAt", "Ngày giờ cần hợp lệ và có offset, ví dụ 2026-11-10T08:00:00+07:00."); }
    }
}
