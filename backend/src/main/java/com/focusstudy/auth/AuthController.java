package com.focusstudy.auth;

import com.focusstudy.auth.dto.*;
import com.focusstudy.common.api.ApiResponse;
import com.focusstudy.users.UserProfile;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService service;
    public AuthController(AuthService service) { this.service = service; }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserProfile>> register(@Valid @RequestBody RegisterRequest body, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.register(body), request));
    }
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest body, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.login(body), request));
    }
}
