package com.focusstudy.focus;

import com.focusstudy.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.util.UUID;

@Entity @Table(name = "pomodoro_preferences")
public class PomodoroPreferenceEntity extends BaseEntity {
    @Column(name = "user_id", nullable = false, unique = true) private UUID userId;
    @Column(name = "daily_sessions", nullable = false) private short dailySessions;
    protected PomodoroPreferenceEntity() { }
    public static PomodoroPreferenceEntity create(UUID owner, int goal) {
        var row = new PomodoroPreferenceEntity(); row.userId = owner; row.setDailySessions(goal); return row;
    }
    public int getDailySessions() { return dailySessions; }
    public void setDailySessions(int value) { dailySessions = (short) value; }
}
