package com.focusstudy.academics;

import com.focusstudy.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.util.UUID;

@Entity @Table(name = "semesters")
public class SemesterEntity extends BaseEntity {
    public enum Status { CURRENT, UPCOMING, COMPLETED }
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(nullable = false) private short term;
    @Column(name = "start_year", nullable = false) private int startYear;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Status status = Status.UPCOMING;
    @Column(nullable = false, columnDefinition = "text") private String note = "";
    protected SemesterEntity() { }
    public static SemesterEntity create(UUID owner, int term, int startYear, Status status, String note) {
        var semester = new SemesterEntity(); semester.userId = owner;
        semester.change(term, startYear, status, note); return semester;
    }
    public void change(int term, int startYear, Status status, String note) {
        this.term = (short) term; this.startYear = startYear; this.status = status; this.note = note == null ? "" : note.trim();
    }
    public void complete() { this.status = Status.COMPLETED; }
    public short getTerm() { return term; }
    public int getStartYear() { return startYear; }
    public Status getStatus() { return status; }
    public String getNote() { return note; }
}
