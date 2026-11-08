package com.pc_builder_store.catalog.service;

import static com.pc_builder_store.catalog.dto.AdminCatalogDtos.*;

import com.pc_builder_store.auth.AuthUserPrincipal;
import com.pc_builder_store.catalog.AttributeDefinitionRegistry;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class AdminCatalogService {

    private static final BigDecimal MAX_PRICE = new BigDecimal("9999999999999.99");
    private static final long MAX_STOCK = 4_294_967_295L;
    private static final int MAX_QUANTITY = 100;
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    private final ProductMediaStorage mediaStorage;

    public AdminCatalogService(
            JdbcTemplate jdbc,
            ObjectMapper objectMapper,
            ProductMediaStorage mediaStorage) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.mediaStorage = mediaStorage;
    }

    public AdminProductPage listProducts(
            String query, String status, String productType, int page, int limit) {
        if (page < 1 || page > 100_000 || limit < 1 || limit > 100) {
            throw badRequest("Trang hoặc số mục trên trang không hợp lệ.");
        }
        String normalizedQuery = query == null ? "" : query.trim();
        if (normalizedQuery.length() > 200) {
            throw badRequest("Từ khóa tìm kiếm không được vượt quá 200 ký tự.");
        }
        if (status != null && !Set.of("DRAFT", "ACTIVE", "HIDDEN", "ARCHIVED").contains(status)) {
            throw badRequest("Trạng thái sản phẩm không hợp lệ.");
        }
        if (productType != null && !productType.matches("[A-Z][A-Z0-9_]{0,39}")) {
            throw badRequest("Loại sản phẩm không hợp lệ.");
        }
        String statusFilter = status == null ? "" : " AND p.\"product_status\" = ?";
        String typeFilter = productType == null ? "" : " AND pt.\"type_code\" = ?";
        String searchFilter = normalizedQuery.isEmpty() ? "" : """
                 AND (p."product_name" ILIKE ? OR p."model_code" ILIKE ? OR p."sku" ILIKE ?)
                """;
        String base = """
                FROM "products" p
                JOIN "product_types" pt ON pt."product_type_id" = p."product_type_id"
                JOIN "categories" c ON c."category_id" = p."category_id"
                LEFT JOIN "brands" b ON b."brand_id" = p."brand_id"
                WHERE TRUE
                """ + statusFilter + typeFilter + searchFilter;
        List<Object> parameters = new ArrayList<>();
        if (status != null) parameters.add(status);
        if (productType != null) parameters.add(productType);
        if (!normalizedQuery.isEmpty()) {
            String like = "%" + normalizedQuery + "%";
            parameters.add(like);
            parameters.add(like);
            parameters.add(like);
        }
        parameters.add(limit);
        parameters.add((long) (page - 1) * limit);
        List<AdminProductSummary> data = jdbc.query("""
                SELECT p."product_id"::text AS "productId",
                       p."model_code" AS "modelCode",
                       p."product_name" AS "productName",
                       pt."type_code" AS "productType",
                       c."category_name" AS "categoryName",
                       b."brand_name" AS "brandName",
                       p."product_status" AS "status",
                       (SELECT po."price" FROM "product_offers" po
                        WHERE po."product_id" = p."product_id" AND po."offer_status" = 'ACTIVE'
                        ORDER BY po."price" LIMIT 1) AS "minimumPrice",
                       (SELECT po."currency_code" FROM "product_offers" po
                        WHERE po."product_id" = p."product_id" AND po."offer_status" = 'ACTIVE'
                        ORDER BY po."price" LIMIT 1) AS "currency",
                       COALESCE((SELECT SUM(po."stock_quantity" - po."reserved_quantity")
                        FROM "product_offers" po
                        WHERE po."product_id" = p."product_id" AND po."offer_status" = 'ACTIVE'), 0)
                          AS "availableQuantity"
                """ + base + """
                ORDER BY p."display_order", p."product_name", p."product_id"
                LIMIT ? OFFSET ?
                """, summaryMapper(), parameters.toArray());
        List<Object> countParameters = new ArrayList<>(parameters.subList(0, parameters.size() - 2));
        Long total = jdbc.queryForObject("SELECT COUNT(*) " + base, Long.class, countParameters.toArray());
        return new AdminProductPage(data, page, limit, total == null ? 0 : total);
    }

    public AdminProduct getProduct(String modelCode) {
        ProductIdentity product = findProduct(modelCode, false);
        List<AdminOffer> offers = jdbc.query("""
                SELECT "offer_id"::text AS "offerId", "condition_code" AS "condition",
                       "price", "compare_at_price" AS "compareAtPrice", "currency_code" AS "currency",
                       "stock_quantity" AS "stockQuantity", "reserved_quantity" AS "reservedQuantity",
                       "warranty_months" AS "warrantyMonths", "offer_status" AS "status",
                       "minimum_purchase_quantity" AS "minimumPurchaseQuantity",
                       "maximum_purchase_quantity" AS "maximumPurchaseQuantity",
                       "low_stock_threshold" AS "lowStockThreshold"
                FROM "product_offers" WHERE "product_id" = ?
                ORDER BY "created_at", "offer_id"
                """, offerMapper(), product.id());
        List<AdminImage> images = jdbc.query("""
                SELECT "image_id"::text AS "imageId", "image_url" AS "url",
                       "alt_text" AS "altText", "caption", "media_type" AS "mediaType",
                       "mime_type" AS "mimeType", "file_name" AS "fileName",
                       "is_primary" AS "primary", "sort_order" AS "displayOrder"
                FROM "product_images" WHERE "product_id" = ?
                ORDER BY "sort_order", "image_id"
                """, imageMapper(), product.id());
        List<AdminBomComponent> components = jdbc.query("""
                SELECT bom."component_product_id"::text AS "componentProductId",
                       component."model_code" AS "modelCode",
                       component."product_name" AS "productName",
                       pt."type_code" AS "productType",
                       bom."quantity", bom."component_warranty_months" AS "warrantyMonths",
                       bom."display_category" AS "displayCategory",
                       bom."display_order" AS "displayOrder",
                       bom."customer_visible" AS "customerVisible"
                FROM "product_bom_components" bom
                JOIN "products" component ON component."product_id" = bom."component_product_id"
                JOIN "product_types" pt ON pt."product_type_id" = component."product_type_id"
                WHERE bom."parent_product_id" = ?
                ORDER BY bom."display_order", component."product_name"
                """, bomMapper(), product.id());
        Map<String, JsonNode> specifications = readObject(product.specificationsJson());
        if (components.isEmpty() && "PC".equals(product.productType())) {
            components = specificationBomComponents(specifications);
        }
        return new AdminProduct(
                product.id().toPlainString(), product.modelCode(), product.productName(),
                product.sku(), product.slug(), product.productType(), product.productTypeName(),
                product.categoryCode(), product.categoryName(), product.brandName(),
                product.shortDescription(), product.description(), product.seoTitle(),
                product.seoDescription(), readStringList(product.tagsJson()), product.featured(),
                product.displayOrder(), product.status(), readJson(product.contentSectionsJson()),
                specifications, offers, images, components);
    }

    @Transactional
    public AdminProduct createProduct(ProductSaveRequest request, AuthUserPrincipal actor) {
        validateProduct(request);
        BigDecimal productId;
        try {
            productId = jdbc.queryForObject("""
                    INSERT INTO "products"
                      ("product_type_id", "category_id", "brand_id", "model_code", "product_name",
                       "short_description", "description", "product_status", "sku", "slug", "tags",
                       "seo_title", "seo_description", "is_featured", "display_order", "content_sections")
                    SELECT pt."product_type_id", c."category_id",
                           (SELECT b."brand_id" FROM "brands" b
                            WHERE b."is_active" = TRUE AND LOWER(b."brand_name") = LOWER(?)
                            ORDER BY b."brand_id" LIMIT 1),
                           ?, ?, ?, ?, 'DRAFT', ?, ?, CAST(? AS jsonb), ?, ?, ?, ?, CAST(? AS jsonb)
                    FROM "product_types" pt
                    JOIN "categories" c ON c."is_active" = TRUE AND c."category_code" = ?
                    WHERE pt."is_active" = TRUE AND pt."type_code" = ?
                      AND (COALESCE(?, '') = '' OR EXISTS (SELECT 1 FROM "brands" b
                           WHERE b."is_active" = TRUE AND LOWER(b."brand_name") = LOWER(?)))
                    RETURNING "product_id"
                    """, BigDecimal.class,
                    request.brandName(), request.modelCode(), request.productName(),
                    request.shortDescription(), request.description(), request.sku(), request.slug(),
                    json(request.tags() == null ? List.of() : request.tags()), request.seoTitle(),
                    request.seoDescription(), request.featured(), request.displayOrder(),
                    json(request.contentSections() == null
                            ? objectMapper.createArrayNode() : request.contentSections()),
                    request.categoryCode(), request.productType(), request.brandName(), request.brandName());
        } catch (EmptyResultDataAccessException exception) {
            throw badRequest("Loại sản phẩm, danh mục hoặc thương hiệu không tồn tại hay đã bị vô hiệu hóa.");
        }
        saveSpecifications(productId, request.productType(), request.specifications());
        audit("PRODUCT", productId, "CREATED", Map.of(
                "modelCode", request.modelCode(),
                "fields", List.of("productName", "sku", "slug", "classification", "descriptions")), actor);
        return getProduct(request.modelCode());
    }

    @Transactional
    public AdminProduct updateProduct(
            String modelCode, ProductSaveRequest request, AuthUserPrincipal actor) {
        validateProduct(request);
        if (!modelCode.equals(request.modelCode())) {
            throw badRequest("Không thể đổi mã model của một sản phẩm đã tạo.");
        }
        ProductIdentity current = findProduct(modelCode, true);
        if (!current.productType().equals(request.productType())) {
            throw badRequest("Không thể đổi loại sản phẩm khi đã có dữ liệu kỹ thuật; hãy tạo sản phẩm mới.");
        }
        int updated = jdbc.update("""
                UPDATE "products" p
                SET "product_type_id" = pt."product_type_id",
                    "category_id" = c."category_id",
                    "brand_id" = (SELECT b."brand_id" FROM "brands" b
                        WHERE b."is_active" = TRUE AND LOWER(b."brand_name") = LOWER(?)
                        ORDER BY b."brand_id" LIMIT 1),
                    "product_name" = ?, "short_description" = ?, "description" = ?,
                    "sku" = ?, "slug" = ?, "tags" = CAST(? AS jsonb),
                    "seo_title" = ?, "seo_description" = ?, "is_featured" = ?,
                    "display_order" = ?, "content_sections" = CAST(? AS jsonb),
                    "updated_at" = CURRENT_TIMESTAMP
                FROM "product_types" pt, "categories" c
                WHERE p."product_id" = ? AND pt."is_active" = TRUE
                  AND pt."type_code" = ? AND c."is_active" = TRUE
                  AND c."category_code" = ?
                  AND (COALESCE(?, '') = '' OR EXISTS (SELECT 1 FROM "brands" b
                       WHERE b."is_active" = TRUE AND LOWER(b."brand_name") = LOWER(?)))
                """,
                request.brandName(), request.productName(), request.shortDescription(),
                request.description(), request.sku(), request.slug(),
                json(request.tags() == null ? List.of() : request.tags()), request.seoTitle(),
                request.seoDescription(), request.featured(), request.displayOrder(),
                json(request.contentSections() == null
                        ? objectMapper.createArrayNode() : request.contentSections()),
                current.id(), request.productType(), request.categoryCode(),
                request.brandName(), request.brandName());
        if (updated != 1) {
            throw badRequest("Loại sản phẩm, danh mục hoặc thương hiệu không tồn tại hay đã bị vô hiệu hóa.");
        }
        saveSpecifications(current.id(), request.productType(), request.specifications());
        audit("PRODUCT", current.id(), "UPDATED", Map.of(
                "fields", List.of("productName", "sku", "slug", "classification", "descriptions",
                        "seo", "tags", "featured", "displayOrder", "specifications")), actor);
        return getProduct(modelCode);
    }

    @Transactional
    public AdminOffer saveOffer(
            String modelCode, OfferSaveRequest request, AuthUserPrincipal actor) {
        ProductIdentity product = findProduct(modelCode, true);
        validateOffer(request);
        BigDecimal offerId;
        if (request.offerId() == null || request.offerId().isBlank()) {
            offerId = jdbc.queryForObject("""
                    INSERT INTO "product_offers"
                      ("product_id", "offer_code", "condition_code", "price", "compare_at_price",
                       "currency_code", "stock_quantity", "warranty_months", "offer_status",
                       "minimum_purchase_quantity", "maximum_purchase_quantity", "low_stock_threshold")
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    RETURNING "offer_id"
                    """, BigDecimal.class, product.id(), "ADM-" + UUID.randomUUID(),
                    request.condition(), request.price(), request.compareAtPrice(), request.currency(),
                    request.stockQuantity(), request.warrantyMonths(), request.status(),
                    request.minimumPurchaseQuantity(), request.maximumPurchaseQuantity(),
                    request.lowStockThreshold());
        } else {
            BigDecimal existingId = parseId(request.offerId(), "offer");
            int updated = jdbc.update("""
                    UPDATE "product_offers"
                    SET "condition_code" = ?, "price" = ?, "compare_at_price" = ?,
                        "currency_code" = ?, "stock_quantity" = ?, "warranty_months" = ?,
                        "offer_status" = ?, "minimum_purchase_quantity" = ?,
                        "maximum_purchase_quantity" = ?, "low_stock_threshold" = ?,
                        "updated_at" = CURRENT_TIMESTAMP
                    WHERE "offer_id" = ? AND "product_id" = ?
                      AND ? >= "reserved_quantity"
                    """, request.condition(), request.price(), request.compareAtPrice(),
                    request.currency(), request.stockQuantity(), request.warrantyMonths(),
                    request.status(), request.minimumPurchaseQuantity(),
                    request.maximumPurchaseQuantity(), request.lowStockThreshold(),
                    existingId, product.id(), request.stockQuantity());
            if (updated != 1) {
                throw badRequest("Ưu đãi không tồn tại hoặc số lượng không thể giảm xuống dưới mức đã đặt trước.");
            }
            offerId = existingId;
        }
        audit("OFFER", offerId, request.offerId() == null ? "CREATED" : "UPDATED",
                Map.of("price", request.price(), "currency", request.currency(),
                        "stockQuantity", request.stockQuantity(), "status", request.status()), actor);
        return jdbc.queryForObject("""
                SELECT "offer_id"::text AS "offerId", "condition_code" AS "condition",
                       "price", "compare_at_price" AS "compareAtPrice", "currency_code" AS "currency",
                       "stock_quantity" AS "stockQuantity", "reserved_quantity" AS "reservedQuantity",
                       "warranty_months" AS "warrantyMonths", "offer_status" AS "status",
                       "minimum_purchase_quantity" AS "minimumPurchaseQuantity",
                       "maximum_purchase_quantity" AS "maximumPurchaseQuantity",
                       "low_stock_threshold" AS "lowStockThreshold"
                FROM "product_offers" WHERE "offer_id" = ?
                """, offerMapper(), offerId);
    }

    @Transactional
    public AdminProduct updateStatus(String modelCode, String status, AuthUserPrincipal actor) {
        ProductIdentity product = findProduct(modelCode, true);
        if (status == null || !Set.of("DRAFT", "ACTIVE", "HIDDEN", "ARCHIVED").contains(status)) {
            throw badRequest("Trạng thái sản phẩm không hợp lệ.");
        }
        if ("ACTIVE".equals(status)) {
            Integer activeOffers = jdbc.queryForObject("""
                    SELECT COUNT(*) FROM "product_offers"
                    WHERE "product_id" = ? AND "offer_status" = 'ACTIVE'
                    """, Integer.class, product.id());
            if (activeOffers == null || activeOffers == 0) {
                throw badRequest("Cần có ít nhất một ưu đãi đang hoạt động trước khi xuất bản.");
            }
            if ("PC".equals(product.productType())) {
                Integer components = jdbc.queryForObject("""
                        SELECT COUNT(*) FROM "product_bom_components"
                        WHERE "parent_product_id" = ?
                        """, Integer.class, product.id());
                if (components == null || components == 0) {
                    throw badRequest("Máy bộ cần có ít nhất một linh kiện trong danh sách cấu hình trước khi xuất bản.");
                }
            }
        }
        jdbc.update("""
                UPDATE "products" SET "product_status" = ?, "updated_at" = CURRENT_TIMESTAMP
                WHERE "product_id" = ?
                """, status, product.id());
        audit("PRODUCT", product.id(), "STATUS_CHANGED",
                Map.of("previousStatus", product.status(), "newStatus", status), actor);
        return getProduct(modelCode);
    }

    @Transactional
    public List<AdminBomComponent> saveBom(
            String modelCode, List<BomComponentRequest> components, AuthUserPrincipal actor) {
        ProductIdentity product = findProduct(modelCode, true);
        if (!"PC".equals(product.productType())) {
            throw badRequest("Danh sách linh kiện chỉ áp dụng cho sản phẩm máy bộ.");
        }
        if (components == null || components.size() > 100) {
            throw badRequest("Danh sách linh kiện không hợp lệ.");
        }
        Set<BigDecimal> ids = new HashSet<>();
        for (BomComponentRequest component : components) {
            BigDecimal componentId = parseId(component.componentProductId(), "component");
            if (componentId.equals(product.id()) || !ids.add(componentId)) {
                throw badRequest("Linh kiện bị trùng hoặc tham chiếu chính sản phẩm máy bộ.");
            }
            if (component.quantity() < 1 || component.quantity() > MAX_QUANTITY
                    || component.displayOrder() < 0
                    || component.displayCategory() == null
                    || component.displayCategory().isBlank()
                    || component.displayCategory().length() > 80
                    || (component.warrantyMonths() != null
                            && (component.warrantyMonths() < 0 || component.warrantyMonths() > 65_535))) {
                throw badRequest("Số lượng, bảo hành, nhóm hiển thị hoặc thứ tự linh kiện không hợp lệ.");
            }
        }
        for (BigDecimal componentId : ids) {
            Integer exists = jdbc.queryForObject("""
                    SELECT COUNT(*) FROM "products"
                    WHERE "product_id" = ? AND "product_status" = 'ACTIVE'
                    """, Integer.class, componentId);
            if (exists == null || exists != 1) {
                throw badRequest("Mọi linh kiện phải tham chiếu đến sản phẩm đang hoạt động.");
            }
        }
        jdbc.update("DELETE FROM \"product_bom_components\" WHERE \"parent_product_id\" = ?", product.id());
        for (BomComponentRequest component : components) {
            jdbc.update("""
                    INSERT INTO "product_bom_components"
                      ("parent_product_id", "component_product_id", "quantity",
                       "component_warranty_months", "display_category", "display_order",
                       "customer_visible", "updated_at")
                    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    """, product.id(), parseId(component.componentProductId(), "component"),
                    component.quantity(), component.warrantyMonths(), component.displayCategory().trim(),
                    component.displayOrder(), component.customerVisible());
        }
        audit("PRODUCT", product.id(), "BOM_UPDATED",
                Map.of("componentCount", components.size()), actor);
        return jdbc.query("""
                SELECT bom."component_product_id"::text AS "componentProductId",
                       component."model_code" AS "modelCode",
                       component."product_name" AS "productName",
                       pt."type_code" AS "productType",
                       bom."quantity", bom."component_warranty_months" AS "warrantyMonths",
                       bom."display_category" AS "displayCategory",
                       bom."display_order" AS "displayOrder",
                       bom."customer_visible" AS "customerVisible"
                FROM "product_bom_components" bom
                JOIN "products" component ON component."product_id" = bom."component_product_id"
                JOIN "product_types" pt ON pt."product_type_id" = component."product_type_id"
                WHERE bom."parent_product_id" = ?
                ORDER BY bom."display_order", component."product_name"
                """, bomMapper(), product.id());
    }

    @Transactional
    public List<AdminImage> saveImages(
            String modelCode, List<ImageSaveRequest> images, AuthUserPrincipal actor) {
        ProductIdentity product = findProduct(modelCode, true);
        validateImages(images);
        Set<BigDecimal> retained = new HashSet<>();
        for (int index = 0; index < images.size(); index++) {
            ImageSaveRequest image = images.get(index);
            validateImage(image);
            if (image.imageId() == null || image.imageId().isBlank()) {
                BigDecimal imageId = jdbc.queryForObject("""
                        INSERT INTO "product_images"
                          ("product_id", "image_url", "alt_text", "caption", "media_type", "is_primary", "sort_order")
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        RETURNING "image_id"
                        """, BigDecimal.class, product.id(), image.url().trim(), image.altText(), image.caption(),
                        image.mediaType(), image.primary(), image.displayOrder());
                retained.add(imageId);
            } else {
                BigDecimal imageId = parseId(image.imageId(), "image");
                if (!retained.add(imageId)) {
                    throw badRequest("Mỗi ảnh chỉ được xuất hiện một lần trong thư viện.");
                }
                int updated = jdbc.update("""
                        UPDATE "product_images"
                        SET "image_url" = ?, "alt_text" = ?, "caption" = ?,
                            "media_type" = ?, "is_primary" = ?, "sort_order" = ?
                        WHERE "image_id" = ? AND "product_id" = ?
                        """, image.url().trim(), image.altText(), image.caption(),
                        image.mediaType(), image.primary(), image.displayOrder(), imageId, product.id());
                if (updated != 1) {
                    throw badRequest("Không tìm thấy ảnh thuộc sản phẩm này.");
                }
            }
        }
        if (retained.isEmpty()) {
            jdbc.update("DELETE FROM \"product_images\" WHERE \"product_id\" = ?", product.id());
        } else {
            String placeholders = String.join(",", java.util.Collections.nCopies(retained.size(), "?"));
            List<Object> parameters = new ArrayList<>();
            parameters.add(product.id());
            parameters.addAll(retained);
            jdbc.update("DELETE FROM \"product_images\" WHERE \"product_id\" = ? AND \"image_id\" NOT IN ("
                    + placeholders + ")", parameters.toArray());
        }
        audit("PRODUCT", product.id(), "IMAGES_UPDATED",
                Map.of("imageCount", images.size()), actor);
        return jdbc.query("""
                SELECT "image_id"::text AS "imageId", "image_url" AS "url",
                       "alt_text" AS "altText", "caption", "media_type" AS "mediaType",
                       "mime_type" AS "mimeType", "file_name" AS "fileName",
                       "is_primary" AS "primary", "sort_order" AS "displayOrder"
                FROM "product_images" WHERE "product_id" = ?
                ORDER BY "sort_order", "image_id"
                """, imageMapper(), product.id());
    }

    @Transactional
    public AdminImage uploadMedia(
            String modelCode,
            org.springframework.web.multipart.MultipartFile upload,
            String altText,
            String caption,
            boolean primary,
            int displayOrder,
            AuthUserPrincipal actor) throws java.io.IOException {
        ProductIdentity product = findProduct(modelCode, true);
        if (displayOrder < 0 || (altText != null && altText.length() > 300)
                || (caption != null && caption.length() > 500)) {
            throw badRequest("Mô tả ảnh hoặc thứ tự hiển thị không hợp lệ.");
        }
        ProductMediaStorage.StoredMedia file = mediaStorage.store(upload);
        if (primary) {
            jdbc.update("UPDATE \"product_images\" SET \"is_primary\" = FALSE WHERE \"product_id\" = ?",
                    product.id());
        }
        jdbc.update("""
                INSERT INTO "product_images"
                  ("product_id", "image_url", "alt_text", "caption", "media_type",
                   "mime_type", "file_name", "is_primary", "sort_order")
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, product.id(), file.url(), altText, caption, file.mediaType(),
                file.mimeType(), file.fileName(), primary, displayOrder);
        audit("PRODUCT", product.id(), "MEDIA_UPLOADED",
                Map.of("mediaType", file.mediaType(), "fileName", file.fileName()), actor);
        return jdbc.queryForObject("""
                SELECT "image_id"::text AS "imageId", "image_url" AS "url",
                       "alt_text" AS "altText", "caption", "media_type" AS "mediaType",
                       "mime_type" AS "mimeType", "file_name" AS "fileName",
                       "is_primary" AS "primary", "sort_order" AS "displayOrder"
                FROM "product_images"
                WHERE "product_id" = ? AND "file_name" = ?
                ORDER BY "image_id" DESC LIMIT 1
                """, imageMapper(), product.id(), file.fileName());
    }

    @Transactional
    public void removeImage(String modelCode, String imageId, AuthUserPrincipal actor) {
        ProductIdentity product = findProduct(modelCode, true);
        BigDecimal key = parseId(imageId, "image");
        int removed = jdbc.update("""
                DELETE FROM "product_images" WHERE "image_id" = ? AND "product_id" = ?
                """, key, product.id());
        if (removed != 1) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ảnh thuộc sản phẩm này.");
        }
        audit("PRODUCT", product.id(), "IMAGE_REMOVED", Map.of("imageId", imageId), actor);
    }

    public List<AuditEntry> getAudit(String modelCode, int limit) {
        ProductIdentity product = findProduct(modelCode, false);
        if (limit < 1 || limit > 200) throw badRequest("Giới hạn lịch sử không hợp lệ.");
        return jdbc.query("""
                SELECT h."action_code" AS "action", h."changes_json"::text AS "changes",
                       u."full_name" AS "actorName", u."email" AS "actorEmail",
                       h."created_at"::text AS "createdAt"
                FROM "admin_product_change_history" h
                LEFT JOIN "users" u ON u."user_id" = h."actor_user_id"
                WHERE h."entity_type" = 'PRODUCT' AND h."entity_id" = ?
                ORDER BY h."created_at" DESC, h."change_id" DESC LIMIT ?
                """, (rs, row) -> new AuditEntry(
                rs.getString("action"), readJson(rs.getString("changes")),
                rs.getString("actorName"), rs.getString("actorEmail"),
                rs.getString("createdAt")), product.id(), limit);
    }

    private void saveSpecifications(
            BigDecimal productId, String productType, Map<String, JsonNode> specifications) {
        if (specifications == null) return;
        if (specifications.size() > 300) throw badRequest("Có quá nhiều thuộc tính trong yêu cầu.");
        BigDecimal productTypeId = jdbc.queryForObject("""
                SELECT "product_type_id" FROM "products" WHERE "product_id" = ?
                """, BigDecimal.class, productId);
        for (Map.Entry<String, JsonNode> entry : specifications.entrySet()) {
            AttributeDefinitionRegistry.Definition definition = AttributeDefinitionRegistry
                    .find(productType, entry.getKey())
                    .orElseThrow(() -> badRequest("Thuộc tính không được định nghĩa cho loại sản phẩm này: "
                            + entry.getKey()));
            JsonNode value = entry.getValue();
            validateAttributeValue(definition, value);
            BigDecimal definitionId = jdbc.queryForObject("""
                    INSERT INTO "product_attribute_definitions"
                      ("product_type_id", "attribute_code", "attribute_name", "data_type", "unit",
                       "is_filterable", "is_build_critical")
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT ("product_type_id", "attribute_code") DO UPDATE SET
                      "attribute_name" = EXCLUDED."attribute_name",
                      "data_type" = EXCLUDED."data_type",
                      "unit" = EXCLUDED."unit",
                      "is_filterable" = EXCLUDED."is_filterable",
                      "is_build_critical" = EXCLUDED."is_build_critical"
                    RETURNING "attribute_definition_id"
                    """, BigDecimal.class, productTypeId, definition.code(), definition.labelVi(),
                    definition.dataType(), definition.unit(), definition.filterable(),
                    definition.buildCritical());
            if (value == null || value.isNull()) {
                jdbc.update("""
                        DELETE FROM "product_attribute_values"
                        WHERE "product_id" = ? AND "attribute_definition_id" = ?
                        """, productId, definitionId);
                continue;
            }
            jdbc.update("""
                    INSERT INTO "product_attribute_values"
                      ("product_id", "attribute_definition_id", "value_text", "value_decimal",
                       "value_integer", "value_boolean", "value_json")
                    VALUES (?, ?, ?, ?, ?, ?, CAST(? AS jsonb))
                    ON CONFLICT ("product_id", "attribute_definition_id") DO UPDATE SET
                      "value_text" = EXCLUDED."value_text",
                      "value_decimal" = EXCLUDED."value_decimal",
                      "value_integer" = EXCLUDED."value_integer",
                      "value_boolean" = EXCLUDED."value_boolean",
                      "value_json" = EXCLUDED."value_json",
                      "updated_at" = CURRENT_TIMESTAMP
                    """, productId, definitionId,
                    "TEXT".equals(definition.dataType()) ? value.textValue() : null,
                    "DECIMAL".equals(definition.dataType()) ? value.decimalValue() : null,
                    "INTEGER".equals(definition.dataType()) ? value.bigIntegerValue() : null,
                    "BOOLEAN".equals(definition.dataType()) ? value.booleanValue() : null,
                    "JSON".equals(definition.dataType()) ? value.toString() : null);
        }
    }

    private void validateAttributeValue(
            AttributeDefinitionRegistry.Definition definition, JsonNode value) {
        if (value == null || value.isNull()) return;
        boolean valid = switch (definition.dataType()) {
            case "TEXT" -> value.isTextual()
                    && (definition.options().isEmpty()
                            || definition.options().contains(value.textValue()));
            case "INTEGER" -> value.isIntegralNumber() && value.bigIntegerValue().abs().toString().length() <= 20;
            case "DECIMAL" -> {
                if (!value.isNumber()) yield false;
                try {
                    yield value.decimalValue().setScale(6, RoundingMode.UNNECESSARY).precision() <= 20;
                } catch (ArithmeticException exception) {
                    yield false;
                }
            }
            case "BOOLEAN" -> value.isBoolean();
            case "JSON" -> value.isArray() || value.isObject();
            default -> false;
        };
        if (!valid) throw badRequest("Giá trị không hợp lệ cho thuộc tính " + definition.code() + ".");
    }

    private void validateProduct(ProductSaveRequest request) {
        if (request == null || request.modelCode() == null
                || !request.modelCode().matches("[A-Za-z0-9][A-Za-z0-9._/-]{0,99}")) {
            throw badRequest("Mã model không hợp lệ.");
        }
        if (request.productName() == null || request.productName().isBlank()
                || request.productName().length() > 240) {
            throw badRequest("Tên sản phẩm là bắt buộc và không được vượt quá 240 ký tự.");
        }
        if (request.productType() == null
                || !request.productType().matches("[A-Z][A-Z0-9_]{0,39}")) {
            throw badRequest("Loại sản phẩm không hợp lệ.");
        }
        if (request.categoryCode() == null || request.categoryCode().isBlank()
                || request.categoryCode().length() > 100) {
            throw badRequest("Danh mục sản phẩm là bắt buộc.");
        }
        if (length(request.sku()) > 100 || length(request.slug()) > 180
                || length(request.shortDescription()) > 500
                || length(request.seoTitle()) > 255 || length(request.seoDescription()) > 500
                || length(request.brandName()) > 160 || request.displayOrder() < 0
                || (request.tags() != null && request.tags().size() > 100)) {
            throw badRequest("Một hoặc nhiều trường sản phẩm vượt quá giới hạn cho phép.");
        }
        if (request.description() != null && request.description().length() > 100_000) {
            throw badRequest("Mô tả sản phẩm không được vượt quá 100.000 ký tự.");
        }
        if (request.tags() != null && request.tags().stream().anyMatch(tag ->
                tag == null || tag.isBlank() || tag.length() > 80)) {
            throw badRequest("Thẻ sản phẩm phải có nội dung và không vượt quá 80 ký tự.");
        }
        JsonNode sections = request.contentSections();
        if (sections != null && (!sections.isArray() || sections.size() > 100
                || sections.toString().length() > 200_000)) {
            throw badRequest("Các mục nội dung phải là danh sách hợp lệ.");
        }
    }

    private void validateOffer(OfferSaveRequest request) {
        if (request == null || request.price() == null || request.price().signum() < 0
                || request.price().compareTo(MAX_PRICE) > 0
                || request.price().scale() > 2
                || request.condition() == null
                || !Set.of("NEW", "LIKE_NEW", "USED").contains(request.condition())
                || request.currency() == null || !request.currency().matches("[A-Z]{3}")
                || request.stockQuantity() < 0 || request.stockQuantity() > MAX_STOCK
                || request.warrantyMonths() < 0 || request.warrantyMonths() > 65_535
                || request.status() == null
                || !Set.of("ACTIVE", "INACTIVE").contains(request.status())
                || request.minimumPurchaseQuantity() < 1
                || request.maximumPurchaseQuantity() < request.minimumPurchaseQuantity()
                || request.maximumPurchaseQuantity() > MAX_QUANTITY
                || (request.lowStockThreshold() != null && request.lowStockThreshold() < 0)
                || (request.compareAtPrice() != null
                        && (request.compareAtPrice().compareTo(request.price()) < 0
                                || request.compareAtPrice().compareTo(MAX_PRICE) > 0
                                || request.compareAtPrice().scale() > 2))) {
            throw badRequest("Giá, tiền tệ, tình trạng, tồn kho hoặc giới hạn mua của ưu đãi không hợp lệ.");
        }
    }

    private void validateImages(List<ImageSaveRequest> images) {
        if (images == null || images.size() > 50) throw badRequest("Thư viện không được vượt quá 50 mục.");
        if (images.stream().filter(ImageSaveRequest::primary).count() > 1) {
            throw badRequest("Chỉ được chọn một ảnh bìa.");
        }
    }

    private void validateImage(ImageSaveRequest image) {
        if (image.url() == null || image.url().isBlank() || image.url().length() > 1000
                || (image.altText() != null && image.altText().length() > 300)
                || (image.caption() != null && image.caption().length() > 500)
                || image.mediaType() == null
                || !Set.of("IMAGE", "VIDEO").contains(image.mediaType())
                || image.displayOrder() < 0
                || !validMediaUrl(image.url())) {
            throw badRequest("Đường dẫn, nội dung hoặc loại media không hợp lệ.");
        }
    }

    private boolean validMediaUrl(String value) {
        if (value.matches("/api/catalog/media/[0-9a-f-]{36}\\.(jpg|png|webp|mp4|webm)")) return true;
        try {
            java.net.URI uri = java.net.URI.create(value);
            return ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    && uri.getHost() != null && uri.getUserInfo() == null
                    && uri.getPort() <= 65_535
                    && value.chars().noneMatch(Character::isWhitespace);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private ProductIdentity findProduct(String modelCode, boolean lock) {
        if (modelCode == null || modelCode.isBlank() || modelCode.length() > 100) {
            throw badRequest("Mã model không hợp lệ.");
        }
        try {
            return jdbc.queryForObject("""
                    SELECT p."product_id" AS "id", p."model_code" AS "modelCode",
                           p."product_name" AS "productName", p."sku", p."slug",
                           pt."type_code" AS "productType", pt."type_name" AS "productTypeName",
                           c."category_code" AS "categoryCode", c."category_name" AS "categoryName",
                           b."brand_name" AS "brandName", p."short_description" AS "shortDescription",
                           p."description", p."seo_title" AS "seoTitle",
                           p."seo_description" AS "seoDescription", p."tags"::text AS "tagsJson",
                           p."is_featured" AS "featured", p."display_order" AS "displayOrder",
                           p."product_status" AS "status", p."content_sections"::text AS "contentSectionsJson",
                           COALESCE((SELECT jsonb_object_agg(ad."attribute_code", COALESCE(
                               to_jsonb(av."value_text"), to_jsonb(av."value_decimal"),
                               to_jsonb(av."value_integer"), to_jsonb(av."value_boolean"), av."value_json"))
                             FROM "product_attribute_definitions" ad
                             JOIN "product_attribute_values" av
                               ON av."attribute_definition_id" = ad."attribute_definition_id"
                              AND av."product_id" = p."product_id"
                             WHERE ad."product_type_id" = p."product_type_id"), '{}'::jsonb)::text
                               AS "specificationsJson"
                    FROM "products" p
                    JOIN "product_types" pt ON pt."product_type_id" = p."product_type_id"
                    JOIN "categories" c ON c."category_id" = p."category_id"
                    LEFT JOIN "brands" b ON b."brand_id" = p."brand_id"
                    WHERE p."model_code" = ?
                    """ + (lock ? " FOR UPDATE OF p" : ""),
                    identityMapper(), modelCode);
        } catch (EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm.");
        }
    }

    private void audit(
            String entityType, BigDecimal entityId, String action,
            Map<String, ?> changes, AuthUserPrincipal actor) {
        try {
            jdbc.update("""
                    INSERT INTO "admin_product_change_history"
                      ("entity_type", "entity_id", "action_code", "changes_json", "actor_user_id")
                    VALUES (?, ?, ?, CAST(? AS jsonb), ?)
                    """, entityType, entityId, action, objectMapper.writeValueAsString(changes),
                    new BigDecimal(actor.userId()));
        } catch (JacksonException exception) {
            throw new IllegalStateException("Could not serialize product audit data.", exception);
        } catch (NumberFormatException exception) {
            throw new IllegalStateException("Authenticated Admin has an invalid user ID.", exception);
        }
    }

    private BigDecimal parseId(String value, String name) {
        if (value == null || !value.matches("[0-9]{1,20}")) {
            throw badRequest("Mã " + name + " không hợp lệ.");
        }
        try {
            return new BigDecimal(value);
        } catch (NumberFormatException exception) {
            throw badRequest("Mã " + name + " không hợp lệ.");
        }
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Could not serialize product data.", exception);
        }
    }

    private JsonNode readJson(String value) {
        try {
            return objectMapper.readTree(value);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Stored product JSON is invalid.", exception);
        }
    }

    private List<String> readStringList(String value) {
        JsonNode parsed = readJson(value);
        List<String> results = new ArrayList<>();
        if (parsed.isArray()) {
            parsed.forEach(item -> {
                if (item.isTextual()) results.add(item.textValue());
            });
        }
        return List.copyOf(results);
    }

    private Map<String, JsonNode> readObject(String value) {
        JsonNode parsed = readJson(value);
        Map<String, JsonNode> result = new LinkedHashMap<>();
        if (parsed.isObject()) parsed.properties().forEach(entry -> result.put(entry.getKey(), entry.getValue()));
        return Map.copyOf(result);
    }

    private List<AdminBomComponent> specificationBomComponents(Map<String, JsonNode> specifications) {
        JsonNode stored = specifications.get("component_details");
        if (stored == null || !stored.isArray()) stored = specifications.get("configuration_items");
        if (stored == null || !stored.isArray()) return List.of();

        List<AdminBomComponent> components = new ArrayList<>();
        int displayOrder = 0;
        for (JsonNode detail : stored) {
            String modelCode = detail.path("model_code").textValue();
            if (modelCode == null || modelCode.isBlank()) continue;
            String componentType = detail.path("component_type").textValue();
            String displayCategory = componentType == null ? "Linh kiện" : componentType;
            int quantity = detail.path("quantity").asInt(1);
            final int componentQuantity = quantity < 1 || quantity > MAX_QUANTITY ? 1 : quantity;
            final Integer warrantyMonths = detail.path("component_warranty_months").isIntegralNumber()
                    ? detail.path("component_warranty_months").intValue()
                    : null;
            final int order = displayOrder;
            List<AdminBomComponent> matched = jdbc.query("""
                    SELECT component."product_id"::text AS "componentProductId",
                           component."model_code" AS "modelCode",
                           component."product_name" AS "productName",
                           componentType."type_code" AS "productType"
                    FROM "products" component
                    JOIN "product_types" componentType
                      ON componentType."product_type_id" = component."product_type_id"
                    WHERE component."model_code" = ?
                    """, (rs, row) -> new AdminBomComponent(
                    rs.getString("componentProductId"), rs.getString("modelCode"),
                    rs.getString("productName"), rs.getString("productType"),
                    componentQuantity, warrantyMonths, displayCategory, order, true), modelCode);
            if (matched.isEmpty()) {
                components.add(new AdminBomComponent(
                        null,
                        modelCode,
                        detail.path("product_name").textValue(),
                        componentType,
                        componentQuantity,
                        warrantyMonths,
                        displayCategory,
                        order,
                        true));
            } else {
                components.add(matched.getFirst());
            }
            displayOrder++;
        }
        return List.copyOf(components);
    }

    private int length(String value) {
        return value == null ? 0 : value.length();
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private RowMapper<AdminProductSummary> summaryMapper() {
        return (rs, row) -> new AdminProductSummary(
                rs.getString("productId"), rs.getString("modelCode"), rs.getString("productName"),
                rs.getString("productType"), rs.getString("categoryName"), rs.getString("brandName"),
                rs.getString("status"), rs.getBigDecimal("minimumPrice"),
                rs.getString("currency"), rs.getLong("availableQuantity"));
    }

    private RowMapper<AdminOffer> offerMapper() {
        return (rs, row) -> new AdminOffer(
                rs.getString("offerId"), rs.getString("condition"), rs.getBigDecimal("price"),
                rs.getBigDecimal("compareAtPrice"), rs.getString("currency"),
                rs.getLong("stockQuantity"), rs.getLong("reservedQuantity"),
                rs.getLong("stockQuantity") - rs.getLong("reservedQuantity"),
                rs.getLong("warrantyMonths"), rs.getString("status"),
                rs.getInt("minimumPurchaseQuantity"), rs.getInt("maximumPurchaseQuantity"),
                (Integer) rs.getObject("lowStockThreshold"));
    }

    private RowMapper<AdminImage> imageMapper() {
        return (rs, row) -> new AdminImage(
                rs.getString("imageId"), rs.getString("url"), rs.getString("altText"),
                rs.getString("caption"), rs.getString("mediaType"), rs.getString("mimeType"),
                rs.getString("fileName"), rs.getBoolean("primary"), rs.getInt("displayOrder"));
    }

    private RowMapper<AdminBomComponent> bomMapper() {
        return (rs, row) -> new AdminBomComponent(
                rs.getString("componentProductId"), rs.getString("modelCode"),
                rs.getString("productName"), rs.getString("productType"), rs.getInt("quantity"),
                (Integer) rs.getObject("warrantyMonths"), rs.getString("displayCategory"),
                rs.getInt("displayOrder"), rs.getBoolean("customerVisible"));
    }

    private RowMapper<ProductIdentity> identityMapper() {
        return (rs, row) -> new ProductIdentity(
                rs.getBigDecimal("id"), rs.getString("modelCode"), rs.getString("productName"),
                rs.getString("sku"), rs.getString("slug"), rs.getString("productType"),
                rs.getString("productTypeName"), rs.getString("categoryCode"),
                rs.getString("categoryName"), rs.getString("brandName"),
                rs.getString("shortDescription"), rs.getString("description"),
                rs.getString("seoTitle"), rs.getString("seoDescription"), rs.getString("tagsJson"),
                rs.getBoolean("featured"), rs.getInt("displayOrder"), rs.getString("status"),
                rs.getString("contentSectionsJson"), rs.getString("specificationsJson"));
    }

    private record ProductIdentity(
            BigDecimal id,
            String modelCode,
            String productName,
            String sku,
            String slug,
            String productType,
            String productTypeName,
            String categoryCode,
            String categoryName,
            String brandName,
            String shortDescription,
            String description,
            String seoTitle,
            String seoDescription,
            String tagsJson,
            boolean featured,
            int displayOrder,
            String status,
            String contentSectionsJson,
            String specificationsJson) {
    }
}
