package com.focusstudy.exams;

import jakarta.validation.constraints.*;
import java.util.*;

public final class ExamRequests {
    private ExamRequests() { }
    private static String text(String value) { return value == null ? "" : value.strip(); }
    private static List<Integer> reminders(Boolean enabled, List<Integer> values) {
        if (values == null) return enabled ? List.of(1440, 180) : List.of();
        return values.stream().sorted(Comparator.nullsLast(Comparator.reverseOrder())).toList();
    }
    public interface Schedule {
        UUID courseId(); ExamEntity.Kind kind(); ExamEntity.Format format(); String startsAt(); String endsAt();
        String timeZone(); String room(); Boolean reminder(); List<Integer> reminderMinutes(); String notes();
    }
    @ValidExamSchedule
    public record Create(
            @NotNull(message = "Chọn môn học cho lịch thi.") UUID courseId,
            @NotNull(message = "Chọn loại kỳ thi.") ExamEntity.Kind kind,
            @NotNull(message = "Chọn hình thức thi.") ExamEntity.Format format,
            @NotBlank(message = "Chọn ngày và giờ bắt đầu thi.") @Size(max = 40) String startsAt,
            @NotBlank(message = "Chọn ngày và giờ kết thúc thi.") @Size(max = 40) String endsAt,
            @NotBlank(message = "Chọn múi giờ của lịch thi.") @Size(max = 100) String timeZone,
            @Size(max = 100, message = "Phòng thi tối đa 100 ký tự.") String room,
            Boolean reminder,
            @Size(max = 10, message = "Tối đa 10 mốc nhắc.") List<@NotNull @Min(0) @Max(10080) Integer> reminderMinutes,
            @Size(max = 5000, message = "Ghi chú tối đa 5000 ký tự.") String notes) implements Schedule {
        public Create { startsAt = text(startsAt); endsAt = text(endsAt); timeZone = text(timeZone); room = text(room); notes = text(notes); reminder = reminder == null || reminder; reminderMinutes = reminders(reminder, reminderMinutes); }
    }
    @ValidExamSchedule
    public record Update(
            @NotNull(message = "Chọn môn học cho lịch thi.") UUID courseId,
            @NotNull(message = "Chọn loại kỳ thi.") ExamEntity.Kind kind,
            @NotNull(message = "Chọn hình thức thi.") ExamEntity.Format format,
            @NotBlank(message = "Chọn ngày và giờ bắt đầu thi.") @Size(max = 40) String startsAt,
            @NotBlank(message = "Chọn ngày và giờ kết thúc thi.") @Size(max = 40) String endsAt,
            @NotBlank(message = "Chọn múi giờ của lịch thi.") @Size(max = 100) String timeZone,
            @Size(max = 100, message = "Phòng thi tối đa 100 ký tự.") String room,
            Boolean reminder,
            @Size(max = 10, message = "Tối đa 10 mốc nhắc.") List<@NotNull @Min(0) @Max(10080) Integer> reminderMinutes,
            @Size(max = 5000, message = "Ghi chú tối đa 5000 ký tự.") String notes,
            @NotNull @PositiveOrZero Long version) implements Schedule {
        public Update { startsAt = text(startsAt); endsAt = text(endsAt); timeZone = text(timeZone); room = text(room); notes = text(notes); reminder = reminder == null || reminder; reminderMinutes = reminders(reminder, reminderMinutes); }
    }
}
