package com.focusstudy.notifications;

import org.springframework.http.HttpStatus;

public class NotificationApiException extends RuntimeException {
    private final HttpStatus status;
    private final String code;
    public NotificationApiException(HttpStatus status, String code, String message) {
        super(message); this.status = status; this.code = code;
    }
    public HttpStatus status() { return status; }
    public String code() { return code; }
}
