package com.focusstudy.planning;

import com.focusstudy.academics.CourseEntity;
import com.focusstudy.academics.courses.*;
import com.focusstudy.assignments.*;
import com.focusstudy.exams.*;
import com.focusstudy.study.StudyApiException;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;

record StudyPlanContext(CourseEntity course, StudyPlanResponse.Target target) {
    static StudyPlanContext load(UUID owner, StudyPlanRequest input, Instant now,
            CourseRepository courses, AssignmentRepository assignments, ExamRepository exams) {
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
        if(target.deadline()!=null&&!target.deadline().isAfter(now))throw new StudyApiException(HttpStatus.CONFLICT,"STUDY_PLAN_DEADLINE_PASSED","Mục tiêu đã đến hạn hoặc kỳ thi đã bắt đầu. Chọn mục tiêu khác hoặc tự học độc lập.");
        return new StudyPlanContext(course,target);
    }
    private static StudyApiException link(){return new StudyApiException(HttpStatus.CONFLICT,"STUDY_PLAN_TARGET_COURSE_MISMATCH","Bài tập hoặc kỳ thi cần thuộc đúng môn đã chọn.");}
}
