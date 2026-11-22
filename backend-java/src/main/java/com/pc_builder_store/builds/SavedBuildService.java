package com.pc_builder_store.builds;

import com.pc_builder_store.auth.AuthUserPrincipal;
import com.pc_builder_store.promotions.PromotionPricingService;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Saved PC builds opened by share code: link sharing, printable quotation, reload into the builder. */
@Service
public class SavedBuildService {

    public record BuildItemRequest(String slot, String modelCode, Integer quantity) {}

    public record SaveRequest(String name, String resolution, List<BuildItemRequest> items) {}

    public record BuildItem(
            String slot, String modelCode, String productName, String productType, String imageUrl,
            int quantity, BigDecimal savedUnitPrice, BigDecimal currentUnitPrice, String currencyCode,
            String offerId, boolean available) {}

    public record SavedBuild(
            String shareCode, String name, String resolution, String createdAt, boolean mine,
            BigDecimal savedTotal, BigDecimal currentTotal, String currencyCode, List<BuildItem> items) {}

    public record BuildSummary(String shareCode, String name, String createdAt, int itemCount, BigDecimal savedTotal) {}

    private static final Set<String> SLOTS = Set.of("CPU", "MOTHERBOARD", "RAM", "GPU", "STORAGE", "PSU", "CASE", "COOLER");
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String OFFER = """
            SELECT p."product_id", p."model_code", o."offer_id", o."condition_code", o."price", o."currency_code",
                   GREATEST(o."stock_quantity" - o."reserved_quantity", 0) AS "available"
            FROM "products" p
            JOIN "product_offers" o ON o."product_id" = p."product_id" AND o."offer_status" = 'ACTIVE'
            WHERE p."model_code" = ? AND p."product_status" = 'ACTIVE'
            ORDER BY (o."stock_quantity" - o."reserved_quantity" > 0) DESC, (o."condition_code" = 'NEW') DESC, o."price"
            LIMIT 1
            """;

    private final JdbcTemplate jdbc;
    private final PromotionPricingService pricing;

    public SavedBuildService(JdbcTemplate jdbc, PromotionPricingService pricing) {
        this.jdbc = jdbc;
        this.pricing = pricing;
    }

    @Transactional
    public SavedBuild save(SaveRequest request, AuthUserPrincipal user) {
        if (request == null || request.items() == null || request.items().isEmpty()) {
            throw badRequest("Cấu hình chưa có linh kiện nào.");
        }
        if (request.items().size() > SLOTS.size()) throw badRequest("Cấu hình có quá nhiều linh kiện.");
        String name = request.name() == null || request.name().isBlank() ? "Cấu hình PC" : request.name().trim();
        if (name.length() > 120) throw badRequest("Tên cấu hình tối đa 120 ký tự.");
        String resolution = request.resolution() == null || request.resolution().isBlank() ? null : request.resolution().trim();
        if (resolution != null && !resolution.matches("1080p|1440p|2160p")) throw badRequest("Độ phân giải không hợp lệ.");

        Set<String> seen = new HashSet<>();
        List<Object[]> rows = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        String currency = null;
        for (BuildItemRequest item : request.items()) {
            if (item == null || item.slot() == null || !SLOTS.contains(item.slot())) throw badRequest("Nhóm linh kiện không hợp lệ.");
            if (!seen.add(item.slot())) throw badRequest("Mỗi nhóm linh kiện chỉ chọn một sản phẩm.");
            int quantity = item.quantity() == null ? 1 : item.quantity();
            if (quantity < 1 || quantity > 8) throw badRequest("Số lượng không hợp lệ.");
            List<Map<String, Object>> offers = jdbc.queryForList(OFFER, item.modelCode());
            if (offers.isEmpty()) throw badRequest("Sản phẩm " + item.modelCode() + " không còn được bán.");
            Map<String, Object> offer = offers.getFirst();
            BigDecimal price = payable(offer);
            String offerCurrency = String.valueOf(offer.get("currency_code")).trim();
            if (currency != null && !currency.equals(offerCurrency)) throw badRequest("Cấu hình có nhiều loại tiền tệ.");
            currency = offerCurrency;
            total = total.add(price.multiply(BigDecimal.valueOf(quantity)));
            rows.add(new Object[] {item.slot(), offer.get("offer_id"), quantity, price});
        }

        String code = newCode();
        BigDecimal userId = user == null ? null : new BigDecimal(user.userId());
        BigDecimal buildId = jdbc.queryForObject("""
                INSERT INTO "pc_builds" ("user_id", "build_name", "target_resolution", "build_status", "is_public", "share_code")
                VALUES (?, ?, ?, 'SAVED', TRUE, ?) RETURNING "build_id"
                """, BigDecimal.class, userId, name, resolution, code);
        BigDecimal revisionId = jdbc.queryForObject("""
                INSERT INTO "pc_build_revisions" ("build_id", "revision_number", "revision_name", "estimated_total", "created_by")
                VALUES (?, 1, ?, ?, ?) RETURNING "build_revision_id"
                """, BigDecimal.class, buildId, name, total, userId);
        for (Object[] row : rows) {
            jdbc.update("""
                    INSERT INTO "pc_build_items" ("build_revision_id", "component_slot_code", "offer_id", "quantity", "unit_price_snapshot")
                    VALUES (?, ?, ?, ?, ?)
                    """, revisionId, row[0], row[1], row[2], row[3]);
        }
        return find(code, user);
    }

