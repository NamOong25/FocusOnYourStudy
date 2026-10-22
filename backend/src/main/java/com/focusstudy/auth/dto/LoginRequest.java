package com.focusstudy.auth.dto;

import jakarta.validation.constraints.*;
import java.util.Locale;

public record LoginRequest(
        @NotBlank(message = "Cần nhập email") @Email(message = "Email chưa hợp lệ")
        @Pattern(regexp = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", message = "Email chưa hợp lệ")
        @Size(max = 254, message = "Email không quá 254 ký tự") String email,
        @NotBlank(message = "Cần nhập mật khẩu")
        @Size(min = 8, max = 128, message = "Mật khẩu cần từ 8 đến 128 ký tự") String password) {
    public LoginRequest { email = email == null ? null : email.strip().toLowerCase(Locale.ROOT); }
    @Override public String toString() { return "LoginRequest[redacted]"; }
}
