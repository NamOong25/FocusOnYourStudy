package com.focusstudy.schedule;

import jakarta.validation.constraints.*;

public final class ClassExceptionRequests {
    private ClassExceptionRequests() { }
    private static String optional(String value) { return value == null ? null : value.strip(); }
    public record Save(
            @NotNull ClassExceptionEntity.Kind kind,
            @Pattern(regexp = "(?:[01]\\d|2[0-3]):[0-5]\\d", message = "Giờ bắt đầu cần là HH:mm.") String startTime,
            @Pattern(regexp = "(?:[01]\\d|2[0-3]):[0-5]\\d", message = "Giờ kết thúc cần là HH:mm.") String endTime,
            @Size(max = 100) String room,
            @Size(max = 200) String teacher,
            @Size(max = 1000) String reason,
            @NotNull @PositiveOrZero Long scheduleVersion) {
        public Save { startTime = optional(startTime); endTime = optional(endTime); room = optional(room); teacher = optional(teacher); reason = reason == null ? "" : reason.strip(); }
    }
}
