package com.focusstudy.assignments;

import com.focusstudy.assignments.AssignmentEntity.Priority;
import com.focusstudy.assignments.AssignmentEntity.Status;
import com.focusstudy.assignments.validation.ValidDeadline;
import jakarta.validation.constraints.*;
import java.util.UUID;

public final class AssignmentRequests {
    private AssignmentRequests() { }
    private static String text(String value) { return value == null ? "" : value.strip(); }
    public record Create(
            @NotNull(message = "Chọn môn học cho bài tập.") UUID courseId,
            @NotBlank(message = "Nhập tên bài tập.") @Size(max = 200, message = "Tên bài tập tối đa 200 ký tự.") String title,
            @NotBlank(message = "Chọn ngày và giờ hạn nộp.") @Size(max = 40) @ValidDeadline String dueAt,
            Priority priority, Status status,
            @Size(max = 5000, message = "Ghi chú tối đa 5000 ký tự.") String notes) {
        public Create {
            title = text(title); dueAt = text(dueAt); notes = text(notes);
            priority = priority == null ? Priority.MEDIUM : priority; status = status == null ? Status.TODO : status;
        }
    }
    public record Update(
            @NotNull(message = "Chọn môn học cho bài tập.") UUID courseId,
            @NotBlank(message = "Nhập tên bài tập.") @Size(max = 200, message = "Tên bài tập tối đa 200 ký tự.") String title,
            @NotBlank(message = "Chọn ngày và giờ hạn nộp.") @Size(max = 40) @ValidDeadline String dueAt,
            Priority priority, Status status,
            @Size(max = 5000, message = "Ghi chú tối đa 5000 ký tự.") String notes,
            @NotNull @PositiveOrZero Long version) {
        public Update {
            title = text(title); dueAt = text(dueAt); notes = text(notes);
            priority = priority == null ? Priority.MEDIUM : priority; status = status == null ? Status.TODO : status;
        }
    }
}
