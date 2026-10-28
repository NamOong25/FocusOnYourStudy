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
    private final PomodoroReadService reads;
    public PomodoroController(PomodoroService service, PomodoroReadService reads) { this.service = service; this.reads = reads; }
    private UUID owner(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
    private ResponseEntity<ApiResponse<PomodoroResponse>> ok(PomodoroResponse row, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(row, request));
    }
    @GetMapping
    public ResponseEntity<ApiResponse<PomodoroReadService.History>> history(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) PomodoroEntity.Status status, @RequestParam(required = false) UUID courseId,
            @RequestParam(required = false) UUID semesterId, @RequestParam(required = false) UUID assignmentId,
            @RequestParam(required = false) UUID studySessionId, @RequestParam(required = false) String from,
            @RequestParam(required = false) String to, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(reads.history(owner(jwt), status, courseId, semesterId, assignmentId, studySessionId, from, to, page, size), request));
    }
    @GetMapping("/daily")
    public ResponseEntity<ApiResponse<PomodoroReadService.Daily>> daily(@AuthenticationPrincipal Jwt jwt, @RequestParam(required = false) String date, @RequestParam(required = false) String timeZone, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(reads.daily(owner(jwt), date, timeZone), request));
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
    @PostMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<PomodoroResponse>> complete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody PomodoroRequests.Transition input, HttpServletRequest request) { return ok(service.complete(owner(jwt), id, input.version()), request); }
    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<PomodoroResponse>> cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody PomodoroRequests.Transition input, HttpServletRequest request) { return ok(service.cancel(owner(jwt), id, input.version()), request); }
}
