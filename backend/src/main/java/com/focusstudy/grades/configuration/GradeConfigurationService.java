package com.focusstudy.grades.configuration;

import com.focusstudy.academics.CourseEntity;
import com.focusstudy.academics.courses.*;
import com.focusstudy.academics.semesters.*;
import com.focusstudy.users.UserRepository;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import static com.focusstudy.grades.configuration.GradeConfigurationRequests.*;

@Service
public class GradeConfigurationService {
    private final GradeConfigurationRepository configurations;
    private final CourseRepository courses;
    private final SemesterRepository semesters;
    private final UserRepository users;
    public GradeConfigurationService(GradeConfigurationRepository configurations, CourseRepository courses, SemesterRepository semesters, UserRepository users) {
        this.configurations = configurations; this.courses = courses; this.semesters = semesters; this.users = users;
    }
    // Header/version and lazy column reads must come from one database snapshot.
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public List<GradeConfigurationResponse> list(UUID owner, UUID courseId, UUID semesterId) {
        if (courseId != null) ownedCourse(owner, courseId);
        if (semesterId != null) semesters.findByIdAndUserId(semesterId, owner).orElseThrow(() -> new SemesterApiException(HttpStatus.NOT_FOUND, "SEMESTER_NOT_FOUND", "Không tìm thấy học kỳ."));
        Specification<GradeConfigurationEntity> filter = (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>(); predicates.add(cb.equal(root.get("userId"), owner));
            if (courseId != null) predicates.add(cb.equal(root.get("courseId"), courseId));
            if (semesterId != null) {
                var matching = query.subquery(UUID.class); var course = matching.from(CourseEntity.class);
                matching.select(course.get("id")).where(cb.equal(course.get("userId"), owner), cb.equal(course.get("semesterId"), semesterId));
                predicates.add(root.get("courseId").in(matching));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        return configurations.findAll(filter, Sort.by("createdAt", "id")).stream().map(GradeConfigurationResponse::from).toList();
    }
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public GradeConfigurationResponse get(UUID owner, UUID id) { return GradeConfigurationResponse.from(owned(owner, id)); }
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public GradeConfigurationResponse forCourse(UUID owner, UUID courseId) {
        ownedCourse(owner, courseId);
        return GradeConfigurationResponse.from(configurations.findByUserIdAndCourseId(owner, courseId).orElseThrow(this::missing));
    }
    @Transactional
    public GradeConfigurationResponse create(UUID owner, UUID courseId, Create input) {
        lockOwner(owner); ownedCourse(owner, courseId);
        if (configurations.existsByUserIdAndCourseId(owner, courseId)) throw new GradeConfigurationApiException(HttpStatus.CONFLICT, "GRADE_CONFIGURATION_ALREADY_EXISTS", "Môn đã có cấu hình điểm. Đọc lại và sửa bằng version mới nhất.");
        validate(input);
        return GradeConfigurationResponse.from(configurations.saveAndFlush(GradeConfigurationEntity.create(owner, courseId, input)));
    }
    @Transactional
    public GradeConfigurationResponse update(UUID owner, UUID id, Update input) {
        lockOwner(owner); var config = owned(owner, id); checkVersion(config, input.version); validate(input);
        protectScores(config, input);
        config.change(input); configurations.flush(); return GradeConfigurationResponse.from(config);
    }
    @Transactional
    public void delete(UUID owner, UUID id, long version) {
        lockOwner(owner); var config = owned(owner, id); checkVersion(config, version);
        if (config.hasScores()) throw new GradeConfigurationApiException(HttpStatus.CONFLICT, "GRADE_CONFIGURATION_HAS_SCORES", "Cấu hình còn điểm đã nhập, gồm cả điểm 0. Xóa điểm qua API điểm trước khi xóa cấu hình.");
        configurations.delete(config); configurations.flush();
    }
    private void protectScores(GradeConfigurationEntity config, Create input) {
        if (!config.hasScores()) return;
        if (config.getAssessment() != input.assessment) scoredColumnConflict();
        var incoming = new HashMap<String, Part>(); input.parts.forEach(part -> incoming.put(part.id, part));
        for (var column : config.getColumns()) {
            if (!column.hasScores()) continue;
            var part = incoming.get(column.getKey());
            if (part == null || part.kind != column.getKind()) scoredColumnConflict();
            var target = part.project == null ? null : part.project.target;
            var share = part.project == null ? null : part.project.share;
            if (target != column.getProjectTarget() || (share == null ? column.getProjectShare() != null : column.getProjectShare() == null || share.compareTo(column.getProjectShare()) != 0)) scoredColumnConflict();
        }
    }
    private void scoredColumnConflict() {
        throw new GradeConfigurationApiException(HttpStatus.CONFLICT, "GRADE_COLUMN_HAS_SCORES", "Có cột đã nhập điểm (kể cả 0). Có thể đổi tên/thứ tự; cần xóa điểm ở cột bị ảnh hưởng trước khi xóa cột, đổi loại/cách quy BTL hoặc đổi loại học phần.");
    }
    private void validate(Create input) {
        var keys = new HashSet<String>(); int finalCount = 0, midCount = 0;
        for (var part : input.parts) {
            if (!keys.add(part.id)) invalid("Mỗi cột cần một mã riêng trong môn.");
            var allowed = input.assessment == Assessment.THEORY
                    ? EnumSet.of(Kind.REGULAR, Kind.REGULAR_TEST, Kind.MIDTERM, Kind.FINAL, Kind.PROJECT)
                    : EnumSet.of(Kind.PRACTICE_REGULAR, Kind.PRACTICE_TEST, Kind.MIDTERM, Kind.FINAL, Kind.PROJECT);
            if (!allowed.contains(part.kind)) invalid("Chọn loại cột phù hợp với Lý thuyết hoặc Thực hành.");
            if (part.kind == Kind.PROJECT) {
                if (part.project == null) invalid("Bài tập lớn cần có cách quy đổi và tỷ lệ theo đề cương môn.");
                if (part.project.target == Target.PRACTICE && (input.assessment != Assessment.PRACTICAL || part.project.share.compareTo(BigDecimal.valueOf(100)) != 0))
                    invalid("BTL thay một cột thực hành chỉ dùng ở học phần thực hành và phải chiếm 100% cột đó.");
            } else if (part.project != null) invalid("Chỉ cột Bài tập lớn được có cấu hình quy đổi.");
            if (part.kind == Kind.FINAL || (part.project != null && part.project.target == Target.FINAL)) finalCount++;
            if (part.kind == Kind.MIDTERM) midCount++;
        }
        if (finalCount > 1) invalid("Chỉ một cột làm điểm cuối kỳ; BTL thay hoặc góp vào cột này, không tạo thêm cột cuối kỳ.");
        if (input.assessment == Assessment.THEORY && midCount > 1) invalid("Lý thuyết chỉ có một cột giữa kỳ.");
    }
    private void invalid(String detail) { throw new GradeConfigurationApiException(HttpStatus.BAD_REQUEST, "INVALID_GRADE_CONFIGURATION", detail); }
    private void lockOwner(UUID owner) { users.lockForAcademicChanges(owner).orElseThrow(() -> new GradeConfigurationApiException(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "Cần đăng nhập lại để tiếp tục.")); }
    private void ownedCourse(UUID owner, UUID id) { courses.findByIdAndUserId(id, owner).orElseThrow(() -> new CourseApiException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy môn học.")); }
    private GradeConfigurationEntity owned(UUID owner, UUID id) { return configurations.findByIdAndUserId(id, owner).orElseThrow(this::missing); }
    private GradeConfigurationApiException missing() { return new GradeConfigurationApiException(HttpStatus.NOT_FOUND, "GRADE_CONFIGURATION_NOT_FOUND", "Không tìm thấy cấu hình điểm."); }
    private void checkVersion(GradeConfigurationEntity config, long version) {
        if (config.getVersion() != version) throw new GradeConfigurationApiException(HttpStatus.CONFLICT, "GRADE_CONFIGURATION_VERSION_CONFLICT", "Cấu hình điểm đã thay đổi ở nơi khác. Tải lại trước khi sửa hoặc xóa.");
    }
}
