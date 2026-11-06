package com.focusstudy.notifications;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;

public record NotificationPreferences(boolean assignments, boolean classes, boolean exams,
        int reminderMinutes, boolean quiet, String quietStart, String quietEnd, long version) {

    static final NotificationPreferences DEFAULT = new NotificationPreferences(true, true, true,
            15, true, "22:00", "07:00", 0);
    private static final String CLOCK = "([01][0-9]|2[0-3]):[0-5][0-9]";

    public record Update(
            @NotNull(message = "Cần chọn có nhắc bài tập hay không") Boolean assignments,
            @NotNull(message = "Cần chọn có nhắc lịch học hay không") Boolean classes,
            @NotNull(message = "Cần chọn có nhắc lịch thi hay không") Boolean exams,
            @NotNull(message = "Cần chọn mốc nhắc") Integer reminderMinutes,
            @NotNull(message = "Cần chọn có bật giờ yên lặng hay không") Boolean quiet,
            @NotNull(message = "Cần nhập giờ bắt đầu")
            @Pattern(regexp = CLOCK, message = "Giờ bắt đầu phải có dạng HH:mm") String quietStart,
            @NotNull(message = "Cần nhập giờ kết thúc")
            @Pattern(regexp = CLOCK, message = "Giờ kết thúc phải có dạng HH:mm") String quietEnd,
            @NotNull(message = "Cần version tùy chọn đã đọc")
            @PositiveOrZero(message = "Version không được âm")
            @Max(value = 9007199254740991L, message = "Version vượt giới hạn hợp lệ") Long version) { }
}
