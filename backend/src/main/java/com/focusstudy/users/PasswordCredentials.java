package com.focusstudy.users;

import com.focusstudy.auth.reset.PasswordResetTokens;
import com.focusstudy.auth.session.RefreshSessionRepository;
import java.time.Clock;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordCredentials {
    private final UserRepository users;
    private final RefreshSessionRepository sessions;
    private final PasswordResetTokens resetTokens;
    private final PasswordEncoder passwords;
    private final Clock clock;

    public PasswordCredentials(UserRepository users, RefreshSessionRepository sessions, PasswordResetTokens resetTokens,
            PasswordEncoder passwords, Clock clock) {
        this.users = users;
        this.sessions = sessions;
        this.resetTokens = resetTokens;
        this.passwords = passwords;
        this.clock = clock;
    }

    // Both callers hold the owner lock before reading credentials or locking session rows.
    @Transactional(propagation = Propagation.MANDATORY)
    public void replace(UserEntity lockedOwner, String newPassword) {
        var active = sessions.lockUnrevokedByUserId(lockedOwner.getId());
        lockedOwner.changePasswordHash(passwords.encode(newPassword));
        var now = clock.instant();
        active.forEach(session -> session.revoke(now, "PASSWORD_CHANGED"));
        resetTokens.invalidate(lockedOwner.getId());
        users.flush();
    }
}
