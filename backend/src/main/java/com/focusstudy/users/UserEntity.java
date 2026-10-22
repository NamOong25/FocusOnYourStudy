package com.focusstudy.users;

import com.focusstudy.common.persistence.BaseEntity;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity @Table(name = "app_users")
public class UserEntity extends BaseEntity {
    @Column(nullable = false, length = 254) private String email;
    @JsonIgnore @Column(name = "password_hash", nullable = false, length = 255) private String passwordHash;
    @Column(name = "full_name", nullable = false, length = 150) private String fullName;
    @Column(nullable = false, length = 200) private String school = "";
    @Column(nullable = false, length = 200) private String major = "";
    @Column(name = "time_zone", nullable = false, length = 60) private String timeZone = "Asia/Ho_Chi_Minh";
    protected UserEntity() { }
    public static UserEntity register(String email, String passwordHash, String fullName, String school, String major) {
        var user = new UserEntity(); user.email = email; user.passwordHash = passwordHash;
        user.fullName = fullName; user.school = school; user.major = major; return user;
    }
    public String getEmail() { return email; }
    @JsonIgnore public String getPasswordHash() { return passwordHash; }
    public String getFullName() { return fullName; }
    public String getSchool() { return school; }
    public String getMajor() { return major; }
    public String getTimeZone() { return timeZone; }
}
