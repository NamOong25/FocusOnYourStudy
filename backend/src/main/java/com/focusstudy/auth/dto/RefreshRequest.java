package com.focusstudy.auth.dto;

import jakarta.validation.constraints.Pattern;

public record RefreshRequest(
        @Pattern(regexp = "[A-Za-z0-9_-]{43}", message = "Refresh token chưa hợp lệ") String refreshToken) {
    @Override public String toString() { return "RefreshRequest[redacted]"; }
}
