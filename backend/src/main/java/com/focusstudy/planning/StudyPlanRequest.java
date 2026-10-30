package com.focusstudy.planning;

import com.focusstudy.study.StudyApiException;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;

public record StudyPlanRequest(
        @NotNull UUID courseId, UUID assignmentId, UUID examId,
        @NotBlank @Size(max=120) String goal,
        @NotBlank @Size(max=10) String fromDate, @NotBlank @Size(max=10) String toDate,
        @NotBlank @Size(max=100) String timeZone,
        @NotBlank @Size(max=5) String availableStart, @NotBlank @Size(max=5) String availableEnd,
        @Size(min=1,max=7) List<@NotNull @Min(1) @Max(7) Integer> weekdays,
        @NotNull @Min(1) @Max(1440) Integer totalMinutes,
        @NotNull @Min(15) @Max(240) Integer sessionMinutes,
        @Min(0) @Max(60) Integer breakMinutes) {
    public StudyPlanRequest {
        goal=goal==null?"":goal.strip();
        weekdays=weekdays==null?List.of(1,2,3,4,5,6,7):weekdays;
        breakMinutes=breakMinutes==null?10:breakMinutes;
    }
    public record Window(LocalDate from,LocalDate to,ZoneId zone,LocalTime start,LocalTime end,Set<Integer> weekdays) { }
    public Window window(Instant now) {
        if(assignmentId!=null && examId!=null)throw invalid("Chọn bài tập hoặc kỳ thi, không chọn cả hai trong cùng đề xuất.");
        try {
            if(!ZoneId.getAvailableZoneIds().contains(timeZone))throw invalid("Chọn múi giờ IANA, ví dụ Asia/Ho_Chi_Minh hoặc UTC.");
            if(!fromDate.matches("\\d{4}-\\d{2}-\\d{2}") || !toDate.matches("\\d{4}-\\d{2}-\\d{2}"))throw new DateTimeException("date");
            var from=LocalDate.parse(fromDate);var to=LocalDate.parse(toDate);var zone=ZoneId.of(timeZone);
            if(from.getYear()<1900 || to.getYear()>2099 || from.isBefore(now.atZone(zone).toLocalDate()) || to.isBefore(from) || to.isAfter(from.plusDays(13)))
                throw invalid("Chọn tối đa 14 ngày, từ hôm nay trở đi, trong năm 1900–2099.");
            if(!availableStart.matches("([01]\\d|2[0-3]):[0-5]\\d") || !availableEnd.matches("([01]\\d|2[0-3]):[0-5]\\d"))throw new DateTimeException("time");
            var start=LocalTime.parse(availableStart);var end=LocalTime.parse(availableEnd);
            if(!start.isBefore(end))throw invalid("Giờ rảnh kết thúc phải sau bắt đầu trong cùng ngày, trước 24:00.");
            if(!to.atTime(end).atZone(zone).toInstant().isBefore(Instant.parse("2100-01-01T00:00:00Z")))
                throw invalid("Khung giờ cần kết thúc trước năm 2100 theo UTC, giống quy tắc lưu buổi tự học.");
            var days=new HashSet<>(weekdays);
            if(days.size()!=weekdays.size())throw invalid("Các thứ trong tuần không được lặp lại.");
            return new Window(from,to,zone,start,end,Set.copyOf(days));
        }catch(DateTimeException e){throw invalid("Ngày cần YYYY-MM-DD hợp lệ; giờ cần HH:mm theo đồng hồ 24 giờ.");}
    }
    static StudyApiException invalid(String message){return new StudyApiException(HttpStatus.BAD_REQUEST,"INVALID_STUDY_PLAN",message);}
}
