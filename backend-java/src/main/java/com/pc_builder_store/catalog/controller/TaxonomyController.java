package com.pc_builder_store.catalog.controller;

import com.pc_builder_store.catalog.dto.TaxonomyDtos.Brand;
import com.pc_builder_store.catalog.dto.TaxonomyDtos.BrandRequest;
import com.pc_builder_store.catalog.dto.TaxonomyDtos.Category;
import com.pc_builder_store.catalog.dto.TaxonomyDtos.CategoryRequest;
import com.pc_builder_store.catalog.service.TaxonomyService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Categories and brands; the whole /api/catalog/admin/** tree is ADMIN-only. */
@RestController
@RequestMapping("/api/catalog/admin/management")
public class TaxonomyController {

    private final TaxonomyService service;

    public TaxonomyController(TaxonomyService service) {
        this.service = service;
    }

    @GetMapping("/categories")
    public List<Category> categories() {
        return service.categories();
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public Category createCategory(@RequestBody CategoryRequest request) {
        return service.createCategory(request);
    }

    @PutMapping("/categories/{categoryCode}")
    public Category updateCategory(@PathVariable String categoryCode, @RequestBody CategoryRequest request) {
        return service.updateCategory(categoryCode, request);
    }

    @DeleteMapping("/categories/{categoryCode}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@PathVariable String categoryCode) {
        service.deleteCategory(categoryCode);
    }

    @GetMapping("/brands")
    public List<Brand> brands() {
        return service.brands();
    }

    @PostMapping("/brands")
    @ResponseStatus(HttpStatus.CREATED)
    public Brand createBrand(@RequestBody BrandRequest request) {
        return service.createBrand(request);
    }

    @PutMapping("/brands/{brandId}")
    public Brand updateBrand(@PathVariable String brandId, @RequestBody BrandRequest request) {
        return service.updateBrand(brandId, request);
    }

    @DeleteMapping("/brands/{brandId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBrand(@PathVariable String brandId) {
        service.deleteBrand(brandId);
    }
}
