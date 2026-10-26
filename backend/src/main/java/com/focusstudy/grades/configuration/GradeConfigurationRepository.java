package com.focusstudy.grades.configuration;

import java.util.*;
import org.springframework.data.jpa.repository.*;

public interface GradeConfigurationRepository extends JpaRepository<GradeConfigurationEntity, UUID>, JpaSpecificationExecutor<GradeConfigurationEntity> {
    Optional<GradeConfigurationEntity> findByIdAndUserId(UUID id, UUID userId);
    Optional<GradeConfigurationEntity> findByUserIdAndCourseId(UUID userId, UUID courseId);
    boolean existsByUserIdAndCourseId(UUID userId, UUID courseId);
    @Query("select distinct g from GradeConfigurationEntity g left join fetch g.columns where g.userId = :userId and g.courseId in :courseIds")
    List<GradeConfigurationEntity> findForCourses(UUID userId, Collection<UUID> courseIds);
}
