package com.focusstudy.academics.semesters;

import com.focusstudy.academics.SemesterEntity;
import com.focusstudy.academics.SemesterEntity.Status;
import com.focusstudy.users.UserRepository;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SemesterService {
    private final SemesterRepository semesters;
    private final UserRepository users;
    public SemesterService(SemesterRepository semesters, UserRepository users) { this.semesters = semesters; this.users = users; }
    @Transactional(readOnly = true)
    public List<SemesterResponse> list(UUID owner) {
        return semesters.findByUserIdOrderByStartYearDescTermDesc(owner).stream().map(SemesterResponse::from).toList();
    }
    @Transactional(readOnly = true)
    public SemesterResponse get(UUID owner, UUID id) { return SemesterResponse.from(owned(owner, id)); }
    @Transactional
    public SemesterResponse create(UUID owner, SemesterRequests.Create input) {
        lockOwner(owner);
        if (semesters.existsByUserIdAndStartYearAndTerm(owner, input.startYear(), input.term().shortValue())) throw duplicate();
        if (input.status() == Status.CURRENT) completePrevious(owner, null);
        return SemesterResponse.from(semesters.saveAndFlush(SemesterEntity.create(owner, input.term(), input.startYear(), input.status(), input.note())));
    }
    @Transactional
    public SemesterResponse update(UUID owner, UUID id, SemesterRequests.Update input) {
        lockOwner(owner);
        var semester = owned(owner, id); checkVersion(semester, input.version());
        if (semesters.existsByUserIdAndStartYearAndTermAndIdNot(owner, input.startYear(), input.term().shortValue(), id)) throw duplicate();
        if (input.status() == Status.CURRENT) completePrevious(owner, id);
        semester.change(input.term(), input.startYear(), input.status(), input.note());
        semesters.flush(); return SemesterResponse.from(semester);
    }
    @Transactional
    public void delete(UUID owner, UUID id, long version) {
        lockOwner(owner);
        var semester = owned(owner, id); checkVersion(semester, version);
        if (semesters.hasCourses(id, owner)) throw new SemesterApiException(HttpStatus.CONFLICT, "SEMESTER_HAS_COURSES",
                "Học kỳ còn môn học. Hãy xử lý các môn trước khi xóa học kỳ.");
        semesters.delete(semester); semesters.flush();
    }
    private void lockOwner(UUID owner) {
        // Serialize ALL semester writes per account, including first creation when
        // no semester row exists yet. Uniqueness constraints remain the final guard.
        users.lockForAcademicChanges(owner).orElseThrow(() -> new SemesterApiException(HttpStatus.UNAUTHORIZED,
                "AUTHENTICATION_REQUIRED", "Cần đăng nhập lại để tiếp tục."));
    }
    private SemesterEntity owned(UUID owner, UUID id) {
        return semesters.findByIdAndUserId(id, owner).orElseThrow(() -> new SemesterApiException(HttpStatus.NOT_FOUND,
                "SEMESTER_NOT_FOUND", "Không tìm thấy học kỳ."));
    }
    private void completePrevious(UUID owner, UUID target) {
        semesters.findByUserIdAndStatus(owner, Status.CURRENT).filter(previous -> !previous.getId().equals(target)).ifPresent(previous -> {
            previous.complete(); semesters.flush(); // release partial unique index before marking target CURRENT
        });
    }
    private void checkVersion(SemesterEntity semester, long version) {
        if (semester.getVersion() != version) throw new SemesterApiException(HttpStatus.CONFLICT, "SEMESTER_VERSION_CONFLICT",
                "Học kỳ đã thay đổi ở nơi khác. Tải lại trước khi sửa hoặc xóa.");
    }
    private SemesterApiException duplicate() {
        return new SemesterApiException(HttpStatus.CONFLICT, "SEMESTER_ALREADY_EXISTS", "Học kỳ này đã có trong năm học đã chọn.");
    }
}
