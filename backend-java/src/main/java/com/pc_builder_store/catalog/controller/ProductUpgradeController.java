package com.pc_builder_store.catalog.controller;

import static com.pc_builder_store.catalog.dto.ProductUpgradeDtos.*;

import com.pc_builder_store.auth.AuthUserPrincipal;
import com.pc_builder_store.catalog.service.ProductUpgradeService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
@RequestMapping("/api/catalog")
public class ProductUpgradeController {

    private final ProductUpgradeService service;

    public ProductUpgradeController(ProductUpgradeService service) {
        this.service = service;
    }

    @GetMapping("/admin/management/products/{modelCode}/upgrade-config")
    public Configuration getAdminConfiguration(@PathVariable String modelCode) {
        return service.getAdminConfiguration(modelCode);
    }

    @PutMapping("/admin/management/products/{modelCode}/upgrade-config")
    public Configuration saveAdminConfiguration(
            @PathVariable String modelCode,
            @RequestBody SaveConfiguration request,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        return service.saveAdminConfiguration(modelCode, request, actor);
    }

    @GetMapping("/products/{modelCode}/upgrades")
    public Map<String, PublicConfiguration> getPublicConfiguration(
            @PathVariable String modelCode,
            @RequestParam String offerId) {
        return Map.of("data", service.getPublicConfiguration(modelCode, offerId));
    }
}
