package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import com.focusstudy.focus.*;
import java.time.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PomodoroTimelineTests {
    private final Instant start = Instant.parse("2026-10-28T12:00:00Z");
    @Test void runningCountsElapsedFromServerAnchorAndRoundsRemainingUp() {
        var r = PomodoroTimeline.read(true, 1500, 0, 0, start, start.plusMillis(1250));
        assertThat(r.elapsedMillis()).isEqualTo(1250); assertThat(r.remainingMillis()).isEqualTo(1498750);
        assertThat(r.remainingSeconds()).isEqualTo(1499); assertThat(r.endsAt()).isEqualTo(start.plusSeconds(1500)); assertThat(r.timeUp()).isFalse();
    }
    @Test void pausedNeverConsumesRemainingEvenAfterDays() {
        var r = PomodoroTimeline.read(false, 1500, 1234, 4000, start, start.plusSeconds(172800));
        assertThat(r.elapsedMillis()).isEqualTo(1234); assertThat(r.remainingMillis()).isEqualTo(1498766);
        assertThat(r.pausedMillis()).isEqualTo(172804000); assertThat(r.endsAt()).isNull();
    }
    @Test void expiredCapsAtDurationAndNeverAddsTimeAfterDeadline() {
        var r = PomodoroTimeline.read(true, 1500, 1400000, 5000, start, start.plusSeconds(100000));
        assertThat(r.elapsedMillis()).isEqualTo(1500000); assertThat(r.remainingMillis()).isZero();
        assertThat(r.remainingSeconds()).isZero(); assertThat(r.timeUp()).isTrue(); assertThat(r.pausedMillis()).isEqualTo(5000);
        assertThat(r.endsAt()).isEqualTo(start.plusSeconds(100));
    }
    @Test void exactDeadlineIsTimeUpButOneMillisecondBeforeIsNot() {
        assertThat(PomodoroTimeline.read(true,1500,0,0,start,start.plusMillis(1499999)).remainingSeconds()).isEqualTo(1);
        assertThat(PomodoroTimeline.read(true,1500,0,0,start,start.plusMillis(1500000)).timeUp()).isTrue();
    }
    @Test void backwardsClockDoesNotCreateNegativeTimeOrEarlierTransition() {
        for (boolean running : new boolean[]{true,false}) {
            var r = PomodoroTimeline.read(running,1500,1000,2500,start,start.minusSeconds(5));
            assertThat(r.elapsedMillis()).isEqualTo(1000); assertThat(r.pausedMillis()).isEqualTo(2500); assertThat(r.serverTime()).isEqualTo(start);
        }
    }
    PomodoroEntity row() {
        UUID course=UUID.randomUUID(); return PomodoroEntity.start(UUID.randomUUID(),new PomodoroRequests.Start(UUID.randomUUID(),course,null,null,"Asia/Ho_Chi_Minh"),new PomodoroEntity.Context(course,"QA","Môn",UUID.randomUUID(),(short)1,2026,null,null,null,null),start);
    }
    @Test void repeatedSubsecondPauseResumeKeepsEveryMillisecond() {
        var row=row(); var time=start;
        for(int i=0;i<100;i++) { time=time.plusMillis(7);row.pause(row.read(time));time=time.plusMillis(11);row.resume(row.read(time)); }
        var r=row.read(time); assertThat(r.elapsedMillis()).isEqualTo(700);assertThat(r.pausedMillis()).isEqualTo(1100);
        assertThat(r.remainingMillis()).isEqualTo(1499300);assertThat(r.endsAt()).isEqualTo(start.plusMillis(1501100));
    }
    @Test void utcElapsedTimeCrossesMidnightAndDstWithoutWallClockArithmetic() {
        var dst=Instant.parse("2026-11-01T05:55:00Z");
        assertThat(PomodoroTimeline.read(true,1500,0,0,dst,dst.plusSeconds(1500)).elapsedMillis()).isEqualTo(1500000);
        var midnight=Instant.parse("2026-10-28T16:55:00Z");
        assertThat(PomodoroTimeline.read(true,1500,0,0,midnight,midnight.plusSeconds(1500)).endsAt()).isEqualTo(Instant.parse("2026-10-28T17:20:00Z"));
    }
    @Test void replayMatchesOriginalContextAndZoneButNotMutatedRequest() {
        var row=row();var context=row.getContext();
        assertThat(row.matches(new PomodoroRequests.Start(row.getClientRequestId(),context.courseId(),null,null,"Asia/Ho_Chi_Minh"))).isTrue();
        assertThat(row.matches(new PomodoroRequests.Start(row.getClientRequestId(),UUID.randomUUID(),null,null,"Asia/Ho_Chi_Minh"))).isFalse();
        assertThat(row.matches(new PomodoroRequests.Start(row.getClientRequestId(),context.courseId(),null,null,"UTC"))).isFalse();
    }
}
