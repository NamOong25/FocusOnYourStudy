package com.focusstudy.auth;

import com.focusstudy.auth.dto.*;
import com.focusstudy.auth.session.*;
import com.focusstudy.users.*;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final RefreshSessionService sessions;
    private final String dummyHash;
    public AuthService(UserRepository users, PasswordEncoder passwords, RefreshSessionService sessions) {
        this.users = users; this.passwords = passwords; this.sessions = sessions;
        this.dummyHash = passwords.encode(UUID.randomUUID().toString());
    }

    @Transactional
    public UserProfile register(RegisterRequest request) {
        if (users.existsByEmail(request.email())) throw AuthApiException.duplicateEmail();
        var user = UserEntity.register(request.email(), passwords.encode(request.password()), request.fullName(), request.school(), request.major());
        try { return UserProfile.from(users.saveAndFlush(user)); }
        catch (DataIntegrityViolationException ex) {
            for (Throwable cause = ex; cause != null; cause = cause.getCause()) {
                if (cause instanceof org.hibernate.exception.ConstraintViolationException constraint
                        && "uq_user_email".equals(constraint.getConstraintName())) throw AuthApiException.duplicateEmail();
            }
            throw ex;
        }
    }

    public LoginResponse login(LoginRequest request, SessionTransport transport) {
        var user = users.findByEmail(request.email());
        boolean matches;
        try { matches = passwords.matches(request.password(), user.map(UserEntity::getPasswordHash).orElse(dummyHash)); }
        catch (IllegalArgumentException ex) { passwords.matches(request.password(), dummyHash); matches = false; }
        if (user.isEmpty() || !matches) throw AuthApiException.invalidCredentials();
        return sessions.start(user.get().getId(), transport);
    }

    @Transactional(readOnly = true)
    public UserProfile me(UUID userId) {
        return users.findById(userId).map(UserProfile::from).orElseThrow(AuthApiException::invalidToken);
    }
}
