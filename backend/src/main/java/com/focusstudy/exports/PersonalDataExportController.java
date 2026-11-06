package com.focusstudy.exports;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/v1/users/me/export")
public class PersonalDataExportController {
    private static final int MAX_BYTES = 20 * 1024 * 1024;
    private static final DateTimeFormatter FILE_TIME = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss").withZone(ZoneOffset.UTC);
    private final PersonalDataExportService service;
    private final ObjectMapper json;

    public PersonalDataExportController(PersonalDataExportService service, ObjectMapper json) {
        this.service = service;
        this.json = json;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> download(@AuthenticationPrincipal Jwt token) {
        var snapshot = service.snapshot(UUID.fromString(token.getSubject()));
        // Materialize the complete document before setting download headers.
        byte[] content = json.writerWithDefaultPrettyPrinter().writeValueAsBytes(snapshot);
        if (content.length > MAX_BYTES) throw new PersonalDataExportException();
        String filename = "focusyourstudy-" + FILE_TIME.format(snapshot.exportedAt()) + ".json";
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .contentType(MediaType.parseMediaType("application/json; charset=utf-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString())
                .contentLength(content.length).body(content);
    }
}
