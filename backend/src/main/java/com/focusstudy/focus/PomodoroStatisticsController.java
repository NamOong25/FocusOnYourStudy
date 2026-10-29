package com.focusstudy.focus;

import com.focusstudy.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/pomodoro-statistics")
public class PomodoroStatisticsController {
    private final PomodoroStatisticsService service;
    public PomodoroStatisticsController(PomodoroStatisticsService service) { this.service = service; }

    @GetMapping
    public ResponseEntity<ApiResponse<PomodoroStatisticsService.Statistics>> get(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String period, @RequestParam(required = false) String date,
            @RequestParam(required = false) String timeZone, @RequestParam(required = false) UUID courseId,
            @RequestParam(required = false) UUID semesterId, HttpServletRequest request) {
        var statistics = service.get(UUID.fromString(jwt.getSubject()), period, date, timeZone, courseId, semesterId);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(statistics, request));
    }
}
