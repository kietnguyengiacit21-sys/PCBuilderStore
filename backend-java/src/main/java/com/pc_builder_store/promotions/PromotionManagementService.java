package com.pc_builder_store.promotions;

import static com.pc_builder_store.promotions.PromotionDtos.*;

import com.pc_builder_store.auth.AuthUserPrincipal;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class PromotionManagementService {

    private static final Set<String> DISCOUNT_TYPES =
            Set.of("PERCENTAGE", "FIXED_AMOUNT", "FIXED_PRICE");
    private static final int MAX_GIFTS = 30;

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public PromotionManagementService(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<Campaign> listCampaigns(boolean includeArchived) {
        return jdbc.query("""
                SELECT "campaign_id"::text, "campaign_code", "campaign_name", "campaign_tag",
                       "starts_at"::text, "ends_at"::text, "priority", "is_exclusive",
                       "is_enabled", ("archived_at" IS NOT NULL) AS "archived"
                FROM "promotion_campaigns"
                WHERE (? = TRUE OR "archived_at" IS NULL)
                ORDER BY "priority", "campaign_id"
                """, (rs, row) -> new Campaign(
                rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4),
                rs.getString(5), rs.getString(6), rs.getInt(7), rs.getBoolean(8),
                rs.getBoolean(9), rs.getBoolean(10)), includeArchived);
    }

    @Transactional
    public Campaign saveCampaign(
            String campaignId, CampaignRequest request, AuthUserPrincipal actor) {
        validateCampaign(request);
        Timestamp starts = timestamp(request.startsAt());
        Timestamp ends = timestamp(request.endsAt());
        if (starts != null && ends != null && !starts.before(ends)) {
            throw badRequest("Thời gian bắt đầu phải trước thời gian kết thúc.");
        }
        BigDecimal actorId = actorId(actor);
        long id;
        if (campaignId == null) {
            Integer taken = jdbc.queryForObject("""
                    SELECT COUNT(*) FROM "promotion_campaigns"
                    WHERE UPPER("campaign_code") = UPPER(?)
                    """, Integer.class, request.campaignCode().trim());
            if (taken != null && taken > 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Mã chương trình \"" + request.campaignCode().trim().toUpperCase()
                                + "\" đã được dùng (kể cả chương trình đã lưu trữ). Hãy chọn mã khác.");
            }
            id = jdbc.queryForObject("""
                    INSERT INTO "promotion_campaigns" (
                        "campaign_code", "campaign_name", "campaign_tag", "starts_at", "ends_at",
                        "priority", "is_exclusive", "is_enabled", "created_by", "updated_by"
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    RETURNING "campaign_id"
                    """, Long.class, request.campaignCode().trim().toUpperCase(),
                    request.campaignName().trim(), blankToNull(request.campaignTag()),
                    starts, ends, request.priority(), request.exclusive(), request.enabled(),
                    actorId, actorId);
        } else {
            long existing = parseId(campaignId, "chương trình");
            int changed = jdbc.update("""
                    UPDATE "promotion_campaigns"
                    SET "campaign_name" = ?, "campaign_tag" = ?, "starts_at" = ?, "ends_at" = ?,
                        "priority" = ?, "is_exclusive" = ?, "is_enabled" = ?,
                        "updated_by" = ?, "updated_at" = CURRENT_TIMESTAMP
                    WHERE "campaign_id" = ? AND "archived_at" IS NULL
                    """, request.campaignName().trim(), blankToNull(request.campaignTag()),
                    starts, ends, request.priority(), request.exclusive(), request.enabled(),
                    actorId, existing);
            if (changed != 1) throw notFound("Không tìm thấy chương trình, hoặc chương trình đã được lưu trữ.");
            id = existing;
        }
        audit("PROMOTION_CAMPAIGN", id, campaignId == null ? "CREATED" : "UPDATED",
                Map.of("name", request.campaignName(), "enabled", request.enabled()), actorId);
        return findCampaign(id);
    }

    @Transactional
    public Campaign archiveCampaign(String campaignId, AuthUserPrincipal actor) {
        long id = parseId(campaignId, "chương trình");
        int changed = jdbc.update("""
                UPDATE "promotion_campaigns"
                SET "is_enabled" = FALSE, "archived_at" = CURRENT_TIMESTAMP,
                    "updated_by" = ?, "updated_at" = CURRENT_TIMESTAMP
                WHERE "campaign_id" = ? AND "archived_at" IS NULL
                """, actorId(actor), id);
        if (changed != 1) throw notFound("Không tìm thấy chương trình, hoặc chương trình đã được lưu trữ trước đó.");
        audit("PROMOTION_CAMPAIGN", id, "ARCHIVED", Map.of(), actorId(actor));
        return findCampaign(id);
    }

    @Transactional(readOnly = true)
    public List<Promotion> listPromotions(String campaignId) {
        if (!StringUtils.hasText(campaignId)) return List.of();
        long id = parseId(campaignId, "chương trình");
        return jdbc.query("""
                SELECT pp."promotion_id"::text, pc."campaign_id"::text, pc."campaign_name",
                       pp."product_id"::text, p."model_code", p."product_name",
                       pp."discount_type", pp."discount_value", pp."discount_currency_code",
                       pp."display_copy",
                       pp."sale_badge", pp."eligibility_json"::text, pp."starts_at"::text,
                       pp."ends_at"::text, pp."priority", pp."is_exclusive", pp."is_enabled"
                FROM "product_promotions" pp
                JOIN "promotion_campaigns" pc ON pc."campaign_id" = pp."campaign_id"
                JOIN "products" p ON p."product_id" = pp."product_id"
                WHERE pc."campaign_id" = ?
                ORDER BY pp."priority", pp."promotion_id"
                """, (rs, row) -> new Promotion(
                rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4),
                rs.getString(5), rs.getString(6), rs.getString(7), rs.getBigDecimal(8),
                rs.getString(9), rs.getString(10), rs.getString(11),
                readConditions(rs.getString(12)), rs.getString(13), rs.getString(14),
                rs.getInt(15), rs.getBoolean(16), rs.getBoolean(17), giftsFor(rs.getLong(1))), id);
    }

    @Transactional
    public Promotion savePromotion(
            String promotionId, PromotionRequest request, AuthUserPrincipal actor) {
        validatePromotion(request);
        long campaignId = parseId(request.campaignId(), "chương trình");
        BigDecimal productId = parseDecimalId(request.productId(), "sản phẩm");
        requireCampaign(campaignId);
        requireActiveProduct(productId);
        validateGifts(request.gifts());
        Timestamp starts = timestamp(request.startsAt());
        Timestamp ends = timestamp(request.endsAt());
        if (starts != null && ends != null && !starts.before(ends)) {
            throw badRequest("Thời gian bắt đầu phải trước thời gian kết thúc.");
        }
        String eligibility = serialize(Map.of("conditions", request.conditions() == null
                ? List.of() : request.conditions()));
        BigDecimal actorId = actorId(actor);
        long id;
        if (promotionId == null) {
            id = jdbc.queryForObject("""
                    INSERT INTO "product_promotions" (
                        "campaign_id", "product_id", "discount_type", "discount_value",
                        "discount_currency_code", "display_copy", "sale_badge",
                        "eligibility_json", "starts_at", "ends_at",
                        "priority", "is_exclusive", "is_enabled", "created_by", "updated_by"
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb), ?, ?, ?, ?, ?, ?, ?)
                    RETURNING "promotion_id"
                    """, Long.class, campaignId, productId, request.discountType(),
                    request.discountValue(), blankToNull(request.discountCurrencyCode()),
                    blankToNull(request.displayCopy()),
                    blankToNull(request.saleBadge()), eligibility, starts, ends,
                    request.priority(), request.exclusive(), request.enabled(), actorId, actorId);
        } else {
            id = parseId(promotionId, "ưu đãi");
            int changed = jdbc.update("""
                    UPDATE "product_promotions"
                    SET "campaign_id" = ?, "product_id" = ?, "discount_type" = ?,
                        "discount_value" = ?, "discount_currency_code" = ?,
                        "display_copy" = ?, "sale_badge" = ?,
                        "eligibility_json" = CAST(? AS jsonb), "starts_at" = ?, "ends_at" = ?,
                        "priority" = ?, "is_exclusive" = ?, "is_enabled" = ?,
                        "updated_by" = ?, "updated_at" = CURRENT_TIMESTAMP
                    WHERE "promotion_id" = ?
                    """, campaignId, productId, request.discountType(), request.discountValue(),
                    blankToNull(request.discountCurrencyCode()), blankToNull(request.displayCopy()),
                    blankToNull(request.saleBadge()), eligibility,
                    starts, ends, request.priority(), request.exclusive(), request.enabled(),
                    actorId, id);
            if (changed != 1) throw notFound("Không tìm thấy ưu đãi.");
            jdbc.update("DELETE FROM \"promotion_gifts\" WHERE \"promotion_id\" = ?", id);
        }
        saveGifts(id, request.gifts());
        audit("PRODUCT_PROMOTION", id, promotionId == null ? "CREATED" : "UPDATED",
                Map.of("campaignId", campaignId, "productId", productId.toPlainString(),
                        "discountType", request.discountType()), actorId);
        return findPromotion(id);
    }

    @Transactional
    public Promotion setPromotionEnabled(
            String promotionId, boolean enabled, AuthUserPrincipal actor) {
        long id = parseId(promotionId, "ưu đãi");
        int changed = jdbc.update("""
                UPDATE "product_promotions"
                SET "is_enabled" = ?, "updated_by" = ?, "updated_at" = CURRENT_TIMESTAMP
                WHERE "promotion_id" = ?
                """, enabled, actorId(actor), id);
        if (changed != 1) throw notFound("Không tìm thấy ưu đãi.");
        audit("PRODUCT_PROMOTION", id, enabled ? "ACTIVATED" : "DEACTIVATED",
                Map.of("enabled", enabled), actorId(actor));
        return findPromotion(id);
    }

    private Campaign findCampaign(long id) {
        return jdbc.queryForObject("""
                SELECT "campaign_id"::text, "campaign_code", "campaign_name", "campaign_tag",
                       "starts_at"::text, "ends_at"::text, "priority", "is_exclusive",
                       "is_enabled", ("archived_at" IS NOT NULL) AS "archived"
                FROM "promotion_campaigns" WHERE "campaign_id" = ?
                """, (rs, row) -> new Campaign(
                rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4),
                rs.getString(5), rs.getString(6), rs.getInt(7), rs.getBoolean(8),
                rs.getBoolean(9), rs.getBoolean(10)), id);
    }

    private Promotion findPromotion(long id) {
        return jdbc.queryForObject("""
                SELECT pp."promotion_id"::text, pc."campaign_id"::text, pc."campaign_name",
                       pp."product_id"::text, p."model_code", p."product_name",
                       pp."discount_type", pp."discount_value", pp."discount_currency_code",
                       pp."display_copy",
                       pp."sale_badge", pp."eligibility_json"::text, pp."starts_at"::text,
                       pp."ends_at"::text, pp."priority", pp."is_exclusive", pp."is_enabled"
                FROM "product_promotions" pp
                JOIN "promotion_campaigns" pc ON pc."campaign_id" = pp."campaign_id"
                JOIN "products" p ON p."product_id" = pp."product_id"
                WHERE pp."promotion_id" = ?
                """, (rs, row) -> new Promotion(
                rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4),
                rs.getString(5), rs.getString(6), rs.getString(7), rs.getBigDecimal(8),
                rs.getString(9), rs.getString(10), rs.getString(11),
                readConditions(rs.getString(12)), rs.getString(13), rs.getString(14),
                rs.getInt(15), rs.getBoolean(16), rs.getBoolean(17), giftsFor(rs.getLong(1))), id);
    }

    private List<Gift> giftsFor(long promotionId) {
        return jdbc.query("""
                SELECT pg."gift_offer_id"::text, p."product_name", p."model_code",
                       pg."quantity", pg."selection_required", pg."display_order"
                FROM "promotion_gifts" pg
                JOIN "product_offers" po ON po."offer_id" = pg."gift_offer_id"
                JOIN "products" p ON p."product_id" = po."product_id"
                WHERE pg."promotion_id" = ?
                ORDER BY pg."display_order", pg."gift_offer_id"
                """, (rs, row) -> new Gift(
                rs.getString(1), rs.getString(2), rs.getString(3), rs.getInt(4),
                rs.getBoolean(5), rs.getInt(6)), promotionId);
    }

    private void saveGifts(long promotionId, List<GiftRequest> gifts) {
        if (gifts == null) return;
        for (GiftRequest gift : gifts) {
            jdbc.update("""
                    INSERT INTO "promotion_gifts" (
                        "promotion_id", "gift_offer_id", "quantity",
                        "selection_required", "display_order"
                    ) VALUES (?, ?, ?, ?, ?)
                    """, promotionId, parseDecimalId(gift.giftOfferId(), "quà tặng"),
                    gift.quantity(), gift.selectionRequired(), gift.displayOrder());
        }
    }

    private void validateGifts(List<GiftRequest> gifts) {
        if (gifts == null) return;
        if (gifts.size() > MAX_GIFTS) throw badRequest("Mỗi ưu đãi chỉ kèm tối đa " + MAX_GIFTS + " quà tặng.");
        Set<String> ids = new java.util.HashSet<>();
        for (GiftRequest gift : gifts) {
            BigDecimal offerId = parseDecimalId(gift.giftOfferId(), "quà tặng");
            if (gift.quantity() < 1 || gift.quantity() > 100 || gift.displayOrder() < 0
                    || !ids.add(offerId.toPlainString())) {
                throw badRequest("Quà tặng không hợp lệ: số lượng từ 1 đến 100 và không chọn trùng một mặt hàng.");
            }
            Integer valid = jdbc.queryForObject("""
                    SELECT COUNT(*) FROM "product_offers" po
                    JOIN "products" p ON p."product_id" = po."product_id"
                    WHERE po."offer_id" = ? AND po."condition_code" = 'NEW'
                      AND po."offer_status" = 'ACTIVE' AND p."product_status" = 'ACTIVE'
                    """, Integer.class, offerId);
            if (valid == null || valid != 1) {
                throw badRequest("Quà tặng phải là hàng mới đang được bán.");
            }
        }
    }

    private List<String> readConditions(String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode conditions = root == null ? null : root.get("conditions");
            if (conditions == null || !conditions.isArray()) return List.of();
            List<String> result = new ArrayList<>();
            conditions.forEach(value -> {
                if (value.isTextual()) result.add(value.asText());
            });
            return List.copyOf(result);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Stored promotion eligibility is invalid.", exception);
        }
    }

    private void requireCampaign(long id) {
        Integer valid = jdbc.queryForObject("""
                SELECT COUNT(*) FROM "promotion_campaigns"
                WHERE "campaign_id" = ? AND "archived_at" IS NULL
                """, Integer.class, id);
        if (valid == null || valid != 1) throw notFound("Không tìm thấy chương trình, hoặc chương trình đã được lưu trữ.");
    }

    private void requireActiveProduct(BigDecimal id) {
        Integer valid = jdbc.queryForObject("""
                SELECT COUNT(*) FROM "products" WHERE "product_id" = ? AND "product_status" = 'ACTIVE'
                """, Integer.class, id);
        if (valid == null || valid != 1) throw badRequest("Sản phẩm được chọn hiện không còn bán, không thể tạo ưu đãi.");
    }

    private void validateCampaign(CampaignRequest request) {
        if (request == null) throw badRequest("Thiếu thông tin chương trình.");
        if (request.campaignCode() == null
                || !request.campaignCode().trim().matches("[A-Za-z0-9][A-Za-z0-9_-]{0,99}")) {
            throw badRequest("Mã chương trình chỉ gồm chữ không dấu, số, dấu gạch ngang hoặc gạch dưới"
                    + " (ví dụ: BLACK-FRIDAY-2026).");
        }
        if (request.campaignName() == null || request.campaignName().isBlank()) {
            throw badRequest("Hãy nhập tên chương trình.");
        }
        if (request.campaignName().length() > 180) throw badRequest("Tên chương trình tối đa 180 ký tự.");
        if (request.priority() < 0) throw badRequest("Độ ưu tiên phải từ 0 trở lên.");
        if (request.campaignTag() != null && request.campaignTag().length() > 80) {
            throw badRequest("Nhãn chương trình tối đa 80 ký tự.");
        }
    }

    private void validatePromotion(PromotionRequest request) {
        if (request == null) throw badRequest("Thiếu thông tin ưu đãi.");
        if (!DISCOUNT_TYPES.contains(request.discountType())) throw badRequest("Loại ưu đãi không hợp lệ.");
        boolean percentage = "PERCENTAGE".equals(request.discountType());
        if (request.discountValue() == null || request.discountValue().signum() < 0) {
            throw badRequest("Giá trị ưu đãi không được âm.");
        }
        if (percentage && request.discountValue().compareTo(new BigDecimal("100")) > 0) {
            throw badRequest("Mức giảm theo phần trăm phải từ 0 đến 100.");
        }
        if (percentage && request.discountCurrencyCode() != null) {
            throw badRequest("Ưu đãi theo phần trăm không dùng đơn vị tiền tệ.");
        }
        if (!percentage && (request.discountCurrencyCode() == null
                || !request.discountCurrencyCode().matches("[A-Z]{3}"))) {
            throw badRequest("Hãy chọn đơn vị tiền tệ cho ưu đãi giảm tiền hoặc giá chiến dịch.");
        }
        if (request.priority() < 0) throw badRequest("Độ ưu tiên phải từ 0 trở lên.");
        if (request.displayCopy() != null && request.displayCopy().length() > 300) {
            throw badRequest("Nội dung hiển thị tối đa 300 ký tự.");
        }
        if (request.saleBadge() != null && request.saleBadge().length() > 80) {
            throw badRequest("Nhãn ưu đãi tối đa 80 ký tự.");
        }
        // An empty list would make the promotion match no offer at all.
        if (request.conditions() == null || request.conditions().isEmpty()) {
            throw badRequest("Chọn ít nhất một tình trạng hàng được áp dụng (mới, như mới, đã qua sử dụng).");
        }
        if (request.conditions().stream()
                .anyMatch(value -> !Set.of("NEW", "LIKE_NEW", "USED").contains(value))) {
            throw badRequest("Tình trạng hàng áp dụng không hợp lệ.");
        }
    }

    private void audit(String entity, long id, String action, Map<String, ?> changes, BigDecimal actor) {
        try {
            jdbc.update("""
                    INSERT INTO "admin_product_change_history"
                        ("entity_type", "entity_id", "action_code", "changes_json", "actor_user_id")
                    VALUES (?, ?, ?, CAST(? AS jsonb), ?)
                    """, entity, BigDecimal.valueOf(id), action,
                    objectMapper.writeValueAsString(changes), actor);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Could not serialize promotion audit data.", exception);
        }
    }

    private String serialize(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Could not serialize promotion data.", exception);
        }
    }

    private static Timestamp timestamp(String value) {
        if (!StringUtils.hasText(value)) return null;
        try {
            // Accept both the form value (2026-11-22T08:00) and the stored text (2026-11-22 08:00:00).
            return Timestamp.valueOf(LocalDateTime.parse(value.trim().replace(' ', 'T')));
        } catch (DateTimeParseException exception) {
            throw badRequest("Ngày giờ bắt đầu/kết thúc không hợp lệ.");
        }
    }

    private static BigDecimal actorId(AuthUserPrincipal actor) {
        if (actor == null || !"ADMIN".equals(actor.roleCode())
                || actor.userId() == null || !actor.userId().matches("[0-9]{1,20}")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ quản trị viên được thay đổi khuyến mãi.");
        }
        return new BigDecimal(actor.userId());
    }

    private static BigDecimal parseDecimalId(String value, String label) {
        return BigDecimal.valueOf(parseId(value, label));
    }

    private static long parseId(String value, String label) {
        if (value == null || !value.matches("[0-9]{1,18}")) {
            throw badRequest("Chưa chọn " + label + ", hoặc " + label + " không hợp lệ.");
        }
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException exception) {
            throw badRequest("Chưa chọn " + label + ", hoặc " + label + " không hợp lệ.");
        }
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }
}
