package com.focusstudy.planning;

import com.focusstudy.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/study-plans")
public class StudyPlanController {
    private final StudyPlanService service;
    public StudyPlanController(StudyPlanService service){this.service=service;}
    @PostMapping("/preview")
    public ResponseEntity<ApiResponse<StudyPlanResponse>> preview(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody StudyPlanRequest input,HttpServletRequest request){
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.preview(UUID.fromString(jwt.getSubject()),input),request));
    }
}
