package com.focusstudy.exams;

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

@RestController @RequestMapping("/api/v1/exams")
public class ExamController {
    private final ExamService service;
    public ExamController(ExamService service) { this.service = service; }
    private UUID owner(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
    @GetMapping
    public ResponseEntity<ApiResponse<List<ExamResponse>>> list(@AuthenticationPrincipal Jwt jwt, @RequestParam(required = false) UUID courseId, @RequestParam(required = false) UUID semesterId,
            @RequestParam(required = false) ExamEntity.Kind kind, @RequestParam(required = false) ExamEntity.Format format, @RequestParam(required = false) String from, @RequestParam(required = false) String to, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.list(owner(jwt), courseId, semesterId, kind, format, from, to), request));
    }
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ExamResponse>> get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, HttpServletRequest request) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.get(owner(jwt), id), request)); }
    @PostMapping
    public ResponseEntity<ApiResponse<ExamResponse>> create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ExamRequests.Create input, HttpServletRequest request) {
        var result = service.create(owner(jwt), input); return ResponseEntity.created(URI.create("/api/v1/exams/" + result.id())).cacheControl(CacheControl.noStore()).body(ApiResponse.of(result, request));
    }
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ExamResponse>> update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody ExamRequests.Update input, HttpServletRequest request) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.update(owner(jwt), id, input), request)); }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestParam @PositiveOrZero long version) { service.delete(owner(jwt), id, version); return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build(); }
}
