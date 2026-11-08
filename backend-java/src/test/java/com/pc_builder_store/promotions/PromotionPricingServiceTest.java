package com.pc_builder_store.promotions;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.json.JsonMapper;

@ExtendWith(MockitoExtension.class)
class PromotionPricingServiceTest {

    @Mock
    private JdbcTemplate jdbc;

    @Test
    void appliesEligibleNonExclusivePromotionsInAscendingPriorityWithoutNegativePrice() {
        when(jdbc.queryForList(org.mockito.ArgumentMatchers.any(String.class),
                eq(new BigDecimal("10")), eq("VND")))
                .thenReturn(List.of(
                        promotion(1, "FIXED_AMOUNT", "20", 10, false, 1, "First"),
                        promotion(2, "PERCENTAGE", "50", 20, false, 2, "Second"),
                        promotion(3, "PERCENTAGE", "100", 30, false, 3, "Third")));
        PromotionPricingService service = new PromotionPricingService(
                jdbc, JsonMapper.builder().build());

        PromotionPricingService.Pricing result = service.price(
                new BigDecimal("10"), "NEW", new BigDecimal("100.00"), "VND");

        assertEquals(new BigDecimal("0.00"), result.payablePrice());
        assertEquals(new BigDecimal("100.00"), result.discountAmount());
        assertEquals(3, result.appliedPromotions().size());
        assertEquals("First, Second, Third", result.campaignNames());
    }

    @Test
    void exclusivePromotionAppliesAloneAndOfferEligibilityIsRespected() {
        when(jdbc.queryForList(org.mockito.ArgumentMatchers.any(String.class),
                eq(new BigDecimal("10")), eq("VND")))
                .thenReturn(List.of(
                        promotion(2, "PERCENTAGE", "50", 2, false, 0, "Stacked"),
                        promotion(1, "FIXED_PRICE", "30", 5, true, 0, "Exclusive"),
                        promotionWithConditions(3, "FIXED_AMOUNT", "5", 1, false, 0,
                                "Ineligible", "{\"conditions\":[\"USED\"]}")));
        PromotionPricingService service = new PromotionPricingService(
                jdbc, JsonMapper.builder().build());

        PromotionPricingService.Pricing result = service.price(
                new BigDecimal("10"), "NEW", new BigDecimal("100.00"), "VND");

        assertEquals(new BigDecimal("30.00"), result.payablePrice());
        assertEquals(1, result.appliedPromotions().size());
        assertEquals("Exclusive", result.appliedPromotions().getFirst().campaignName());
    }

    @Test
    void campaignPriceCannotIncreasePayablePriceAndInvalidBasePriceIsRejected() {
        when(jdbc.queryForList(org.mockito.ArgumentMatchers.any(String.class),
                eq(new BigDecimal("10")), eq("VND")))
                .thenReturn(List.of(
                        promotion(1, "FIXED_PRICE", "150", 1, true, 0, "Higher campaign")));
        PromotionPricingService service = new PromotionPricingService(
                jdbc, JsonMapper.builder().build());

        PromotionPricingService.Pricing result = service.price(
                new BigDecimal("10"), "NEW", new BigDecimal("100.00"), "VND");
        assertEquals(new BigDecimal("100.00"), result.payablePrice());
        assertEquals(BigDecimal.ZERO.setScale(2), result.discountAmount());
    }

    @Test
    void fixedPromotionsAreLoadedOnlyForTheOfferCurrency() {
        when(jdbc.queryForList(org.mockito.ArgumentMatchers.any(String.class),
                eq(new BigDecimal("10")), eq("USD")))
                .thenReturn(List.of());
        PromotionPricingService service = new PromotionPricingService(
                jdbc, JsonMapper.builder().build());

        PromotionPricingService.Pricing result = service.price(
                new BigDecimal("10"), "NEW", new BigDecimal("100.00"), "USD");

        assertEquals(new BigDecimal("100.00"), result.payablePrice());
        assertEquals(BigDecimal.ZERO.setScale(2), result.discountAmount());
        verify(jdbc).queryForList(org.mockito.ArgumentMatchers.any(String.class),
                eq(new BigDecimal("10")), eq("USD"));
    }

    private static Map<String, Object> promotion(
            long id, String type, String value, int priority,
            boolean exclusive, int campaignPriority, String name) {
        return promotionWithConditions(
                id, type, value, priority, exclusive, campaignPriority, name, "{}");
    }

    private static Map<String, Object> promotionWithConditions(
            long id, String type, String value, int priority,
            boolean exclusive, int campaignPriority, String name, String eligibility) {
        Map<String, Object> result = new HashMap<>();
        result.put("promotion_id", id);
        result.put("discount_type", type);
        result.put("discount_value", new BigDecimal(value));
        result.put("discount_currency_code", "PERCENTAGE".equals(type) ? null : "VND");
        result.put("display_copy", name);
        result.put("sale_badge", name);
        result.put("eligibility_json", eligibility);
        result.put("priority", priority);
        result.put("is_exclusive", exclusive);
        result.put("campaign_priority", campaignPriority);
        result.put("campaign_exclusive", false);
        result.put("campaign_name", name);
        return result;
    }
}
