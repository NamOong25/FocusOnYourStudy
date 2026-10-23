package com.focusstudy.academics.courses;

import com.focusstudy.academics.CourseEntity.Status;
import jakarta.validation.constraints.*;
import java.util.Locale;
import java.util.UUID;

public final class CourseRequests {
    private CourseRequests() { }
    private static String text(String value) { return value == null ? "" : value.strip(); }
    private static String code(String value) { return text(value).toUpperCase(Locale.ROOT); }
    public record Create(
            @NotNull UUID semesterId,
            @NotBlank @Size(max = 64) String code,
            @NotBlank @Size(max = 200) String name,
            @NotNull @Min(1) @Max(30) Integer credits,
            @Size(max = 200) String teacher,
            @Size(max = 100) String room,
            Status status,
            @Pattern(regexp = "lavender|mint|peach|blue") String color,
            @Size(max = 5000) String description) {
        public Create {
            code = CourseRequests.code(code); name = text(name); teacher = text(teacher); room = text(room); description = text(description);
            status = status == null ? Status.STUDYING : status; color = color == null ? "lavender" : color;
        }
    }
    public record Update(
            @NotNull UUID semesterId,
            @NotBlank @Size(max = 64) String code,
            @NotBlank @Size(max = 200) String name,
            @NotNull @Min(1) @Max(30) Integer credits,
            @Size(max = 200) String teacher,
            @Size(max = 100) String room,
            Status status,
            @Pattern(regexp = "lavender|mint|peach|blue") String color,
            @Size(max = 5000) String description,
            @NotNull @PositiveOrZero Long version) {
        public Update {
            code = CourseRequests.code(code); name = text(name); teacher = text(teacher); room = text(room); description = text(description);
            status = status == null ? Status.STUDYING : status; color = color == null ? "lavender" : color;
        }
    }
}
