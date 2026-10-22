package com.focusstudy.users;

import com.focusstudy.common.persistence.BaseEntity;
import jakarta.persistence.*;

@Entity @Table(name = "app_users")
public class UserEntity extends BaseEntity {
    @Column(nullable = false, length = 254) private String email;
    @Column(name = "password_hash", nullable = false, length = 255) private String passwordHash;
    @Column(name = "full_name", nullable = false, length = 150) private String fullName;
    @Column(nullable = false, length = 200) private String school = "";
    @Column(nullable = false, length = 200) private String major = "";
    @Column(name = "time_zone", nullable = false, length = 60) private String timeZone = "Asia/Ho_Chi_Minh";
    protected UserEntity() { }
}
