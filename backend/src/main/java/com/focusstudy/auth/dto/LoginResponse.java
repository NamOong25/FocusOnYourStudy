package com.focusstudy.auth.dto;

import com.focusstudy.users.UserProfile;

public record LoginResponse(String accessToken, String tokenType, long expiresIn, UserProfile user) {
    @Override public String toString() { return "LoginResponse[redacted]"; }
}
