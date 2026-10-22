package com.focusstudy.academics.semesters;

import com.focusstudy.academics.SemesterEntity;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface SemesterRepository extends JpaRepository<SemesterEntity, UUID> {
    List<SemesterEntity> findByUserIdOrderByStartYearDescTermDesc(UUID userId);
    Optional<SemesterEntity> findByIdAndUserId(UUID id, UUID userId);
    Optional<SemesterEntity> findByUserIdAndStatus(UUID userId, SemesterEntity.Status status);
    boolean existsByUserIdAndStartYearAndTermAndIdNot(UUID userId, int startYear, short term, UUID id);
    boolean existsByUserIdAndStartYearAndTerm(UUID userId, int startYear, short term);
    @Query("select count(c) > 0 from CourseEntity c where c.semesterId = :semesterId and c.userId = :userId")
    boolean hasCourses(UUID semesterId, UUID userId);
}
