package com.focusstudy.assignments;

import org.springframework.http.HttpStatus;

public class AssignmentApiException extends RuntimeException {
    private final HttpStatus status;
    private final String code;
    public AssignmentApiException(HttpStatus status, String code, String message) { super(message); this.status = status; this.code = code; }
    public HttpStatus status() { return status; }
    public String code() { return code; }
}
