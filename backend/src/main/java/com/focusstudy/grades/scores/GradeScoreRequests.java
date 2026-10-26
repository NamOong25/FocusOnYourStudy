package com.focusstudy.grades.scores;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.focusstudy.grades.configuration.GradeConfigurationRequests.StrictInput;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

public final class GradeScoreRequests {
    private GradeScoreRequests() { }
    public static class Update extends StrictInput {
        @NotNull @PositiveOrZero public Long version;
        @NotNull @Size(max = 10) public List<@NotNull @Valid Part> parts;
    }
    public static class Part extends StrictInput {
        @NotBlank @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9_-]{0,79}") public String id;
        @DecimalMin("0") @DecimalMax("10") @Digits(integer = 2, fraction = 4) private BigDecimal score;
        @DecimalMin("0") @DecimalMax("10") @Digits(integer = 2, fraction = 4) private BigDecimal remainderScore;
        private boolean scorePresent, remainderPresent;
        // Explicit JSON null clears a value. An omitted property must not clear
        // an existing mark accidentally, so distinguish presence from value.
        @JsonSetter("score") public void setScore(BigDecimal value) { score = value; scorePresent = true; }
        @JsonSetter("remainderScore") public void setRemainderScore(BigDecimal value) { remainderScore = value; remainderPresent = true; }
        public BigDecimal getScore() { return score; }
        public BigDecimal getRemainderScore() { return remainderScore; }
        public boolean valuesPresent() { return scorePresent && remainderPresent; }
    }
}
