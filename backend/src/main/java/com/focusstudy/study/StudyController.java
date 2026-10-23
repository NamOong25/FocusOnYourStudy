package com.focusstudy.study;

import com.focusstudy.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.PositiveOrZero;
import java.net.URI;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/study-sessions")
public class StudyController {
    private final StudyService service;
    public StudyController(StudyService service) { this.service = service; }
    private UUID owner(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
    @GetMapping
    public ResponseEntity<ApiResponse<List<StudyResponse>>> list(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) UUID courseId, @RequestParam(required = false) UUID semesterId,
            @RequestParam(required = false) UUID assignmentId, @RequestParam(required = false) StudySessionEntity.Status status,
            @RequestParam(required = false) String from, @RequestParam(required = false) String to, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.list(owner(jwt), courseId, semesterId, assignmentId, status, from, to), request));
    }
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StudyResponse>> get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.get(owner(jwt), id), request));
    }
    @PostMapping
    public ResponseEntity<ApiResponse<StudyResponse>> create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody StudyRequests.Create input, HttpServletRequest request) {
        var result = service.create(owner(jwt), input);
        return ResponseEntity.created(URI.create("/api/v1/study-sessions/" + result.id())).cacheControl(CacheControl.noStore()).body(ApiResponse.of(result, request));
    }
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<StudyResponse>> update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @Valid @RequestBody StudyRequests.Update input, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.update(owner(jwt), id, input), request));
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestParam @PositiveOrZero long version) {
        service.delete(owner(jwt), id, version); return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }
}
