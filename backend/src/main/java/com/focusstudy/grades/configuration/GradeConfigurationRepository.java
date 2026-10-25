package com.focusstudy.grades.configuration;

import java.util.*;
import org.springframework.data.jpa.repository.*;

public interface GradeConfigurationRepository extends JpaRepository<GradeConfigurationEntity, UUID>, JpaSpecificationExecutor<GradeConfigurationEntity> {
    Optional<GradeConfigurationEntity> findByIdAndUserId(UUID id, UUID userId);
    Optional<GradeConfigurationEntity> findByUserIdAndCourseId(UUID userId, UUID courseId);
    boolean existsByUserIdAndCourseId(UUID userId, UUID courseId);
}
