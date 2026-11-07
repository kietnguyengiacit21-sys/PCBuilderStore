package com.pc_builder_store.catalog.controller;

import com.pc_builder_store.catalog.dto.CatalogFacetsResponse;
import com.pc_builder_store.catalog.dto.CatalogAttributeDefinitionsResponse;
import com.pc_builder_store.catalog.dto.CatalogProduct;
import com.pc_builder_store.catalog.dto.CatalogProductPage;
import com.pc_builder_store.catalog.dto.CatalogProductResponse;
import com.pc_builder_store.catalog.dto.PublicCatalogAttributeDefinitionsResponse;
import com.pc_builder_store.catalog.dto.UpdateGpuSpecificationsRequest;
import com.pc_builder_store.catalog.service.CatalogService;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriUtils;

@RestController
@RequestMapping("/api/catalog")
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/facets")
    public CatalogFacetsResponse facets() {
        return new CatalogFacetsResponse(catalogService.getFacets());
    }

    @GetMapping("/attribute-definitions")
    public PublicCatalogAttributeDefinitionsResponse attributeDefinitions() {
        return new PublicCatalogAttributeDefinitionsResponse(catalogService.getAttributeDefinitions());
    }

    @GetMapping("/admin/attribute-definitions")
    public CatalogAttributeDefinitionsResponse adminAttributeDefinitions() {
        return new CatalogAttributeDefinitionsResponse(catalogService.getAdminAttributeDefinitions());
    }

    @GetMapping("/admin/products/{modelCode}")
    public CatalogProductResponse adminProduct(@PathVariable String modelCode) {
        CatalogProduct product = catalogService.getAdminProduct(modelCode);
        return new CatalogProductResponse(product, catalogService.demoNotice());
    }

    @GetMapping("/products")
    public CatalogProductPage products(HttpServletRequest request) {
        return catalogService.getProducts(request.getParameterMap());
    }

    @GetMapping({"/products/{modelCode}", "/products/{*modelCode}"})
    public CatalogProductResponse product(
            @PathVariable(name = "modelCode", required = false) String modelCode,
            HttpServletRequest request) {
        String resolvedModelCode = modelCode;
        if (resolvedModelCode == null || resolvedModelCode.isEmpty()) {
            resolvedModelCode = modelCodeFromRequestPath(request);
        } else if (resolvedModelCode.startsWith("/")) {
            resolvedModelCode = resolvedModelCode.substring(1);
        }
        CatalogProduct product = catalogService.getProduct(resolvedModelCode);
        return new CatalogProductResponse(product, catalogService.demoNotice());
    }

    @PutMapping("/admin/products/{modelCode}/specifications")
    public CatalogProductResponse updateGpuSpecifications(
            @PathVariable String modelCode,
            @RequestBody UpdateGpuSpecificationsRequest request) {
        CatalogProduct product = catalogService.updateGpuSpecifications(
                modelCode, request == null ? null : request.specifications());
        return new CatalogProductResponse(product, catalogService.demoNotice());
    }

    private String modelCodeFromRequestPath(HttpServletRequest request) {
        String prefix = request.getContextPath() + "/api/catalog/products/";
        String path = request.getRequestURI();
        if (!path.startsWith(prefix)) {
            return null;
        }
        return UriUtils.decode(path.substring(prefix.length()), StandardCharsets.UTF_8);
    }
}
