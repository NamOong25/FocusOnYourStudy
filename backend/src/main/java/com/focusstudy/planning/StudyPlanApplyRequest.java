package com.focusstudy.planning;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;

public record StudyPlanApplyRequest(
        @NotNull UUID clientRequestId,
        @NotNull @Valid StudyPlanRequest conditions,
        @NotNull @PositiveOrZero Long courseVersion,
        @PositiveOrZero Long targetVersion,
        @NotNull @Size(min=1,max=97) List<@NotNull @Valid Session> sessions) {
    public record Session(@NotNull @Min(1) @Max(97) Integer index,
            @NotBlank @Size(max=200) String title,
            @NotBlank @Size(max=40) String startsAt,
            @NotNull @Min(1) @Max(240) Integer durationMinutes) {
        public Session {title=title==null?"":title.strip();startsAt=startsAt==null?"":startsAt.strip();}
    }
}
