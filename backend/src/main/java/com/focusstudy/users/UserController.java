package com.focusstudy.users;

import com.focusstudy.auth.AuthService;
import com.focusstudy.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/users")
public class UserController {
    private final AuthService auth;
    private final UserProfileService profiles;
    public UserController(AuthService auth, UserProfileService profiles) { this.auth = auth; this.profiles = profiles; }
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfile>> me(@AuthenticationPrincipal Jwt token, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(ApiResponse.of(auth.me(UUID.fromString(token.getSubject())), request));
    }
    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserProfile>> update(@AuthenticationPrincipal Jwt token,
            @Valid @RequestBody UpdateProfileRequest input, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(ApiResponse.of(profiles.update(UUID.fromString(token.getSubject()), input), request));
    }
}
