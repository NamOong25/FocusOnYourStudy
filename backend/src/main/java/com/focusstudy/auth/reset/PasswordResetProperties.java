package com.focusstudy.auth.reset;

import com.focusstudy.auth.AuthApiException;
import jakarta.mail.internet.AddressException;
import jakarta.mail.internet.InternetAddress;
import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.http.HttpStatus;

@ConfigurationProperties("app.auth.password-reset")
public record PasswordResetProperties(boolean enabled, URI url, String from) {
    public PasswordResetProperties {
        if (enabled) {
            if (url == null || url.getHost() == null || url.getRawUserInfo() != null
                    || url.getRawQuery() != null || url.getRawFragment() != null
                    || !("https".equalsIgnoreCase(url.getScheme())
                    || ("http".equalsIgnoreCase(url.getScheme()) && isLoopback(url.getHost()))))
                throw new IllegalArgumentException("PASSWORD_RESET_URL must be a trusted HTTPS page or a loopback HTTP page, without query or fragment");
            try {
                if (from == null || from.isBlank() || from.contains("\r") || from.contains("\n")) throw new AddressException();
                var address = new InternetAddress(from, true);
                address.validate();
                if (address.isGroup()) throw new AddressException();
            } catch (AddressException ex) {
                throw new IllegalArgumentException("PASSWORD_RESET_FROM must be a valid sender address");
            }
        }
    }

    void requireEnabled() {
        if (!enabled) throw new AuthApiException(HttpStatus.SERVICE_UNAVAILABLE,
                "PASSWORD_RESET_UNAVAILABLE", "Chức năng đặt lại mật khẩu chưa sẵn sàng. Vui lòng thử lại sau.");
    }

    static boolean isLoopback(String host) {
        return "localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host) || "::1".equals(host) || "[::1]".equals(host);
    }
}
