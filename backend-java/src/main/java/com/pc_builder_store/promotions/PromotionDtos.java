package com.pc_builder_store.promotions;

import java.math.BigDecimal;
import java.util.List;

public final class PromotionDtos {

    private PromotionDtos() {
    }

    public record GiftRequest(
            String giftOfferId,
            int quantity,
            boolean selectionRequired,
            int displayOrder) {
    }

    public record CampaignRequest(
            String campaignCode,
            String campaignName,
            String campaignTag,
            String startsAt,
            String endsAt,
            int priority,
            boolean exclusive,
            boolean enabled) {
    }

    public record PromotionRequest(
            String campaignId,
            String productId,
            String discountType,
            BigDecimal discountValue,
            String discountCurrencyCode,
            String displayCopy,
            String saleBadge,
            List<String> conditions,
            String startsAt,
            String endsAt,
            int priority,
            boolean exclusive,
            boolean enabled,
            List<GiftRequest> gifts) {
    }

    public record Campaign(
            String campaignId,
            String campaignCode,
            String campaignName,
            String campaignTag,
            String startsAt,
            String endsAt,
            int priority,
            boolean exclusive,
            boolean enabled,
            boolean archived) {
    }

    public record Gift(
            String offerId,
            String productName,
            String modelCode,
            int quantity,
            boolean selectionRequired,
            int displayOrder) {
    }

    public record Promotion(
            String promotionId,
            String campaignId,
            String campaignName,
            String productId,
            String modelCode,
            String productName,
            String discountType,
            BigDecimal discountValue,
            String discountCurrencyCode,
            String displayCopy,
            String saleBadge,
            List<String> conditions,
            String startsAt,
            String endsAt,
            int priority,
            boolean exclusive,
            boolean enabled,
            List<Gift> gifts) {
    }

    public record AppliedPromotion(
            long promotionId,
            String campaignName,
            String discountType,
            BigDecimal discountValue,
            BigDecimal discountAmount,
            String displayCopy,
            String saleBadge,
            List<Gift> gifts) {
    }

    public record GiftSelection(
            String promotionId,
            String offerId,
            int quantity) {
    }

    public record SelectedGift(
            String promotionId,
            String offerId,
            String productName,
            String modelCode,
            int quantity,
            int maximumAvailable,
            boolean selectionRequired) {
    }
}
