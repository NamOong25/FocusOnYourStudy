package com.focusstudy.users;

import jakarta.validation.constraints.*;

public record ChangePasswordRequest(
        @NotBlank(message = "Cần nhập mật khẩu hiện tại")
        @Size(max = 128, message = "Mật khẩu hiện tại không quá 128 ký tự") String currentPassword,
        @NotBlank(message = "Cần nhập mật khẩu mới")
        @Size(min = 8, max = 128, message = "Mật khẩu mới cần từ 8 đến 128 ký tự") String newPassword) {
    // Passwords must not be trimmed, normalized, or included in diagnostic text.
    @Override public String toString() { return "ChangePasswordRequest[redacted]"; }
}
