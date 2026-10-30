package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import com.focusstudy.planning.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class StudyPlanEngineTests {
    final UUID course=UUID.randomUUID();
    final Instant now=Instant.parse("2026-11-02T00:00:00Z");
    StudyPlanRequest input(int total,int duration,int rest){return new StudyPlanRequest(course,null,null,"Ôn React","2026-11-02","2026-11-03","Asia/Ho_Chi_Minh","19:00","21:00",null,total,duration,rest);}
    StudyPlanEngine.Interval busy(String start,String end){return new StudyPlanEngine.Interval(Instant.parse(start),Instant.parse(end));}
    StudyPlanEngine.Result plan(StudyPlanRequest r,Instant at,Instant deadline,StudyPlanEngine.Interval... busy){return StudyPlanEngine.plan(r,r.window(at),at,deadline,List.of(busy));}
    @Test void threeHoursSplitIntoFour45MinuteSessionsWithTenMinuteBreaks(){
        var r=plan(input(180,45,10),now,null);assertThat(r.scheduledMinutes()).isEqualTo(180);assertThat(r.sessions()).hasSize(4);
        assertThat(r.sessions().stream().map(x->x.startsAt().toString())).containsExactly("2026-11-02T12:00:00Z","2026-11-02T12:55:00Z","2026-11-03T12:00:00Z","2026-11-03T12:55:00Z");
    }
    @Test void finalRemainderIsShorterAndNeverAddsExtraMinutes(){var r=plan(input(115,45,10),now,null);assertThat(r.sessions().stream().map(x->x.durationMinutes())).containsExactly(45,45,25);assertThat(r.scheduledMinutes()).isEqualTo(115);}
    @Test void totalLessThanSessionLengthStillCreatesExactlyRequestedTime(){assertThat(plan(input(1,45,10),now,null).sessions().getFirst().durationMinutes()).isEqualTo(1);}
    @Test void mergesUnorderedOverlappingAndTouchingBusyIntervals(){
        var r=plan(input(45,45,0),now,null,busy("2026-11-02T12:20:00Z","2026-11-02T13:00:00Z"),busy("2026-11-02T12:00:00Z","2026-11-02T12:30:00Z"),busy("2026-11-02T13:00:00Z","2026-11-02T13:15:00Z"));
        assertThat(r.sessions().getFirst().startsAt()).isEqualTo(Instant.parse("2026-11-02T13:15:00Z"));
    }
    @Test void exactBusyBoundariesAreAllowed(){var r=plan(input(90,45,0),now,null,busy("2026-11-02T12:45:00Z","2026-11-02T13:15:00Z"));assertThat(r.sessions()).hasSize(2);assertThat(r.sessions().getFirst().endsAt()).isEqualTo(Instant.parse("2026-11-02T12:45:00Z"));assertThat(r.sessions().getLast().startsAt()).isEqualTo(Instant.parse("2026-11-02T13:15:00Z"));}
    @Test void shortFragmentsDoNotBecomeTinySessionsToFillQuota(){var r=plan(input(45,45,0),now,Instant.parse("2026-11-02T14:00:00Z"),busy("2026-11-02T12:20:00Z","2026-11-02T13:40:00Z"));assertThat(r.sessions()).isEmpty();assertThat(r.warnings()).contains("INSUFFICIENT_CONTIGUOUS_TIME");}
    @Test void fractionalNowRoundsUpAndCannotScheduleInThePast(){var r=plan(input(45,45,0),Instant.parse("2026-11-02T12:00:00.000001Z"),null);assertThat(r.sessions().getFirst().startsAt()).isEqualTo(Instant.parse("2026-11-02T12:01:00Z"));}
    @Test void fractionalBusyEndRoundsUpToValidStudyMinute(){var r=plan(input(45,45,0),now,null,busy("2026-11-02T11:00:00Z","2026-11-02T12:00:00.000001Z"));assertThat(r.sessions().getFirst().startsAt()).isEqualTo(Instant.parse("2026-11-02T12:01:00Z"));}
    @Test void deadlineIsInclusiveButNotRoundedUp(){assertThat(plan(input(45,45,0),now,Instant.parse("2026-11-02T12:45:00Z")).scheduledMinutes()).isEqualTo(45);assertThat(plan(input(45,45,0),now,Instant.parse("2026-11-02T12:44:59.999999Z")).scheduledMinutes()).isZero();}
    @Test void weekdaySelectionAndInsufficientMinutesAreExplicit(){var a=input(180,45,10);var b=new StudyPlanRequest(course,null,null,a.goal(),a.fromDate(),a.toDate(),a.timeZone(),a.availableStart(),a.availableEnd(),List.of(1),180,45,10);var r=plan(b,now,null);assertThat(r.scheduledMinutes()).isEqualTo(90);assertThat(r.warnings()).contains("INSUFFICIENT_CONTIGUOUS_TIME");}
    @Test void dstMissingAndRepeatedBoundariesAreSkippedInsteadOfMoved(){
        for(String date:List.of("2027-03-14","2027-11-07")){
            String start=date.contains("03-14")?"02:15":"01:15";
            var r=new StudyPlanRequest(course,null,null,"DST",date,date,"America/New_York",start,"04:00",null,45,45,0);
            var result=plan(r,Instant.parse("2026-11-01T00:00:00Z"),null);assertThat(result.sessions()).isEmpty();assertThat(result.warnings()).contains("DST_WINDOW_SKIPPED");
        }
    }
    @Test void dstCrossingUsesActualElapsedMinutes(){var r=new StudyPlanRequest(course,null,null,"DST","2027-11-07","2027-11-07","America/New_York","00:00","04:00",null,180,180,0);var s=plan(r,now,null).sessions().getFirst();assertThat(Duration.between(s.startsAt(),s.endsAt()).toMinutes()).isEqualTo(180);assertThat(s.endsAt().atZone(ZoneId.of(r.timeZone())).toLocalTime()).isEqualTo(LocalTime.of(2,0));}
    @Test void inputAndSourceOrderCannotChangeDeterministicOutput(){var r=input(45,45,0);var a=busy("2026-11-02T12:00:00Z","2026-11-02T12:15:00Z");var b=busy("2026-11-02T12:15:00Z","2026-11-02T12:20:00Z");assertThat(plan(r,now,null,a,b)).isEqualTo(plan(r,now,null,b,a));}
}
