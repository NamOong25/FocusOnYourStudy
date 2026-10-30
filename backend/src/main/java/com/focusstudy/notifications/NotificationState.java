package com.focusstudy.notifications;

import java.time.Instant;
import java.util.List;

public record NotificationState(NotificationRequests.Target target, boolean available,
        String revision, Basis basis, boolean read, Instant readAt) {
    /** Lets the client reject a query response newer than the content it displayed. */
    public record Basis(long sourceVersion, long courseVersion, long semesterVersion,
            @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
            Integer milestoneMinutes) { }
    public record Snapshot(Instant asOf, List<NotificationState> items) { }
}
