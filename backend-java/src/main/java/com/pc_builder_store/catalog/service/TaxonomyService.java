package com.pc_builder_store.catalog.service;

import com.pc_builder_store.catalog.dto.TaxonomyDtos.Brand;
import com.pc_builder_store.catalog.dto.TaxonomyDtos.BrandRequest;
import com.pc_builder_store.catalog.dto.TaxonomyDtos.Category;
import com.pc_builder_store.catalog.dto.TaxonomyDtos.CategoryRequest;
import java.math.BigDecimal;
import java.net.URI;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Admin management of product categories and brands. */
@Service
public class TaxonomyService {

    private static final String CATEGORY_SELECT = """
            SELECT c."category_id"::text AS "categoryId", c."category_code" AS "categoryCode",
                   c."category_name" AS "categoryName", c."description" AS "description",
                   parent."category_code" AS "parentCategoryCode", c."is_active" AS "active",
                   (SELECT COUNT(*) FROM "products" p WHERE p."category_id" = c."category_id") AS "productCount",
                   (SELECT COUNT(*) FROM "products" p WHERE p."category_id" = c."category_id"
                      AND p."product_status" = 'ACTIVE') AS "activeProductCount"
            FROM "categories" c
            LEFT JOIN "categories" parent ON parent."category_id" = c."parent_category_id"
            """;
    private static final String BRAND_SELECT = """
            SELECT b."brand_id"::text AS "brandId", b."brand_name" AS "brandName",
                   b."website_url" AS "websiteUrl", b."description" AS "description", b."is_active" AS "active",
                   (SELECT COUNT(*) FROM "products" p WHERE p."brand_id" = b."brand_id") AS "productCount",
                   (SELECT COUNT(*) FROM "products" p WHERE p."brand_id" = b."brand_id"
                      AND p."product_status" = 'ACTIVE') AS "activeProductCount"
            FROM "brands" b
            """;

    private final JdbcTemplate jdbc;

    public TaxonomyService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // --- Categories -----------------------------------------------------------

    public List<Category> categories() {
        return jdbc.query(CATEGORY_SELECT + " ORDER BY c.\"category_name\"", this::mapCategory);
    }

    @Transactional
    public Category createCategory(CategoryRequest request) {
        if (request == null) throw badRequest("Thiếu thông tin danh mục.");
        String code = categoryCode(request.categoryCode());
        if (categoryId(code) != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Mã danh mục " + code + " đã tồn tại.");
        }
        BigDecimal parent = parentId(request.parentCategoryCode(), null);
        jdbc.update("""
                INSERT INTO "categories" ("category_code", "category_name", "description", "parent_category_id", "is_active")
                VALUES (?, ?, ?, ?, ?)
                """, code, name(request.categoryName(), 160, "Tên danh mục"), text(request.description()),
                parent, request.active() == null || request.active());
        return category(code);
    }

    @Transactional
    public Category updateCategory(String code, CategoryRequest request) {
        if (request == null) throw badRequest("Thiếu thông tin danh mục.");
        BigDecimal id = requireCategory(code);
        BigDecimal parent = parentId(request.parentCategoryCode(), id);
        jdbc.update("""
                UPDATE "categories"
                SET "category_name" = ?, "description" = ?, "parent_category_id" = ?, "is_active" = ?
                WHERE "category_id" = ?
                """, name(request.categoryName(), 160, "Tên danh mục"), text(request.description()),
                parent, request.active() == null || request.active(), id);
        return category(code);
    }

    @Transactional
    public void deleteCategory(String code) {
        BigDecimal id = requireCategory(code);
        Long products = jdbc.queryForObject(
                "SELECT COUNT(*) FROM \"products\" WHERE \"category_id\" = ?", Long.class, id);
        if (products != null && products > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Danh mục đang có " + products + " sản phẩm. Hãy chuyển sản phẩm sang danh mục khác hoặc ẩn danh mục thay vì xóa.");
        }
        Long children = jdbc.queryForObject(
                "SELECT COUNT(*) FROM \"categories\" WHERE \"parent_category_id\" = ?", Long.class, id);
        if (children != null && children > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Danh mục đang có " + children + " danh mục con. Hãy đổi danh mục cha của chúng trước.");
        }
        jdbc.update("DELETE FROM \"categories\" WHERE \"category_id\" = ?", id);
    }

    private Category category(String code) {
        return jdbc.query(CATEGORY_SELECT + " WHERE c.\"category_code\" = ?", this::mapCategory, code).getFirst();
    }

    private BigDecimal categoryId(String code) {
        List<BigDecimal> ids = jdbc.queryForList(
                "SELECT \"category_id\" FROM \"categories\" WHERE \"category_code\" = ?", BigDecimal.class, code);
        return ids.isEmpty() ? null : ids.getFirst();
    }

