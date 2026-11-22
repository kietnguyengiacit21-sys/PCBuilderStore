package com.pc_builder_store.dashboard;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** ADMIN and SALES (see SecurityConfiguration). */
@RestController
public class DashboardController {

    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    @GetMapping("/api/admin/dashboard")
    public DashboardService.Overview overview() {
        return service.overview();
    }
}
