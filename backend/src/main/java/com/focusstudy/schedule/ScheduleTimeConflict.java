package com.focusstudy.schedule;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/** One owned, effective interval that blocks the requested write. */
public final class ScheduleTimeConflict extends RuntimeException {
    public record Conflict(String kind, UUID id, UUID courseId, String courseName, String title,
            LocalDate date, LocalDate endDate, String startTime, String endTime, String timeZone, Instant startsAt, Instant endsAt) { }
    private final Conflict conflict;
    public ScheduleTimeConflict(Conflict conflict) {
        super("Trùng " + (switch (conflict.kind()) { case "CLASS" -> "lịch học"; case "EXAM" -> "lịch thi"; default -> "buổi tự học"; }) + " “" + conflict.title()
                + "” của môn “" + conflict.courseName() + "”, ngày " + conflict.date().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                + " " + conflict.startTime() + "–" + (conflict.date().equals(conflict.endDate()) ? "" : conflict.endDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " ")
                + conflict.endTime() + " (" + conflict.timeZone() + "). Chọn giờ khác hoặc điều chỉnh buổi đã lưu.");
        this.conflict = conflict;
    }
    public Conflict conflict() { return conflict; }
}