    @Transactional(readOnly = true)
    public SavedBuild find(String code, AuthUserPrincipal viewer) {
        if (code == null || !code.matches("[A-Za-z0-9]{6,16}")) throw notFound();
        List<Map<String, Object>> builds = jdbc.queryForList("""
                SELECT b."build_id", b."user_id"::text AS "user_id", b."build_name", b."target_resolution",
                       b."created_at"::text AS "created", r."build_revision_id", r."estimated_total"
                FROM "pc_builds" b
                JOIN "pc_build_revisions" r ON r."build_id" = b."build_id"
                WHERE b."share_code" = ?
                ORDER BY r."revision_number" DESC LIMIT 1
                """, code);
        if (builds.isEmpty()) throw notFound();
        Map<String, Object> build = builds.getFirst();
        List<BuildItem> items = new ArrayList<>();
        BigDecimal current = BigDecimal.ZERO;
        String currency = null;
        for (Map<String, Object> row : jdbc.queryForList("""
                SELECT i."component_slot_code", i."quantity", i."unit_price_snapshot", o."offer_id"::text AS "offer_id",
                       o."condition_code", o."price", o."currency_code", o."offer_status",
                       GREATEST(o."stock_quantity" - o."reserved_quantity", 0) AS "available",
                       p."product_id", p."model_code", p."product_name", p."product_status", pt."type_code",
                       (SELECT im."image_url" FROM "product_images" im WHERE im."product_id" = p."product_id"
                        ORDER BY im."is_primary" DESC, im."sort_order", im."image_id" LIMIT 1) AS "image_url"
                FROM "pc_build_items" i
                JOIN "product_offers" o ON o."offer_id" = i."offer_id"
                JOIN "products" p ON p."product_id" = o."product_id"
                JOIN "product_types" pt ON pt."product_type_id" = p."product_type_id"
                WHERE i."build_revision_id" = ?
                ORDER BY ARRAY_POSITION(ARRAY['CPU','MOTHERBOARD','RAM','GPU','STORAGE','PSU','CASE','COOLER'], i."component_slot_code"::text)
                """, build.get("build_revision_id"))) {
            boolean sellable = "ACTIVE".equals(row.get("offer_status")) && "ACTIVE".equals(row.get("product_status"));
            BigDecimal price = sellable ? payable(row) : null;
            int quantity = ((Number) row.get("quantity")).intValue();
            if (price != null) current = current.add(price.multiply(BigDecimal.valueOf(quantity)));
            currency = String.valueOf(row.get("currency_code")).trim();
            items.add(new BuildItem(
                    String.valueOf(row.get("component_slot_code")), String.valueOf(row.get("model_code")),
                    String.valueOf(row.get("product_name")), String.valueOf(row.get("type_code")),
                    (String) row.get("image_url"), quantity, (BigDecimal) row.get("unit_price_snapshot"), price, currency,
                    String.valueOf(row.get("offer_id")), sellable && ((Number) row.get("available")).longValue() >= quantity));
        }
        String owner = (String) build.get("user_id");
        boolean mine = viewer != null && owner != null && owner.equals(viewer.userId());
        return new SavedBuild(code, String.valueOf(build.get("build_name")), (String) build.get("target_resolution"),
                String.valueOf(build.get("created")), mine, (BigDecimal) build.get("estimated_total"), current, currency, items);
    }

    @Transactional(readOnly = true)
    public List<BuildSummary> mine(AuthUserPrincipal user) {
        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập.");
        return jdbc.query("""
                SELECT b."share_code", b."build_name", b."created_at"::text AS "created", r."estimated_total",
                       (SELECT COUNT(*) FROM "pc_build_items" i WHERE i."build_revision_id" = r."build_revision_id") AS "items"
                FROM "pc_builds" b
                JOIN "pc_build_revisions" r ON r."build_id" = b."build_id" AND r."revision_number" = 1
                WHERE b."user_id" = ? AND b."share_code" IS NOT NULL
                ORDER BY b."created_at" DESC LIMIT 50
                """, (row, index) -> new BuildSummary(row.getString("share_code"), row.getString("build_name"),
                row.getString("created"), row.getInt("items"), row.getBigDecimal("estimated_total")),
                new BigDecimal(user.userId()));
    }

    @Transactional
    public void delete(String code, AuthUserPrincipal user) {
        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập.");
        int deleted = jdbc.update("DELETE FROM \"pc_builds\" WHERE \"share_code\" = ? AND \"user_id\" = ?",
                code, new BigDecimal(user.userId()));
        if (deleted == 0) throw notFound();
    }

    private BigDecimal payable(Map<String, Object> offer) {
        return pricing.price(
                (BigDecimal) offer.get("product_id"),
                String.valueOf(offer.get("condition_code")),
                (BigDecimal) offer.get("price"),
                String.valueOf(offer.get("currency_code")).trim()).payablePrice();
    }

    private String newCode() {
        for (int attempt = 0; attempt < 5; attempt++) {
            StringBuilder code = new StringBuilder();
            for (int index = 0; index < 10; index++) code.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
            Long clash = jdbc.queryForObject("SELECT COUNT(*) FROM \"pc_builds\" WHERE \"share_code\" = ?", Long.class, code.toString());
            if (clash == null || clash == 0) return code.toString();
        }
        throw new IllegalStateException("Could not allocate a unique build share code.");
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy cấu hình đã lưu.");
    }
}
