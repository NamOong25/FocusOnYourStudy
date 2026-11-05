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
    private final PasswordChangeService passwords;
    public UserController(AuthService auth, UserProfileService profiles, PasswordChangeService passwords) {
        this.auth = auth; this.profiles = profiles; this.passwords = passwords;
    }
    @PutMapping("/me/password")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal Jwt token, @Valid @RequestBody ChangePasswordRequest input) {
        passwords.change(UUID.fromString(token.getSubject()), UUID.fromString(token.getClaimAsString("sid")), input);
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }
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
