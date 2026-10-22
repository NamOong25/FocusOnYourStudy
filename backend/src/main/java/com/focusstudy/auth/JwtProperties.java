package com.focusstudy.auth;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.core.io.Resource;

@ConfigurationProperties("app.auth.jwt")
public record JwtProperties(String issuer, String audience, Duration accessTokenTtl,
                            Resource privateKeyLocation, Resource publicKeyLocation) {
    public JwtProperties {
        if (issuer == null || issuer.isBlank() || audience == null || audience.isBlank())
            throw new IllegalArgumentException("JWT issuer and audience are required");
        if (accessTokenTtl == null || accessTokenTtl.compareTo(Duration.ofMinutes(1)) < 0
                || accessTokenTtl.compareTo(Duration.ofMinutes(30)) > 0)
            throw new IllegalArgumentException("Access token TTL must be between 1 and 30 minutes");
        if (privateKeyLocation == null || publicKeyLocation == null)
            throw new IllegalArgumentException("JWT key locations are required");
    }
}
