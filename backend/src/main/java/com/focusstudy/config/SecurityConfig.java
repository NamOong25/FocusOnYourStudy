package com.focusstudy.config;

import com.focusstudy.common.api.ApiProblems;
import com.focusstudy.auth.AuthRateLimiter;
import com.focusstudy.auth.AuthRateLimitFilter;
import com.focusstudy.auth.session.*;
import java.time.Clock;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.csrf.*;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import tools.jackson.databind.ObjectMapper;

@Configuration
public class SecurityConfig {
    @Bean
    SecurityFilterChain security(HttpSecurity http, ObjectMapper json,
                                 @Qualifier("corsConfigurationSource") CorsConfigurationSource corsSource,
                                 AuthRateLimitFilter rateLimit, SessionValidationFilter sessionValidation,
                                 SessionProperties sessionProperties) throws Exception {
        AuthenticationEntryPoint unauthorized = (request, response, ex) -> {
            boolean supplied = request.getHeader(HttpHeaders.AUTHORIZATION) != null;
            response.setStatus(401); response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
            json.writeValue(response.getOutputStream(), ApiProblems.of(HttpStatus.UNAUTHORIZED,
                    supplied ? "INVALID_ACCESS_TOKEN" : "AUTHENTICATION_REQUIRED",
                    supplied ? "Phiên đăng nhập không còn hợp lệ. Hãy đăng nhập lại." : "Cần đăng nhập để truy cập chức năng này.", request));
        };
        AccessDeniedHandler forbidden = (request, response, ex) -> {
            boolean csrfFailure = ex instanceof CsrfException;
            response.setStatus(403); response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
            json.writeValue(response.getOutputStream(), ApiProblems.of(HttpStatus.FORBIDDEN,
                    csrfFailure ? "CSRF_INVALID" : "ACCESS_DENIED",
                    csrfFailure ? "Yêu cầu web thiếu hoặc sai mã bảo vệ CSRF. Hãy lấy mã mới rồi thử lại." : "Bạn chưa được phép thực hiện thao tác này.", request));
        };
        var csrfRepository = new CookieCsrfTokenRepository();
        csrfRepository.setCookieName(AuthTransport.CSRF_COOKIE);
        csrfRepository.setCookieCustomizer(cookie -> cookie.path(AuthTransport.COOKIE_PATH)
                .httpOnly(true).sameSite("Strict").secure(sessionProperties.cookieSecure()));
        return http.cors(cors -> cors.configurationSource(corsSource))
                // Only auth endpoints authenticate via ambient cookies. Academic
                // requests require an explicit Bearer and never authenticate by cookie.
                .csrf(csrf -> csrf.csrfTokenRepository(csrfRepository).requireCsrfProtectionMatcher(request ->
                        request.getServletPath().startsWith("/api/v1/auth/") && AuthTransport.needsCsrf(request)))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/health", "/actuator/health").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/register", "/api/v1/auth/login",
                                "/api/v1/auth/refresh", "/api/v1/auth/logout").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/auth/csrf").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/users/me").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/semesters", "/api/v1/semesters/*").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/semesters").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v1/semesters/*").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/semesters/*").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/courses", "/api/v1/courses/*").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/courses").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v1/courses/*").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/courses/*").authenticated()
                        .anyRequest().denyAll())
                .exceptionHandling(errors -> errors.authenticationEntryPoint(unauthorized).accessDeniedHandler(forbidden))
                .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> { }).authenticationEntryPoint(unauthorized).accessDeniedHandler(forbidden))
                .addFilterBefore(rateLimit, BearerTokenAuthenticationFilter.class)
                .addFilterAfter(sessionValidation, BearerTokenAuthenticationFilter.class)
                .build();
    }

    // JSON login is handled by AuthService; never enable a generated legacy account.
    @Bean
    UserDetailsService noLegacyPasswordLogin() { return username -> { throw new UsernameNotFoundException("Use the JSON auth API"); }; }

    @Bean AuthRateLimitFilter authRateLimit(ObjectMapper json, Clock clock,
            @Value("${app.auth.rate-limit.login-per-minute}") int loginLimit,
            @Value("${app.auth.rate-limit.register-per-minute}") int registerLimit,
            @Value("${app.auth.rate-limit.refresh-per-minute}") int refreshLimit,
            @Value("${app.auth.rate-limit.logout-per-minute}") int logoutLimit) {
        return new AuthRateLimitFilter(new AuthRateLimiter(clock, loginLimit, registerLimit, refreshLimit, logoutLimit, 10_000), json);
    }

    @Bean FilterRegistrationBean<AuthRateLimitFilter> preventDuplicateRateFilter(AuthRateLimitFilter filter) {
        var registration = new FilterRegistrationBean<>(filter); registration.setEnabled(false); return registration;
    }
    @Bean SessionValidationFilter sessionValidation(RefreshSessionRepository sessions, Clock clock, ObjectMapper json) {
        return new SessionValidationFilter(sessions, clock, json);
    }
    @Bean FilterRegistrationBean<SessionValidationFilter> preventDuplicateSessionFilter(SessionValidationFilter filter) {
        var registration = new FilterRegistrationBean<>(filter); registration.setEnabled(false); return registration;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins}") List<String> origins) {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type", "Accept", "Authorization", "X-Request-ID", "X-Auth-Transport", "X-XSRF-TOKEN"));
        config.setExposedHeaders(List.of("X-Request-ID", "Retry-After", "WWW-Authenticate"));
        config.setAllowCredentials(true);
        var source = new UrlBasedCorsConfigurationSource(); source.registerCorsConfiguration("/**", config);
        return source;
    }
}
