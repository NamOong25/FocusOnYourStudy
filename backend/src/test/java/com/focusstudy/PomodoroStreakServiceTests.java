package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.focusstudy.focus.*;
import com.focusstudy.users.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class PomodoroStreakServiceTests {
    private final UUID owner=UUID.randomUUID();
    private final PomodoroStreakRepository repository=mock(PomodoroStreakRepository.class);
    private final UserRepository users=mock(UserRepository.class);
    private final PomodoroStreakService service=new PomodoroStreakService(repository,users,Clock.fixed(Instant.parse("2026-10-29T01:00:00Z"),ZoneOffset.UTC));
    void rows(PomodoroStreakRepository.StudyDay... values){when(repository.days(any(),any(),any(),any())).thenReturn(List.of(values));}
    PomodoroStreakRepository.StudyDay day(String date,long sessions){return new PomodoroStreakRepository.StudyDay(LocalDate.parse(date),sessions,sessions*1500000);}
    @Test void emptyMonthHasZeroStreakAndEveryCalendarDate() {
        rows();var s=service.get(owner,"2026-10","UTC");assertThat(s.currentStreakDays()).isZero();assertThat(s.longestStreakDays()).isZero();assertThat(s.calendar().days()).hasSize(31);assertThat(s.calendar().days()).allSatisfy(d->{assertThat(d.studied()).isFalse();assertThat(d.studyMillis()).isZero();});
    }
    @Test void calendarCountsSessionsWhileStreakCountsDistinctDates() {
        rows(day("2026-10-28",2),day("2026-10-29",3));var s=service.get(owner,null,"UTC");assertThat(s.currentStreakDays()).isEqualTo(2);assertThat(s.totalStudiedDays()).isEqualTo(2);assertThat(s.calendar().completedSessions()).isEqualTo(5);assertThat(s.calendar().studySeconds()).isEqualTo(7500);assertThat(s.calendar().studiedDays()).isEqualTo(2);
    }
    @Test void chosenMonthDoesNotTrimLifetimeBestOrCurrentRun() {
        rows(day("2026-09-28",1),day("2026-09-29",1),day("2026-09-30",1),day("2026-10-29",1));var s=service.get(owner,"2026-09","UTC");assertThat(s.currentStreakDays()).isEqualTo(1);assertThat(s.longestStreakDays()).isEqualTo(3);assertThat(s.calendar().completedSessions()).isEqualTo(3);assertThat(s.totalStudiedDays()).isEqualTo(4);
    }
    @Test void futureCalendarIsZeroWithoutResettingCurrentStreak() {
        rows(day("2026-10-28",1),day("2026-10-29",1));var s=service.get(owner,"2026-11","UTC");assertThat(s.currentStreakDays()).isEqualTo(2);assertThat(s.calendar().completedSessions()).isZero();assertThat(s.calendar().days()).hasSize(30);
    }
    @Test void ownerAndHistoryBoundariesAreForwardedAndNoPreferenceIsCreated() {
        rows();service.get(owner,"2026-02","Asia/Ho_Chi_Minh");verify(repository).days(eq(owner),eq(ZoneId.of("Asia/Ho_Chi_Minh")),eq(LocalDate.of(1900,1,1).atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant()),eq(Instant.parse("2026-10-29T17:00:00Z")));verifyNoInteractions(users);
    }
    @Test void invalidInputDoesNotScanSessionHistory() {
        assertThatThrownBy(()->service.get(owner,"2026-13","UTC")).isInstanceOf(PomodoroApiException.class);verifyNoInteractions(repository);
    }
    @Test void missingProfileCannotSilentlyUseSomeOtherAccountsZone() {
        when(users.findById(owner)).thenReturn(Optional.empty());assertThatThrownBy(()->service.get(owner,null,null)).isInstanceOfSatisfying(PomodoroApiException.class,e->assertThat(e.status().value()).isEqualTo(401));verifyNoInteractions(repository);
    }
}
