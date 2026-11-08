package com.pc_builder_store.catalog.controller;

import static com.pc_builder_store.catalog.dto.AdminCatalogDtos.*;

import com.pc_builder_store.auth.AuthUserPrincipal;
import com.pc_builder_store.catalog.service.AdminCatalogService;
import com.pc_builder_store.catalog.service.ProductMediaStorage;
import java.io.IOException;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/catalog/admin/management")
public class AdminProductController {

    private final AdminCatalogService service;

    public AdminProductController(AdminCatalogService service) {
        this.service = service;
    }

    @GetMapping("/products")
    public AdminProductPage listProducts(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int limit) {
        return service.listProducts(q, status, type, page, limit);
    }

    @GetMapping("/products/{modelCode}")
    public AdminProduct getProduct(@PathVariable String modelCode) {
        return service.getProduct(modelCode);
    }

    @PostMapping("/products")
    public ResponseEntity<AdminProduct> createProduct(
            @RequestBody ProductSaveRequest request,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createProduct(request, actor));
    }

    @PutMapping("/products/{modelCode}")
    public AdminProduct updateProduct(
            @PathVariable String modelCode,
            @RequestBody ProductSaveRequest request,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        return service.updateProduct(modelCode, request, actor);
    }

    @PutMapping("/products/{modelCode}/status")
    public AdminProduct updateStatus(
            @PathVariable String modelCode,
            @RequestBody ProductStatusRequest request,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        return service.updateStatus(modelCode, request == null ? null : request.status(), actor);
    }

    @PostMapping("/products/{modelCode}/offers")
    public ResponseEntity<AdminOffer> createOffer(
            @PathVariable String modelCode,
            @RequestBody OfferSaveRequest request,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thông tin ưu đãi là bắt buộc.");
        }
        if (request.offerId() != null && !request.offerId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã ưu đãi phải được máy chủ tạo.");
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.saveOffer(modelCode, request, actor));
    }

    @PutMapping("/products/{modelCode}/offers/{offerId}")
    public AdminOffer updateOffer(
            @PathVariable String modelCode,
            @PathVariable String offerId,
            @RequestBody OfferSaveRequest request,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thông tin ưu đãi là bắt buộc.");
        }
        OfferSaveRequest update = new OfferSaveRequest(
                offerId, request.condition(), request.price(), request.compareAtPrice(),
                request.currency(), request.stockQuantity(), request.warrantyMonths(),
                request.status(), request.minimumPurchaseQuantity(),
                request.maximumPurchaseQuantity(), request.lowStockThreshold());
        return service.saveOffer(modelCode, update, actor);
    }

    @PutMapping("/products/{modelCode}/bom")
    public List<AdminBomComponent> saveBom(
            @PathVariable String modelCode,
            @RequestBody List<BomComponentRequest> components,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        return service.saveBom(modelCode, components, actor);
    }

    @PutMapping("/products/{modelCode}/images")
    public List<AdminImage> saveImages(
            @PathVariable String modelCode,
            @RequestBody List<ImageSaveRequest> images,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        return service.saveImages(modelCode, images, actor);
    }

    @PostMapping(value = "/products/{modelCode}/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AdminImage> uploadMedia(
            @PathVariable String modelCode,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String altText,
            @RequestParam(required = false) String caption,
            @RequestParam(defaultValue = "false") boolean primary,
            @RequestParam(defaultValue = "0") int displayOrder,
            @AuthenticationPrincipal AuthUserPrincipal actor) throws IOException {
        AdminImage image = service.uploadMedia(
                modelCode, file, altText, caption, primary, displayOrder, actor);
        return ResponseEntity.status(HttpStatus.CREATED).body(image);
    }

    @GetMapping("/products/{modelCode}/audit")
    public List<AuditEntry> audit(
            @PathVariable String modelCode,
            @RequestParam(defaultValue = "100") int limit) {
        return service.getAudit(modelCode, limit);
    }

    @DeleteMapping("/products/{modelCode}/images/{imageId}")
    public ResponseEntity<Void> removeImage(
            @PathVariable String modelCode,
            @PathVariable String imageId,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        service.removeImage(modelCode, imageId, actor);
        return ResponseEntity.noContent().build();
    }
}

@RestController
class CatalogMediaController {

    private final ProductMediaStorage mediaStorage;

    CatalogMediaController(ProductMediaStorage mediaStorage) {
        this.mediaStorage = mediaStorage;
    }

    @GetMapping("/api/catalog/media/{fileName}")
    public ResponseEntity<Resource> getMedia(@PathVariable String fileName) {
        ProductMediaStorage.StoredFile file = mediaStorage.find(fileName);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.mimeType()))
                .cacheControl(CacheControl.noCache())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .header("X-Content-Type-Options", "nosniff")
                .body(file.resource());
    }
}
