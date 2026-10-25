package com.focusstudy.grades.configuration;

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

@RestController @RequestMapping("/api/v1")
public class GradeConfigurationController {
    private final GradeConfigurationService service;
    public GradeConfigurationController(GradeConfigurationService service) { this.service = service; }
    private UUID owner(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
    @GetMapping("/grade-configurations")
    public ResponseEntity<ApiResponse<List<GradeConfigurationResponse>>> list(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) UUID courseId, @RequestParam(required = false) UUID semesterId, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.list(owner(jwt), courseId, semesterId), request));
    }
    @GetMapping("/grade-configurations/{id}")
    public ResponseEntity<ApiResponse<GradeConfigurationResponse>> get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.get(owner(jwt), id), request));
    }
    @GetMapping("/courses/{courseId}/grade-configuration")
    public ResponseEntity<ApiResponse<GradeConfigurationResponse>> forCourse(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID courseId, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.forCourse(owner(jwt), courseId), request));
    }
    @PostMapping("/courses/{courseId}/grade-configuration")
    public ResponseEntity<ApiResponse<GradeConfigurationResponse>> create(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID courseId,
            @Valid @RequestBody GradeConfigurationRequests.Create input, HttpServletRequest request) {
        var result = service.create(owner(jwt), courseId, input);
        return ResponseEntity.created(URI.create("/api/v1/grade-configurations/" + result.id())).cacheControl(CacheControl.noStore()).body(ApiResponse.of(result, request));
    }
    @PutMapping("/grade-configurations/{id}")
    public ResponseEntity<ApiResponse<GradeConfigurationResponse>> update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @Valid @RequestBody GradeConfigurationRequests.Update input, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.update(owner(jwt), id, input), request));
    }
    @DeleteMapping("/grade-configurations/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestParam @PositiveOrZero long version) {
        service.delete(owner(jwt), id, version); return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }
}
