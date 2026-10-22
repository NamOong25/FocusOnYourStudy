package com.focusstudy.auth.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Target(ElementType.TYPE) @Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = PasswordConfirmationValidator.class)
public @interface PasswordConfirmation {
    String message() default "Mật khẩu xác nhận chưa trùng khớp";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
