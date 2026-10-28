package com.focusstudy.focus;

import java.time.*;

/** Milliseconds are persisted: pausing repeatedly must not discard fractional seconds. */
public final class PomodoroTimeline {
    private PomodoroTimeline() { }
    public record Reading(Instant serverTime, long elapsedMillis, long pausedMillis, long remainingMillis,
                          long remainingSeconds, Instant endsAt, boolean timeUp) { }
    public static Reading read(boolean running, int durationSeconds, long elapsed, long paused, Instant changedAt, Instant now) {
        // A backwards server-clock adjustment cannot produce negative study/pause time.
        Instant observed = now.isBefore(changedAt) ? changedAt : now;
        long delta = Duration.between(changedAt, observed).toMillis();
        long target = durationSeconds * 1000L;
        long studied = running ? elapsed + Math.min(target - elapsed, delta) : elapsed;
        long remaining = target - studied;
        return new Reading(observed, studied, running ? paused : paused + delta, remaining,
                (remaining + 999) / 1000, running ? changedAt.plusMillis(target - elapsed) : null, remaining == 0);
    }
}
