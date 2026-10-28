package com.focusstudy.focus;

import com.focusstudy.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/pomodoro-sessions")
public class PomodoroController {
    private final PomodoroService service;
    public PomodoroController(PomodoroService service) { this.service = service; }
    private UUID owner(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
    private ResponseEntity<ApiResponse<PomodoroResponse>> ok(PomodoroResponse row, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(row, request));
    }
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<PomodoroResponse>> active(@AuthenticationPrincipal Jwt jwt, HttpServletRequest request) { return ok(service.active(owner(jwt)), request); }
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PomodoroResponse>> get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, HttpServletRequest request) { return ok(service.get(owner(jwt), id), request); }
    @PostMapping
    public ResponseEntity<ApiResponse<PomodoroResponse>> start(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PomodoroRequests.Start input, HttpServletRequest request) {
        var result = service.start(owner(jwt), input);
        return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .location(URI.create("/api/v1/pomodoro-sessions/" + result.session().id())).cacheControl(CacheControl.noStore()).body(ApiResponse.of(result.session(), request));
    }
    @PostMapping("/{id}/pause")
    public ResponseEntity<ApiResponse<PomodoroResponse>> pause(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody PomodoroRequests.Transition input, HttpServletRequest request) { return ok(service.pause(owner(jwt), id, input.version()), request); }
    @PostMapping("/{id}/resume")
    public ResponseEntity<ApiResponse<PomodoroResponse>> resume(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody PomodoroRequests.Transition input, HttpServletRequest request) { return ok(service.resume(owner(jwt), id, input.version()), request); }
}
