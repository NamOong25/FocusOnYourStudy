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
}
