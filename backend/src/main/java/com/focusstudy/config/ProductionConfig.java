package com.focusstudy.config;

import java.net.URI;
import java.nio.file.Path;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;

/** Reject incomplete production settings before creating database/security beans. */
@Configuration(proxyBeanMethods = false)
@Profile("prod")
public class ProductionConfig {
    @Bean
    static BeanFactoryPostProcessor productionSettings(Environment environment) {
        return beanFactory -> validate(environment);
    }

    static void validate(Environment env) {
        String database = required(env, "spring.datasource.url");
        if (!database.startsWith("jdbc:postgresql://")) fail("DB_URL must be a PostgreSQL JDBC URL");
        required(env, "spring.datasource.username");
        required(env, "spring.datasource.password");
        if (!"true".equalsIgnoreCase(required(env, "app.auth.session.cookie-secure")))
            fail("Production requires Secure session cookies");

        String issuer = required(env, "app.auth.jwt.issuer");
        URI issuerUri = uri(issuer, "JWT_ISSUER");
        if (!issuerUri.isAbsolute() || issuer.contains("${") || issuer.equals("urn:focus-study:local"))
            fail("JWT_ISSUER must be an explicit absolute production identifier");
        key(env, "app.auth.jwt.private-key-location");
        key(env, "app.auth.jwt.public-key-location");

        String origins = required(env, "app.cors.allowed-origins");
        for (String origin : origins.split(",", -1)) {
            URI address = https(origin.trim(), "CORS_ALLOWED_ORIGINS");
            if (!address.getRawPath().isEmpty()) fail("CORS_ALLOWED_ORIGINS must contain origins without paths or trailing slashes");
        }
        if (Boolean.parseBoolean(env.getProperty("app.auth.password-reset.enabled", "false"))) {
            https(required(env, "app.auth.password-reset.url"), "PASSWORD_RESET_URL");
            required(env, "app.auth.password-reset.from");
            required(env, "spring.mail.host");
        }

        String strategy = required(env, "server.forward-headers-strategy").toUpperCase(Locale.ROOT);
        if (!strategy.equals("NONE") && !strategy.equals("NATIVE"))
            fail("Production supports NONE or NATIVE forwarded headers with explicit trusted proxies");
        if (strategy.equals("NATIVE")) {
            String trusted = required(env, "TRUSTED_PROXY_IPS");
            try {
                Pattern pattern = Pattern.compile(trusted);
                if (pattern.matcher("198.51.100.123").matches() && pattern.matcher("203.0.113.123").matches())
                    fail("TRUSTED_PROXY_IPS must identify the actual proxy network, not every address");
            } catch (java.util.regex.PatternSyntaxException ex) {
                fail("TRUSTED_PROXY_IPS must be a valid regular expression");
            }
        }
    }

    private static void key(Environment env, String property) {
        String location = required(env, property);
        try {
            URI resource = URI.create(location);
            if (!"file".equals(resource.getScheme()) || !Path.of(resource).isAbsolute())
                fail("Production JWT keys must be mounted as absolute file: locations");
        } catch (IllegalArgumentException ex) {
            fail("Production JWT keys must be mounted as absolute file: locations");
        }
    }

    private static URI https(String value, String name) {
        URI address = uri(value, name);
        String host = address.getHost();
        if (!"https".equalsIgnoreCase(address.getScheme()) || host == null || host.contains("*")
                || address.getRawUserInfo() != null || address.getRawQuery() != null || address.getRawFragment() != null
                || host.equalsIgnoreCase("localhost") || host.endsWith(".localhost")
                || host.startsWith("127.") || host.equals("[::1]") || host.equals("0.0.0.0"))
            fail(name + " must use an explicit public HTTPS address without credentials, query or fragment");
        return address;
    }

    private static URI uri(String value, String name) {
        try { return URI.create(value); }
        catch (IllegalArgumentException ex) { throw new IllegalStateException("Production configuration: " + name + " is not a valid URI"); }
    }

    private static String required(Environment env, String property) {
        String value;
        try { value = env.getProperty(property); }
        catch (IllegalArgumentException ex) { value = null; }
        if (value == null || value.isBlank() || value.contains("${") || value.contains("replace-with-"))
            fail("Missing or placeholder setting " + property);
        return value;
    }

    private static void fail(String message) { throw new IllegalStateException("Production configuration: " + message); }
}
