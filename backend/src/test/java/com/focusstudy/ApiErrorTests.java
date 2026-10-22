package com.focusstudy;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.focusstudy.common.api.GlobalExceptionHandler;
import com.focusstudy.common.api.RequestIdFilter;
import com.focusstudy.health.HealthController;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.bind.annotation.*;

class ApiErrorTests {
    private MockMvc mvc;
    @RestController
    static class TestOnlyController {
        record Input(@NotBlank(message = "Cần nhập tên") String name) { }
        @PostMapping("/validation") Input validate(@Valid @RequestBody Input input) { return input; }
        @GetMapping("/conflict") void conflict() { throw new DataIntegrityViolationException("private SQL and password values"); }
        @GetMapping("/failure") void failure() { throw new IllegalStateException("private internal information"); }
    }
    @BeforeEach void setup() {
        var validator = new LocalValidatorFactoryBean(); validator.afterPropertiesSet();
        mvc = MockMvcBuilders.standaloneSetup(new TestOnlyController())
                .setControllerAdvice(new GlobalExceptionHandler()).setValidator(validator).addFilters(new RequestIdFilter()).build();
    }
    @Test void invalidInputHasFieldMessagesWithoutRejectedValues() throws Exception {
        mvc.perform(post("/validation").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors[0].field").value("name"))
                .andExpect(jsonPath("$.errors[0].message").value("Cần nhập tên"))
                .andExpect(jsonPath("$.errors[0].rejectedValue").doesNotExist());
    }
    @Test void malformedJsonReturnsStandard400() throws Exception {
        mvc.perform(post("/validation").contentType(MediaType.APPLICATION_JSON).content("{broken"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }
    @Test void dataConflictsDoNotExposeSql() throws Exception {
        mvc.perform(get("/conflict")).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("DATA_CONFLICT"))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("private SQL"))));
    }
    @Test void unexpectedExceptionsDoNotExposeStackOrMessage() throws Exception {
        mvc.perform(get("/failure")).andExpect(status().isInternalServerError()).andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.stackTrace").doesNotExist())
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("private internal"))));
    }
    @Test void databaseFailureIs503NotAFalseHealthyResult() {
        var jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForObject("SELECT 1", Integer.class)).thenThrow(new DataAccessResourceFailureException("private database address"));
        var response = new HealthController(jdbc).ready(new MockHttpServletRequest("GET", "/api/v1/health"));
        assertThat(response.getStatusCode().value()).isEqualTo(503);
        assertThat(((ProblemDetail) response.getBody()).getProperties()).containsEntry("code", "DATABASE_UNAVAILABLE");
    }
}
