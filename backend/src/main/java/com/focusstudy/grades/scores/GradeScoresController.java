package com.focusstudy.grades.scores;

import com.focusstudy.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/grade-configurations/{id}/scores")
public class GradeScoresController {
    private final GradeScoresService service;
    public GradeScoresController(GradeScoresService service) { this.service = service; }
    @GetMapping
    public ResponseEntity<ApiResponse<GradeScoresResponse>> get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.get(UUID.fromString(jwt.getSubject()), id), request));
    }
    @PutMapping
    public ResponseEntity<ApiResponse<GradeScoresResponse>> update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @Valid @RequestBody GradeScoreRequests.Update input, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.update(UUID.fromString(jwt.getSubject()), id, input), request));
    }
}
