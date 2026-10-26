package com.focusstudy.grades.attempts;

import com.focusstudy.academics.semesters.SemesterResponse;
import java.util.*;
import static com.focusstudy.grades.attempts.CourseAttemptsResponse.*;

public final class CourseAttemptsTimeline {
    private CourseAttemptsTimeline() { }
    public record Entry(SemesterResponse semester, Course course) { }
    private record Key(String code, int credits) { }
    private record Period(int year, int term) implements Comparable<Period> {
        @Override public int compareTo(Period other) {
            int yearOrder = Integer.compare(year, other.year);
            return yearOrder == 0 ? Integer.compare(term, other.term) : yearOrder;
        }
    }
    public static CourseAttemptsResponse build(UUID focusCourseId, List<Entry> entries) {
        var grouped = new TreeMap<Key, List<Entry>>(Comparator.comparing(Key::code).thenComparingInt(Key::credits));
        for (var e : entries) grouped.computeIfAbsent(new Key(e.course().code(), e.course().credits()), k -> new ArrayList<>()).add(e);
        var variantsByCode = new HashMap<String, List<CreditVariant>>();
        grouped.forEach((key, rows) -> variantsByCode.computeIfAbsent(key.code(), k -> new ArrayList<>()).add(
                new CreditVariant(key.credits(), rows.stream().map(e -> e.course().id()).sorted().toList())));
        var groups = new ArrayList<Group>();
        for (var item : grouped.entrySet()) {
            var key = item.getKey(); var rows = item.getValue();
            var issues = EnumSet.noneOf(Issue.class);
            var variants = variantsByCode.get(key.code()).stream().filter(v -> v.credits() != key.credits()).toList();
            if (!variants.isEmpty()) issues.add(Issue.CREDIT_VARIANTS);
            if (rows.stream().map(e -> e.course().assessment()).filter(Objects::nonNull).distinct().count() > 1) issues.add(Issue.ASSESSMENT_VARIANTS);
            var periods = new TreeMap<Period, List<Entry>>();
            for (var row : rows) periods.computeIfAbsent(new Period(row.semester().startYear(), row.semester().term()), k -> new ArrayList<>()).add(row);
            var attempts = new ArrayList<Attempt>();
            List<Entry> previous = List.of(); int recorded = 0;
            for (var samePeriod : periods.values()) {
                // UUID only stabilizes display for a tie; it never decides academic precedence.
                samePeriod.sort(Comparator.comparing(e -> e.course().id()));
                var candidates = previous.stream().map(e -> e.course().id()).sorted().toList();
                if (samePeriod.size() > 1) issues.add(Issue.AMBIGUOUS_PERIOD);
                for (var row : samePeriod) {
                    Relation relation = samePeriod.size() > 1 ? Relation.AMBIGUOUS_PERIOD
                            : previous.isEmpty() ? Relation.FIRST_RECORDED
                            : previous.size() > 1 ? Relation.AMBIGUOUS_PREDECESSOR
                            : relation(previous.getFirst().course());
                    UUID predecessor = samePeriod.size() == 1 && previous.size() == 1 ? candidates.getFirst() : null;
                    attempts.add(new Attempt(samePeriod.size() == 1 ? recorded + 1 : null, predecessor,
                            candidates, relation, row.semester(), row.course()));
                }
                recorded += samePeriod.size(); previous = samePeriod;
            }
            groups.add(new Group(key.code(), key.credits(), !issues.isEmpty(), List.copyOf(issues), variants, List.copyOf(attempts)));
        }
        return new CourseAttemptsResponse(focusCourseId, POLICY,
                new Summary(groups.size(), entries.size(), (int) groups.stream().filter(g -> g.attempts().size() > 1).count(),
                        (int) groups.stream().filter(Group::needsReview).count()), List.copyOf(groups));
    }
    private static Relation relation(Course previous) {
        if (!previous.complete() || previous.passed() == null) return Relation.FOLLOWUP_PREVIOUS_UNRESOLVED;
        return previous.passed() ? Relation.FOLLOWUP_AFTER_PASSED_RESULT : Relation.RETAKE_AFTER_FAILED_RESULT;
    }
}
