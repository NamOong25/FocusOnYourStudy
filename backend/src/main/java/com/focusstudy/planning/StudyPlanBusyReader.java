package com.focusstudy.planning;

import com.focusstudy.schedule.*;
import com.focusstudy.study.*;
import com.focusstudy.exams.ExamRepository;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.*;

@Component
public class StudyPlanBusyReader {
    private final ClassScheduleRepository schedules;private final ClassExceptionRepository exceptions;
    private final StudySessionRepository studies;private final ExamRepository exams;
    public StudyPlanBusyReader(ClassScheduleRepository schedules,ClassExceptionRepository exceptions,StudySessionRepository studies,ExamRepository exams){
        this.schedules=schedules;this.exceptions=exceptions;this.studies=studies;this.exams=exams;
    }
    @Transactional(propagation=Propagation.MANDATORY,readOnly=true)
    public List<StudyPlanEngine.Interval> read(UUID owner,Instant from,Instant to) {
        var low=from.atZone(ZoneOffset.UTC).toLocalDate().minusDays(2);var high=to.atZone(ZoneOffset.UTC).toLocalDate().plusDays(2);
        var rules=schedules.findByUserIdAndStartsOnLessThanEqualAndEndsOnGreaterThanEqual(owner,high,low);
        if(rules.size()>500)throw limit();
        var overrides=new HashMap<UUID,Map<LocalDate,ClassExceptionEntity>>();
        if(!rules.isEmpty())for(var e:exceptions.findByUserIdAndScheduleIdInAndDateBetween(owner,rules.stream().map(ClassScheduleEntity::getId).toList(),low,high))
            overrides.computeIfAbsent(e.getScheduleId(),ignored->new HashMap<>()).put(e.getDate(),e);
        var result=new ArrayList<StudyPlanEngine.Interval>();
        for(var rule:rules){
            var first=rule.getStartsOn().isAfter(low)?rule.getStartsOn():low;var last=rule.getEndsOn().isBefore(high)?rule.getEndsOn():high;
            for(var day=first;!day.isAfter(last);day=day.plusDays(1))if((rule.getWeekdayMask() & (1 << (day.getDayOfWeek().getValue()-1)))!=0){
                var row=ClassOccurrenceResponse.from(rule,day,overrides.getOrDefault(rule.getId(),Map.of()).get(day));
                if(!row.cancelled() && row.startsAt().isBefore(to) && row.endsAt().isAfter(from))result.add(new StudyPlanEngine.Interval(row.startsAt(),row.endsAt()));
            }
        }
        for(var row:studies.findByUserIdAndStartsAtLessThanAndEndsAtGreaterThan(owner,to,from))result.add(new StudyPlanEngine.Interval(row.getStartsAt(),row.getEndsAt()));
        for(var row:exams.findByUserIdAndStartsAtLessThanAndEndsAtGreaterThan(owner,to,from))result.add(new StudyPlanEngine.Interval(row.getStartsAt(),row.getEndsAt()));
        if(result.size()>10000)throw limit();return result;
    }
    private StudyApiException limit(){return new StudyApiException(HttpStatus.UNPROCESSABLE_CONTENT,"STUDY_PLAN_SOURCE_LIMIT","Lịch bận quá lớn cho một đề xuất. Thu hẹp khoảng ngày rồi thử lại.");}
}
