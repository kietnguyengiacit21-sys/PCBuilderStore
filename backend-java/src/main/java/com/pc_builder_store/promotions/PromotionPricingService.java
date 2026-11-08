package com.pc_builder_store.promotions;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class PromotionPricingService {

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public PromotionPricingService(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    public Pricing price(
            BigDecimal productId,
            String condition,
            BigDecimal basePrice,
            String currency) {
        if (basePrice == null || basePrice.signum() < 0
                || currency == null || !currency.matches("[A-Z]{3}")) {
            throw new IllegalArgumentException("The stored base price or currency is invalid.");
        }
        List<Promotion> eligible = jdbc.queryForList("""
                SELECT pp."promotion_id", pp."discount_type", pp."discount_value",
                       pp."discount_currency_code", pp."display_copy", pp."sale_badge",
                       pp."eligibility_json"::text,
                       pp."priority", pp."is_exclusive", pc."campaign_name",
                       pc."priority" AS "campaign_priority", pc."is_exclusive" AS "campaign_exclusive"
                FROM "product_promotions" pp
                JOIN "promotion_campaigns" pc ON pc."campaign_id" = pp."campaign_id"
                WHERE pp."product_id" = ?
                  AND pp."is_enabled" = TRUE
                  AND pc."is_enabled" = TRUE
                  AND pc."archived_at" IS NULL
                  AND (pp."starts_at" IS NULL OR pp."starts_at" <= CURRENT_TIMESTAMP)
                  AND (pp."ends_at" IS NULL OR pp."ends_at" > CURRENT_TIMESTAMP)
                  AND (pc."starts_at" IS NULL OR pc."starts_at" <= CURRENT_TIMESTAMP)
                  AND (pc."ends_at" IS NULL OR pc."ends_at" > CURRENT_TIMESTAMP)
                  AND (pp."discount_type" = 'PERCENTAGE' OR pp."discount_currency_code" = ?)
                """, productId, currency).stream()
                .map(row -> new Promotion(
                        numberLong(row.get("promotion_id")),
                        String.valueOf(row.get("discount_type")),
                        (BigDecimal) row.get("discount_value"),
                        (String) row.get("discount_currency_code"),
                        (String) row.get("display_copy"),
                        (String) row.get("sale_badge"),
                        String.valueOf(row.get("eligibility_json")),
                        number(row.get("priority")),
                        Boolean.TRUE.equals(row.get("is_exclusive"))
                                || Boolean.TRUE.equals(row.get("campaign_exclusive")),
                        number(row.get("campaign_priority")),
                        (String) row.get("campaign_name")))
                .toList();

        eligible = eligible.stream()
                .filter(promotion -> conditionEligible(promotion.eligibilityJson(), condition))
                .sorted(Comparator.comparingInt(Promotion::priority)
                        .thenComparingInt(Promotion::campaignPriority)
                        .thenComparingLong(Promotion::id))
                .toList();
        if (eligible.isEmpty()) return Pricing.fullPrice(basePrice, currency);
        List<Promotion> selected;
        Promotion exclusive = eligible.stream().filter(Promotion::exclusive).findFirst().orElse(null);
        if (exclusive != null) {
            selected = List.of(exclusive);
        } else {
            selected = eligible;
        }

        BigDecimal current = basePrice.setScale(2, RoundingMode.HALF_UP);
        List<AppliedPromotion> applied = new ArrayList<>();
        for (Promotion promotion : selected) {
            BigDecimal discount = discount(promotion, current);
            BigDecimal next = current.subtract(discount).max(BigDecimal.ZERO)
                    .min(current).setScale(2, RoundingMode.HALF_UP);
            applied.add(new AppliedPromotion(
                    promotion.id(),
                    promotion.campaignName(),
                    promotion.discountType(),
                    promotion.discountValue(),
                    promotion.discountCurrencyCode(),
                    discount,
                    promotion.displayCopy(),
                    promotion.saleBadge()));
            current = next;
        }
        List<GiftOffer> gifts = selected.stream()
                .flatMap(promotion -> giftsFor(promotion.id()).stream())
                .toList();
        return new Pricing(
                basePrice.setScale(2, RoundingMode.HALF_UP),
                current,
                basePrice.setScale(2, RoundingMode.HALF_UP).subtract(current),
                currency,
                List.copyOf(applied),
                gifts);
    }

    private boolean conditionEligible(String json, String condition) {
        try {
            JsonNode eligibility = objectMapper.readTree(json);
            if (eligibility == null || !eligibility.isObject()) {
                throw new IllegalStateException("Promotion eligibility must be a JSON object.");
            }
            JsonNode conditions = eligibility.get("conditions");
            if (conditions == null || conditions.isNull()) return true;
            if (!conditions.isArray()) {
                throw new IllegalStateException("Promotion conditions must be a JSON array.");
            }
            for (JsonNode candidate : conditions) {
                if (candidate.isTextual() && candidate.asText().equals(condition)) return true;
            }
            return false;
        } catch (JacksonException exception) {
            throw new IllegalStateException("Stored promotion eligibility is invalid.", exception);
        }
    }

    private BigDecimal discount(Promotion promotion, BigDecimal current) {
        BigDecimal value = promotion.discountValue();
        BigDecimal discount = switch (promotion.discountType()) {
            case "PERCENTAGE" -> current.multiply(value)
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            case "FIXED_AMOUNT" -> value.min(current);
            case "FIXED_PRICE" -> current.subtract(value).max(BigDecimal.ZERO);
            default -> throw new IllegalStateException("Unsupported stored promotion type.");
        };
        return discount.max(BigDecimal.ZERO).min(current).setScale(2, RoundingMode.HALF_UP);
    }

    private static int number(Object value) {
        return ((Number) value).intValue();
    }

    private static long numberLong(Object value) {
        return ((Number) value).longValue();
    }

    private List<GiftOffer> giftsFor(long promotionId) {
        return jdbc.query("""
                SELECT pg."promotion_id", pg."gift_offer_id"::text, p."product_name",
                       p."model_code", pg."quantity", pg."selection_required",
                       GREATEST(po."stock_quantity" - po."reserved_quantity", 0) AS "available",
                       po."offer_status" = 'ACTIVE' AND p."product_status" = 'ACTIVE'
                           AND po."condition_code" = 'NEW' AS "active"
                FROM "promotion_gifts" pg
                JOIN "product_offers" po ON po."offer_id" = pg."gift_offer_id"
                JOIN "products" p ON p."product_id" = po."product_id"
                WHERE pg."promotion_id" = ?
                ORDER BY pg."display_order", pg."gift_offer_id"
                """, (rs, row) -> new GiftOffer(
                rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4),
                rs.getInt(5), rs.getBoolean(6), rs.getInt(7), rs.getBoolean(8)), promotionId);
    }

    public String snapshot(Pricing pricing) {
        if (pricing.appliedPromotions().isEmpty()) return null;
        return snapshot(pricing.appliedPromotions());
    }

    public String snapshot(List<AppliedPromotion> promotions) {
        if (promotions == null || promotions.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(promotions);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Could not save applied promotion snapshots.", exception);
        }
    }

    public String giftSnapshot(
            GiftOffer gift, AppliedPromotion promotion, int quantity) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("promotionId", gift.promotionId());
        snapshot.put("campaignName", promotion.campaignName());
        snapshot.put("giftOfferId", gift.offerId());
        snapshot.put("productName", gift.productName());
        snapshot.put("modelCode", gift.modelCode());
        snapshot.put("unitQuantity", gift.quantity());
        snapshot.put("orderQuantity", quantity);
        snapshot.put("selectionRequired", gift.selectionRequired());
        try {
            return objectMapper.writeValueAsString(snapshot);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Could not save gift snapshots.", exception);
        }
    }

    private record Promotion(
            long id,
            String discountType,
            BigDecimal discountValue,
            String discountCurrencyCode,
            String displayCopy,
            String saleBadge,
            String eligibilityJson,
            int priority,
            boolean exclusive,
            int campaignPriority,
            String campaignName) {
    }

    public record AppliedPromotion(
            long promotionId,
            String campaignName,
            String discountType,
            BigDecimal discountValue,
            String discountCurrencyCode,
            BigDecimal discountAmount,
            String displayCopy,
            String saleBadge) {
    }

    public record Pricing(
            BigDecimal basePrice,
            BigDecimal payablePrice,
            BigDecimal discountAmount,
            String currency,
            List<AppliedPromotion> appliedPromotions,
            List<GiftOffer> availableGifts) {
        public static Pricing fullPrice(BigDecimal price, String currency) {
            BigDecimal amount = price.setScale(2, RoundingMode.HALF_UP);
            return new Pricing(
                    amount, amount, BigDecimal.ZERO.setScale(2), currency, List.of(), List.of());
        }

        public long primaryPromotionId() {
            return appliedPromotions.isEmpty() ? 0 : appliedPromotions.getFirst().promotionId();
        }

        public String campaignNames() {
            return appliedPromotions.stream()
                    .map(AppliedPromotion::campaignName)
                    .distinct()
                    .reduce((first, second) -> first + ", " + second)
                    .orElse(null);
        }

        public String displayCopy() {
            return appliedPromotions.stream()
                    .map(AppliedPromotion::displayCopy)
                    .filter(value -> value != null && !value.isBlank())
                    .distinct()
                    .reduce((first, second) -> first + " · " + second)
                    .orElse(null);
        }

        public String saleBadge() {
            return appliedPromotions.stream()
                    .map(AppliedPromotion::saleBadge)
                    .filter(value -> value != null && !value.isBlank())
                    .findFirst()
                    .orElse(null);
        }

        public String promotionIdsSnapshot() {
            return appliedPromotions.stream()
                    .map(item -> Long.toString(item.promotionId()))
                    .reduce((first, second) -> first + "," + second)
                    .orElse(null);
        }
    }

    public record GiftOffer(
            long promotionId,
            String offerId,
            String productName,
            String modelCode,
            int quantity,
            boolean selectionRequired,
            int availableQuantity,
            boolean active) {
    }
}
