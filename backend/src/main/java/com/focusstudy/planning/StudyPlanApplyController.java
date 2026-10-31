package com.focusstudy.planning;

import com.focusstudy.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/study-plans")
public class StudyPlanApplyController {
    private final StudyPlanApplyService service;
    public StudyPlanApplyController(StudyPlanApplyService service){this.service=service;}
    @PostMapping("/apply")
    public ResponseEntity<ApiResponse<StudyPlanApplication>> apply(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody StudyPlanApplyRequest input,HttpServletRequest request){
        var applied=service.apply(UUID.fromString(jwt.getSubject()),input);
        return ResponseEntity.status(applied.created()?HttpStatus.CREATED:HttpStatus.OK).location(URI.create("/api/v1/study-plans/applications/"+input.clientRequestId()))
                .cacheControl(CacheControl.noStore()).body(ApiResponse.of(applied.value(),request));
    }
    @GetMapping("/applications/{clientRequestId}")
    public ResponseEntity<ApiResponse<StudyPlanApplication>> get(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID clientRequestId,HttpServletRequest request){
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(service.get(UUID.fromString(jwt.getSubject()),clientRequestId),request));
    }
}
