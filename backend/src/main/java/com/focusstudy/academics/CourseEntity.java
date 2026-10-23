package com.focusstudy.academics;

import com.focusstudy.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.util.UUID;

@Entity @Table(name = "courses")
public class CourseEntity extends BaseEntity {
    public enum Status { STUDYING, COMPLETED, PLANNED }
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(name = "semester_id", nullable = false) private UUID semesterId;
    @Column(nullable = false, length = 64) private String code;
    @Column(nullable = false, length = 200) private String name;
    @Column(nullable = false) private int credits;
    @Column(nullable = false, length = 200) private String teacher = "";
    @Column(nullable = false, length = 100) private String room = "";
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Status status = Status.STUDYING;
    @Column(nullable = false, length = 20) private String color = "lavender";
    @Column(nullable = false, columnDefinition = "text") private String description = "";
    protected CourseEntity() { }
    public static CourseEntity create(UUID owner, UUID semesterId, String code, String name, int credits,
            String teacher, String room, Status status, String color, String description) {
        var course = new CourseEntity(); course.userId = owner;
        course.change(semesterId, code, name, credits, teacher, room, status, color, description); return course;
    }
    public void change(UUID semesterId, String code, String name, int credits, String teacher, String room,
            Status status, String color, String description) {
        this.semesterId = semesterId; this.code = code; this.name = name; this.credits = credits;
        this.teacher = teacher; this.room = room; this.status = status; this.color = color; this.description = description;
    }
    public UUID getSemesterId() { return semesterId; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public int getCredits() { return credits; }
    public String getTeacher() { return teacher; }
    public String getRoom() { return room; }
    public Status getStatus() { return status; }
    public String getColor() { return color; }
    public String getDescription() { return description; }
}
