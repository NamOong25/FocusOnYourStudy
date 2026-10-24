package com.focusstudy.schedule;

import jakarta.validation.constraints.*;
import java.util.*;

public final class ClassScheduleRequests {
    private ClassScheduleRequests() { }
    private static String text(String value) { return value == null ? "" : value.strip(); }
    public interface Rule {
        UUID courseId(); List<Integer> weekdays(); String startsOn(); String endsOn(); String startTime(); String endTime();
        String timeZone(); String room(); String teacher(); Integer reminderMinutes(); String notes();
    }
    @ValidClassSchedule
    public record Create(
            @NotNull UUID courseId,
            @NotNull @Size(min = 1, max = 7) List<@NotNull @Min(1) @Max(7) Integer> weekdays,
            @NotBlank @Size(max = 10) String startsOn,
            @NotBlank @Size(max = 10) String endsOn,
            @NotBlank @Size(max = 5) String startTime,
            @NotBlank @Size(max = 5) String endTime,
            @NotBlank @Size(max = 100) String timeZone,
            @Size(max = 100) String room,
            @Size(max = 200) String teacher,
            @Min(0) @Max(10080) Integer reminderMinutes,
            @Size(max = 5000) String notes) implements Rule {
        public Create { startsOn = text(startsOn); endsOn = text(endsOn); startTime = text(startTime); endTime = text(endTime);
            timeZone = text(timeZone); room = text(room); teacher = text(teacher); notes = text(notes); reminderMinutes = reminderMinutes == null ? 15 : reminderMinutes; }
    }
    @ValidClassSchedule
    public record Update(
            @NotNull UUID courseId,
            @NotNull @Size(min = 1, max = 7) List<@NotNull @Min(1) @Max(7) Integer> weekdays,
            @NotBlank @Size(max = 10) String startsOn,
            @NotBlank @Size(max = 10) String endsOn,
            @NotBlank @Size(max = 5) String startTime,
            @NotBlank @Size(max = 5) String endTime,
            @NotBlank @Size(max = 100) String timeZone,
            @Size(max = 100) String room,
            @Size(max = 200) String teacher,
            @Min(0) @Max(10080) Integer reminderMinutes,
            @Size(max = 5000) String notes,
            @NotNull @PositiveOrZero Long version) implements Rule {
        public Update { startsOn = text(startsOn); endsOn = text(endsOn); startTime = text(startTime); endTime = text(endTime);
            timeZone = text(timeZone); room = text(room); teacher = text(teacher); notes = text(notes); reminderMinutes = reminderMinutes == null ? 15 : reminderMinutes; }
    }
}
