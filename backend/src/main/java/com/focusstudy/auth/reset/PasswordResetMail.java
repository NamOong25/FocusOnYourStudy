package com.focusstudy.auth.reset;

import com.focusstudy.auth.AuthApiException;
import jakarta.annotation.PreDestroy;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
public class PasswordResetMail {
    private static final Logger LOG = LoggerFactory.getLogger(PasswordResetMail.class);
    private final PasswordResetService service;
    private final PasswordResetProperties settings;
    private final JavaMailSender sender;
    private final ThreadPoolExecutor queue = new ThreadPoolExecutor(2, 2, 0L, TimeUnit.SECONDS,
            new ArrayBlockingQueue<>(32), Thread.ofPlatform().daemon().name("password-reset-mail-", 0).factory());

    public PasswordResetMail(PasswordResetService service, PasswordResetProperties settings,
            ObjectProvider<JavaMailSender> sender, @Value("${spring.mail.host:}") String smtpHost,
            @Value("${spring.mail.properties[mail.smtp.starttls.required]:true}") boolean tlsRequired) {
        this.service = service;
        this.settings = settings;
        this.sender = settings.enabled() ? sender.getIfAvailable() : null;
        if (settings.enabled() && (smtpHost.isBlank() || this.sender == null))
            throw new IllegalArgumentException("Set RESET_SMTP_HOST when password reset is enabled");
        if (settings.enabled() && !tlsRequired && !PasswordResetProperties.isLoopback(smtpHost))
            throw new IllegalArgumentException("Password reset SMTP outside loopback requires STARTTLS");
    }

    public void request(String email) {
        try {
            // Keep account lookup and SMTP off the request thread for both existing and unknown addresses.
            queue.execute(() -> issueAndSend(email));
        } catch (RejectedExecutionException ex) {
            throw new AuthApiException(HttpStatus.SERVICE_UNAVAILABLE, "PASSWORD_RESET_UNAVAILABLE",
                    "Chức năng đặt lại mật khẩu đang bận. Vui lòng thử lại sau.");
        }
    }

    private void issueAndSend(String email) {
        try {
            service.issue(email).ifPresent(link -> send(link.email(), "Đặt lại mật khẩu FocusYourStudy", """
                    Mở liên kết sau để đặt mật khẩu mới. Liên kết dùng một lần và hết hạn sau 30 phút.

                    %s#reset-token=%s

                    Nếu bạn không yêu cầu, có thể bỏ qua thư này.
                    """.formatted(settings.url().toASCIIString(), link.token())));
        } catch (RuntimeException ex) {
            LOG.warn("Password reset request could not be processed");
        }
    }

    public void notifyCompleted(String email) {
        try {
            queue.execute(() -> {
                try {
                    send(email, "Mật khẩu FocusYourStudy đã được đặt lại", """
                            Mật khẩu của tài khoản đã được đặt lại và các phiên cũ đã đóng.
                            Nếu đây không phải thao tác của bạn, hãy kiểm tra bảo mật hộp thư và đặt lại mật khẩu.
                            """);
                } catch (RuntimeException ex) {
                    LOG.warn("Password reset completion notification could not be sent");
                }
            });
        } catch (RejectedExecutionException ex) {
            LOG.warn("Password reset completion notification queue is unavailable");
        }
    }

    private void send(String to, String subject, String text) {
        var message = new SimpleMailMessage();
        message.setFrom(settings.from());
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        sender.send(message);
    }

    @PreDestroy
    void stop() { queue.shutdownNow(); }
}
