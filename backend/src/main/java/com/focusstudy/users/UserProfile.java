package com.focusstudy.users;

import java.util.UUID;

public record UserProfile(UUID id, String email, String fullName, String school, String major, String timeZone) {
    public static UserProfile from(UserEntity user) {
        return new UserProfile(user.getId(), user.getEmail(), user.getFullName(), user.getSchool(), user.getMajor(), user.getTimeZone());
    }
}
