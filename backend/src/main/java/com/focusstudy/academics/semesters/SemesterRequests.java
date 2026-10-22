package com.focusstudy.academics.semesters;

import com.focusstudy.academics.SemesterEntity.Status;
import jakarta.validation.constraints.*;

public final class SemesterRequests {
    private SemesterRequests() { }
    public record Create(
            @NotNull @Min(value = 1, message = "Chọn học kỳ 1, 2 hoặc 3 (hè).") @Max(3) Integer term,
            @NotNull @Min(1900) @Max(2099) Integer startYear,
            @NotNull Status status,
            @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự.") String note) { }
    public record Update(
            @NotNull @Min(value = 1, message = "Chọn học kỳ 1, 2 hoặc 3 (hè).") @Max(3) Integer term,
            @NotNull @Min(1900) @Max(2099) Integer startYear,
            @NotNull Status status,
            @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự.") String note,
            @NotNull @PositiveOrZero Long version) { }
}
