package com.focusstudy.schedule;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

public class ClassScheduleValidator implements ConstraintValidator<ValidClassSchedule, ClassScheduleRequests.Rule> {
    static final Instant MIN = Instant.parse("1900-01-01T00:00:00Z"), MAX = Instant.parse("2100-01-01T00:00:00Z");
    public static LocalDate date(String value) {
        if (value == null || !value.matches("\\d{4}-\\d{2}-\\d{2}")) throw new DateTimeException("Expected ISO date");
        var date = LocalDate.parse(value);
        if (date.getYear() < 1900 || date.getYear() > 2099) throw new DateTimeException("Out of range");
        return date;
    }
    private static LocalTime time(String value) {
        if (value == null || !value.matches("(?:[01]\\d|2[0-3]):[0-5]\\d")) throw new DateTimeException("Expected HH:mm");
        return LocalTime.parse(value);
    }
    static int mask(List<Integer> days) { return days.stream().mapToInt(d -> 1 << (d - 1)).reduce(0, (a, b) -> a | b); }
    static List<Integer> weekdays(int mask) { return java.util.stream.IntStream.rangeClosed(1, 7).filter(d -> (mask & (1 << (d - 1))) != 0).boxed().toList(); }
    static boolean matches(int mask, LocalDate date) { return (mask & (1 << (date.getDayOfWeek().getValue() - 1))) != 0; }
    private boolean error(ConstraintValidatorContext context, String field, String message) {
        context.disableDefaultConstraintViolation(); context.buildConstraintViolationWithTemplate(message).addPropertyNode(field).addConstraintViolation(); return false;
    }
    @Override public boolean isValid(ClassScheduleRequests.Rule v, ConstraintValidatorContext context) {
        if (v == null) return true;
        // Basic annotations report missing values and invalid day numbers separately.
        if (v.weekdays() == null || v.weekdays().isEmpty() || v.weekdays().size() > 7 || v.weekdays().stream().anyMatch(d -> d == null || d < 1 || d > 7)) return true;
        if (new HashSet<>(v.weekdays()).size() != v.weekdays().size()) return error(context, "weekdays", "Các thứ trong tuần không được lặp lại.");
        LocalDate from, to; LocalTime start, end;
        try { from = date(v.startsOn()); } catch (DateTimeException e) { return error(context, "startsOn", "Ngày bắt đầu cần là YYYY-MM-DD hợp lệ trong năm 1900–2099."); }
        try { to = date(v.endsOn()); } catch (DateTimeException e) { return error(context, "endsOn", "Ngày kết thúc cần là YYYY-MM-DD hợp lệ trong năm 1900–2099."); }
        if (to.isBefore(from) || ChronoUnit.DAYS.between(from, to) > 365) return error(context, "endsOn", "Khoảng lịch tối đa 366 ngày, ngày kết thúc không trước ngày bắt đầu.");
        try { start = time(v.startTime()); } catch (DateTimeException e) { return error(context, "startTime", "Giờ bắt đầu cần là HH:mm, theo đồng hồ 24 giờ."); }
        try { end = time(v.endTime()); } catch (DateTimeException e) { return error(context, "endTime", "Giờ kết thúc cần là HH:mm, theo đồng hồ 24 giờ."); }
        if (!end.isAfter(start)) return error(context, "endTime", "Giờ kết thúc phải sau giờ bắt đầu và trước 24:00 cùng ngày.");
        if (v.timeZone() == null || !ZoneId.getAvailableZoneIds().contains(v.timeZone())) return error(context, "timeZone", "Chọn múi giờ hợp lệ, ví dụ Asia/Ho_Chi_Minh hoặc UTC.");
        var zone = ZoneId.of(v.timeZone()); int mask = mask(v.weekdays()); boolean found = false;
        for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
            if (!matches(mask, day)) continue;
            found = true;
            var localStart = day.atTime(start); var localEnd = day.atTime(end);
            if (zone.getRules().getValidOffsets(localStart).size() != 1) return error(context, "startTime", "Giờ bắt đầu không tồn tại hoặc có hai lần vào " + day + " theo múi giờ đã chọn. Chọn khung giờ khác.");
            if (zone.getRules().getValidOffsets(localEnd).size() != 1) return error(context, "endTime", "Giờ kết thúc không tồn tại hoặc có hai lần vào " + day + " theo múi giờ đã chọn. Chọn khung giờ khác.");
            var a = localStart.atZone(zone).toInstant(); var b = localEnd.atZone(zone).toInstant();
            if (!b.isAfter(a) || a.isBefore(MIN) || !b.isBefore(MAX)) return error(context, "startsOn", "Các buổi học cần nằm trong khoảng thời điểm năm 1900–2099.");
        }
        return found || error(context, "weekdays", "Khoảng ngày đã chọn chưa có buổi nào rơi vào các thứ này.");
    }
}
