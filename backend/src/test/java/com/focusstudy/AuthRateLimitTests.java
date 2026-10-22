package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import com.focusstudy.auth.*;
import com.focusstudy.common.api.RequestIdFilter;
import java.time.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import tools.jackson.databind.json.JsonMapper;

class AuthRateLimitTests {
    static class TestClock extends Clock {
        long time; public ZoneId getZone() { return ZoneOffset.UTC; }
        public Clock withZone(ZoneId zone) { return this; }
        public Instant instant() { return Instant.ofEpochMilli(time); }
    }
    @Test void countsRoutesIndependentlyAndResetsAtWindowBoundary() {
        var clock = new TestClock(); var limiter = new AuthRateLimiter(clock, 2, 1, 10);
        assertThat(limiter.acquire(false, "a").allowed()).isTrue();
        assertThat(limiter.acquire(false, "a").allowed()).isTrue();
        assertThat(limiter.acquire(false, "a").allowed()).isFalse();
        assertThat(limiter.acquire(true, "a").allowed()).isTrue();
        clock.time = 59_001; assertThat(limiter.acquire(true, "a").retryAfterSeconds()).isEqualTo(1);
        clock.time = 60_000; assertThat(limiter.acquire(false, "a").allowed()).isTrue();
    }
    @Test void doesNotGrowPastCapacityAndReclaimsExpiredKeys() {
        var clock = new TestClock(); var limiter = new AuthRateLimiter(clock, 2, 2, 1);
        assertThat(limiter.acquire(false, "a").allowed()).isTrue();
        assertThat(limiter.acquire(false, "b").allowed()).isFalse();
        clock.time = 60_000; assertThat(limiter.acquire(false, "b").allowed()).isTrue();
    }
    @Test void actualFilterReturns429AndIgnoresSpoofedForwardedAddresses() throws Exception {
        var clock = new TestClock(); var filter = new AuthRateLimitFilter(new AuthRateLimiter(clock, 1, 1, 10), JsonMapper.builder().build());
        var passed = new AtomicInteger();
        for (int i = 0; i < 2; i++) {
            var request = new MockHttpServletRequest("POST", "/api/v1/auth/login"); request.setServletPath("/api/v1/auth/login");
            request.setRemoteAddr("127.0.0.1"); request.addHeader("X-Forwarded-For", "198.51.100." + i);
            request.setAttribute(RequestIdFilter.ATTRIBUTE, "rate-test");
            var response = new MockHttpServletResponse(); filter.doFilter(request, response, (req, res) -> passed.incrementAndGet());
            if (i == 1) {
                assertThat(response.getStatus()).isEqualTo(429);
                assertThat(response.getHeader("Retry-After")).isEqualTo("60");
                assertThat(response.getContentAsString()).contains("AUTH_RATE_LIMITED", "rate-test");
            }
        }
        assertThat(passed.get()).isEqualTo(1);
    }
    @Test void corsPreflightDoesNotConsumeALoginAttempt() throws Exception {
        var filter = new AuthRateLimitFilter(new AuthRateLimiter(Clock.systemUTC(), 1, 1, 10), JsonMapper.builder().build());
        var passed = new AtomicInteger(); var request = new MockHttpServletRequest("OPTIONS", "/api/v1/auth/login");
        request.setServletPath("/api/v1/auth/login");
        filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> passed.incrementAndGet());
        assertThat(passed.get()).isEqualTo(1);
    }
    @Test void refreshAndLogoutHaveSeparateLimitsAndTheFilterCoversBothRoutes() throws Exception {
        var clock = new TestClock();
        var limiter = new AuthRateLimiter(clock, 1, 1, 1, 2, 10);
        assertThat(limiter.acquire("refresh", "a").allowed()).isTrue();
        assertThat(limiter.acquire("refresh", "a").allowed()).isFalse();
        assertThat(limiter.acquire("logout", "a").allowed()).isTrue();
        assertThat(limiter.acquire("logout", "a").allowed()).isTrue();
        assertThat(limiter.acquire("logout", "a").allowed()).isFalse();
        assertThat(limiter.acquire("login", "a").allowed()).isTrue();
        for (String route : java.util.List.of("refresh", "logout")) {
            var filter = new AuthRateLimitFilter(new AuthRateLimiter(clock, 1, 1, 1, 1, 10), JsonMapper.builder().build());
            for (int i = 0; i < 2; i++) {
                var request = new MockHttpServletRequest("POST", "/api/v1/auth/" + route);
                request.setServletPath("/api/v1/auth/" + route);
                var response = new MockHttpServletResponse();
                filter.doFilter(request, response, (req, res) -> { });
                assertThat(response.getStatus()).isEqualTo(i == 0 ? 200 : 429);
            }
        }
    }
}
