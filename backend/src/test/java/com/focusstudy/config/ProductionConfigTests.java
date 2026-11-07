package com.focusstudy.config;

import static org.assertj.core.api.Assertions.*;

import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.mock.env.MockEnvironment;

class ProductionConfigTests {
    private MockEnvironment valid() {
        return new MockEnvironment()
                .withProperty("spring.datasource.url", "jdbc:postgresql://db.example.test/study?sslmode=verify-full")
                .withProperty("spring.datasource.username", "study")
                .withProperty("spring.datasource.password", "private-test-value")
                .withProperty("app.auth.jwt.issuer", "https://api.example.test")
                .withProperty("app.auth.jwt.private-key-location", Path.of("target/private.pem").toAbsolutePath().toUri().toString())
                .withProperty("app.auth.jwt.public-key-location", Path.of("target/public.pem").toAbsolutePath().toUri().toString())
                .withProperty("app.auth.session.cookie-secure", "true")
                .withProperty("app.cors.allowed-origins", "https://app.example.test,https://admin.example.test:8443")
                .withProperty("server.forward-headers-strategy", "NONE");
    }

    @Test void validProductionAndOptionalResetSettings() {
        assertThatCode(() -> ProductionConfig.validate(valid())).doesNotThrowAnyException();
        var env = valid().withProperty("app.auth.password-reset.enabled", "true")
                .withProperty("app.auth.password-reset.url", "https://app.example.test/reset")
                .withProperty("app.auth.password-reset.from", "study@example.test")
                .withProperty("spring.mail.host", "smtp.example.test");
        assertThatCode(() -> ProductionConfig.validate(env)).doesNotThrowAnyException();
    }

    @Test void missingOrUnresolvedSecretsFailWithoutLeakingValues() {
        for (String property : new String[]{"spring.datasource.url", "spring.datasource.username", "spring.datasource.password",
                "app.auth.jwt.issuer", "app.auth.jwt.private-key-location", "app.auth.jwt.public-key-location", "app.cors.allowed-origins"}) {
            for (String value : new String[]{"", "${MISSING_SECRET}", "replace-with-secret"}) {
                var env = valid().withProperty(property, value);
                assertThatThrownBy(() -> ProductionConfig.validate(env)).isInstanceOf(IllegalStateException.class)
                        .hasMessageContaining("Production configuration").hasMessageNotContaining("private-test-value");
            }
        }
    }

    @Test void rejectsInsecureCookiesAndInvalidDatabase() {
        assertThatThrownBy(() -> ProductionConfig.validate(valid().withProperty("app.auth.session.cookie-secure", "false")))
                .hasMessageContaining("Secure session cookies");
        assertThatThrownBy(() -> ProductionConfig.validate(valid().withProperty("spring.datasource.url", "jdbc:h2:mem:study")))
                .hasMessageContaining("PostgreSQL");
    }

    @Test void rejectsBroadOriginsAndLocalOrMalformedAddresses() {
        for (String origin : new String[]{"*", "https://*.example.test", "http://app.example.test", "https://localhost",
                "https://127.0.0.1", "https://[::1]", "https://app.example.test/", "https://app.example.test/path",
                "https://app.example.test?q=1", "https://app.example.test#fragment", "https://u:p@app.example.test", "https://app.example.test,"}) {
            assertThatThrownBy(() -> ProductionConfig.validate(valid().withProperty("app.cors.allowed-origins", origin)))
                    .as(origin).isInstanceOf(IllegalStateException.class);
        }
    }

    @Test void resetRequiresHttpsAndSmtpWhenEnabled() {
        for (Map.Entry<String, String> invalid : Map.of("app.auth.password-reset.url", "http://localhost:8092/",
                "app.auth.password-reset.from", "", "spring.mail.host", "").entrySet()) {
            var env = valid().withProperty("app.auth.password-reset.enabled", "true")
                    .withProperty("app.auth.password-reset.url", "https://app.example.test/")
                    .withProperty("app.auth.password-reset.from", "study@example.test")
                    .withProperty("spring.mail.host", "smtp.example.test").withProperty(invalid.getKey(), invalid.getValue());
            assertThatThrownBy(() -> ProductionConfig.validate(env)).isInstanceOf(IllegalStateException.class);
        }
    }

    @Test void keysCannotComeFromClasspathRelativePathsOrUrls() {
        for (String key : new String[]{"classpath:private.pem", "file:.local/auth/private.pem", "https://example.test/key.pem"}) {
            assertThatThrownBy(() -> ProductionConfig.validate(valid().withProperty("app.auth.jwt.private-key-location", key)))
                    .isInstanceOf(IllegalStateException.class).hasMessageContaining("absolute file:");
        }
        assertThatThrownBy(() -> ProductionConfig.validate(valid().withProperty("app.auth.jwt.issuer", "urn:focus-study:local")))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test void forwardedHeadersRequireAnExplicitLimitedProxyConfiguration() {
        var env = valid().withProperty("server.forward-headers-strategy", "NATIVE");
        assertThatThrownBy(() -> ProductionConfig.validate(env)).hasMessageContaining("TRUSTED_PROXY_IPS");
        for (String pattern : new String[]{".*", "(", ""}) {
            assertThatThrownBy(() -> ProductionConfig.validate(env.withProperty("TRUSTED_PROXY_IPS", pattern)))
                    .isInstanceOf(IllegalStateException.class);
        }
        assertThatCode(() -> ProductionConfig.validate(env.withProperty("TRUSTED_PROXY_IPS", "127\\.0\\.0\\.1")))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> ProductionConfig.validate(valid().withProperty("server.forward-headers-strategy", "FRAMEWORK")))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test void guardIsInactiveLocallyAndStopsProductionContextEarly() {
        new ApplicationContextRunner().withUserConfiguration(ProductionConfig.class)
                .run(context -> assertThat(context).hasNotFailed());
        new ApplicationContextRunner().withUserConfiguration(ProductionConfig.class)
                .withPropertyValues("spring.profiles.active=prod")
                .run(context -> assertThat(context).hasFailed().getFailure().hasMessageContaining("Production configuration"));
    }
}
