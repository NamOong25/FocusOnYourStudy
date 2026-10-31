package com.focusstudy.planning;

import com.focusstudy.academics.courses.CourseRepository;
import com.focusstudy.assignments.AssignmentRepository;
import com.focusstudy.exams.ExamRepository;
import com.focusstudy.study.*;
import com.focusstudy.users.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import tools.jackson.databind.ObjectMapper;

@Service
public class StudyPlanApplyService {
    private final UserRepository users;private final CourseRepository courses;private final AssignmentRepository assignments;private final ExamRepository exams;
    private final StudyPlanBusyReader busy;private final StudySessionRepository studies;private final StudyPlanApplications applications;private final ObjectMapper json;private final Clock clock;
    public StudyPlanApplyService(UserRepository users,CourseRepository courses,AssignmentRepository assignments,ExamRepository exams,
            StudyPlanBusyReader busy,StudySessionRepository studies,StudyPlanApplications applications,ObjectMapper json,Clock clock){
        this.users=users;this.courses=courses;this.assignments=assignments;this.exams=exams;this.busy=busy;this.studies=studies;this.applications=applications;this.json=json;this.clock=clock;
    }
    public record Applied(StudyPlanApplication value,boolean created) { }
    @Transactional(readOnly=true)
    public StudyPlanApplication get(UUID owner,UUID key){
        return applications.find(owner,key).map(StudyPlanApplications.Receipt::value).orElseThrow(()->new StudyApiException(HttpStatus.NOT_FOUND,"STUDY_PLAN_APPLICATION_NOT_FOUND","Chưa tìm thấy biên nhận cho mã yêu cầu này. Giữ nguyên mã để đối chiếu; không tự tạo mã mới."));
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public Applied apply(UUID owner,StudyPlanApplyRequest request){
        // All academic writers take this first lock. At READ_COMMITTED the queries after
        // a wait see the winning commit, including the initially-empty interval/key case.
        users.lockForAcademicChanges(owner).orElseThrow(()->new StudyApiException(HttpStatus.UNAUTHORIZED,"AUTHENTICATION_REQUIRED","Cần đăng nhập lại để tiếp tục."));
        String hash=fingerprint(request);var prior=applications.find(owner,request.clientRequestId());
        if(prior.isPresent()){
            if(!prior.get().hash().equals(hash))throw StudyPlanSelection.conflict("STUDY_PLAN_REQUEST_REUSED","Mã yêu cầu đã dùng để lưu nội dung khác. Đọc biên nhận cũ; không tự đổi mã để gửi lại.");
            // Return the immutable receipt even if sources/studies were later edited or deleted.
            return new Applied(prior.get().value(),false);
        }
        var now=clock.instant();var conditions=request.conditions();var window=conditions.window(now);
        if((conditions.assignmentId()!=null||conditions.examId()!=null)!=(request.targetVersion()!=null))throw StudyPlanRequest.invalid("Mục tiêu bài/thi cần version đã xem; tự học độc lập không có targetVersion.");
        var context=StudyPlanContext.load(owner,conditions,now,courses,assignments,exams);
        if(context.course().getVersion()!=request.courseVersion()||!Objects.equals(context.target().version(),request.targetVersion()))
            throw StudyPlanSelection.conflict("STUDY_PLAN_SOURCE_CHANGED","Môn hoặc mục tiêu đã thay đổi. Tải lại, xem và duyệt bản mới trước khi lưu.");
        var slots=StudyPlanSelection.validate(request,window,now,context.target().deadline());
        var first=slots.stream().map(StudyPlanSelection.Slot::start).min(Comparator.naturalOrder()).orElseThrow();
        var last=slots.stream().map(StudyPlanSelection.Slot::end).max(Comparator.naturalOrder()).orElseThrow();
        var intervals=busy.read(owner,first,last);
        for(var slot:slots)if(intervals.stream().anyMatch(b->slot.start().isBefore(b.end())&&slot.end().isAfter(b.start())))
            throw StudyPlanSelection.conflict("STUDY_PLAN_TIME_CONFLICT","Lịch đã có sự kiện trùng một buổi đang chọn. Chưa lưu buổi nào; xem lại hoặc tạo lại đề xuất.");
        var entities=slots.stream().map(slot->StudySessionEntity.create(owner,new StudyRequests.Create(conditions.courseId(),conditions.assignmentId(),slot.input().title(),slot.start().toString(),conditions.timeZone(),slot.input().durationMinutes(),StudySessionEntity.Status.PLANNED,""))).toList();
        studies.saveAllAndFlush(entities);
        var saved=new ArrayList<StudyPlanApplication.SavedSession>();
        for(int i=0;i<slots.size();i++)saved.add(new StudyPlanApplication.SavedSession(slots.get(i).input().index(),StudyResponse.from(entities.get(i))));
        int minutes=slots.stream().mapToInt(s->s.input().durationMinutes()).sum();
        var receipt=new StudyPlanApplication(UUID.randomUUID(),request.clientRequestId(),true,now.truncatedTo(ChronoUnit.MICROS),conditions.courseId(),context.course().getVersion(),context.target(),conditions.totalMinutes(),minutes,conditions.totalMinutes()-minutes,List.copyOf(saved));
        applications.insert(owner,hash,receipt);return new Applied(receipt,true);
    }
    private record CanonicalSession(int index,String title,Instant start,int duration) { }
    private record Command(String format,StudyPlanRequest conditions,long courseVersion,Long targetVersion,List<CanonicalSession> sessions) { }
    private String fingerprint(StudyPlanApplyRequest request){
        var c=request.conditions();var normalized=new StudyPlanRequest(c.courseId(),c.assignmentId(),c.examId(),c.goal(),c.fromDate(),c.toDate(),c.timeZone(),c.availableStart(),c.availableEnd(),c.weekdays().stream().sorted().toList(),c.totalMinutes(),c.sessionMinutes(),c.breakMinutes());
        var rows=request.sessions().stream().map(s->new CanonicalSession(s.index(),s.title(),StudyPlanSelection.start(s),s.durationMinutes())).sorted(Comparator.comparingInt(CanonicalSession::index)).toList();
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.writeValueAsString(new Command("APPLY_V1",normalized,request.courseVersion(),request.targetVersion(),rows)).getBytes(StandardCharsets.UTF_8)));}
        catch(NoSuchAlgorithmException e){throw new IllegalStateException("SHA-256 unavailable",e);}
    }
}
