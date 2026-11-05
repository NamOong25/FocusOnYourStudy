package com.focusstudy.users;

import jakarta.validation.constraints.*;

/** Complete replacement of editable profile fields; identity comes from the Bearer. */
public record UpdateProfileRequest(
        @NotBlank(message = "Cần nhập họ tên")
        @Size(max = 60, message = "Họ tên không quá 60 ký tự") String fullName,
        @Size(max = 100, message = "Tên trường không quá 100 ký tự") String school,
        @Size(max = 100, message = "Ngành học không quá 100 ký tự") String major,
        @NotNull(message = "Cần version hồ sơ đã đọc")
        @PositiveOrZero(message = "Version không được âm")
        @Max(value = 9007199254740991L, message = "Version vượt giới hạn hợp lệ") Long version) {
    public UpdateProfileRequest {
        fullName = fullName == null ? null : fullName.strip();
        school = school == null ? "" : school.strip();
        major = major == null ? "" : major.strip();
    }
    @Override public String toString() { return "UpdateProfileRequest[redacted]"; }
}
