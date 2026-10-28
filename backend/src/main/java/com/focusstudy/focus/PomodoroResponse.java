package com.focusstudy.focus;

import java.time.Instant;
import java.util.UUID;

public record PomodoroResponse(UUID id, UUID clientRequestId, PomodoroEntity.Status status, int durationSeconds,
        Instant startedAt, Instant stateChangedAt, String timeZone, PomodoroEntity.Context context,
        Instant serverTime, long elapsedMillis, long pausedMillis, long remainingMillis,
        long remainingSeconds, Instant endsAt, boolean timeUp, long version) {
    public static PomodoroResponse from(PomodoroEntity row, Instant now) {
        var r = row.read(now);
        return new PomodoroResponse(row.getId(), row.getClientRequestId(), row.getStatus(), row.getDurationSeconds(),
                row.getStartedAt(), row.getStateChangedAt(), row.getTimeZone(), row.getContext(), r.serverTime(),
                r.elapsedMillis(), r.pausedMillis(), r.remainingMillis(), r.remainingSeconds(), r.endsAt(), r.timeUp(), row.getVersion());
    }
}
