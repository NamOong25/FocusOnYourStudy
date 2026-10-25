package com.focusstudy.exams;

import java.util.*;
import java.time.Instant;
import org.springframework.data.jpa.repository.*;

public interface ExamRepository extends JpaRepository<ExamEntity, UUID>, JpaSpecificationExecutor<ExamEntity> {
    Optional<ExamEntity> findByIdAndUserId(UUID id, UUID userId);
    boolean existsByUserIdAndCourseId(UUID userId, UUID courseId);
    List<ExamEntity> findByUserIdAndStartsAtLessThanAndEndsAtGreaterThan(UUID userId, Instant end, Instant start);
}
