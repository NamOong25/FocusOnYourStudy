package com.focusstudy.auth;

import org.springframework.http.HttpStatus;

public class AuthApiException extends RuntimeException {
    private final HttpStatus status;
    private final String code;
    public AuthApiException(HttpStatus status, String code, String message) {
        super(message); this.status = status; this.code = code;
    }
    public HttpStatus status() { return status; }
    public String code() { return code; }
    public static AuthApiException duplicateEmail() {
        return new AuthApiException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "Email này đã được đăng ký.");
    }
    public static AuthApiException invalidCredentials() {
        return new AuthApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email hoặc mật khẩu chưa đúng.");
    }
    public static AuthApiException invalidToken() {
        return new AuthApiException(HttpStatus.UNAUTHORIZED, "INVALID_ACCESS_TOKEN", "Phiên đăng nhập không còn hợp lệ. Hãy đăng nhập lại.");
    }
}
