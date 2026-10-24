package com.focusstudy.schedule;

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

@RestController @RequestMapping("/api/v1/class-schedules")
public class ClassScheduleController {
    private final ClassScheduleService service;
    public ClassScheduleController(ClassScheduleService service) { this.service = service; }
    private UUID owner(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
    @GetMapping public ResponseEntity<ApiResponse<List<ClassScheduleResponse>>> list(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) UUID courseId, @RequestParam(required = false) UUID semesterId,
            @RequestParam(required = false) String from, @RequestParam(required = false) String to, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.list(owner(jwt), courseId, semesterId, from, to), request));
    }
    @GetMapping("/occurrences") public ResponseEntity<ApiResponse<List<ClassOccurrenceResponse>>> occurrences(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) UUID courseId, @RequestParam(required = false) UUID semesterId,
            @RequestParam String from, @RequestParam String to, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.occurrences(owner(jwt), courseId, semesterId, from, to), request));
    }
    @GetMapping("/{id}") public ResponseEntity<ApiResponse<ClassScheduleResponse>> get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.get(owner(jwt), id), request));
    }
    @PostMapping public ResponseEntity<ApiResponse<ClassScheduleResponse>> create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ClassScheduleRequests.Create input, HttpServletRequest request) {
        var result = service.create(owner(jwt), input); return ResponseEntity.created(URI.create("/api/v1/class-schedules/" + result.id())).cacheControl(CacheControl.noStore()).body(ApiResponse.of(result, request));
    }
    @PutMapping("/{id}") public ResponseEntity<ApiResponse<ClassScheduleResponse>> update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody ClassScheduleRequests.Update input, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.update(owner(jwt), id, input), request));
    }
    @DeleteMapping("/{id}") public ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestParam @PositiveOrZero long version) {
        service.delete(owner(jwt), id, version); return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }
}
