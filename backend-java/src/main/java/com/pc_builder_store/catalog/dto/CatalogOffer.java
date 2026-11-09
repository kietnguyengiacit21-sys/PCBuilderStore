package com.pc_builder_store.catalog.dto;

import java.math.BigDecimal;
import java.util.List;
import com.pc_builder_store.promotions.PromotionPricingService;

public record CatalogOffer(
        String offerId,
        String condition,
        BigDecimal price,
        BigDecimal basePrice,
        BigDecimal discountAmount,
        String currency,
        long stockQuantity,
        long reservedQuantity,
        long availableQuantity,
        Long warrantyMonths,
        String status,
        long promotionId,
        String campaignName,
        String promotionDisplayCopy,
        String saleBadge,
        List<PromotionPricingService.AppliedPromotion> promotions,
        List<PromotionPricingService.GiftOffer> gifts,
        BigDecimal compareAtPrice) {

    public CatalogOffer(
            String offerId,
            String condition,
            BigDecimal price,
            BigDecimal basePrice,
            BigDecimal discountAmount,
            String currency,
            long stockQuantity,
            long reservedQuantity,
            long availableQuantity,
            Long warrantyMonths,
            String status,
            long promotionId,
            String campaignName,
            String promotionDisplayCopy,
            String saleBadge,
            List<PromotionPricingService.AppliedPromotion> promotions,
            List<PromotionPricingService.GiftOffer> gifts) {
        this(offerId, condition, price, basePrice, discountAmount, currency, stockQuantity,
                reservedQuantity, availableQuantity, warrantyMonths, status, promotionId,
                campaignName, promotionDisplayCopy, saleBadge, promotions, gifts, null);
    }

    public CatalogOffer(
            String offerId,
            String condition,
            BigDecimal price,
            String currency,
            long stockQuantity,
            long reservedQuantity,
            long availableQuantity,
            Long warrantyMonths,
            String status) {
        this(offerId, condition, price, price, BigDecimal.ZERO, currency, stockQuantity,
                reservedQuantity, availableQuantity, warrantyMonths, status, 0, null, null, null,
                List.of(), List.of(), null);
    }
}
