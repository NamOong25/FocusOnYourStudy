package com.focusstudy.study;

import com.focusstudy.study.StudySessionEntity.Status;
import jakarta.validation.constraints.*;
import java.util.UUID;

public final class StudyRequests {
    private StudyRequests() { }
    private static String text(String value) { return value == null ? "" : value.strip(); }
    public interface Schedule {
        UUID courseId(); UUID assignmentId(); String title(); String startsAt(); String timeZone();
        Integer durationMinutes(); Status status(); String notes();
    }
    @ValidStudySchedule
    public record Create(
            @NotNull(message = "Chọn môn học cho buổi tự học.") UUID courseId,
            UUID assignmentId,
            @NotBlank(message = "Nhập nội dung tự học.") @Size(max = 200, message = "Nội dung tự học tối đa 200 ký tự.") String title,
            @NotBlank(message = "Chọn ngày và giờ bắt đầu.") @Size(max = 40) String startsAt,
            @NotBlank(message = "Chọn múi giờ của buổi học.") @Size(max = 100) String timeZone,
            @NotNull @Min(value = 1, message = "Thời lượng ít nhất 1 phút.") @Max(value = 240, message = "Thời lượng tối đa 240 phút.") Integer durationMinutes,
            Status status,
            @Size(max = 5000, message = "Ghi chú tối đa 5000 ký tự.") String notes) implements Schedule {
        public Create { title = text(title); startsAt = text(startsAt); timeZone = text(timeZone); notes = text(notes); status = status == null ? Status.PLANNED : status; }
    }
    @ValidStudySchedule
    public record Update(
            @NotNull(message = "Chọn môn học cho buổi tự học.") UUID courseId,
            UUID assignmentId,
            @NotBlank(message = "Nhập nội dung tự học.") @Size(max = 200, message = "Nội dung tự học tối đa 200 ký tự.") String title,
            @NotBlank(message = "Chọn ngày và giờ bắt đầu.") @Size(max = 40) String startsAt,
            @NotBlank(message = "Chọn múi giờ của buổi học.") @Size(max = 100) String timeZone,
            @NotNull @Min(value = 1, message = "Thời lượng ít nhất 1 phút.") @Max(value = 240, message = "Thời lượng tối đa 240 phút.") Integer durationMinutes,
            Status status,
            @Size(max = 5000, message = "Ghi chú tối đa 5000 ký tự.") String notes,
            @NotNull @PositiveOrZero Long version) implements Schedule {
        public Update { title = text(title); startsAt = text(startsAt); timeZone = text(timeZone); notes = text(notes); status = status == null ? Status.PLANNED : status; }
    }
}