    private BigDecimal requireCategory(String code) {
        BigDecimal id = code == null ? null : categoryId(code);
        if (id == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy danh mục.");
        return id;
    }

    /** Resolves the parent and refuses a parent that is the category itself or one of its descendants. */
    private BigDecimal parentId(String parentCode, BigDecimal self) {
        if (parentCode == null || parentCode.isBlank()) return null;
        BigDecimal parent = categoryId(parentCode.trim());
        if (parent == null) throw badRequest("Danh mục cha không tồn tại.");
        if (self == null) return parent;
        Long cycle = jdbc.queryForObject("""
                WITH RECURSIVE chain("id") AS (
                    SELECT ?::numeric
                    UNION
                    SELECT c."parent_category_id" FROM "categories" c JOIN chain ON c."category_id" = chain."id"
                    WHERE c."parent_category_id" IS NOT NULL
                )
                SELECT COUNT(*) FROM chain WHERE "id" = ?
                """, Long.class, parent, self);
        if (cycle != null && cycle > 0) throw badRequest("Không thể chọn chính danh mục này hoặc danh mục con của nó làm danh mục cha.");
        return parent;
    }

    private Category mapCategory(ResultSet row, int index) throws SQLException {
        return new Category(
                row.getString("categoryId"), row.getString("categoryCode"), row.getString("categoryName"),
                row.getString("description"), row.getString("parentCategoryCode"), row.getBoolean("active"),
                row.getLong("productCount"), row.getLong("activeProductCount"));
    }

    // --- Brands ---------------------------------------------------------------

    public List<Brand> brands() {
        return jdbc.query(BRAND_SELECT + " ORDER BY LOWER(b.\"brand_name\")", this::mapBrand);
    }

    @Transactional
    public Brand createBrand(BrandRequest request) {
        if (request == null) throw badRequest("Thiếu thông tin thương hiệu.");
        String name = name(request.brandName(), 120, "Tên thương hiệu");
        requireUniqueBrandName(name, null);
        jdbc.update("""
                INSERT INTO "brands" ("brand_name", "website_url", "description", "is_active") VALUES (?, ?, ?, ?)
                """, name, website(request.websiteUrl()), text(request.description()),
                request.active() == null || request.active());
        return jdbc.query(BRAND_SELECT + " WHERE b.\"brand_name\" = ?", this::mapBrand, name).getFirst();
    }

    @Transactional
    public Brand updateBrand(String brandId, BrandRequest request) {
        if (request == null) throw badRequest("Thiếu thông tin thương hiệu.");
        BigDecimal id = requireBrand(brandId);
        String name = name(request.brandName(), 120, "Tên thương hiệu");
        requireUniqueBrandName(name, id);
        jdbc.update("""
                UPDATE "brands" SET "brand_name" = ?, "website_url" = ?, "description" = ?, "is_active" = ?
                WHERE "brand_id" = ?
                """, name, website(request.websiteUrl()), text(request.description()),
                request.active() == null || request.active(), id);
        return jdbc.query(BRAND_SELECT + " WHERE b.\"brand_id\" = ?", this::mapBrand, id).getFirst();
    }

    @Transactional
    public void deleteBrand(String brandId) {
        BigDecimal id = requireBrand(brandId);
        Long products = jdbc.queryForObject(
                "SELECT COUNT(*) FROM \"products\" WHERE \"brand_id\" = ?", Long.class, id);
        if (products != null && products > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Thương hiệu đang có " + products + " sản phẩm. Hãy ẩn thương hiệu thay vì xóa.");
        }
        jdbc.update("DELETE FROM \"brands\" WHERE \"brand_id\" = ?", id);
    }

    private BigDecimal requireBrand(String brandId) {
        if (brandId == null || !brandId.matches("[0-9]{1,20}")) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thương hiệu.");
        }
        BigDecimal id = new BigDecimal(brandId);
        Long found = jdbc.queryForObject("SELECT COUNT(*) FROM \"brands\" WHERE \"brand_id\" = ?", Long.class, id);
        if (found == null || found == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thương hiệu.");
        return id;
    }

    /** Product editing matches brands case-insensitively, so names must be unique that way too. */
    private void requireUniqueBrandName(String name, BigDecimal self) {
        Long clash = jdbc.queryForObject("""
                SELECT COUNT(*) FROM "brands" WHERE LOWER("brand_name") = LOWER(?) AND (?::numeric IS NULL OR "brand_id" <> ?)
                """, Long.class, name, self, self);
        if (clash != null && clash > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Thương hiệu \"" + name + "\" đã tồn tại.");
        }
    }

    private Brand mapBrand(ResultSet row, int index) throws SQLException {
        return new Brand(
                row.getString("brandId"), row.getString("brandName"), row.getString("websiteUrl"),
                row.getString("description"), row.getBoolean("active"),
                row.getLong("productCount"), row.getLong("activeProductCount"));
    }

    // --- Validation -------------------------------------------------------------

    static String categoryCode(String value) {
        String code = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (!code.matches("[A-Z0-9_]{2,60}")) {
            throw badRequest("Mã danh mục gồm 2–60 ký tự: chữ in hoa không dấu, số hoặc dấu gạch dưới.");
        }
        return code;
    }

    static String name(String value, int max, String label) {
        String name = value == null ? "" : value.trim().replaceAll("\\s+", " ");
        if (name.isEmpty() || name.length() > max) throw badRequest(label + " cần từ 1 đến " + max + " ký tự.");
        return name;
    }

    static String text(String value) {
        if (value == null || value.isBlank()) return null;
        String text = value.trim();
        if (text.length() > 4000) throw badRequest("Mô tả tối đa 4000 ký tự.");
        return text;
    }

    static String website(String value) {
        if (value == null || value.isBlank()) return null;
        String url = value.trim();
        try {
            URI uri = URI.create(url);
            if (url.length() <= 500 && ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) && uri.getHost() != null) {
                return url;
            }
        } catch (IllegalArgumentException ignored) {
            // falls through to the error below
        }
        throw badRequest("Website phải là đường dẫn http(s) hợp lệ, tối đa 500 ký tự.");
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
