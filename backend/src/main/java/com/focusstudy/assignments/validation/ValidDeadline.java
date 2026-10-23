package com.focusstudy.assignments.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Documented @Constraint(validatedBy = DeadlineValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT}) @Retention(RetentionPolicy.RUNTIME)
public @interface ValidDeadline {
    String message() default "Hạn nộp cần ngày/giờ ISO 8601 kèm Z hoặc độ lệch múi giờ, trong khoảng 1900–2099 theo UTC.";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
