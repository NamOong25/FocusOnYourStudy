package com.focusstudy.focus;

import com.focusstudy.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/pomodoro-goal")
public class PomodoroGoalController {
    private final PomodoroGoalService service;
    public PomodoroGoalController(PomodoroGoalService service) { this.service = service; }
    @GetMapping
    public ResponseEntity<ApiResponse<PomodoroGoalService.Goal>> get(@AuthenticationPrincipal Jwt jwt, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.get(UUID.fromString(jwt.getSubject())), request));
    }
    @PutMapping
    public ResponseEntity<ApiResponse<PomodoroGoalService.Goal>> save(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PomodoroRequests.Goal input, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.save(UUID.fromString(jwt.getSubject()), input), request));
    }
}
