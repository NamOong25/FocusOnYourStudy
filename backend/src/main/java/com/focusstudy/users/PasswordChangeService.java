package com.focusstudy.users;

import com.focusstudy.auth.AuthApiException;
import com.focusstudy.auth.session.RefreshSessionRepository;
import java.time.Clock;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordChangeService {
    private final UserRepository users;
    private final RefreshSessionRepository sessions;
    private final PasswordEncoder passwords;
    private final Clock clock;
    private final PasswordCredentials credentials;
    public PasswordChangeService(UserRepository users, RefreshSessionRepository sessions, PasswordEncoder passwords, Clock clock,
            PasswordCredentials credentials) {
        this.users = users; this.sessions = sessions; this.passwords = passwords; this.clock = clock;
        this.credentials = credentials;
    }

    @Transactional
    public void change(UUID ownerId, UUID sessionId, ChangePasswordRequest input) {
        var user = users.lockForAcademicChanges(ownerId).orElseThrow(AuthApiException::invalidToken);
        // The security filter may have run before another change revoked this session.
        var now = clock.instant();
        if (!sessions.existsByIdAndUserIdAndRevokedAtIsNullAndExpiresAtAfter(sessionId, ownerId, now))
            throw AuthApiException.invalidToken();
        boolean matches;
        try { matches = passwords.matches(input.currentPassword(), user.getPasswordHash()); }
        catch (IllegalArgumentException ex) { matches = false; }
        if (!matches) throw new AuthApiException(HttpStatus.BAD_REQUEST, "CURRENT_PASSWORD_INCORRECT", "Mật khẩu hiện tại chưa đúng.");
        if (input.currentPassword().equals(input.newPassword()))
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "PASSWORD_UNCHANGED", "Mật khẩu mới cần khác mật khẩu hiện tại.");

        credentials.replace(user, input.newPassword());
    }
}
