package com.focusstudy.auth.reset;

import com.focusstudy.auth.AuthApiException;
import com.focusstudy.auth.session.RefreshSecrets;
import com.focusstudy.users.PasswordCredentials;
import com.focusstudy.users.UserRepository;
import java.time.Clock;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordResetService {
    record IssuedLink(String email, String token) {
        @Override public String toString() { return "IssuedLink[redacted]"; }
    }

    private final UserRepository users;
    private final PasswordResetTokens tokens;
    private final PasswordCredentials credentials;
    private final Clock clock;

    public PasswordResetService(UserRepository users, PasswordResetTokens tokens, PasswordCredentials credentials, Clock clock) {
        this.users = users;
        this.tokens = tokens;
        this.credentials = credentials;
        this.clock = clock;
    }

    @Transactional
    public Optional<IssuedLink> issue(String email) {
        return users.lockByEmail(email).flatMap(owner -> {
            String token = RefreshSecrets.generate();
            if (!tokens.issue(owner.getId(), RefreshSecrets.hash(token), clock.instant())) return Optional.empty();
            return Optional.of(new IssuedLink(owner.getEmail(), token));
        });
    }

    @Transactional
    public String confirm(String token, String newPassword) {
        String hash = RefreshSecrets.hash(token);
        var ownerId = tokens.ownerOf(hash, clock.instant()).orElseThrow(PasswordResetService::invalidLink);
        var owner = users.lockForAcademicChanges(ownerId).orElseThrow(PasswordResetService::invalidLink);
        // A competing request or password change can replace this link while we wait for the owner lock.
        if (tokens.ownerOf(hash, clock.instant()).filter(ownerId::equals).isEmpty()) throw invalidLink();
        credentials.replace(owner, newPassword);
        return owner.getEmail();
    }

    static AuthApiException invalidLink() {
        return new AuthApiException(HttpStatus.BAD_REQUEST, "PASSWORD_RESET_LINK_INVALID",
                "Liên kết đã hết hạn hoặc không còn hiệu lực. Hãy yêu cầu một liên kết mới.");
    }
}
