package com.focusstudy.grades.cumulative;

import com.focusstudy.grades.attempts.CourseAttemptsService;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class CumulativeGpaService {
    private final CourseAttemptsService attempts;
    public CumulativeGpaService(CourseAttemptsService attempts) { this.attempts = attempts; }
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public CumulativeGpaResponse get(UUID owner) {
        // The batched history read joins this transaction, keeping all source versions together.
        return CumulativeGpaCalculator.calculate(attempts.list(owner));
    }
}
