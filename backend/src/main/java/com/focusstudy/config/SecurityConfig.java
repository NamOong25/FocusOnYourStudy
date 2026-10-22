package com.focusstudy.config;

import com.focusstudy.common.api.ApiProblems;
import com.focusstudy.auth.AuthRateLimiter;
import com.focusstudy.auth.AuthRateLimitFilter;
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
                                 AuthRateLimitFilter rateLimit) throws Exception {
        AuthenticationEntryPoint unauthorized = (request, response, ex) -> {
            boolean supplied = request.getHeader(HttpHeaders.AUTHORIZATION) != null;
            response.setStatus(401); response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
            json.writeValue(response.getOutputStream(), ApiProblems.of(HttpStatus.UNAUTHORIZED,
                    supplied ? "INVALID_ACCESS_TOKEN" : "AUTHENTICATION_REQUIRED",
                    supplied ? "Phiên đăng nhập không còn hợp lệ. Hãy đăng nhập lại." : "Cần đăng nhập để truy cập chức năng này.", request));
        };
        AccessDeniedHandler forbidden = (request, response, ex) -> {
            response.setStatus(403); response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            json.writeValue(response.getOutputStream(), ApiProblems.of(HttpStatus.FORBIDDEN,
                    "ACCESS_DENIED", "Bạn chưa được phép thực hiện thao tác này.", request));
        };
        return http.cors(cors -> cors.configurationSource(corsSource))
                .csrf(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/health", "/actuator/health").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/register", "/api/v1/auth/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/users/me").authenticated()
                        .anyRequest().denyAll())
                .exceptionHandling(errors -> errors.authenticationEntryPoint(unauthorized).accessDeniedHandler(forbidden))
                .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> { }).authenticationEntryPoint(unauthorized).accessDeniedHandler(forbidden))
                .addFilterBefore(rateLimit, BearerTokenAuthenticationFilter.class)
                .build();
    }

    // JSON login is handled by AuthService; never enable a generated legacy account.
    @Bean
    UserDetailsService noLegacyPasswordLogin() { return username -> { throw new UsernameNotFoundException("Use the JSON auth API"); }; }

    @Bean AuthRateLimitFilter authRateLimit(ObjectMapper json, Clock clock,
            @Value("${app.auth.rate-limit.login-per-minute}") int loginLimit,
            @Value("${app.auth.rate-limit.register-per-minute}") int registerLimit) {
        return new AuthRateLimitFilter(new AuthRateLimiter(clock, loginLimit, registerLimit, 10_000), json);
    }

    @Bean FilterRegistrationBean<AuthRateLimitFilter> preventDuplicateRateFilter(AuthRateLimitFilter filter) {
        var registration = new FilterRegistrationBean<>(filter); registration.setEnabled(false); return registration;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins}") List<String> origins) {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type", "Accept", "Authorization", "X-Request-ID"));
        config.setExposedHeaders(List.of("X-Request-ID", "Retry-After", "WWW-Authenticate"));
        config.setAllowCredentials(false);
        var source = new UrlBasedCorsConfigurationSource(); source.registerCorsConfiguration("/**", config);
        return source;
    }
}
