package com.focusstudy.schedule;

import java.time.LocalDate;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClassExceptionRepository extends JpaRepository<ClassExceptionEntity, UUID> {
    Optional<ClassExceptionEntity> findByScheduleIdAndUserIdAndDate(UUID scheduleId, UUID owner, LocalDate date);
    List<ClassExceptionEntity> findByScheduleIdAndUserIdOrderByDateAsc(UUID scheduleId, UUID owner);
    List<ClassExceptionEntity> findByUserIdAndScheduleIdInAndDateBetween(UUID owner, Collection<UUID> scheduleIds, LocalDate from, LocalDate to);
}
