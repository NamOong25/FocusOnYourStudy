package com.focusstudy.grades.configuration;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

public final class GradeConfigurationRequests {
    private GradeConfigurationRequests() { }
    public enum Assessment { THEORY, PRACTICAL }
    public enum Kind { REGULAR, REGULAR_TEST, MIDTERM, PRACTICE_REGULAR, PRACTICE_TEST, FINAL, PROJECT }
    public enum Target { PRACTICE, FINAL }

    public abstract static class StrictInput {
        // Prevent a caller accidentally submitting scores or forged weights to
        // this configuration-only endpoint and receiving a misleading success.
        @JsonAnySetter public void rejectUnknown(String key, Object value) {
            throw new IllegalArgumentException("Unsupported grade configuration field");
        }
    }
    public static class Create extends StrictInput {
        @NotNull public Assessment assessment;
        @NotNull @Size(max = 10) public List<@NotNull @Valid Part> parts;
    }
    public static class Update extends Create {
        @NotNull @PositiveOrZero public Long version;
    }
    public static class Part extends StrictInput {
        @NotBlank @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9_-]{0,79}") public String id;
        @NotBlank @Size(max = 200) public String name;
        @NotNull public Kind kind;
        @Valid public Project project;
    }
    public static class Project extends StrictInput {
        @NotNull public Target target;
        @NotNull @DecimalMin(value = "0", inclusive = false) @DecimalMax("100") @Digits(integer = 3, fraction = 4)
        public BigDecimal share;
    }
}
