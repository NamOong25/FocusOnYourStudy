package com.focusstudy.planning;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

/** Deterministic, earliest-fit planner. No database, writes, randomness or model provider. */
public final class StudyPlanEngine {
    private StudyPlanEngine() { }
    public record Interval(Instant start,Instant end) { }
    public record Result(List<StudyPlanResponse.Session> sessions,List<String> warnings,int scheduledMinutes) { }
    public static Instant ceilMinute(Instant value){var floor=value.truncatedTo(ChronoUnit.MINUTES);return floor.equals(value)?floor:floor.plusSeconds(60);}
    public static Result plan(StudyPlanRequest input,StudyPlanRequest.Window window,Instant now,Instant deadline,List<Interval> occupied) {
        var busy=occupied.stream().filter(x->x.start().isBefore(x.end())).sorted(Comparator.comparing(Interval::start).thenComparing(Interval::end)).toList();
        var merged=new ArrayList<Interval>();
        for(var x:busy){if(merged.isEmpty() || merged.getLast().end().isBefore(x.start()))merged.add(x);
            else{var last=merged.removeLast();merged.add(new Interval(last.start(),last.end().isAfter(x.end())?last.end():x.end()));}}
        var sessions=new ArrayList<StudyPlanResponse.Session>();var warnings=new LinkedHashSet<String>();
        int remaining=input.totalMinutes();Instant nextAllowed=ceilMinute(now);
        for(var day=window.from();!day.isAfter(window.to()) && remaining>0;day=day.plusDays(1)) {
            if(!window.weekdays().contains(day.getDayOfWeek().getValue()))continue;
            var start=day.atTime(window.start());var end=day.atTime(window.end());
            // Never silently move a missing/repeated wall-clock boundary during a DST transition.
            if(window.zone().getRules().getValidOffsets(start).size()!=1 || window.zone().getRules().getValidOffsets(end).size()!=1){warnings.add("DST_WINDOW_SKIPPED");continue;}
            var lower=start.atZone(window.zone()).toInstant();var upper=end.atZone(window.zone()).toInstant();
            if(deadline!=null && deadline.isBefore(upper)){upper=deadline;warnings.add("DEADLINE_LIMIT");}
            var gaps=new ArrayList<Interval>();var cursor=lower;
            for(var x:merged){if(!x.end().isAfter(cursor))continue;if(!x.start().isBefore(upper))break;
                if(x.start().isAfter(cursor))gaps.add(new Interval(cursor,x.start()));
                if(x.end().isAfter(cursor))cursor=x.end();}
            if(cursor.isBefore(upper))gaps.add(new Interval(cursor,upper));
            for(var gap:gaps){
                var candidate=ceilMinute(gap.start().isAfter(nextAllowed)?gap.start():nextAllowed);
                while(remaining>0){int minutes=Math.min(input.sessionMinutes(),remaining);var finish=candidate.plusSeconds(minutes*60L);
                    if(finish.isAfter(gap.end()))break;
                    int index=sessions.size()+1;
                    sessions.add(new StudyPlanResponse.Session(index,input.goal()+" · Buổi "+index,input.courseId(),input.assignmentId(),candidate,finish,input.timeZone(),minutes));
                    remaining-=minutes;nextAllowed=finish.plusSeconds(input.breakMinutes()*60L);candidate=nextAllowed;
                }
            }
        }
        if(remaining>0)warnings.add("INSUFFICIENT_CONTIGUOUS_TIME");
        return new Result(List.copyOf(sessions),List.copyOf(warnings),input.totalMinutes()-remaining);
    }
}
