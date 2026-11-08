package com.pc_builder_store.cart;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;
import java.util.List;
import com.pc_builder_store.promotions.PromotionPricingService;
import com.pc_builder_store.promotions.PromotionDtos.GiftSelection;
import com.pc_builder_store.catalog.dto.ProductUpgradeDtos.CartConfiguration;
import com.pc_builder_store.catalog.dto.ProductUpgradeDtos.UpgradeSelection;
import com.pc_builder_store.catalog.dto.ProductUpgradeDtos.BundleSelection;

public final class CartDtos {

    private CartDtos() {}

    public record QuantityRequest(
            @Min(1) @Max(100) int quantity) {}

    public record AddItemRequest(
            @NotBlank @Pattern(regexp = "[0-9]{1,20}") String offerId,
            @Min(1) @Max(100) int quantity) {}

    public record GiftSelectionRequest(List<GiftSelection> gifts) {}

    public record ConfigurationSelectionRequest(
            List<UpgradeSelection> upgrades, List<BundleSelection> bundles) {}

    public record CartItem(
            String offerId,
            String productName,
            String modelCode,
            int quantity,
            BigDecimal unitPrice,
            BigDecimal baseUnitPrice,
            BigDecimal discountAmount,
            String currency,
            BigDecimal subtotal,
            int availableQuantity,
            String availability,
            String availabilityMessage,
            String campaignName,
            String promotionDisplayCopy,
            String saleBadge,
            List<PromotionPricingService.AppliedPromotion> promotions,
            List<PromotionPricingService.GiftOffer> gifts,
            List<GiftSelection> selectedGifts,
            CartConfiguration configuration) {}

    public record CartResponse(List<CartItem> items, int itemCount) {}
}
