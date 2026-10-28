package com.focusstudy.focus;

import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PomodoroPreferenceRepository extends JpaRepository<PomodoroPreferenceEntity, UUID> {
    Optional<PomodoroPreferenceEntity> findByUserId(UUID userId);
}
