package com.focusstudy.focus;

import com.focusstudy.academics.courses.CourseRepository;
import com.focusstudy.academics.semesters.SemesterRepository;
import com.focusstudy.assignments.AssignmentRepository;
import com.focusstudy.study.StudySessionRepository;
import com.focusstudy.users.UserRepository;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PomodoroService {
    private final PomodoroRepository sessions;
    private final CourseRepository courses;
    private final SemesterRepository semesters;
    private final AssignmentRepository assignments;
    private final StudySessionRepository study;
    private final UserRepository users;
    private final Clock clock;
    public PomodoroService(PomodoroRepository sessions, CourseRepository courses, SemesterRepository semesters,
            AssignmentRepository assignments, StudySessionRepository study, UserRepository users, Clock clock) {
        this.sessions = sessions; this.courses = courses; this.semesters = semesters; this.assignments = assignments;
        this.study = study; this.users = users; this.clock = clock;
    }
    public record Started(PomodoroResponse session, boolean created) { }
    private Instant now() { return clock.instant().truncatedTo(ChronoUnit.MILLIS); }
    @Transactional(readOnly = true)
    public PomodoroResponse active(UUID owner) { return sessions.active(owner).map(row -> PomodoroResponse.from(row, now())).orElse(null); }
    @Transactional(readOnly = true)
    public PomodoroResponse get(UUID owner, UUID id) { return PomodoroResponse.from(owned(owner, id), now()); }
    @Transactional
    public Started start(UUID owner, PomodoroRequests.Start input) {
        lock(owner);
        var previous = sessions.findByUserIdAndClientRequestId(owner, input.clientRequestId());
        if (previous.isPresent()) {
            if (!previous.get().matches(input)) throw problem(HttpStatus.CONFLICT, "POMODORO_REQUEST_REUSED", "Mã yêu cầu đã dùng với nội dung khác. Đọc lại phiên đã lưu; không tự tạo phiên thay thế.");
            return new Started(PomodoroResponse.from(previous.get(), now()), false);
        }
        if (sessions.active(owner).isPresent()) throw problem(HttpStatus.CONFLICT, "POMODORO_ALREADY_ACTIVE", "Bạn đang có một phiên học hoặc tạm dừng. Đọc lại phiên hiện tại trước khi bắt đầu phiên khác.");
        if (!ZoneId.getAvailableZoneIds().contains(input.timeZone())) throw problem(HttpStatus.BAD_REQUEST, "INVALID_POMODORO_TIME_ZONE", "Chọn múi giờ IANA hợp lệ, ví dụ Asia/Ho_Chi_Minh.");
        var course = courses.findByIdAndUserId(input.courseId(), owner).orElseThrow(() -> missing("COURSE_NOT_FOUND", "Không tìm thấy môn học."));
        var semester = semesters.findByIdAndUserId(course.getSemesterId(), owner).orElseThrow(() -> missing("SEMESTER_NOT_FOUND", "Không tìm thấy học kỳ."));
        String assignmentTitle = null, studyTitle = null;
        if (input.assignmentId() != null) {
            var task = assignments.findByIdAndUserId(input.assignmentId(), owner).orElseThrow(() -> missing("ASSIGNMENT_NOT_FOUND", "Không tìm thấy bài tập."));
            if (!task.getCourseId().equals(course.getId())) throw problem(HttpStatus.CONFLICT, "POMODORO_CONTEXT_MISMATCH", "Bài tập cần thuộc đúng môn đang học.");
            assignmentTitle = task.getTitle();
        }
        if (input.studySessionId() != null) {
            var planned = study.findByIdAndUserId(input.studySessionId(), owner).orElseThrow(() -> missing("STUDY_SESSION_NOT_FOUND", "Không tìm thấy buổi tự học."));
            if (!planned.getCourseId().equals(course.getId()) || !Objects.equals(planned.getAssignmentId(), input.assignmentId()))
                throw problem(HttpStatus.CONFLICT, "POMODORO_CONTEXT_MISMATCH", "Môn và bài tập cần khớp buổi tự học đã chọn.");
            studyTitle = planned.getTitle();
        }
        var context = new PomodoroEntity.Context(course.getId(), course.getCode(), course.getName(), semester.getId(), semester.getTerm(), semester.getStartYear(), input.assignmentId(), assignmentTitle, input.studySessionId(), studyTitle);
        var time = now(); var row = sessions.saveAndFlush(PomodoroEntity.start(owner, input, context, time));
        return new Started(PomodoroResponse.from(row, time), true);
    }
    @Transactional
    public PomodoroResponse pause(UUID owner, UUID id, long version) { return transition(owner, id, version, true); }
    @Transactional
    public PomodoroResponse resume(UUID owner, UUID id, long version) { return transition(owner, id, version, false); }
    @Transactional
    public PomodoroResponse complete(UUID owner, UUID id, long version) { return finish(owner, id, version, PomodoroEntity.Status.COMPLETED); }
    @Transactional
    public PomodoroResponse cancel(UUID owner, UUID id, long version) { return finish(owner, id, version, PomodoroEntity.Status.CANCELLED); }
    private PomodoroResponse finish(UUID owner, UUID id, long version, PomodoroEntity.Status target) {
        lock(owner); var row = owned(owner, id); var time = now();
        // Terminal rows are immutable. Accept an exact retry of the successful command
        // (pre-transition version), or a repeated action using the current GET version.
        if (row.isFinished() && row.getStatus() == target && (version == row.getVersion() || version == row.getVersion() - 1))
            return PomodoroResponse.from(row, time);
        checkVersion(row, version);
        if (row.isFinished()) throw problem(HttpStatus.CONFLICT, "POMODORO_ALREADY_FINISHED", "Phiên đã hoàn tất hoặc hủy; không đổi kết quả đã lưu.");
        var reading = row.read(time);
        if (target == PomodoroEntity.Status.COMPLETED && !reading.timeUp()) throw problem(HttpStatus.CONFLICT, "POMODORO_NOT_READY", "Cần học đủ 25 phút, không tính thời gian tạm dừng, để hoàn tất phiên.");
        if (target == PomodoroEntity.Status.CANCELLED && reading.timeUp()) throw problem(HttpStatus.CONFLICT, "POMODORO_TIME_UP", "Phiên đã đủ thời lượng. Hoàn tất để lưu kết quả thay vì hủy.");
        row.finish(target, reading); sessions.flush(); return PomodoroResponse.from(row, time);
    }
    private PomodoroResponse transition(UUID owner, UUID id, long version, boolean pause) {
        lock(owner); var row = owned(owner, id);
        checkVersion(row, version);
        if (row.isFinished()) throw problem(HttpStatus.CONFLICT, "POMODORO_ALREADY_FINISHED", "Phiên đã hoàn tất hoặc hủy, không thể tiếp tục hoặc tạm dừng.");
        var time = now(); var reading = row.read(time);
        if (reading.timeUp()) throw problem(HttpStatus.CONFLICT, "POMODORO_TIME_UP", "Đã đủ thời lượng. Hoàn tất để lưu kết quả phiên học.");
        if ((row.getStatus() == PomodoroEntity.Status.RUNNING) != pause) throw problem(HttpStatus.CONFLICT, "POMODORO_INVALID_STATE", "Chỉ tạm dừng phiên đang chạy hoặc tiếp tục phiên đang tạm dừng.");
        if (pause) row.pause(reading); else row.resume(reading);
        sessions.flush(); return PomodoroResponse.from(row, time);
    }
    private PomodoroEntity owned(UUID owner, UUID id) { return sessions.findByIdAndUserId(id, owner).orElseThrow(() -> missing("POMODORO_NOT_FOUND", "Không tìm thấy phiên Pomodoro.")); }
    private void checkVersion(PomodoroEntity row, long version) {
        if (row.getVersion() != version) throw problem(HttpStatus.CONFLICT, "POMODORO_VERSION_CONFLICT", "Phiên đã thay đổi ở nơi khác. Đọc lại trước khi thao tác; không gửi lại với version tự đoán.");
    }
    private void lock(UUID owner) { users.lockForAcademicChanges(owner).orElseThrow(() -> problem(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "Cần đăng nhập lại để tiếp tục.")); }
    private PomodoroApiException missing(String code, String message) { return problem(HttpStatus.NOT_FOUND, code, message); }
    private PomodoroApiException problem(HttpStatus status, String code, String message) { return new PomodoroApiException(status, code, message); }
}
