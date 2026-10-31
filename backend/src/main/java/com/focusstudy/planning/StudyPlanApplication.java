package com.focusstudy.planning;

import com.focusstudy.study.StudyResponse;
import java.time.Instant;
import java.util.*;

/** Immutable receipt of the successful transaction, not the current state of its study rows. */
public record StudyPlanApplication(UUID applicationId, UUID clientRequestId, boolean persisted,
        Instant appliedAt, UUID courseId, long courseVersion, StudyPlanResponse.Target target,
        int requestedMinutes, int savedMinutes, int remainingMinutes, List<SavedSession> sessions) {
    public record SavedSession(int index, StudyResponse session) { }
}
