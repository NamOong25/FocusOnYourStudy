package com.focusstudy.focus;

import java.util.*;
import org.springframework.data.jpa.repository.*;

public interface PomodoroRepository extends JpaRepository<PomodoroEntity, UUID> {
    Optional<PomodoroEntity> findByIdAndUserId(UUID id, UUID userId);
    Optional<PomodoroEntity> findByUserIdAndClientRequestId(UUID userId, UUID clientRequestId);
    Optional<PomodoroEntity> findByUserIdAndStatusIn(UUID userId, Collection<PomodoroEntity.Status> statuses);
    default Optional<PomodoroEntity> active(UUID owner) {
        return findByUserIdAndStatusIn(owner, List.of(PomodoroEntity.Status.RUNNING, PomodoroEntity.Status.PAUSED));
    }
}
