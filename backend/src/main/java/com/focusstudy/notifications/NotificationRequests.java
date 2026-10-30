package com.focusstudy.notifications;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.UUID;

public final class NotificationRequests {
    private NotificationRequests() { }
    public enum Kind { ASSIGNMENT, EXAM, CLASS }
    public record Target(@NotNull Kind kind, @NotNull UUID sourceId, String occurrenceDate) { }
    public record Query(@NotNull @Size(max = 200) List<@NotNull @Valid Target> targets) { }
    public record ReadItem(@NotNull @Valid Target target,
            @NotNull @Pattern(regexp = "[0-9a-f]{64}") String revision) { }
    public record MarkRead(@NotNull @Size(min = 1, max = 200) List<@NotNull @Valid ReadItem> items) { }
}
