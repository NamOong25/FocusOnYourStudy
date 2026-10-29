package com.focusstudy.assignments.statistics;

import com.focusstudy.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/assignment-statistics")
public class AssignmentStatisticsController {
    private final AssignmentStatisticsService service;
    public AssignmentStatisticsController(AssignmentStatisticsService service) { this.service = service; }

    @GetMapping
    public ResponseEntity<ApiResponse<AssignmentStatisticsService.Statistics>> get(@AuthenticationPrincipal Jwt jwt,
            @RequestParam UUID semesterId, @RequestParam(required = false) UUID courseId,
            @RequestParam(required = false) String timeZone, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(
                service.get(UUID.fromString(jwt.getSubject()), semesterId, courseId, timeZone), request));
    }
}
