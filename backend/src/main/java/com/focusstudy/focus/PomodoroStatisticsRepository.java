package com.focusstudy.focus;

import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.Predicate;
import java.util.*;
import org.springframework.stereotype.Repository;

@Repository
public class PomodoroStatisticsRepository {
    private final EntityManager entityManager;
    public PomodoroStatisticsRepository(EntityManager entityManager) { this.entityManager = entityManager; }

    /** One bounded (7–31 calendar days) query, no live source joins and no per-day N+1 reads. */
    public List<PomodoroStatisticsRow> completed(UUID owner, PomodoroStatisticsWindow window, UUID courseId, UUID semesterId) {
        var cb = entityManager.getCriteriaBuilder();
        var query = cb.createQuery(PomodoroStatisticsRow.class);
        var row = query.from(PomodoroEntity.class);
        var filters = new ArrayList<Predicate>();
        filters.add(cb.equal(row.get("userId"), owner));
        filters.add(cb.equal(row.get("status"), PomodoroEntity.Status.COMPLETED));
        filters.add(cb.greaterThanOrEqualTo(row.get("endedAt"), window.from()));
        filters.add(cb.lessThan(row.get("endedAt"), window.to()));
        if (courseId != null) filters.add(cb.equal(row.get("courseId"), courseId));
        if (semesterId != null) filters.add(cb.equal(row.get("semesterId"), semesterId));
        query.select(cb.construct(PomodoroStatisticsRow.class, row.get("id"), row.get("courseId"),
                row.get("courseCode"), row.get("courseName"), row.get("semesterId"), row.get("semesterTerm"),
                row.get("semesterStartYear"), row.get("endedAt"), row.get("elapsedMillis")))
                .where(filters.toArray(Predicate[]::new));
        return entityManager.createQuery(query).getResultList();
    }
}
