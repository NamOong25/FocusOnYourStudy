package com.focusstudy.notifications;

import com.focusstudy.users.UserRepository;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import static com.focusstudy.notifications.NotificationRequests.*;

@Service
public class NotificationReadService {
    private final NotificationReadRepository receipts;
    private final UserRepository users;
    private final Clock clock;
    public NotificationReadService(NotificationReadRepository receipts, UserRepository users, Clock clock) {
        this.receipts = receipts; this.users = users; this.clock = clock;
    }
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public NotificationState.Snapshot query(UUID owner, Query request) {
        validate(request.targets());
        var now = clock.instant().truncatedTo(ChronoUnit.MICROS);
        return new NotificationState.Snapshot(now,receipts.lookup(owner,request.targets(),now));
    }
    @Transactional
    public NotificationState.Snapshot markRead(UUID owner, MarkRead request) {
        var targets = request.items().stream().map(ReadItem::target).toList(); validate(targets);
        // Same first lock as assignment/exam/class/course writes. No source can
        // change between revision validation and the receipt commit.
        users.lockForAcademicChanges(owner).orElseThrow(() -> new NotificationApiException(HttpStatus.UNAUTHORIZED,
                "AUTHENTICATION_REQUIRED","Cần đăng nhập lại để tiếp tục."));
        var now = clock.instant().truncatedTo(ChronoUnit.MICROS);
        var states = receipts.lookup(owner,targets,now);
        // Validate the whole batch before writing anything. Mark-all means the
        // explicitly observed revisions, never an unbounded sweep of new items.
        for (int i=0;i<states.size();i++) {
            var state = states.get(i);
            if (!state.available()) throw new NotificationApiException(HttpStatus.NOT_FOUND,"NOTIFICATION_SOURCE_UNAVAILABLE",
                    "Lời nhắc không còn khả dụng. Tải lại danh sách thông báo.");
            if (!state.revision().equals(request.items().get(i).revision())) throw new NotificationApiException(HttpStatus.CONFLICT,
                    "NOTIFICATION_REVISION_CONFLICT","Nội dung lời nhắc đã thay đổi. Tải lại trước khi đánh dấu đã đọc.");
        }
        for (var state : states) receipts.mark(owner,state,now);
        return new NotificationState.Snapshot(now, states.stream().map(s -> new NotificationState(s.target(),true,s.revision(),s.basis(),true,
                s.read() ? s.readAt() : now)).toList());
    }
    private void validate(List<Target> targets) {
        if (targets.size()>200 || new HashSet<>(targets).size()!=targets.size()) invalid("Mỗi lượt tối đa 200 mục và không lặp cùng một lời nhắc.");
        for (var t : targets) {
            if (t.kind()==Kind.CLASS) {
                try {
                    var date=LocalDate.parse(t.occurrenceDate());
                    if (!date.toString().equals(t.occurrenceDate()) || date.getYear()<1900 || date.getYear()>2099) invalid("Ngày buổi học cần YYYY-MM-DD trong năm 1900–2099.");
                } catch (DateTimeException | NullPointerException ex) { invalid("Lịch học cần ngày buổi học YYYY-MM-DD hợp lệ."); }
            } else if (t.occurrenceDate()!=null) invalid("Bài tập và lịch thi không nhận ngày buổi học.");
        }
    }
    private void invalid(String message) { throw new NotificationApiException(HttpStatus.BAD_REQUEST,"INVALID_NOTIFICATION_TARGET",message); }
}
