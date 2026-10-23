package com.focusstudy.academics.courses;

import com.focusstudy.academics.CourseEntity;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseRepository extends JpaRepository<CourseEntity, UUID> {
    List<CourseEntity> findByUserIdOrderByCodeAscIdAsc(UUID userId);
    List<CourseEntity> findByUserIdAndSemesterIdOrderByCodeAscIdAsc(UUID userId, UUID semesterId);
    Optional<CourseEntity> findByIdAndUserId(UUID id, UUID userId);
    boolean existsByUserIdAndSemesterIdAndCode(UUID userId, UUID semesterId, String code);
    boolean existsByUserIdAndSemesterIdAndCodeAndIdNot(UUID userId, UUID semesterId, String code, UUID id);
}
