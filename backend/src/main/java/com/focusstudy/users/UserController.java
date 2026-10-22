package com.focusstudy.users;

import com.focusstudy.auth.AuthService;
import com.focusstudy.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/users")
public class UserController {
    private final AuthService auth;
    public UserController(AuthService auth) { this.auth = auth; }
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfile>> me(@AuthenticationPrincipal Jwt token, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(ApiResponse.of(auth.me(UUID.fromString(token.getSubject())), request));
    }
}
