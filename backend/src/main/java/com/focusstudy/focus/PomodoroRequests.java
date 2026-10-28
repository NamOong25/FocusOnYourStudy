package com.focusstudy.focus;

import jakarta.validation.constraints.*;
import java.util.UUID;

public final class PomodoroRequests {
    private PomodoroRequests() { }
    public record Start(
            @NotNull UUID clientRequestId,
            @NotNull(message = "Chọn môn học để tập trung.") UUID courseId,
            UUID assignmentId,
            UUID studySessionId,
            @NotBlank @Size(max = 100) String timeZone) {
        public Start { timeZone = timeZone == null ? null : timeZone.strip(); }
    }
    public record Transition(@NotNull @PositiveOrZero Long version) { }
}
