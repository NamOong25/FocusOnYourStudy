package com.focusstudy.assignments;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AssignmentRepository extends JpaRepository<AssignmentEntity, UUID>, JpaSpecificationExecutor<AssignmentEntity> {
    Optional<AssignmentEntity> findByIdAndUserId(UUID id, UUID userId);
    boolean existsByUserIdAndCourseId(UUID userId, UUID courseId);
}
