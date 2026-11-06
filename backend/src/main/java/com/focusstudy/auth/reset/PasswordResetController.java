package com.focusstudy.auth.reset;

import com.focusstudy.auth.AuthApiException;
import com.focusstudy.auth.session.RefreshSecrets;
import com.focusstudy.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Locale;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth/password-reset")
public class PasswordResetController {
    record ResetRequest(
            @NotBlank(message = "Cần nhập email") @Email(message = "Email chưa hợp lệ")
            @Pattern(regexp = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", message = "Email chưa hợp lệ")
            @Size(max = 254, message = "Email không quá 254 ký tự") String email) {
        ResetRequest { email = email == null ? null : email.strip().toLowerCase(Locale.ROOT); }
        @Override public String toString() { return "ResetRequest[redacted]"; }
    }

    record ResetConfirmation(String token,
            @NotBlank(message = "Cần nhập mật khẩu mới")
            @Size(min = 8, max = 128, message = "Mật khẩu mới cần từ 8 đến 128 ký tự") String newPassword,
            @NotBlank(message = "Cần xác nhận mật khẩu")
            @Size(min = 8, max = 128, message = "Mật khẩu xác nhận cần từ 8 đến 128 ký tự") String confirmPassword) {
        @Override public String toString() { return "ResetConfirmation[redacted]"; }
    }

    public record Accepted(String message) { }

    private final PasswordResetProperties settings;
    private final PasswordResetMail mail;
    private final PasswordResetService service;

    public PasswordResetController(PasswordResetProperties settings, PasswordResetMail mail, PasswordResetService service) {
        this.settings = settings;
        this.mail = mail;
        this.service = service;
    }

    @PostMapping(value = "/request", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<Accepted>> request(@Valid @RequestBody ResetRequest input, HttpServletRequest request) {
        settings.requireEnabled();
        mail.request(input.email());
        return ResponseEntity.accepted().cacheControl(CacheControl.noStore()).body(ApiResponse.of(new Accepted(
                "Nếu email có tài khoản, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu."), request));
    }

    @PostMapping(value = "/confirm", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> confirm(@Valid @RequestBody ResetConfirmation input) {
        settings.requireEnabled();
        if (!RefreshSecrets.valid(input.token())) throw PasswordResetService.invalidLink();
        if (!input.newPassword().equals(input.confirmPassword())) throw new AuthApiException(HttpStatus.BAD_REQUEST,
                "PASSWORD_CONFIRMATION_MISMATCH", "Mật khẩu xác nhận chưa trùng khớp.");
        String email = service.confirm(input.token(), input.newPassword());
        mail.notifyCompleted(email);
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }
}
