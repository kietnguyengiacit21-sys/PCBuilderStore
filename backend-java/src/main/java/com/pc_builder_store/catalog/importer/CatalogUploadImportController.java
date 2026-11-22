package com.pc_builder_store.catalog.importer;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** ADMIN-only (see SecurityConfiguration). */
@RestController
@RequestMapping("/api/admin/imports")
public class CatalogUploadImportController {

    private final CatalogUploadImportService service;

    public CatalogUploadImportController(CatalogUploadImportService service) {
        this.service = service;
    }

    /** apply=false (default) validates and previews without writing; apply=true imports in one transaction. */
    @PostMapping(value = "/catalog", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CatalogUploadImportService.ImportResult importCatalog(
            @RequestPart("file") MultipartFile file,
            @RequestParam(defaultValue = "false") boolean apply) {
        return service.run(file, apply);
    }
}
