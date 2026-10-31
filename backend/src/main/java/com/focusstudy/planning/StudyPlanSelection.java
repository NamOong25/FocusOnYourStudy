package com.focusstudy.planning;

import com.focusstudy.study.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.http.HttpStatus;

/** Checks edited/selected drafts, without trusting totals, deadlines or busy data from the client. */
final class StudyPlanSelection {
    record Slot(StudyPlanApplyRequest.Session input,Instant start,Instant end) { }
    static Instant start(StudyPlanApplyRequest.Session row){
        try{return StudySchedule.parse(row.startsAt());}
        catch(DateTimeException e){throw StudyPlanRequest.invalid("Ngày giờ buổi học cần ISO-8601 có offset hoặc Z.");}
    }
    static List<Slot> validate(StudyPlanApplyRequest request,StudyPlanRequest.Window window,Instant now,Instant deadline){
        var seen=new HashSet<Integer>();var slots=new ArrayList<Slot>();int total=0;
        for(var row:request.sessions()){
            if(!seen.add(row.index()))throw StudyPlanRequest.invalid("Vị trí buổi học không được lặp lại.");
            var start=start(row);var end=start.plusSeconds(row.durationMinutes()*60L);var local=start.atZone(window.zone());var day=local.toLocalDate();
            if(!start.equals(start.truncatedTo(ChronoUnit.MINUTES))||start.isBefore(Instant.parse("1900-01-01T00:00:00Z"))||!end.isBefore(Instant.parse("2100-01-01T00:00:00Z")))
                throw StudyPlanRequest.invalid("Buổi học cần bắt đầu đến phút và nằm trong năm 1900–2099 theo UTC.");
            if(start.isBefore(now))throw conflict("STUDY_PLAN_IN_PAST","Giờ bắt đầu của một buổi đã qua. Tạo lại đề xuất trước khi lưu.");
            if(day.isBefore(window.from())||day.isAfter(window.to())||!window.weekdays().contains(day.getDayOfWeek().getValue())||!end.atZone(window.zone()).toLocalDate().equals(day))throw availability();
            var left=day.atTime(window.start());var right=day.atTime(window.end());
            if(window.zone().getRules().getValidOffsets(left).size()!=1||window.zone().getRules().getValidOffsets(right).size()!=1
                    ||start.isBefore(left.atZone(window.zone()).toInstant())||end.isAfter(right.atZone(window.zone()).toInstant()))throw availability();
            if(deadline!=null&&end.isAfter(deadline))throw conflict("STUDY_AFTER_DEADLINE","Một buổi kết thúc sau hạn nộp hoặc giờ bắt đầu thi. Điều chỉnh đề xuất trước khi lưu.");
            total+=row.durationMinutes();slots.add(new Slot(row,start,end));
        }
        if(total>request.conditions().totalMinutes())throw StudyPlanRequest.invalid("Tổng phút đã chọn vượt số phút yêu cầu. Bỏ chọn hoặc giảm thời lượng.");
        var timed=slots.stream().sorted(Comparator.comparing(Slot::start)).toList();
        for(int i=1;i<timed.size();i++)if(timed.get(i).start().isBefore(timed.get(i-1).end().plusSeconds(request.conditions().breakMinutes()*60L)))
            throw conflict("STUDY_PLAN_SELECTION_CONFLICT","Các buổi đã chọn bị trùng hoặc chưa đủ thời gian nghỉ.");
        return slots.stream().sorted(Comparator.comparing(s->s.input().index())).toList();
    }
    private static StudyApiException availability(){return conflict("STUDY_PLAN_OUTSIDE_AVAILABILITY","Một buổi nằm ngoài ngày, thứ hoặc khung giờ rảnh đã chọn, hoặc khung giờ bị lặp/không tồn tại do đổi giờ.");}
    static StudyApiException conflict(String code,String message){return new StudyApiException(HttpStatus.CONFLICT,code,message);}
}
