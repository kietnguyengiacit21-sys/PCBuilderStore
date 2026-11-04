package com.pc_builder_store.controller;

import com.pc_builder_store.dto.DatabaseHealthResponse;
import com.pc_builder_store.dto.HealthResponse;
import com.pc_builder_store.service.HealthService;
import java.time.Instant;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final HealthService healthService;

    public HealthController(HealthService healthService) {
        this.healthService = healthService;
    }

    @GetMapping
    public HealthResponse health() {
        return new HealthResponse("ok", "pc-builder-store-api", Instant.now().toString());
    }

    @GetMapping("/db")
    public DatabaseHealthResponse databaseHealth() {
        healthService.checkDatabase();
        return new DatabaseHealthResponse("ok", "connected", Instant.now().toString());
    }
}
