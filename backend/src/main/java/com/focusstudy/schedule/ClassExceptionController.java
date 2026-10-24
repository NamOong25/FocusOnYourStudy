package com.focusstudy.schedule;

import com.focusstudy.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/class-schedules/{scheduleId}/exceptions")
public class ClassExceptionController {
    private final ClassExceptionService service;
    public ClassExceptionController(ClassExceptionService service) { this.service = service; }
    private UUID owner(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
    @GetMapping public ResponseEntity<ApiResponse<List<ClassExceptionResponse>>> list(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID scheduleId, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.list(owner(jwt), scheduleId), request));
    }
    @GetMapping("/{date}") public ResponseEntity<ApiResponse<ClassExceptionResponse>> get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID scheduleId, @PathVariable String date, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.get(owner(jwt), scheduleId, date), request));
    }
    @PutMapping("/{date}") public ResponseEntity<ApiResponse<ClassExceptionResponse>> save(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID scheduleId, @PathVariable String date, @Valid @RequestBody ClassExceptionRequests.Save input, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.save(owner(jwt), scheduleId, date, input), request));
    }
    @DeleteMapping("/{date}") public ResponseEntity<Void> restore(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID scheduleId, @PathVariable String date, @RequestParam @PositiveOrZero long scheduleVersion) {
        service.restore(owner(jwt), scheduleId, date, scheduleVersion); return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }
}
