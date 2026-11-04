package com.pc_builder_store.controller;

import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.pc_builder_store.repository.HealthRepository;
import com.jayway.jsonpath.JsonPath;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private HealthRepository healthRepository;

    @Test
    void returnsFrontendCompatibleApiHealthResponse() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.service").value("pc-builder-store-api"))
                .andExpect(result -> Instant.parse(JsonPath.read(
                        result.getResponse().getContentAsString(), "$.timestamp")));
    }

    @Test
    void returnsDatabaseSuccessWhenSelectOneSucceeds() throws Exception {
        doNothing().when(healthRepository).checkConnection();

        mockMvc.perform(get("/api/health/db"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.database").value("connected"));

        verify(healthRepository).checkConnection();
    }

    @Test
    void returnsSanitizedServiceUnavailableWhenDatabaseCheckFails() throws Exception {
        doThrow(new DataAccessResourceFailureException("connection failed with secret details"))
                .when(healthRepository).checkConnection();

        mockMvc.perform(get("/api/health/db"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error.code").value("DATABASE_UNAVAILABLE"))
                .andExpect(jsonPath("$.error.message").value("Database is unavailable."))
                .andExpect(result -> org.junit.jupiter.api.Assertions.assertFalse(
                        result.getResponse().getContentAsString().contains("secret details")));
    }
}
