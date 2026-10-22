package com.focusstudy.auth.dto;

import com.focusstudy.auth.validation.PasswordConfirmation;
import jakarta.validation.constraints.*;
import java.util.Locale;

@PasswordConfirmation
public record RegisterRequest(
        @NotBlank(message = "Cần nhập email") @Email(message = "Email chưa hợp lệ")
        @Pattern(regexp = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", message = "Email chưa hợp lệ")
        @Size(max = 254, message = "Email không quá 254 ký tự") String email,
        @NotBlank(message = "Cần nhập mật khẩu")
        @Size(min = 8, max = 128, message = "Mật khẩu cần từ 8 đến 128 ký tự") String password,
        @NotBlank(message = "Cần xác nhận mật khẩu")
        @Size(min = 8, max = 128, message = "Mật khẩu xác nhận cần từ 8 đến 128 ký tự") String confirmPassword,
        @NotBlank(message = "Cần nhập họ tên") @Size(max = 60, message = "Họ tên không quá 60 ký tự") String fullName,
        @Size(max = 100, message = "Tên trường không quá 100 ký tự") String school,
        @Size(max = 100, message = "Ngành học không quá 100 ký tự") String major) {
    public RegisterRequest {
        email = email == null ? null : email.strip().toLowerCase(Locale.ROOT);
        fullName = fullName == null ? null : fullName.strip();
        school = school == null ? "" : school.strip();
        major = major == null ? "" : major.strip();
        // Passwords are never trimmed or normalized.
    }
    @Override public String toString() { return "RegisterRequest[redacted]"; }
}
