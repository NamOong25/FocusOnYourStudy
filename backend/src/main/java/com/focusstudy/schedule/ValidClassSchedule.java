package com.focusstudy.schedule;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Target(ElementType.TYPE) @Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ClassScheduleValidator.class)
public @interface ValidClassSchedule {
    String message() default "Ngày, thứ hoặc giờ học chưa hợp lệ.";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
