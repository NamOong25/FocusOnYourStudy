package com.focusstudy.exams;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Target(ElementType.TYPE) @Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ExamSchedule.class)
public @interface ValidExamSchedule {
    String message() default "Ngày, giờ hoặc mốc nhắc lịch thi chưa hợp lệ.";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
