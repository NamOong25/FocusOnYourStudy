package com.focusstudy.grades.semester;

import com.focusstudy.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/semesters/{id}/gpa")
public class SemesterGpaController {
    private final SemesterGpaService service;
    public SemesterGpaController(SemesterGpaService service) { this.service = service; }
    @GetMapping
    public ResponseEntity<ApiResponse<SemesterGpaResponse>> get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.get(UUID.fromString(jwt.getSubject()), id), request));
    }
}
