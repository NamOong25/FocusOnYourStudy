package com.focusstudy.grades.results;

import com.focusstudy.grades.configuration.GradeConfigurationRequests.*;
import com.focusstudy.grades.configuration.GradeConfigurationResponse.State;
import com.focusstudy.grades.scores.GradeScoresResponse;
import java.math.*;
import java.util.*;
import static com.focusstudy.grades.results.IuhCourseResult.*;

/** Computes from one trusted server snapshot; displayed percentage weights are not calculation inputs. */
public final class IuhCourseCalculator {
    private IuhCourseCalculator() { }
    private static final BigDecimal HUNDRED = new BigDecimal("100");
    public static IuhCourseResult calculate(GradeScoresResponse snapshot, int credits) {
        var parts = snapshot.parts(); var missing = new ArrayList<MissingScore>(); var columns = new ArrayList<Column>();
        var effective = new HashMap<String, BigDecimal>(); var notices = new ArrayList<Notice>();
        for (var part : parts) {
            if (part.score() == null) missing.add(new MissingScore(part.id(), ValueField.SCORE));
            boolean partial = part.kind() == Kind.PROJECT && part.project().target() == Target.FINAL && part.project().share().compareTo(HUNDRED) < 0;
            if (partial && part.remainderScore() == null) missing.add(new MissingScore(part.id(), ValueField.REMAINDER_SCORE));
            BigDecimal value = part.score();
            if (partial) value = part.score() == null || part.remainderScore() == null ? null
                    : part.score().multiply(part.project().share()).add(part.remainderScore().multiply(HUNDRED.subtract(part.project().share())))
                            .divide(HUNDRED, 1, RoundingMode.HALF_UP);
            effective.put(part.id(), value); columns.add(new Column(part.id(), value));
        }
        boolean theory = snapshot.assessment() == Assessment.THEORY;
        var regular = parts.stream().filter(p -> p.kind() == Kind.REGULAR || p.kind() == Kind.REGULAR_TEST).toList();
        BigDecimal average = null;
        if (!regular.isEmpty() && regular.stream().allMatch(p -> effective.get(p.id()) != null)) {
            // One column represents the already published regular average. For
            // separate tests, derive that component and round it to one decimal.
            average = regular.size() == 1 ? effective.get(regular.getFirst().id())
                    : regular.stream().map(p -> effective.get(p.id())).reduce(BigDecimal.ZERO, BigDecimal::add)
                            .divide(BigDecimal.valueOf(regular.size()), 1, RoundingMode.HALF_UP);
        }
        var mid = parts.stream().filter(p -> p.kind() == Kind.MIDTERM).findFirst().map(GradeScoresResponse.Part::score).orElse(null);
        var finalPart = parts.stream().filter(p -> p.kind() == Kind.FINAL || (p.kind() == Kind.PROJECT && p.project().target() == Target.FINAL)).findFirst().orElse(null);
        BigDecimal finalScore = finalPart == null ? null : effective.get(finalPart.id());
        var eligibility = !theory ? ExamEligibility.NOT_EVALUATED : mid == null ? ExamEligibility.UNKNOWN
                : mid.signum() == 0 ? ExamEligibility.BLOCKED_BY_MIDTERM_ZERO : ExamEligibility.ELIGIBLE_BY_MIDTERM;
        boolean blocked = eligibility == ExamEligibility.BLOCKED_BY_MIDTERM_ZERO;
        boolean ready = snapshot.configurationState() == State.READY;
        boolean allEntered = !parts.isEmpty() && missing.isEmpty();
        boolean complete = ready && allEntered && !blocked;
        boolean finalBelowMinimum = theory && finalScore != null && finalScore.compareTo(new BigDecimal("3")) < 0;
        if (theory && regular.size() == 1) notices.add(new Notice("REPORTED_REGULAR_AVERAGE", "Cột thường kỳ duy nhất được dùng như điểm trung bình thường kỳ đã công bố."));
        if (theory && regular.size() > 1 && regular.size() != (credits >= 3 ? 3 : 2))
            notices.add(new Notice("CUSTOM_REGULAR_COLUMN_COUNT", "Số cột thường kỳ khác gợi ý theo tín chỉ; kiểm tra đúng bộ cột của môn."));
        if (!theory && !parts.isEmpty() && parts.size() != (credits >= 3 ? 5 : 3))
            notices.add(new Notice("CUSTOM_PRACTICAL_COLUMN_COUNT", "Đang tính trung bình bộ cột tùy chỉnh; gợi ý theo tín chỉ là " + (credits >= 3 ? 5 : 3) + " cột."));
        BigDecimal weighted = null, raw = null, total = null, point = null; String letter = null;
        if (complete) {
            if (theory) {
                weighted = average.multiply(new BigDecimal("0.2")).add(mid.multiply(new BigDecimal("0.3"))).add(finalScore.multiply(new BigDecimal("0.5")));
                raw = finalBelowMinimum ? finalScore : weighted; total = raw.setScale(1, RoundingMode.HALF_UP);
            } else {
                BigDecimal sum = effective.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
                var denominator = BigDecimal.valueOf(parts.size());
                // Round the exact division to 0.1 directly, never 100/N weights
                // or a rounded intermediate approximation of the average.
                weighted = sum.divide(denominator, 12, RoundingMode.HALF_UP); raw = weighted;
                total = sum.divide(denominator, 1, RoundingMode.HALF_UP);
            }
            var band = band(total); letter = band.letter(); point = band.point();
        }
        Status status; String reason; Boolean passed = null, retake = null;
        if (blocked) { status = Status.EXAM_BLOCKED; reason = "MIDTERM_ZERO"; }
        else if (!ready) { status = Status.INCOMPLETE_CONFIGURATION; reason = "MISSING_GROUPS"; }
        else if (finalBelowMinimum) { status = Status.FAILED; reason = "FINAL_BELOW_3"; passed = false; retake = true; }
        else if (!allEntered) { status = Status.INCOMPLETE_SCORES; reason = "MISSING_SCORES"; }
        else if (total.compareTo(new BigDecimal("4")) < 0) { status = Status.FAILED; reason = "TOTAL_BELOW_4"; passed = false; retake = true; }
        else { status = Status.PASSED; reason = "TOTAL_AT_LEAST_4"; passed = true; retake = false; }
        return new IuhCourseResult(status, reason, complete, allEntered, passed, retake, eligibility, average, finalScore, weighted, raw, total, letter, point,
                (int) columns.stream().filter(c -> c.effectiveScore() != null).count(), parts.size(), snapshot.missingGroups(),
                List.copyOf(missing), List.copyOf(columns), List.copyOf(notices));
    }
    private record Band(BigDecimal minimum, String letter, BigDecimal point) { }
    private static final List<Band> BANDS = List.of(
            b("9", "A+", "4.0"), b("8.5", "A", "3.8"), b("8", "B+", "3.5"), b("7", "B", "3.0"),
            b("6", "C+", "2.5"), b("5.5", "C", "2.0"), b("5", "D+", "1.5"), b("4", "D", "1.0"), b("0", "F", "0.0"));
    private static Band b(String minimum, String letter, String point) { return new Band(new BigDecimal(minimum), letter, new BigDecimal(point)); }
    private static Band band(BigDecimal total) { return BANDS.stream().filter(b -> total.compareTo(b.minimum()) >= 0).findFirst().orElseThrow(); }
}
