package com.focusstudy.schedule;

import java.util.*;
import java.time.LocalDate;
import org.springframework.data.jpa.repository.*;

public interface ClassScheduleRepository extends JpaRepository<ClassScheduleEntity, UUID>, JpaSpecificationExecutor<ClassScheduleEntity> {
    Optional<ClassScheduleEntity> findByIdAndUserId(UUID id, UUID userId);
    boolean existsByUserIdAndCourseId(UUID userId, UUID courseId);
    List<ClassScheduleEntity> findByUserIdAndStartsOnLessThanEqualAndEndsOnGreaterThanEqual(UUID userId, LocalDate high, LocalDate low);
}
