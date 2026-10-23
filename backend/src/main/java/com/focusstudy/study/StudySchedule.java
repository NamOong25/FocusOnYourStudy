package com.focusstudy.study;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.time.*;
import java.time.format.DateTimeFormatter;

public class StudySchedule implements ConstraintValidator<ValidStudySchedule, StudyRequests.Schedule> {
    static final Instant MIN = Instant.parse("1900-01-01T00:00:00Z"), MAX = Instant.parse("2100-01-01T00:00:00Z");
    public static Instant parse(String value) { return OffsetDateTime.parse(value, DateTimeFormatter.ISO_OFFSET_DATE_TIME).toInstant(); }
    private boolean error(ConstraintValidatorContext context, String field, String message) {
        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(message).addPropertyNode(field).addConstraintViolation(); return false;
    }
    @Override public boolean isValid(StudyRequests.Schedule value, ConstraintValidatorContext context) {
        if (value == null) return true;
        if (value.startsAt() == null || value.startsAt().isBlank() || value.timeZone() == null || value.timeZone().isBlank()
                || value.durationMinutes() == null || value.durationMinutes() < 1 || value.durationMinutes() > 240) return true;
        if (!ZoneId.getAvailableZoneIds().contains(value.timeZone())) return error(context, "timeZone", "Múi giờ chưa hợp lệ. Ví dụ Asia/Ho_Chi_Minh hoặc UTC.");
        try {
            var start = parse(value.startsAt()); var end = start.plusSeconds(value.durationMinutes() * 60L);
            var localStart = start.atZone(ZoneId.of(value.timeZone())); var localEnd = end.atZone(localStart.getZone());
            if (start.isBefore(MIN) || !end.isBefore(MAX) || localStart.getYear() < 1900 || localStart.getYear() > 2099)
                return error(context, "startsAt", "Buổi học cần nằm trong khoảng năm 1900–2099.");
            if (localStart.getSecond() != 0 || localStart.getNano() != 0)
                return error(context, "startsAt", "Chọn giờ bắt đầu đến phút; giây và phần lẻ phải bằng 0.");
            if (!localStart.toLocalDate().equals(localEnd.toLocalDate()))
                return error(context, "durationMinutes", "Buổi học phải kết thúc trước 24:00 cùng ngày theo múi giờ đã chọn.");
            return true;
        } catch (DateTimeException failure) { return error(context, "startsAt", "Ngày giờ cần hợp lệ và có múi giờ, ví dụ 2026-10-30T19:00:00+07:00."); }
    }
}
