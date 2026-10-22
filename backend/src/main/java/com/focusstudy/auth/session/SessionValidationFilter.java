package com.focusstudy.auth.session;

import com.focusstudy.common.api.ApiProblems;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.time.Clock;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.http.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

public class SessionValidationFilter extends OncePerRequestFilter {
    private final RefreshSessionRepository sessions;
    private final Clock clock;
    private final ObjectMapper json;
    public SessionValidationFilter(RefreshSessionRepository sessions, Clock clock, ObjectMapper json) {
        this.sessions = sessions; this.clock = clock; this.json = json;
    }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() instanceof JwtAuthenticationToken authentication) {
            var token = authentication.getToken();
            boolean active;
            try {
                active = sessions.existsByIdAndUserIdAndRevokedAtIsNullAndExpiresAtAfter(
                        UUID.fromString(token.getClaimAsString("sid")), UUID.fromString(token.getSubject()), clock.instant());
            } catch (DataAccessException ex) {
                fail(request, response, HttpStatus.SERVICE_UNAVAILABLE, "DATABASE_UNAVAILABLE", "Chưa kết nối được dữ liệu. Hãy thử lại sau."); return;
            }
            if (!active) {
                SecurityContextHolder.clearContext();
                response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
                fail(request, response, HttpStatus.UNAUTHORIZED, "INVALID_ACCESS_TOKEN", "Phiên đăng nhập không còn hợp lệ. Hãy đăng nhập lại."); return;
            }
        }
        chain.doFilter(request, response);
    }
    private void fail(HttpServletRequest request, HttpServletResponse response, HttpStatus status, String code, String detail) throws IOException {
        response.setStatus(status.value()); response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        json.writeValue(response.getOutputStream(), ApiProblems.of(status, code, detail, request));
    }
}
