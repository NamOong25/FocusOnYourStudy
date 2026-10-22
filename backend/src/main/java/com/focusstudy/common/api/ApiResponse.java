package com.focusstudy.common.api;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;

public record ApiResponse<T>(T data, Meta meta) {
    public record Meta(Instant timestamp, String requestId) { }

    public static <T> ApiResponse<T> of(T data, HttpServletRequest request) {
        return new ApiResponse<>(data, new Meta(Instant.now(), RequestIdFilter.id(request)));
    }
}
