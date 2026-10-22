package com.focusstudy.auth;

import com.focusstudy.auth.dto.*;
import com.focusstudy.auth.session.*;
import com.focusstudy.common.api.ApiResponse;
import com.focusstudy.users.UserProfile;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.web.csrf.CsrfToken;

@RestController @RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService service;
    private final RefreshSessionService sessions;
    private final AuthTransport transport;
    public AuthController(AuthService service, RefreshSessionService sessions, AuthTransport transport) {
        this.service = service; this.sessions = sessions; this.transport = transport;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserProfile>> register(@Valid @RequestBody RegisterRequest body, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.register(body), request));
    }
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
        var channel = transport.resolve(request);
        var tokens = transport.deliver(service.login(body, channel), channel, response);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(tokens, request));
    }
    @PostMapping(value = "/refresh", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<LoginResponse>> refresh(@Valid @RequestBody(required = false) RefreshRequest body,
            HttpServletRequest request, HttpServletResponse response) {
        var channel = transport.resolve(request);
        String secret = transport.refreshSecret(request, channel, body == null ? null : body.refreshToken());
        try {
            var tokens = transport.deliver(sessions.refresh(secret, channel), channel, response);
            return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(tokens, request));
        } catch (AuthApiException ex) {
            if (channel == SessionTransport.COOKIE && ex.status() == HttpStatus.UNAUTHORIZED) transport.clear(response);
            throw ex;
        }
    }
    @PostMapping(value = "/logout", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> logout(@Valid @RequestBody(required = false) RefreshRequest body,
            HttpServletRequest request, HttpServletResponse response) {
        var channel = transport.resolve(request);
        sessions.logout(transport.refreshSecret(request, channel, body == null ? null : body.refreshToken()), channel);
        if (channel == SessionTransport.COOKIE) transport.clear(response);
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }
    public record CsrfResponse(String headerName, String token) {
        @Override public String toString() { return "CsrfResponse[redacted]"; }
    }
    @GetMapping("/csrf")
    public ResponseEntity<ApiResponse<CsrfResponse>> csrf(CsrfToken token, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(ApiResponse.of(new CsrfResponse(token.getHeaderName(), token.getToken()), request));
    }
}
