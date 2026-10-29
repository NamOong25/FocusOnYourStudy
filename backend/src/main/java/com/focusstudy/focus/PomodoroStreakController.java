package com.focusstudy.focus;

import com.focusstudy.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/pomodoro-streak")
public class PomodoroStreakController {
    private final PomodoroStreakService service;
    public PomodoroStreakController(PomodoroStreakService service) { this.service = service; }

    @GetMapping
    public ResponseEntity<ApiResponse<PomodoroStreakService.Streak>> get(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String month, @RequestParam(required = false) String timeZone, HttpServletRequest request) {
        var value = service.get(UUID.fromString(jwt.getSubject()), month, timeZone);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(value, request));
    }
}
