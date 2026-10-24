package com.focusstudy.schedule;

import org.springframework.http.HttpStatus;

public class ClassScheduleApiException extends RuntimeException {
    private final HttpStatus status;
    private final String code;
    public ClassScheduleApiException(HttpStatus status, String code, String message) { super(message); this.status = status; this.code = code; }
    public HttpStatus status() { return status; }
    public String code() { return code; }
}
