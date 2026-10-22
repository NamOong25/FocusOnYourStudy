package com.focusstudy.auth.dto;

import com.focusstudy.users.UserProfile;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;

public record LoginResponse(String accessToken, String tokenType, long expiresIn, UserProfile user,
        @JsonInclude(JsonInclude.Include.NON_NULL) String refreshToken, Instant refreshExpiresAt, Instant sessionExpiresAt) {
    public LoginResponse withoutRefreshToken() {
        return new LoginResponse(accessToken, tokenType, expiresIn, user, null, refreshExpiresAt, sessionExpiresAt);
    }
    @Override public String toString() { return "LoginResponse[redacted]"; }
}
