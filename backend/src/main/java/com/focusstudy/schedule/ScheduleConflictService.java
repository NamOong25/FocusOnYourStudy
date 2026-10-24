package com.focusstudy.schedule;

import com.focusstudy.academics.courses.CourseRepository;
import com.focusstudy.study.StudySessionRepository;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Called inside the writer transaction, after the shared account lock. No service cycle or per-day queries. */
@Service
@Transactional(propagation = Propagation.MANDATORY)
public class ScheduleConflictService {
    private final ClassScheduleRepository schedules;
    private final ClassExceptionRepository exceptions;
    private final StudySessionRepository studies;
    private final CourseRepository courses;
    public ScheduleConflictService(ClassScheduleRepository schedules, ClassExceptionRepository exceptions,
            StudySessionRepository studies, CourseRepository courses) {
        this.schedules = schedules; this.exceptions = exceptions; this.studies = studies; this.courses = courses;
    }
    private record Busy(String kind, UUID id, UUID courseId, String title, String zone, Instant start, Instant end) { }
    private static final Comparator<Busy> ORDER = Comparator.comparing(Busy::start).thenComparing(Busy::kind)
            .thenComparing(Busy::id, Comparator.nullsFirst(Comparator.naturalOrder()));

    public void checkRule(UUID owner, ClassScheduleEntity candidate, List<ClassExceptionEntity> overrides, UUID excludedRule) {
        var byDate = new HashMap<LocalDate, ClassExceptionEntity>();
        for (var e : overrides) byDate.put(e.getDate(), e);
        var proposed = expand(candidate, byDate, candidate.getStartsOn(), candidate.getEndsOn());
        check(owner, proposed, excludedRule, true);
    }
    public void checkOccurrence(UUID owner, ClassScheduleEntity rule, LocalDate day, ClassExceptionEntity override) {
        var proposed = new ArrayList<Busy>();
        add(proposed, rule, day, override);
        check(owner, proposed, rule.getId(), true);
    }
    public void checkStudy(UUID owner, Instant start, Instant end) {
        // Self-study/self-study checks keep their established STUDY_TIME_CONFLICT contract.
        check(owner, List.of(new Busy("STUDY", new UUID(0, 0), null, "", "UTC", start, end)), null, false);
    }
    private void check(UUID owner, List<Busy> proposed, UUID excludedRule, boolean includeStudies) {
        if (proposed.isEmpty()) return; // Cancelled days do not reserve any time.
        proposed = new ArrayList<>(proposed); proposed.sort(ORDER);
        var from = proposed.getFirst().start();
        var to = proposed.stream().map(Busy::end).max(Comparator.naturalOrder()).orElseThrow();
        // Rule dates are local. A padded UTC date window includes even opposite date-line zones.
        var low = from.atZone(ZoneOffset.UTC).toLocalDate().minusDays(2);
        var high = to.atZone(ZoneOffset.UTC).toLocalDate().plusDays(2);
        var rules = schedules.findByUserIdAndStartsOnLessThanEqualAndEndsOnGreaterThanEqual(owner, high, low).stream()
                .filter(s -> !s.getId().equals(excludedRule)).toList();
        var byRule = new HashMap<UUID, Map<LocalDate, ClassExceptionEntity>>();
        if (!rules.isEmpty()) for (var e : exceptions.findByUserIdAndScheduleIdInAndDateBetween(owner,
                rules.stream().map(ClassScheduleEntity::getId).toList(), low, high))
            byRule.computeIfAbsent(e.getScheduleId(), ignored -> new HashMap<>()).put(e.getDate(), e);
        var busy = new ArrayList<Busy>();
        for (var rule : rules) busy.addAll(expand(rule, byRule.getOrDefault(rule.getId(), Map.of()), low, high));
        if (includeStudies) for (var study : studies.findByUserIdAndStartsAtLessThanAndEndsAtGreaterThan(owner, to, from))
            busy.add(new Busy("STUDY", study.getId(), study.getCourseId(), study.getTitle(), study.getTimeZone(), study.getStartsAt(), study.getEndsAt()));
        busy.sort(ORDER);
        int a = 0, b = 0;
        // Half-open [start,end), sweeping sorted intervals; never compare weekday/clock strings alone.
        while (a < proposed.size() && b < busy.size()) {
            var x = proposed.get(a); var y = busy.get(b);
            if (x.start().isBefore(y.end()) && y.start().isBefore(x.end())) throw conflict(owner, y);
            if (!x.end().isAfter(y.start())) a++; else b++;
        }
    }
    private List<Busy> expand(ClassScheduleEntity rule, Map<LocalDate, ClassExceptionEntity> overrides, LocalDate low, LocalDate high) {
        var result = new ArrayList<Busy>();
        var from = rule.getStartsOn().isAfter(low) ? rule.getStartsOn() : low;
        var to = rule.getEndsOn().isBefore(high) ? rule.getEndsOn() : high;
        for (var day = from; !day.isAfter(to); day = day.plusDays(1))
            if (ClassScheduleValidator.matches(rule.getWeekdayMask(), day)) add(result, rule, day, overrides.get(day));
        return result;
    }
    private void add(List<Busy> result, ClassScheduleEntity rule, LocalDate day, ClassExceptionEntity override) {
        var occurrence = ClassOccurrenceResponse.from(rule, day, override);
        if (!occurrence.cancelled()) result.add(new Busy("CLASS", rule.getId(), rule.getCourseId(), "Buổi học", rule.getTimeZone(), occurrence.startsAt(), occurrence.endsAt()));
    }
    private ScheduleTimeConflict conflict(UUID owner, Busy busy) {
        String name = courses.findByIdAndUserId(busy.courseId(), owner).orElseThrow().getName();
        var start = busy.start().atZone(ZoneId.of(busy.zone())); var end = busy.end().atZone(ZoneId.of(busy.zone()));
        return new ScheduleTimeConflict(new ScheduleTimeConflict.Conflict(busy.kind(), busy.id(), busy.courseId(), name, busy.title(),
                start.toLocalDate(), end.toLocalDate(), ClassScheduleResponse.time(start.toLocalTime()), ClassScheduleResponse.time(end.toLocalTime()), busy.zone(), busy.start(), busy.end()));
    }
}
