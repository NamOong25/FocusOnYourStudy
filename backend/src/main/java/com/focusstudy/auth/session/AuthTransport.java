package com.focusstudy.auth.session;

import com.focusstudy.auth.AuthApiException;
import com.focusstudy.auth.dto.LoginResponse;
import jakarta.servlet.http.*;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;

@Component
public class AuthTransport {
    public static final String HEADER = "X-Auth-Transport";
    public static final String REFRESH_COOKIE = "FOCUS_REFRESH";
    public static final String CSRF_COOKIE = "FOCUS_XSRF";
    public static final String COOKIE_PATH = "/api/v1/auth";
    private final List<String> allowedOrigins;
    private final SessionProperties properties;
    private final Clock clock;

    public AuthTransport(@Value("${app.cors.allowed-origins}") List<String> allowedOrigins, SessionProperties properties, Clock clock) {
        this.allowedOrigins = allowedOrigins; this.properties = properties; this.clock = clock;
    }

    public SessionTransport resolve(HttpServletRequest request) {
        String choice = request.getHeader(HEADER), origin = request.getHeader(HttpHeaders.ORIGIN);
        if ("cookie".equals(choice)) {
            if (origin == null || !allowedOrigins.contains(origin))
                throw new AuthApiException(HttpStatus.FORBIDDEN, "AUTH_ORIGIN_REJECTED", "Nguồn yêu cầu chưa được phép dùng phiên web.");
            return SessionTransport.COOKIE;
        }
        if (choice != null && !"body".equals(choice))
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "AUTH_TRANSPORT_INVALID", "Chọn cách gửi phiên hợp lệ.");
        if (origin != null || hasCookie(request, REFRESH_COOKIE) || hasCookie(request, CSRF_COOKIE))
            throw new AuthApiException(HttpStatus.FORBIDDEN, "COOKIE_TRANSPORT_REQUIRED", "Trình duyệt cần dùng phiên cookie và bảo vệ CSRF.");
        return SessionTransport.BODY;
    }

    public String refreshSecret(HttpServletRequest request, SessionTransport transport, String bodyToken) {
        if (transport == SessionTransport.BODY) return bodyToken;
        if (bodyToken != null)
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "AUTH_TRANSPORT_INVALID", "Không gửi đồng thời refresh token qua cookie và nội dung yêu cầu.");
        if (request.getCookies() == null) return null;
        String result = null;
        for (var cookie : request.getCookies()) if (REFRESH_COOKIE.equals(cookie.getName())) {
            if (result != null) throw new AuthApiException(HttpStatus.BAD_REQUEST, "AUTH_TRANSPORT_INVALID", "Cookie phiên bị trùng. Hãy đăng nhập lại.");
            result = cookie.getValue();
        }
        return result;
    }

    public LoginResponse deliver(LoginResponse tokens, SessionTransport transport, HttpServletResponse response) {
        if (transport == SessionTransport.BODY) return tokens;
        long seconds = Math.max(0, Duration.between(clock.instant(), tokens.refreshExpiresAt()).getSeconds());
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(tokens.refreshToken(), Duration.ofSeconds(seconds)).toString());
        return tokens.withoutRefreshToken();
    }
    public void clear(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString());
    }
    private ResponseCookie cookie(String value, Duration maxAge) {
        return ResponseCookie.from(REFRESH_COOKIE, value).httpOnly(true).secure(properties.cookieSecure())
                .sameSite("Strict").path(COOKIE_PATH).maxAge(maxAge).build();
    }

    public static boolean hasCookie(HttpServletRequest request, String name) {
        return request.getCookies() != null && Arrays.stream(request.getCookies()).anyMatch(cookie -> name.equals(cookie.getName()));
    }
    public static boolean needsCsrf(HttpServletRequest request) {
        if (Set.of("GET", "HEAD", "OPTIONS", "TRACE").contains(request.getMethod())) return false;
        return request.getHeader(HttpHeaders.ORIGIN) != null || "cookie".equals(request.getHeader(HEADER))
                || hasCookie(request, REFRESH_COOKIE) || hasCookie(request, CSRF_COOKIE);
    }
}
