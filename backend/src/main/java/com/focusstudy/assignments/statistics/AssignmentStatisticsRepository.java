package com.focusstudy.assignments.statistics;

import jakarta.persistence.EntityManager;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class AssignmentStatisticsRepository {
    public record Totals(long total, long todo, long inProgress, long completed, long overdue, long dueSoon) { }
    private final EntityManager entityManager;
    public AssignmentStatisticsRepository(EntityManager entityManager) { this.entityManager = entityManager; }

    /** Aggregate in PostgreSQL: no entity hydration, notes/titles, per-course reads or writes. */
    public Totals count(UUID owner, UUID semesterId, UUID courseId, AssignmentStatisticsWindow window) {
        String sql = """
                SELECT count(*),
                       count(*) FILTER (WHERE a.status = 'TODO'),
                       count(*) FILTER (WHERE a.status = 'IN_PROGRESS'),
                       count(*) FILTER (WHERE a.status = 'COMPLETED'),
                       count(*) FILTER (WHERE a.status <> 'COMPLETED' AND a.due_at < :asOf),
                       count(*) FILTER (WHERE a.status <> 'COMPLETED' AND a.due_at >= :asOf AND a.due_at <= :soonThrough)
                FROM assignments a
                JOIN courses c ON c.id = a.course_id AND c.user_id = a.user_id
                WHERE a.user_id = :owner AND c.user_id = :owner AND c.semester_id = :semesterId
                """;
        if (courseId != null) sql += " AND a.course_id = :courseId";
        var query = entityManager.createNativeQuery(sql)
                .setParameter("owner", owner).setParameter("semesterId", semesterId)
                .setParameter("asOf", window.asOf()).setParameter("soonThrough", window.dueSoonThrough());
        if (courseId != null) query.setParameter("courseId", courseId);
        var row = (Object[]) query.getSingleResult();
        return new Totals(number(row[0]), number(row[1]), number(row[2]), number(row[3]), number(row[4]), number(row[5]));
    }

    private static long number(Object value) { return ((Number) value).longValue(); }
}
