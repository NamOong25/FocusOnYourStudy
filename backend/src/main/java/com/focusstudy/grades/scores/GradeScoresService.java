package com.focusstudy.grades.scores;

import com.focusstudy.grades.configuration.*;
import com.focusstudy.users.UserRepository;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class GradeScoresService {
    private final GradeConfigurationRepository configurations;
    private final UserRepository users;
    public GradeScoresService(GradeConfigurationRepository configurations, UserRepository users) { this.configurations = configurations; this.users = users; }
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public GradeScoresResponse get(UUID owner, UUID id) { return GradeScoresResponse.from(owned(owner, id)); }
    @Transactional
    public GradeScoresResponse update(UUID owner, UUID id, GradeScoreRequests.Update input) {
        users.lockForAcademicChanges(owner).orElseThrow(() -> new GradeConfigurationApiException(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "Cần đăng nhập lại để tiếp tục."));
        var config = owned(owner, id);
        if (config.getVersion() != input.version) throw new GradeConfigurationApiException(HttpStatus.CONFLICT, "GRADE_CONFIGURATION_VERSION_CONFLICT", "Cấu hình hoặc điểm đã thay đổi ở nơi khác. Tải lại trước khi lưu.");
        var columns = new HashMap<String, GradeColumnEntity>(); config.getColumns().forEach(column -> columns.put(column.getKey(), column));
        var values = new HashMap<String, GradeColumnEntity.Scores>();
        for (var part : input.parts) {
            if (!part.valuesPresent()) invalid("Mỗi cột phải gửi rõ score và remainderScore; dùng null khi chưa nhập hoặc muốn xóa điểm.");
            var column = columns.get(part.id);
            if (column == null) invalid("Có mã cột không nằm trong cấu hình hiện tại. Đọc lại cấu hình trước khi lưu điểm.");
            if (values.containsKey(part.id)) invalid("Không gửi trùng mã cột trong một lần lưu điểm.");
            boolean partialFinal = column.getKind() == GradeConfigurationRequests.Kind.PROJECT
                    && column.getProjectTarget() == GradeConfigurationRequests.Target.FINAL
                    && column.getProjectShare().compareTo(BigDecimal.valueOf(100)) < 0;
            if (!partialFinal && part.getRemainderScore() != null) invalid("Chỉ BTL góp một phần vào cuối kỳ mới có remainderScore; cột khác cần gửi null.");
            values.put(part.id, new GradeColumnEntity.Scores(part.getScore(), part.getRemainderScore()));
        }
        if (values.size() != columns.size()) invalid("Gửi đủ bộ cột hiện có, mỗi mã một lần. Không bỏ cột khi chỉ muốn để trống điểm.");
        config.changeScores(values); configurations.flush(); return GradeScoresResponse.from(config);
    }
    private GradeConfigurationEntity owned(UUID owner, UUID id) {
        return configurations.findByIdAndUserId(id, owner).orElseThrow(() -> new GradeConfigurationApiException(HttpStatus.NOT_FOUND, "GRADE_CONFIGURATION_NOT_FOUND", "Không tìm thấy cấu hình điểm."));
    }
    private void invalid(String message) { throw new GradeConfigurationApiException(HttpStatus.BAD_REQUEST, "INVALID_GRADE_SCORES", message); }
}
