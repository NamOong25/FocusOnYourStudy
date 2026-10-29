package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.focusstudy.focus.*;
import com.focusstudy.users.UserRepository;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class PomodoroStatisticsServiceTests {
    private final UUID owner = id(1), course = id(2), semester = id(3);
    private final PomodoroStatisticsRepository repository = mock(PomodoroStatisticsRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final PomodoroStatisticsService service = new PomodoroStatisticsService(repository,users,Clock.fixed(Instant.parse("2026-10-29T00:00:00Z"),ZoneOffset.UTC));
    static UUID id(int n) { return UUID.fromString("00000000-0000-4000-8000-"+String.format("%012d",n)); }
    PomodoroStatisticsRow row(int n, UUID c, UUID s, String name, String end) {
        return new PomodoroStatisticsRow(id(n),c,"JAVA",name,s,(short)1,2026,Instant.parse(end),1500000);
    }
    void rows(PomodoroStatisticsRow... rows) { when(repository.completed(any(),any(),any(),any())).thenReturn(List.of(rows)); }
    PomodoroStatisticsService.Statistics read(String zone) { return service.get(owner,"WEEK","2026-10-28",zone,null,null); }
    @Test void emptyMonthHasEveryDayWithoutInventedCoursesOrMinutes() {
        rows();var value=service.get(owner,"MONTH","2026-10-29","UTC",null,null);
        assertThat(value.days()).hasSize(31);assertThat(value.completedSessions()).isZero();assertThat(value.studyMillis()).isZero();assertThat(value.courses()).isEmpty();
        assertThat(value.days()).allSatisfy(day->{assertThat(day.completedSessions()).isZero();assertThat(day.studySeconds()).isZero();});
    }
    @Test void dayAndCourseTotalsUseTheSameCreditedRows() {
        rows(row(10,course,semester,"Java","2026-10-27T18:00:00Z"),row(11,course,semester,"Java","2026-10-28T18:00:00Z"),row(12,id(4),semester,"React","2026-10-28T19:00:00Z"));
        var value=read("Asia/Ho_Chi_Minh");assertThat(value.completedSessions()).isEqualTo(3);assertThat(value.studySeconds()).isEqualTo(4500);
        assertThat(value.days().stream().mapToLong(PomodoroStatisticsService.Day::studyMillis).sum()).isEqualTo(value.studyMillis());
        assertThat(value.courses().stream().mapToLong(PomodoroStatisticsService.Course::completedSessions).sum()).isEqualTo(3);
        assertThat(value.courses().getFirst().studySeconds()).isEqualTo(3000);
    }
    @Test void bucketsFollowSelectedZoneNotServerDateOrSessionStartZone() {
        rows(row(10,course,semester,"Java","2026-10-27T18:00:00Z"));
        var asia=read("Asia/Ho_Chi_Minh");var utc=read("UTC");
        assertThat(asia.days().stream().filter(d->d.completedSessions()>0).findFirst().orElseThrow().date()).isEqualTo(LocalDate.of(2026,10,28));
        assertThat(utc.days().stream().filter(d->d.completedSessions()>0).findFirst().orElseThrow().date()).isEqualTo(LocalDate.of(2026,10,27));
    }
    @Test void latestSnapshotLabelIsDeterministicEvenWithUnorderedRowsAndEqualEndTimes() {
        rows(row(22,course,semester,"Mới nhất","2026-10-28T18:00:00Z"),row(20,course,semester,"Tên cũ","2026-10-27T18:00:00Z"),row(21,course,semester,"Tên cùng thời điểm","2026-10-28T18:00:00Z"));
        var value=read("UTC");assertThat(value.courses()).hasSize(1);assertThat(value.courses().getFirst().courseName()).isEqualTo("Mới nhất");assertThat(value.courses().getFirst().completedSessions()).isEqualTo(3);
    }
    @Test void sameCourseMovedBetweenSemestersRemainsTwoSnapshotGroups() {
        rows(row(10,course,semester,"Java","2026-10-27T18:00:00Z"),row(11,course,id(4),"Java","2026-10-28T18:00:00Z"));
        var value=read("UTC");assertThat(value.courses()).hasSize(2);assertThat(value.courses()).extracting(PomodoroStatisticsService.Course::semesterId).containsExactly(semester,id(4));
    }
    @Test void differentCourseIdsWithSameCodeOrNameAreNotMerged() {
        rows(row(10,course,semester,"Java","2026-10-27T18:00:00Z"),row(11,id(4),semester,"Java","2026-10-28T18:00:00Z"));
        assertThat(read("UTC").courses()).hasSize(2);
    }
    @Test void invalidRangeDoesNotExecuteTheStatisticsQuery() {
        assertThatThrownBy(()->service.get(owner,"WEEK","2026-02-30","UTC",null,null)).isInstanceOf(PomodoroApiException.class);verifyNoInteractions(repository);
    }
    @Test void missingAccountCannotSupplyADefaultZone() {
        when(users.findById(owner)).thenReturn(Optional.empty());
        assertThatThrownBy(()->service.get(owner,"WEEK",null,null,null,null)).isInstanceOfSatisfying(PomodoroApiException.class,e->assertThat(e.status().value()).isEqualTo(401));verifyNoInteractions(repository);
    }
}
