package com.pc_builder_store.catalog.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public final class ProductUpgradeDtos {

    private ProductUpgradeDtos() {}

    public record Configuration(
            List<UpgradeGroup> groups,
            List<Bundle> bundles,
            List<RelatedProduct> relatedProducts,
            List<SelectableOffer> selectableOffers) {}

    public record UpgradeGroup(
            String groupId,
            String groupCode,
            String displayName,
            String description,
            boolean required,
            int displayOrder,
            boolean enabled,
            List<UpgradeOption> options) {}

    public record UpgradeOption(
            String optionId,
            String offerId,
            String productId,
            String modelCode,
            String productName,
            String productType,
            String condition,
            BigDecimal price,
            String currency,
            int availableQuantity,
            BigDecimal priceDifference,
            String displayName,
            String description,
            boolean defaultOption,
            int minimumQuantity,
            int maximumQuantity,
            int displayOrder,
            boolean enabled) {}

    public record Bundle(
            String bundleId,
            String name,
            String description,
            String discountType,
            BigDecimal discountValue,
            List<String> eligibleConditions,
            LocalDateTime startsAt,
            LocalDateTime endsAt,
            int displayOrder,
            boolean enabled,
            List<BundleItem> items) {}

    public record BundleItem(
            String offerId,
            String productId,
            String modelCode,
            String productName,
            String productType,
            String condition,
            BigDecimal price,
            String currency,
            int availableQuantity,
            boolean required,
            boolean defaultSelected,
            int displayOrder,
            boolean enabled) {}

    public record RelatedProduct(
            String productId,
            String modelCode,
            String productName,
            String productType,
            String offerId,
            BigDecimal price,
            String currency,
            int availableQuantity,
            int displayOrder) {}

    public record SelectableOffer(
            String offerId,
            String productId,
            String modelCode,
            String productName,
            String productType,
            String condition,
            BigDecimal price,
            String currency,
            int availableQuantity) {}

    public record SaveConfiguration(
            List<SaveUpgradeGroup> groups,
            List<SaveBundle> bundles,
            List<SaveRelatedProduct> relatedProducts) {}

    public record SaveUpgradeGroup(
            String groupCode,
            String displayName,
            String description,
            boolean required,
            int displayOrder,
            boolean enabled,
            List<SaveUpgradeOption> options) {}

    public record SaveUpgradeOption(
            String offerId,
            String displayName,
            String description,
            boolean defaultOption,
            int minimumQuantity,
            int maximumQuantity,
            int displayOrder,
            boolean enabled) {}

    public record SaveBundle(
            String bundleId,
            String name,
            String description,
            String discountType,
            BigDecimal discountValue,
            List<String> eligibleConditions,
            LocalDateTime startsAt,
            LocalDateTime endsAt,
            int displayOrder,
            boolean enabled,
            List<SaveBundleItem> items) {}

    public record SaveBundleItem(
            String offerId,
            boolean required,
            boolean defaultSelected,
            int displayOrder,
            boolean enabled) {}

    public record SaveRelatedProduct(String productId, int displayOrder) {}

    public record UpgradeSelection(String groupId, String optionId, int quantity) {}

    public record BundleSelection(String bundleId, List<String> offerIds) {}

    public record CartConfiguration(
            List<UpgradeSelection> upgrades,
            List<BundleSelection> bundles,
            BigDecimal componentPriceDifference,
            BigDecimal bundleSubtotal,
            BigDecimal bundleDiscount,
            boolean available,
            String availabilityMessage) {}

    public record PublicConfiguration(
            List<PublicUpgradeGroup> groups,
            List<PublicBundle> bundles,
            List<RelatedProduct> relatedProducts) {}

    public record PublicUpgradeGroup(
            String groupId,
            String groupCode,
            String displayName,
            String description,
            boolean required,
            int displayOrder,
            List<PublicUpgradeOption> options) {}

    public record PublicUpgradeOption(
            String optionId,
            String offerId,
            String productId,
            String modelCode,
            String productName,
            String productType,
            BigDecimal price,
            String currency,
            int availableQuantity,
            BigDecimal priceDifference,
            String displayName,
            String description,
            boolean defaultOption,
            int minimumQuantity,
            int maximumQuantity,
            int displayOrder) {}

    public record PublicBundle(
            String bundleId,
            String name,
            String description,
            String discountType,
            BigDecimal discountValue,
            LocalDateTime startsAt,
            LocalDateTime endsAt,
            int displayOrder,
            List<PublicBundleItem> items) {}

    public record PublicBundleItem(
            String offerId,
            String productId,
            String modelCode,
            String productName,
            String productType,
            BigDecimal price,
            String currency,
            int availableQuantity,
            boolean required,
            boolean defaultSelected,
            int displayOrder) {}
}
