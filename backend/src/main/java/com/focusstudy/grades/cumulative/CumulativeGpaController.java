package com.focusstudy.grades.cumulative;

import com.focusstudy.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/gpa/cumulative")
public class CumulativeGpaController {
    private final CumulativeGpaService service;
    public CumulativeGpaController(CumulativeGpaService service) { this.service = service; }
    @GetMapping
    public ResponseEntity<ApiResponse<CumulativeGpaResponse>> get(@AuthenticationPrincipal Jwt jwt, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(ApiResponse.of(service.get(UUID.fromString(jwt.getSubject())), request));
    }
}
