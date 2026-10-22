package com.focusstudy.academics.semesters;

import org.springframework.http.HttpStatus;

public class SemesterApiException extends RuntimeException {
    private final HttpStatus status;
    private final String code;
    public SemesterApiException(HttpStatus status, String code, String message) {
        super(message); this.status = status; this.code = code;
    }
    public HttpStatus status() { return status; }
    public String code() { return code; }
}
