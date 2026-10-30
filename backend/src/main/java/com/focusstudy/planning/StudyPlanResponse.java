package com.focusstudy.planning;

import java.time.*;
import java.util.*;

public record StudyPlanResponse(String engine,boolean persisted,Instant asOf,UUID courseId,long courseVersion,
        Target target,String goal,LocalDate fromDate,LocalDate toDate,String timeZone,
        int requestedMinutes,int scheduledMinutes,int unscheduledMinutes,boolean complete,
        List<String> warnings,List<Session> sessions) {
    public record Target(String kind,UUID id,Long version,Instant deadline) { }
    public record Session(int index,String title,UUID courseId,UUID assignmentId,Instant startsAt,Instant endsAt,
            String timeZone,int durationMinutes) { }
}
