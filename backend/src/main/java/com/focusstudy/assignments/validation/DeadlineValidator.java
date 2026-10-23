package com.focusstudy.assignments.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;

public class DeadlineValidator implements ConstraintValidator<ValidDeadline, String> {
    private static final Instant MIN = Instant.parse("1900-01-01T00:00:00Z"), MAX = Instant.parse("2100-01-01T00:00:00Z");
    public static Instant parse(String value) {
        return OffsetDateTime.parse(value, DateTimeFormatter.ISO_OFFSET_DATE_TIME).toInstant().truncatedTo(ChronoUnit.MICROS);
    }
    @Override public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) return true; // @NotBlank provides the required-field error.
        try { var instant = parse(value); return !instant.isBefore(MIN) && instant.isBefore(MAX); }
        catch (DateTimeException failure) { return false; }
    }
}
