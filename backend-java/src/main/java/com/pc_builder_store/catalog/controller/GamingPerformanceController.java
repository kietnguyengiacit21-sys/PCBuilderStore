package com.pc_builder_store.catalog.controller;

import static com.pc_builder_store.catalog.dto.GamingPerformanceDtos.*;

import com.pc_builder_store.catalog.service.GamingPerformanceService;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/catalog/products/{modelCode}/gaming-performance")
public class GamingPerformanceController {

    private final GamingPerformanceService service;

    public GamingPerformanceController(GamingPerformanceService service) {
        this.service = service;
    }

    @PostMapping
    public EstimateResponse estimate(
            @PathVariable String modelCode,
            @RequestBody EstimateRequest request) {
        return service.estimate(modelCode, request);
    }
}
