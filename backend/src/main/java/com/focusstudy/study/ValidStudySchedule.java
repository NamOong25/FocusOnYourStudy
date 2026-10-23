package com.focusstudy.study;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Target(ElementType.TYPE) @Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = StudySchedule.class)
public @interface ValidStudySchedule {
    String message() default "Ngày, giờ hoặc thời lượng buổi học chưa hợp lệ.";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
