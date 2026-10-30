package com.focusstudy.planning;

import com.focusstudy.academics.courses.*;
import com.focusstudy.assignments.*;
import com.focusstudy.exams.*;
import com.focusstudy.study.StudyApiException;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class StudyPlanService {
    private final CourseRepository courses;private final AssignmentRepository assignments;private final ExamRepository exams;
    private final StudyPlanBusyReader busy;private final Clock clock;
    public StudyPlanService(CourseRepository courses,AssignmentRepository assignments,ExamRepository exams,StudyPlanBusyReader busy,Clock clock){
        this.courses=courses;this.assignments=assignments;this.exams=exams;this.busy=busy;this.clock=clock;
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public StudyPlanResponse preview(UUID owner,StudyPlanRequest input){
        var now=clock.instant();var window=input.window(now);
        var course=courses.findByIdAndUserId(input.courseId(),owner).orElseThrow(()->new CourseApiException(HttpStatus.NOT_FOUND,"COURSE_NOT_FOUND","Không tìm thấy môn học."));
        var target=new StudyPlanResponse.Target("SELF_STUDY",null,null,null);
        if(input.assignmentId()!=null){
            var task=assignments.findByIdAndUserId(input.assignmentId(),owner).orElseThrow(()->new AssignmentApiException(HttpStatus.NOT_FOUND,"ASSIGNMENT_NOT_FOUND","Không tìm thấy bài tập."));
            if(!task.getCourseId().equals(course.getId()))throw link();
            if(task.getStatus()==AssignmentEntity.Status.COMPLETED)throw new StudyApiException(HttpStatus.CONFLICT,"STUDY_PLAN_TARGET_COMPLETED","Bài tập đã hoàn thành. Chọn bài khác hoặc tự học độc lập.");
            target=new StudyPlanResponse.Target("ASSIGNMENT",task.getId(),task.getVersion(),task.getDueAt());
        }
        if(input.examId()!=null){
            var exam=exams.findByIdAndUserId(input.examId(),owner).orElseThrow(()->new ExamApiException(HttpStatus.NOT_FOUND,"EXAM_NOT_FOUND","Không tìm thấy lịch thi."));
            if(!exam.getCourseId().equals(course.getId()))throw link();
            target=new StudyPlanResponse.Target("EXAM",exam.getId(),exam.getVersion(),exam.getStartsAt());
        }
        if(target.deadline()!=null && !target.deadline().isAfter(now))throw new StudyApiException(HttpStatus.CONFLICT,"STUDY_PLAN_DEADLINE_PASSED","Mục tiêu đã đến hạn hoặc kỳ thi đã bắt đầu. Chọn mục tiêu khác hoặc tự học độc lập.");
        var from=window.from().atStartOfDay(window.zone()).toInstant();var to=window.to().plusDays(1).atStartOfDay(window.zone()).toInstant();
        var result=StudyPlanEngine.plan(input,window,now,target.deadline(),busy.read(owner,from,to));
        int missing=input.totalMinutes()-result.scheduledMinutes();
        return new StudyPlanResponse("RULE_BASED_V1",false,now,course.getId(),course.getVersion(),target,input.goal(),window.from(),window.to(),input.timeZone(),
                input.totalMinutes(),result.scheduledMinutes(),missing,missing==0,result.warnings(),result.sessions());
    }
    private StudyApiException link(){return new StudyApiException(HttpStatus.CONFLICT,"STUDY_PLAN_TARGET_COURSE_MISMATCH","Bài tập hoặc kỳ thi cần thuộc đúng môn đã chọn.");}
}
