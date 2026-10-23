package com.focusstudy.study;

import java.time.Instant;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface StudySessionRepository extends JpaRepository<StudySessionEntity, UUID>, JpaSpecificationExecutor<StudySessionEntity> {
    Optional<StudySessionEntity> findByIdAndUserId(UUID id, UUID userId);
    List<StudySessionEntity> findByUserIdAndAssignmentId(UUID userId, UUID assignmentId);
    boolean existsByUserIdAndCourseId(UUID userId, UUID courseId);
    boolean existsByUserIdAndAssignmentId(UUID userId, UUID assignmentId);
    boolean existsByUserIdAndAssignmentIdAndEndsAtAfter(UUID userId, UUID assignmentId, Instant deadline);
    @Query("select (count(s) > 0) from StudySessionEntity s where s.userId = :owner and s.startsAt < :end and s.endsAt > :start")
    boolean overlaps(@Param("owner") UUID owner, @Param("start") Instant start, @Param("end") Instant end);
    @Query("select (count(s) > 0) from StudySessionEntity s where s.userId = :owner and s.startsAt < :end and s.endsAt > :start and s.id <> :excluded")
    boolean overlapsExcept(@Param("owner") UUID owner, @Param("start") Instant start, @Param("end") Instant end, @Param("excluded") UUID excluded);
}
