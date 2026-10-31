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
        var context=StudyPlanContext.load(owner,input,now,courses,assignments,exams);var course=context.course();var target=context.target();
        var from=window.from().atStartOfDay(window.zone()).toInstant();var to=window.to().plusDays(1).atStartOfDay(window.zone()).toInstant();
        var result=StudyPlanEngine.plan(input,window,now,target.deadline(),busy.read(owner,from,to));
        int missing=input.totalMinutes()-result.scheduledMinutes();
        return new StudyPlanResponse("RULE_BASED_V1",false,now,course.getId(),course.getVersion(),target,input.goal(),window.from(),window.to(),input.timeZone(),
                input.totalMinutes(),result.scheduledMinutes(),missing,missing==0,result.warnings(),result.sessions());
    }
}
