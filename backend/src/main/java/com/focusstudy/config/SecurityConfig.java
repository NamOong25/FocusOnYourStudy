package com.focusstudy.config;

import com.focusstudy.common.api.ApiProblems;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import tools.jackson.databind.ObjectMapper;

@Configuration
public class SecurityConfig {
    @Bean
    SecurityFilterChain security(HttpSecurity http, ObjectMapper json,
                                 @Qualifier("corsConfigurationSource") CorsConfigurationSource corsSource) throws Exception {
        return http.cors(cors -> cors.configurationSource(corsSource))
                .csrf(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/health", "/actuator/health").permitAll()
                        .anyRequest().denyAll())
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, ex) -> {
                            response.setStatus(401); response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
                            json.writeValue(response.getOutputStream(), ApiProblems.of(HttpStatus.UNAUTHORIZED,
                                    "AUTHENTICATION_REQUIRED", "Cần đăng nhập để truy cập chức năng này.", request));
                        })
                        .accessDeniedHandler((request, response, ex) -> {
                            response.setStatus(403); response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
                            json.writeValue(response.getOutputStream(), ApiProblems.of(HttpStatus.FORBIDDEN,
                                    "ACCESS_DENIED", "Bạn chưa được phép thực hiện thao tác này.", request));
                        }))
                .build();
    }

    // No generated demo password or usable account before the real authentication phase.
    @Bean
    UserDetailsService noAccountsYet() { return username -> { throw new UsernameNotFoundException("Authentication is not implemented"); }; }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins}") List<String> origins) {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type", "Accept", "Authorization", "X-Request-ID"));
        config.setExposedHeaders(List.of("X-Request-ID"));
        config.setAllowCredentials(false);
        var source = new UrlBasedCorsConfigurationSource(); source.registerCorsConfiguration("/**", config);
        return source;
    }
}
