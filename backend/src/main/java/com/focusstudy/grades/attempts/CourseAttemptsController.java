package com.focusstudy.grades.attempts;

import com.focusstudy.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
public class CourseAttemptsController {
    private final CourseAttemptsService service;
    public CourseAttemptsController(CourseAttemptsService service) { this.service = service; }
    @GetMapping("/api/v1/course-attempts")
    public ResponseEntity<ApiResponse<CourseAttemptsResponse>> list(@AuthenticationPrincipal Jwt jwt, HttpServletRequest request) {
        return response(service.list(UUID.fromString(jwt.getSubject())), request);
    }
    @GetMapping("/api/v1/courses/{id}/attempts")
    public ResponseEntity<ApiResponse<CourseAttemptsResponse>> get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, HttpServletRequest request) {
        return response(service.get(UUID.fromString(jwt.getSubject()), id), request);
    }
    private ResponseEntity<ApiResponse<CourseAttemptsResponse>> response(CourseAttemptsResponse result, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(result, request));
    }
}
