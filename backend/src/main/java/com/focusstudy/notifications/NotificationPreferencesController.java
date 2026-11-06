package com.focusstudy.notifications;

import com.focusstudy.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notification-preferences")
public class NotificationPreferencesController {
    private final NotificationPreferencesService service;

    public NotificationPreferencesController(NotificationPreferencesService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<NotificationPreferences>> get(@AuthenticationPrincipal Jwt token, HttpServletRequest request) {
        return response(service.get(UUID.fromString(token.getSubject())), request);
    }

    @PutMapping
    public ResponseEntity<ApiResponse<NotificationPreferences>> update(@AuthenticationPrincipal Jwt token,
            @Valid @RequestBody NotificationPreferences.Update input, HttpServletRequest request) {
        return response(service.update(UUID.fromString(token.getSubject()), input), request);
    }

    private ResponseEntity<ApiResponse<NotificationPreferences>> response(NotificationPreferences value, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(value, request));
    }
}
