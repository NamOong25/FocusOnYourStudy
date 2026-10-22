package com.focusstudy.auth;

import com.focusstudy.common.api.ApiProblems;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import org.springframework.http.*;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

public class AuthRateLimitFilter extends OncePerRequestFilter {
    private final AuthRateLimiter limiter;
    private final ObjectMapper json;
    public AuthRateLimitFilter(AuthRateLimiter limiter, ObjectMapper json) { this.limiter = limiter; this.json = json; }
    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equals(request.getMethod()) || !("/api/v1/auth/login".equals(request.getServletPath())
                || "/api/v1/auth/register".equals(request.getServletPath()));
    }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var permit = limiter.acquire(request.getServletPath().endsWith("/register"), request.getRemoteAddr());
        if (permit.allowed()) { chain.doFilter(request, response); return; }
        response.setStatus(429); response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setHeader(HttpHeaders.RETRY_AFTER, Long.toString(permit.retryAfterSeconds()));
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        json.writeValue(response.getOutputStream(), ApiProblems.of(HttpStatus.TOO_MANY_REQUESTS,
                "AUTH_RATE_LIMITED", "Bạn đã thử nhiều lần. Chờ một chút rồi thử lại.", request));
    }
}
