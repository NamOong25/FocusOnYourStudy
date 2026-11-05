package com.focusstudy.users;

import com.focusstudy.auth.AuthApiException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserProfileService {
    private final UserRepository users;
    public UserProfileService(UserRepository users) { this.users = users; }

    @Transactional
    public UserProfile update(UUID owner, UpdateProfileRequest input) {
        // Share the owner lock used by academic writers; read version after waiting.
        var user = users.lockForAcademicChanges(owner).orElseThrow(AuthApiException::invalidToken);
        if (user.getVersion() != input.version()) throw new AuthApiException(HttpStatus.CONFLICT,
                "PROFILE_VERSION_CONFLICT", "Hồ sơ đã thay đổi ở nơi khác. Đọc lại hồ sơ rồi xem và lưu bản mới.");
        user.updateProfile(input.fullName(), input.school(), input.major());
        users.flush();
        return UserProfile.from(user);
    }
}
