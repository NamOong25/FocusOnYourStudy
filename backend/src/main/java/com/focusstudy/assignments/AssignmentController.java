package com.focusstudy.assignments;

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

@RestController @RequestMapping("/api/v1/assignments")
public class AssignmentController {
    private final AssignmentService service;
    public AssignmentController(AssignmentService service) { this.service = service; }
    private UUID owner(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
    @GetMapping
    public ResponseEntity<ApiResponse<List<AssignmentResponse>>> list(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) UUID courseId, @RequestParam(required = false) UUID semesterId,
            @RequestParam(required = false) AssignmentEntity.Status status, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.list(owner(jwt), courseId, semesterId, status), request));
    }
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AssignmentResponse>> get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.get(owner(jwt), id), request));
    }
    @PostMapping
    public ResponseEntity<ApiResponse<AssignmentResponse>> create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody AssignmentRequests.Create input, HttpServletRequest request) {
        var result = service.create(owner(jwt), input);
        return ResponseEntity.created(URI.create("/api/v1/assignments/" + result.id())).cacheControl(CacheControl.noStore()).body(ApiResponse.of(result, request));
    }
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AssignmentResponse>> update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @Valid @RequestBody AssignmentRequests.Update input, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.update(owner(jwt), id, input), request));
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestParam @PositiveOrZero long version) {
        service.delete(owner(jwt), id, version); return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }
}
