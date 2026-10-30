package com.focusstudy.notifications;

import com.focusstudy.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notification-read-states")
public class NotificationReadController {
    private final NotificationReadService service;
    public NotificationReadController(NotificationReadService service) { this.service=service; }

    // POST carries a bounded set of keys, but the operation is strictly read-only.
    @PostMapping("/query")
    public ResponseEntity<ApiResponse<NotificationState.Snapshot>> query(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody NotificationRequests.Query input,HttpServletRequest request) {
        return response(service.query(UUID.fromString(jwt.getSubject()),input),request);
    }
    @PutMapping
    public ResponseEntity<ApiResponse<NotificationState.Snapshot>> markRead(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody NotificationRequests.MarkRead input,HttpServletRequest request) {
        return response(service.markRead(UUID.fromString(jwt.getSubject()),input),request);
    }
    private ResponseEntity<ApiResponse<NotificationState.Snapshot>> response(NotificationState.Snapshot value,HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(value,request));
    }
}
