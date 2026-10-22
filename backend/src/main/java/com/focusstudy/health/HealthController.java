package com.focusstudy.health;

import com.focusstudy.common.api.ApiProblems;
import com.focusstudy.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
    private final JdbcTemplate jdbc;
    public HealthController(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public record Health(String status, String database) { }

    @GetMapping("/api/v1/health")
    public ResponseEntity<?> ready(HttpServletRequest request) {
        try {
            Integer result = jdbc.queryForObject("SELECT 1", Integer.class);
            if (Integer.valueOf(1).equals(result)) {
                return ResponseEntity.ok(ApiResponse.of(new Health("UP", "UP"), request));
            }
        } catch (DataAccessException ignored) { }
        return ResponseEntity.status(503).body(ApiProblems.of(HttpStatus.SERVICE_UNAVAILABLE,
                "DATABASE_UNAVAILABLE", "Chưa kết nối được dữ liệu. Hãy thử lại sau.", request));
    }
}
