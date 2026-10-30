package com.focusstudy.common.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import com.focusstudy.auth.AuthApiException;
import com.focusstudy.academics.semesters.SemesterApiException;
import com.focusstudy.academics.courses.CourseApiException;
import com.focusstudy.assignments.AssignmentApiException;
import com.focusstudy.study.StudyApiException;
import com.focusstudy.focus.PomodoroApiException;
import com.focusstudy.exams.ExamApiException;
import com.focusstudy.grades.configuration.GradeConfigurationApiException;
import com.focusstudy.schedule.ClassScheduleApiException;
import com.focusstudy.schedule.ScheduleTimeConflict;
import java.util.Comparator;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    public record FieldError(String field, String message) { }
    @ExceptionHandler(com.focusstudy.notifications.NotificationApiException.class)
    ResponseEntity<ProblemDetail> notificationProblem(com.focusstudy.notifications.NotificationApiException ex, HttpServletRequest request) {
        return ResponseEntity.status(ex.status()).cacheControl(CacheControl.noStore())
                .body(ApiProblems.of(ex.status(), ex.code(), ex.getMessage(), request));
    }
    @ExceptionHandler(PomodoroApiException.class)
    ResponseEntity<ProblemDetail> pomodoroProblem(PomodoroApiException ex, HttpServletRequest request) {
        return ResponseEntity.status(ex.status()).cacheControl(CacheControl.noStore()).body(ApiProblems.of(ex.status(), ex.code(), ex.getMessage(), request));
    }
    @ExceptionHandler(GradeConfigurationApiException.class)
    ResponseEntity<ProblemDetail> gradeConfigurationProblem(GradeConfigurationApiException ex, HttpServletRequest request) {
        return ResponseEntity.status(ex.status()).cacheControl(CacheControl.noStore()).body(ApiProblems.of(ex.status(), ex.code(), ex.getMessage(), request));
    }
    @ExceptionHandler(ExamApiException.class)
    ResponseEntity<ProblemDetail> examProblem(ExamApiException ex, HttpServletRequest request) {
        return ResponseEntity.status(ex.status()).cacheControl(CacheControl.noStore()).body(ApiProblems.of(ex.status(), ex.code(), ex.getMessage(), request));
    }
    @ExceptionHandler(ScheduleTimeConflict.class)
    ResponseEntity<ProblemDetail> timeConflict(ScheduleTimeConflict ex, HttpServletRequest request) {
        var problem = ApiProblems.of(HttpStatus.CONFLICT, "SCHEDULE_TIME_CONFLICT", ex.getMessage(), request);
        problem.setProperty("conflict", ex.conflict());
        return ResponseEntity.status(HttpStatus.CONFLICT).cacheControl(CacheControl.noStore()).body(problem);
    }
    @ExceptionHandler(ClassScheduleApiException.class)
    ResponseEntity<ProblemDetail> classProblem(ClassScheduleApiException ex, HttpServletRequest request) {
        return ResponseEntity.status(ex.status()).cacheControl(CacheControl.noStore())
                .body(ApiProblems.of(ex.status(), ex.code(), ex.getMessage(), request));
    }
    @ExceptionHandler(StudyApiException.class)
    ResponseEntity<ProblemDetail> studyProblem(StudyApiException ex, HttpServletRequest request) {
        return ResponseEntity.status(ex.status()).cacheControl(CacheControl.noStore())
                .body(ApiProblems.of(ex.status(), ex.code(), ex.getMessage(), request));
    }
    @ExceptionHandler(AssignmentApiException.class)
    ResponseEntity<ProblemDetail> assignmentProblem(AssignmentApiException ex, HttpServletRequest request) {
        return ResponseEntity.status(ex.status()).cacheControl(CacheControl.noStore())
                .body(ApiProblems.of(ex.status(), ex.code(), ex.getMessage(), request));
    }
    @ExceptionHandler(CourseApiException.class)
    ResponseEntity<ProblemDetail> courseProblem(CourseApiException ex, HttpServletRequest request) {
        return ResponseEntity.status(ex.status()).cacheControl(CacheControl.noStore())
                .body(ApiProblems.of(ex.status(), ex.code(), ex.getMessage(), request));
    }
    @ExceptionHandler(SemesterApiException.class)
    ResponseEntity<ProblemDetail> semesterProblem(SemesterApiException ex, HttpServletRequest request) {
        return ResponseEntity.status(ex.status()).cacheControl(CacheControl.noStore())
                .body(ApiProblems.of(ex.status(), ex.code(), ex.getMessage(), request));
    }

    @ExceptionHandler(AuthApiException.class)
    ResponseEntity<ProblemDetail> authProblem(AuthApiException ex, HttpServletRequest request) {
        var response = ResponseEntity.status(ex.status()).cacheControl(CacheControl.noStore());
        if (ex.status() == HttpStatus.UNAUTHORIZED) response.header(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
        return response.body(ApiProblems.of(ex.status(), ex.code(), ex.getMessage(), request));
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception ex, Object body, HttpHeaders headers,
                                                              HttpStatusCode status, WebRequest request) {
        HttpStatus http = HttpStatus.valueOf(status.value());
        String code = switch (http) {
            case NOT_FOUND -> "NOT_FOUND";
            case METHOD_NOT_ALLOWED -> "METHOD_NOT_ALLOWED";
            case UNSUPPORTED_MEDIA_TYPE -> "UNSUPPORTED_MEDIA_TYPE";
            case NOT_ACCEPTABLE -> "NOT_ACCEPTABLE";
            default -> http.is5xxServerError() ? "INTERNAL_ERROR" : "INVALID_REQUEST";
        };
        String message = http.is5xxServerError() ? "Chưa thể xử lý yêu cầu. Hãy thử lại sau."
                : "Yêu cầu chưa hợp lệ. Kiểm tra đường dẫn, phương thức và nội dung gửi lên.";
        ProblemDetail problem = ApiProblems.of(http, code, message, ((ServletWebRequest) request).getRequest());
        if (ex instanceof MethodArgumentNotValidException invalid) {
            problem.setProperty("code", "VALIDATION_FAILED");
            problem.setType(java.net.URI.create("urn:focus-study:problem:validation-failed"));
            problem.setDetail("Kiểm tra các trường được báo lỗi.");
            List<FieldError> errors = invalid.getBindingResult().getFieldErrors().stream()
                    .map(error -> new FieldError(error.getField(), error.getDefaultMessage()))
                    .distinct().sorted(Comparator.comparing(FieldError::field).thenComparing(FieldError::message)).toList();
            problem.setProperty("errors", errors);
        }
        return super.handleExceptionInternal(ex, problem, headers, status, request);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ProblemDetail> invalidConstraint(ConstraintViolationException ex, HttpServletRequest request) {
        var problem = ApiProblems.of(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Kiểm tra các trường được báo lỗi.", request);
        problem.setProperty("errors", ex.getConstraintViolations().stream()
                .map(v -> new FieldError(v.getPropertyPath().toString(), v.getMessage()))
                .sorted(Comparator.comparing(FieldError::field)).toList());
        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler({DataIntegrityViolationException.class, OptimisticLockingFailureException.class})
    ResponseEntity<ProblemDetail> conflict(DataAccessException ex, HttpServletRequest request) {
        return ResponseEntity.status(409).body(ApiProblems.of(HttpStatus.CONFLICT, "DATA_CONFLICT",
                "Dữ liệu bị trùng hoặc còn liên kết. Kiểm tra lại trước khi lưu.", request));
    }

    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<ProblemDetail> unavailable(DataAccessException ex, HttpServletRequest request) {
        return ResponseEntity.status(503).body(ApiProblems.of(HttpStatus.SERVICE_UNAVAILABLE, "DATABASE_UNAVAILABLE",
                "Chưa kết nối được dữ liệu. Hãy thử lại sau.", request));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> unexpected(Exception ex, HttpServletRequest request) {
        LOG.error("Unhandled API error", ex);
        return ResponseEntity.internalServerError().body(ApiProblems.of(HttpStatus.INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR", "Chưa thể xử lý yêu cầu. Hãy thử lại sau.", request));
    }
}
