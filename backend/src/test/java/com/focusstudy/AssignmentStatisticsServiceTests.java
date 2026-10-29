package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.focusstudy.academics.*;
import com.focusstudy.academics.courses.*;
import com.focusstudy.academics.semesters.*;
import com.focusstudy.assignments.AssignmentApiException;
import com.focusstudy.assignments.statistics.*;
import com.focusstudy.users.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AssignmentStatisticsServiceTests {
    private final UUID owner=UUID.randomUUID(), semester=UUID.randomUUID(), course=UUID.randomUUID();
    private final AssignmentStatisticsRepository assignments=mock(AssignmentStatisticsRepository.class);
    private final SemesterRepository semesters=mock(SemesterRepository.class);
    private final CourseRepository courses=mock(CourseRepository.class);
    private final UserRepository users=mock(UserRepository.class);
    private final AssignmentStatisticsService service=new AssignmentStatisticsService(assignments,semesters,courses,users,
            Clock.fixed(Instant.parse("2026-10-28T18:00:00Z"),ZoneOffset.UTC));
    @BeforeEach void owned() {
        when(semesters.findByIdAndUserId(semester,owner)).thenReturn(Optional.of(mock(SemesterEntity.class)));
    }
    void totals(long total,long todo,long active,long completed,long overdue,long soon) {
        when(assignments.count(eq(owner),eq(semester),any(),any())).thenReturn(new AssignmentStatisticsRepository.Totals(total,todo,active,completed,overdue,soon));
    }
    AssignmentStatisticsService.Statistics get() { return service.get(owner,semester,null,"UTC"); }
    @Test void fiveTasksTwoCompletedMeans40PercentAndSeparateDeadlineCounts() {
        totals(5,2,1,2,1,1); var value=get();
        assertThat(value.totalAssignments()).isEqualTo(5); assertThat(value.completionPercent()).isEqualTo(40);
        assertThat(value.pendingAssignments()).isEqualTo(3); assertThat(value.notDueAssignments()).isEqualTo(2);
        assertThat(value.overdueAssignments()).isEqualTo(1); assertThat(value.dueSoonAssignments()).isEqualTo(1);
    }
    @Test void emptyCountsAreZeroAndNeverDivideByZeroOrClaim100Percent() {
        totals(0,0,0,0,0,0); var value=get();
        assertThat(value.totalAssignments()).isZero();assertThat(value.completionPercent()).isZero();assertThat(value.pendingAssignments()).isZero();
    }
    @Test void percentagesRoundHalfUpAndRemainWithin100WithoutOverflow() {
        totals(3,2,0,1,0,0); assertThat(get().completionPercent()).isEqualTo(33);
        totals(3,1,0,2,0,0); assertThat(get().completionPercent()).isEqualTo(67);
        totals(8,7,0,1,0,0); assertThat(get().completionPercent()).isEqualTo(13);
        totals(Long.MAX_VALUE,0,0,Long.MAX_VALUE,0,0); assertThat(get().completionPercent()).isEqualTo(100);
    }
    @Test void defaultZoneComesFromProfileAndQueryUsesTheSameSnapshot() {
        var user=UserEntity.register("qa@example.test","hash","QA","","");
        when(users.findById(owner)).thenReturn(Optional.of(user));totals(0,0,0,0,0,0);
        var value=service.get(owner,semester,null,null);
        assertThat(value.timeZone()).isEqualTo("Asia/Ho_Chi_Minh");assertThat(value.date()).isEqualTo(LocalDate.of(2026,10,29));
        verify(assignments).count(eq(owner),eq(semester),isNull(),argThat(w->w.asOf().equals(value.asOf())&&w.dueSoonThrough().equals(value.dueSoonThrough())));
    }
    @Test void ownedCourseIsValidatedAndPassedToAggregate() {
        when(courses.findByIdAndUserId(course,owner)).thenReturn(Optional.of(mock(CourseEntity.class)));totals(0,0,0,0,0,0);
        assertThat(service.get(owner,semester,course,"UTC").courseId()).isEqualTo(course);
        verify(assignments).count(eq(owner),eq(semester),eq(course),any());
    }
    @Test void missingSemesterIsInvalidWithoutAnyRead() {
        assertThatThrownBy(()->service.get(owner,null,null,"UTC")).isInstanceOf(AssignmentApiException.class);
        verifyNoInteractions(assignments,courses,users);verify(semesters,never()).findByIdAndUserId(any(),any());
    }
    @Test void foreignOrMissingSemesterIs404BeforeAnyAggregate() {
        when(semesters.findByIdAndUserId(semester,owner)).thenReturn(Optional.empty());
        assertThatThrownBy(this::get).isInstanceOfSatisfying(SemesterApiException.class,e->assertThat(e.status().value()).isEqualTo(404));
        verifyNoInteractions(assignments,courses,users);
    }
    @Test void foreignOrMissingCourseIs404WithoutAggregate() {
        assertThatThrownBy(()->service.get(owner,semester,course,"UTC")).isInstanceOfSatisfying(CourseApiException.class,e->assertThat(e.code()).isEqualTo("COURSE_NOT_FOUND"));
        verifyNoInteractions(assignments);
    }
    @Test void invalidZoneDoesNotReadAssignmentRows() {
        assertThatThrownBy(()->service.get(owner,semester,null,"UTC+07:00")).isInstanceOf(AssignmentApiException.class);
        verifyNoInteractions(assignments);
    }
    @Test void missingAccountCannotSupplyDefaultZone() {
        assertThatThrownBy(()->service.get(owner,semester,null,null)).isInstanceOfSatisfying(AssignmentApiException.class,e->assertThat(e.status().value()).isEqualTo(401));
        verifyNoInteractions(assignments);
    }
}
