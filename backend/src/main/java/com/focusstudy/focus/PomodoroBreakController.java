package com.focusstudy.focus;

import com.focusstudy.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/pomodoro-break")
public class PomodoroBreakController {
    public record Command(@NotNull PomodoroBreakService.Action action, PomodoroBreakService.Kind kind,
                          @NotNull @PositiveOrZero Long version) { }
    private final PomodoroBreakService service;
    public PomodoroBreakController(PomodoroBreakService service) { this.service = service; }

    @GetMapping
    public ResponseEntity<ApiResponse<PomodoroBreakService.Snapshot>> get(@AuthenticationPrincipal Jwt jwt, HttpServletRequest request) {
        return response(service.get(UUID.fromString(jwt.getSubject())), request);
    }

    @PutMapping
    public ResponseEntity<ApiResponse<PomodoroBreakService.Snapshot>> change(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody Command command, HttpServletRequest request) {
        return response(service.change(UUID.fromString(jwt.getSubject()), command.action(), command.kind(), command.version()), request);
    }

    private ResponseEntity<ApiResponse<PomodoroBreakService.Snapshot>> response(PomodoroBreakService.Snapshot result, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(result, request));
    }
}
