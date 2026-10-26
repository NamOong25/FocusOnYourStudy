package com.focusstudy.grades.results;

import com.focusstudy.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/grade-configurations/{id}/result")
public class GradeResultController {
    private final GradeResultService service;
    public GradeResultController(GradeResultService service) { this.service = service; }
    @GetMapping
    public ResponseEntity<ApiResponse<GradeResultResponse>> get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.get(UUID.fromString(jwt.getSubject()), id), request));
    }
}
