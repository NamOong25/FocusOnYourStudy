package com.focusstudy.auth.session;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.auth.session")
public record SessionProperties(Duration absoluteTtl, Duration refreshTtl, boolean cookieSecure) {
    public SessionProperties {
        if (absoluteTtl == null || absoluteTtl.compareTo(Duration.ofDays(1)) < 0 || absoluteTtl.compareTo(Duration.ofDays(90)) > 0
                || refreshTtl == null || refreshTtl.compareTo(Duration.ofHours(1)) < 0 || refreshTtl.compareTo(absoluteTtl) > 0)
            throw new IllegalArgumentException("Session TTL must be 1–90 days; refresh TTL 1 hour up to session TTL");
    }
}
