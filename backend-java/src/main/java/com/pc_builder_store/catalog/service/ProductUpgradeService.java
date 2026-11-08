package com.pc_builder_store.catalog.service;

import static com.pc_builder_store.catalog.dto.ProductUpgradeDtos.*;

import com.pc_builder_store.auth.AuthUserPrincipal;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class ProductUpgradeService {

    private static final Set<String> CONDITIONS = Set.of("NEW", "LIKE_NEW", "USED");
    private static final Set<String> DISCOUNTS = Set.of("PERCENTAGE", "FIXED_AMOUNT");
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public ProductUpgradeService(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public Configuration getAdminConfiguration(String modelCode) {
        Product product = findProduct(modelCode, true);
        return new Configuration(
                groups(product.id(), true),
                bundles(product.id(), true, null),
                relatedProducts(product.id()),
                jdbc.query("""
                        SELECT po."offer_id"::text AS "offer_id",
                               p."product_id"::text AS "product_id",
                               p."model_code", p."product_name",
                               pt."type_code" AS "product_type",
                               po."condition_code", po."price", po."currency_code",
                               GREATEST(po."stock_quantity" - po."reserved_quantity", 0)::integer
                                   AS "available_quantity"
                        FROM "product_offers" po
                        JOIN "products" p ON p."product_id" = po."product_id"
                        JOIN "product_types" pt ON pt."product_type_id" = p."product_type_id"
                        WHERE p."product_status" = 'ACTIVE'
                          AND po."offer_status" = 'ACTIVE'
                          AND pt."type_code" <> 'PC'
                        ORDER BY pt."type_code", p."product_name", po."condition_code", po."offer_id"
                        """, (rs, row) -> new SelectableOffer(
                        rs.getString("offer_id"), rs.getString("product_id"),
                        rs.getString("model_code"), rs.getString("product_name"),
                        rs.getString("product_type"), rs.getString("condition_code"),
                        rs.getBigDecimal("price"), rs.getString("currency_code"),
                        rs.getInt("available_quantity"))));
    }

    @Transactional
    public Configuration saveAdminConfiguration(
            String modelCode, SaveConfiguration request, AuthUserPrincipal actor) {
        if (request == null || request.groups() == null || request.bundles() == null
                || request.relatedProducts() == null) {
            throw badRequest("Cấu hình nâng cấp và gói sản phẩm không hợp lệ.");
        }
        Product product = findProduct(modelCode, true);
        if (!"PC".equals(product.type())) {
            throw badRequest("Chỉ có thể cấu hình nâng cấp cho PC lắp sẵn.");
        }
        validateGroups(product.id(), request.groups());
        validateBundles(request.bundles());
        validateRelatedProducts(product.id(), request.relatedProducts());

        jdbc.update("""
                UPDATE "product_upgrade_groups"
                SET "is_enabled" = FALSE, "updated_at" = CURRENT_TIMESTAMP
                WHERE "product_id" = ?
                """, product.id());
        for (SaveUpgradeGroup group : request.groups()) saveGroup(product.id(), group);

        jdbc.update("""
                UPDATE "product_bundles"
                SET "is_enabled" = FALSE, "updated_at" = CURRENT_TIMESTAMP
                WHERE "product_id" = ?
                """, product.id());
        List<SavedBundle> savedBundles = new ArrayList<>();
        for (SaveBundle bundle : request.bundles()) {
            savedBundles.add(new SavedBundle(bundle, saveBundle(product.id(), bundle)));
        }

        jdbc.update("""
                UPDATE "product_bundle_items" item
                SET "is_enabled" = FALSE
                FROM "product_bundles" bundle
                WHERE item."bundle_id" = bundle."bundle_id"
                  AND bundle."product_id" = ?
                """, product.id());
        for (SavedBundle bundle : savedBundles) {
            saveBundleItems(bundle.id(), bundle.request());
        }

        jdbc.update("""
                DELETE FROM "product_relationships"
                WHERE "source_product_id" = ? AND "relationship_type" = 'CROSS_SELL'
                """, product.id());
        for (SaveRelatedProduct related : request.relatedProducts()) {
            jdbc.update("""
                    INSERT INTO "product_relationships" (
                        "source_product_id", "target_product_id", "relationship_type",
                        "status_code", "display_order"
                    ) VALUES (?, ?, 'CROSS_SELL', 'ACTIVE', ?)
                    """, product.id(), new BigDecimal(related.productId()), related.displayOrder());
        }
        jdbc.update("""
                INSERT INTO "admin_product_change_history"
                    ("entity_type", "entity_id", "action_code", "changes_json", "actor_user_id")
                VALUES ('PC_UPGRADE_CONFIG', ?, 'CONFIGURATION_SAVED',
                        CAST(? AS jsonb), CAST(? AS NUMERIC))
                """, product.id(),
                "{\"groups\":" + request.groups().size()
                        + ",\"bundles\":" + request.bundles().size()
                        + ",\"relatedProducts\":" + request.relatedProducts().size() + "}",
                actor == null ? null : actor.userId());
        return getAdminConfiguration(modelCode);
    }

    @Transactional(readOnly = true)
    public PublicConfiguration getPublicConfiguration(String modelCode, String baseOfferId) {
        Product product = findProduct(modelCode, false);
        if (!"PC".equals(product.type())) {
            return new PublicConfiguration(List.of(), List.of(), List.of());
        }
        BaseOffer baseOffer = findBaseOffer(product.id(), baseOfferId);
        List<PublicUpgradeGroup> publicGroups = groups(product.id(), false).stream()
                .map(group -> new PublicUpgradeGroup(
                        group.groupId(), group.groupCode(), group.displayName(), group.description(),
                        group.required(), group.displayOrder(),
                        group.options().stream()
                                .filter(option -> option.enabled()
                                        && "NEW".equals(option.condition())
                                        && baseOffer.currency().equals(option.currency())
                                        && option.availableQuantity() > 0)
                                .map(option -> new PublicUpgradeOption(
                                        option.optionId(), option.offerId(), option.productId(),
                                        option.modelCode(), option.productName(), option.productType(),
                                        option.price(), option.currency(), option.availableQuantity(),
                                        option.priceDifference(), option.displayName(), option.description(),
                                        option.defaultOption(), option.minimumQuantity(),
                                        option.maximumQuantity(), option.displayOrder()))
                                .toList()))
                .filter(group -> !group.options().isEmpty())
                .toList();
        List<PublicBundle> publicBundles = bundles(product.id(), false, baseOffer.currency()).stream()
                .filter(this::isScheduleActive)
                .filter(bundle -> bundle.eligibleConditions().isEmpty()
                        || bundle.eligibleConditions().contains(baseOffer.condition()))
                .map(bundle -> new PublicBundle(
                        bundle.bundleId(), bundle.name(), bundle.description(), bundle.discountType(),
                        bundle.discountValue(), bundle.startsAt(), bundle.endsAt(), bundle.displayOrder(),
                        bundle.items().stream()
                                .filter(item -> item.enabled()
                                        && baseOffer.currency().equals(item.currency())
                                        && item.availableQuantity() > 0)
                                .map(item -> new PublicBundleItem(
                                        item.offerId(), item.productId(), item.modelCode(),
                                        item.productName(), item.productType(), item.price(),
                                        item.currency(), item.availableQuantity(), item.required(),
                                        item.defaultSelected(), item.displayOrder()))
                                .toList()))
                .filter(bundle -> !bundle.items().isEmpty())
                .toList();
        return new PublicConfiguration(
                publicGroups, publicBundles, relatedProducts(product.id()));
    }

    @Transactional(readOnly = true)
    public ResolvedConfiguration resolve(
            BigDecimal productId,
            String condition,
            String currency,
            int pcQuantity,
            List<UpgradeSelection> requestedUpgrades,
            List<BundleSelection> requestedBundles) {
        List<UpgradeSelection> requestedOptions =
                requestedUpgrades == null ? List.of() : requestedUpgrades;
        List<BundleSelection> requestedPackages =
                requestedBundles == null ? List.of() : requestedBundles;
        List<UpgradeGroup> groups = groups(productId, false);
        Map<String, UpgradeSelection> selections = new java.util.HashMap<>();
        for (UpgradeSelection selection : requestedOptions) {
            if (selection == null || selection.groupId() == null
                    || selections.putIfAbsent(selection.groupId(), selection) != null) {
                throw badRequest("Lựa chọn linh kiện bị trùng hoặc không hợp lệ.");
            }
        }
        List<UpgradeSelection> normalizedUpgrades = new ArrayList<>();
        List<ComponentSubstitution> substitutions = new ArrayList<>();
        BigDecimal priceDifference = BigDecimal.ZERO;
        boolean available = true;
        String availabilityMessage = "";
        for (UpgradeGroup group : groups) {
            UpgradeOption defaultOption = group.options().stream()
                    .filter(UpgradeOption::defaultOption).findFirst()
                    .orElseThrow(() -> badRequest("Nhóm nâng cấp chưa có linh kiện mặc định."));
            UpgradeSelection selected = selections.remove(group.groupId());
            UpgradeOption chosen = selected == null ? defaultOption
                    : group.options().stream()
                            .filter(option -> option.optionId().equals(selected.optionId()))
                            .findFirst()
                            .orElseThrow(() -> badRequest("Lựa chọn linh kiện không thuộc nhóm này."));
            int quantity = selected == null ? defaultOption.minimumQuantity() : selected.quantity();
            if (!chosen.enabled() || quantity < chosen.minimumQuantity()
                    || quantity > chosen.maximumQuantity()
                    || !currency.equals(chosen.currency())
                    || !chosen.condition().equals("NEW")) {
                throw badRequest("Lựa chọn linh kiện không còn hợp lệ.");
            }
            if (chosen.availableQuantity() < quantity * pcQuantity) {
                available = false;
                availabilityMessage = "Không đủ tồn kho cho linh kiện đã chọn.";
            }
            normalizedUpgrades.add(new UpgradeSelection(
                    group.groupId(), chosen.optionId(), quantity));
            priceDifference = priceDifference.add(chosen.price()
                    .multiply(BigDecimal.valueOf(quantity))
                    .subtract(defaultOption.price()
                            .multiply(BigDecimal.valueOf(defaultOption.minimumQuantity()))));
            substitutions.add(new ComponentSubstitution(
                    new BigDecimal(defaultOption.productId()),
                    new BigDecimal(chosen.productId()),
                    chosen.modelCode(),
                    new BigDecimal(chosen.offerId()),
                    defaultOption.minimumQuantity(),
                    quantity));
        }
        if (!selections.isEmpty()) {
            throw badRequest("Một nhóm nâng cấp đã ngừng hoạt động.");
        }

        List<Bundle> eligibleBundles = bundles(productId, false, currency).stream()
                .filter(this::isScheduleActive)
                .filter(bundle -> bundle.eligibleConditions().isEmpty()
                        || bundle.eligibleConditions().contains(condition))
                .toList();
        Map<String, BundleSelection> selectedBundleMap = new java.util.LinkedHashMap<>();
        for (BundleSelection selection : requestedPackages) {
            if (selection == null || selection.bundleId() == null
                    || selectedBundleMap.putIfAbsent(selection.bundleId(), selection) != null) {
                throw badRequest("Lựa chọn gói sản phẩm bị trùng hoặc không hợp lệ.");
            }
        }
        List<BundleSelection> normalizedBundles = new ArrayList<>();
        List<BundleOffer> bundleOffers = new ArrayList<>();
        BigDecimal bundleSubtotal = BigDecimal.ZERO;
        BigDecimal bundleDiscount = BigDecimal.ZERO;
        for (BundleSelection selected : selectedBundleMap.values()) {
            Bundle bundle = eligibleBundles.stream()
                    .filter(item -> item.bundleId().equals(selected.bundleId()))
                    .findFirst()
                    .orElseThrow(() -> badRequest("Gói sản phẩm không còn đủ điều kiện."));
            Set<String> selectedOfferIds = new java.util.HashSet<>(
                    selected.offerIds() == null ? List.of() : selected.offerIds());
            if (selected.offerIds() != null
                    && selectedOfferIds.size() != selected.offerIds().size()) {
                throw badRequest("Sản phẩm trong gói bị trùng.");
            }
            List<String> acceptedOfferIds = new ArrayList<>();
            BigDecimal thisBundleSubtotal = BigDecimal.ZERO;
            for (BundleItem item : bundle.items()) {
                boolean explicitlySelected = selectedOfferIds.remove(item.offerId());
                boolean include = item.required() || item.defaultSelected() || explicitlySelected;
                if (!include) continue;
                if (!item.enabled() || !currency.equals(item.currency())) {
                    throw badRequest("Sản phẩm trong gói không còn khả dụng.");
                }
                if (item.availableQuantity() < pcQuantity) {
                    available = false;
                    availabilityMessage = "Không đủ tồn kho cho sản phẩm trong gói.";
                }
                acceptedOfferIds.add(item.offerId());
                thisBundleSubtotal = thisBundleSubtotal.add(item.price());
                bundleOffers.add(new BundleOffer(
                        new BigDecimal(item.offerId()), new BigDecimal(item.productId()),
                        item.modelCode(), 1));
            }
            if (!selectedOfferIds.isEmpty()) {
                throw badRequest("Gói sản phẩm chứa lựa chọn không hợp lệ.");
            }
            BigDecimal discount = "PERCENTAGE".equals(bundle.discountType())
                    ? thisBundleSubtotal.multiply(bundle.discountValue())
                            .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP)
                    : bundle.discountValue().min(thisBundleSubtotal);
            bundleSubtotal = bundleSubtotal.add(thisBundleSubtotal);
            bundleDiscount = bundleDiscount.add(discount);
            normalizedBundles.add(new BundleSelection(bundle.bundleId(), acceptedOfferIds));
        }
        try {
            String snapshot = objectMapper.writeValueAsString(
                    new ConfigurationSnapshot(normalizedUpgrades, normalizedBundles,
                            priceDifference, bundleSubtotal, bundleDiscount,
                            substitutions, bundleOffers));
            return new ResolvedConfiguration(
                    normalizedUpgrades, normalizedBundles, priceDifference, bundleSubtotal,
                    bundleDiscount, substitutions, bundleOffers, snapshot, available,
                    availabilityMessage);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Could not snapshot the PC configuration.", exception);
        }
    }

    private void validateGroups(BigDecimal productId, List<SaveUpgradeGroup> groups) {
        Set<String> groupCodes = new java.util.HashSet<>();
        for (SaveUpgradeGroup group : groups) {
            if (group == null || !hasText(group.groupCode()) || group.groupCode().length() > 80
                    || !group.groupCode().matches("[A-Z][A-Z0-9_]{0,79}")
                    || !hasText(group.displayName()) || group.displayName().length() > 180
                    || group.displayOrder() < 0 || !groupCodes.add(group.groupCode())
                    || group.options() == null) {
                throw badRequest("Một nhóm nâng cấp bị thiếu thông tin hoặc trùng mã.");
            }
            if (group.enabled() && group.options().isEmpty()) {
                throw badRequest("Nhóm nâng cấp đang bật phải có ít nhất một lựa chọn.");
            }
            long defaults = group.options().stream().filter(SaveUpgradeOption::defaultOption).count();
            if (group.enabled() && defaults != 1) {
                throw badRequest("Mỗi nhóm nâng cấp đang bật phải có đúng một linh kiện mặc định.");
            }
            Set<String> offerIds = new java.util.HashSet<>();
            SaveUpgradeOption defaultOption = group.options().stream()
                    .filter(SaveUpgradeOption::defaultOption).findFirst().orElse(null);
            Offer defaultOffer = defaultOption == null ? null : findOffer(defaultOption.offerId());
            if (group.enabled() && (defaultOption == null || !defaultOption.enabled()
                    || defaultOffer == null || !defaultOffer.activeNew())) {
                throw badRequest("Linh kiện mặc định phải là ưu đãi NEW đang hoạt động.");
            }
            if (group.enabled() && defaultOffer != null) {
                Integer bomQuantity = jdbc.query("""
                        SELECT "quantity" FROM "product_bom_components"
                        WHERE "parent_product_id" = ? AND "component_product_id" = ?
                        """, rs -> rs.next() ? rs.getInt(1) : null,
                        productId, defaultOffer.productId());
                if (bomQuantity == null) {
                    throw badRequest("Linh kiện mặc định phải thuộc BOM hiện tại của sản phẩm.");
                }
                if (defaultOption.minimumQuantity() != bomQuantity
                        || defaultOption.maximumQuantity() != bomQuantity) {
                    throw badRequest("Số lượng mặc định phải khớp với BOM hiện tại.");
                }
            }
            for (SaveUpgradeOption option : group.options()) {
                if (option == null || !offerIds.add(option.offerId())
                        || option.displayOrder() < 0
                        || !hasText(option.offerId())
                        || !hasText(option.displayName())
                        || option.displayName().length() > 180
                        || option.minimumQuantity() < 1
                        || option.maximumQuantity() < option.minimumQuantity()
                        || option.maximumQuantity() > 100) {
                    throw badRequest("Một lựa chọn nâng cấp không hợp lệ.");
                }
                Offer selected = findOffer(option.offerId());
                if (group.enabled() && option.enabled() && (!selected.activeNew()
                        || defaultOffer == null
                        || !selected.productType().equals(defaultOffer.productType())
                        || !selected.currency().equals(defaultOffer.currency()))) {
                    throw badRequest("Lựa chọn nâng cấp phải là ưu đãi NEW đang hoạt động cùng loại và tiền tệ.");
                }
            }
        }
    }

    private void validateBundles(List<SaveBundle> bundles) {
        Set<String> ids = new java.util.HashSet<>();
        for (SaveBundle bundle : bundles) {
            if (bundle == null || !hasText(bundle.name()) || bundle.name().length() > 180
                    || bundle.displayOrder() < 0 || bundle.items() == null
                    || !DISCOUNTS.contains(bundle.discountType())
                    || bundle.discountValue() == null || bundle.discountValue().signum() < 0
                    || ("PERCENTAGE".equals(bundle.discountType())
                            && bundle.discountValue().compareTo(new BigDecimal("100")) > 0)
                    || (bundle.startsAt() != null && bundle.endsAt() != null
                            && !bundle.startsAt().isBefore(bundle.endsAt()))) {
                throw badRequest("Thông tin gói sản phẩm không hợp lệ.");
            }
            if (bundle.bundleId() != null && !ids.add(bundle.bundleId())) {
                throw badRequest("Mã gói sản phẩm bị trùng.");
            }
            Set<String> offers = new java.util.HashSet<>();
            for (SaveBundleItem item : bundle.items()) {
                if (item == null || !hasText(item.offerId())
                        || !offers.add(item.offerId()) || item.displayOrder() < 0) {
                    throw badRequest("Một sản phẩm trong gói không hợp lệ hoặc bị trùng.");
                }
                Offer offer = findOffer(item.offerId());
                if (bundle.enabled() && item.enabled() && !offer.active()) {
                    throw badRequest("Gói đang bật chỉ được chứa ưu đãi và sản phẩm đang hoạt động.");
                }
                if (item.required() && !item.defaultSelected()) {
                    throw badRequest("Sản phẩm bắt buộc trong gói phải được chọn mặc định.");
                }
            }
            if (bundle.enabled() && bundle.items().isEmpty()) {
                throw badRequest("Gói đang bật phải có ít nhất một sản phẩm.");
            }
        }
    }

    private void validateRelatedProducts(
            BigDecimal sourceProductId, List<SaveRelatedProduct> relatedProducts) {
        Set<String> productIds = new java.util.HashSet<>();
        for (SaveRelatedProduct item : relatedProducts) {
            if (item == null || !hasText(item.productId()) || item.displayOrder() < 0
                    || !productIds.add(item.productId())) {
                throw badRequest("Danh sách sản phẩm liên quan không hợp lệ.");
            }
            BigDecimal targetId = parseId(item.productId());
            Integer count = jdbc.queryForObject("""
                    SELECT COUNT(*) FROM "products"
                    WHERE "product_id" = ? AND "product_status" = 'ACTIVE'
                    """, Integer.class, targetId);
            if (count == null || count != 1 || sourceProductId.equals(targetId)) {
                throw badRequest("Sản phẩm liên quan phải là sản phẩm đang hoạt động khác PC hiện tại.");
            }
        }
    }

    private void saveGroup(BigDecimal productId, SaveUpgradeGroup group) {
        Long groupId = jdbc.query("""
                INSERT INTO "product_upgrade_groups" (
                    "product_id", "group_code", "display_name", "description",
                    "is_required", "display_order", "is_enabled"
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT ("product_id", "group_code")
                DO UPDATE SET "display_name" = EXCLUDED."display_name",
                              "description" = EXCLUDED."description",
                              "is_required" = EXCLUDED."is_required",
                              "display_order" = EXCLUDED."display_order",
                              "is_enabled" = EXCLUDED."is_enabled",
                              "updated_at" = CURRENT_TIMESTAMP
                RETURNING "upgrade_group_id"
                """, (rs, row) -> rs.getLong(1), productId, group.groupCode(),
                group.displayName().trim(), blankToNull(group.description()),
                group.required(), group.displayOrder(), group.enabled()).getFirst();
        jdbc.update("""
                UPDATE "product_upgrade_options" SET "is_enabled" = FALSE
                WHERE "upgrade_group_id" = ?
                """, groupId);
        SaveUpgradeOption defaultOption = group.options().stream()
                .filter(SaveUpgradeOption::defaultOption).findFirst().orElse(null);
        Offer defaultOffer = defaultOption == null ? null : findOffer(defaultOption.offerId());
        for (SaveUpgradeOption option : group.options()) {
            Offer offer = findOffer(option.offerId());
            BigDecimal priceDifference = defaultOffer == null ? BigDecimal.ZERO
                    : offer.price().subtract(defaultOffer.price());
            jdbc.update("""
                    INSERT INTO "product_upgrade_options" (
                        "upgrade_group_id", "offer_id", "price_delta", "display_name",
                        "description", "is_default", "minimum_quantity", "maximum_quantity",
                        "display_order", "is_enabled"
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT ("upgrade_group_id", "offer_id")
                    DO UPDATE SET "price_delta" = EXCLUDED."price_delta",
                                  "display_name" = EXCLUDED."display_name",
                                  "description" = EXCLUDED."description",
                                  "is_default" = EXCLUDED."is_default",
                                  "minimum_quantity" = EXCLUDED."minimum_quantity",
                                  "maximum_quantity" = EXCLUDED."maximum_quantity",
                                  "display_order" = EXCLUDED."display_order",
                                  "is_enabled" = EXCLUDED."is_enabled"
                    """, groupId, parseId(option.offerId()), priceDifference,
                    option.displayName().trim(), blankToNull(option.description()),
                    option.defaultOption(), option.minimumQuantity(), option.maximumQuantity(),
                    option.displayOrder(), group.enabled() && option.enabled());
        }
    }

    private BigDecimal saveBundle(BigDecimal productId, SaveBundle bundle) {
        String eligibility = json(Map.of(
                "conditions", bundle.eligibleConditions() == null
                        ? List.of() : bundle.eligibleConditions()));
        if (bundle.bundleId() == null) {
            return jdbc.queryForObject("""
                    INSERT INTO "product_bundles" (
                        "product_id", "bundle_name", "bundle_description", "discount_type",
                        "discount_value", "eligibility_json", "starts_at", "ends_at",
                        "display_order", "is_enabled"
                    ) VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb), ?, ?, ?, ?)
                    RETURNING "bundle_id"
                    """, BigDecimal.class, productId, bundle.name().trim(),
                    blankToNull(bundle.description()), bundle.discountType(),
                    bundle.discountValue(), eligibility, bundle.startsAt(), bundle.endsAt(),
                    bundle.displayOrder(), bundle.enabled());
        }
        BigDecimal bundleId = parseId(bundle.bundleId());
        int updated =
            jdbc.update("""
                    UPDATE "product_bundles"
                    SET "bundle_name" = ?, "bundle_description" = ?, "discount_type" = ?,
                        "discount_value" = ?, "eligibility_json" = CAST(? AS jsonb),
                        "starts_at" = ?, "ends_at" = ?, "display_order" = ?,
                        "is_enabled" = ?, "updated_at" = CURRENT_TIMESTAMP
                    WHERE "bundle_id" = ? AND "product_id" = ?
                    """, bundle.name().trim(), blankToNull(bundle.description()), bundle.discountType(),
                    bundle.discountValue(), eligibility, bundle.startsAt(), bundle.endsAt(),
                    bundle.displayOrder(), bundle.enabled(), bundleId, productId);
        if (updated != 1) throw badRequest("Gói sản phẩm không thuộc PC đang được chỉnh sửa.");
        return bundleId;
    }

    private void saveBundleItems(BigDecimal bundleId, SaveBundle bundle) {
        for (SaveBundleItem item : bundle.items()) {
            jdbc.update("""
                    INSERT INTO "product_bundle_items" (
                        "bundle_id", "offer_id", "is_required", "is_default_selected",
                        "display_order", "is_enabled"
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT ("bundle_id", "offer_id")
                    DO UPDATE SET "is_required" = EXCLUDED."is_required",
                                  "is_default_selected" = EXCLUDED."is_default_selected",
                                  "display_order" = EXCLUDED."display_order",
                                  "is_enabled" = EXCLUDED."is_enabled"
                    """, bundleId, parseId(item.offerId()), item.required(),
                    item.defaultSelected(), item.displayOrder(), bundle.enabled() && item.enabled());
        }
    }

    private List<UpgradeGroup> groups(BigDecimal productId, boolean includeDisabled) {
        return jdbc.query("""
                SELECT "upgrade_group_id", "group_code", "display_name", "description",
                       "is_required", "display_order", "is_enabled"
                FROM "product_upgrade_groups"
                WHERE "product_id" = ? AND (? OR "is_enabled")
                ORDER BY "display_order", "upgrade_group_id"
                """, (rs, row) -> {
            long id = rs.getLong("upgrade_group_id");
            return new UpgradeGroup(
                    Long.toString(id), rs.getString("group_code"), rs.getString("display_name"),
                    rs.getString("description"), rs.getBoolean("is_required"),
                    rs.getInt("display_order"), rs.getBoolean("is_enabled"),
                    options(id, includeDisabled));
        }, productId, includeDisabled);
    }

    private List<UpgradeOption> options(long groupId, boolean includeDisabled) {
        return jdbc.query("""
                SELECT uo."upgrade_option_id", po."offer_id"::text AS "offer_id",
                       p."product_id"::text AS "product_id", p."model_code", p."product_name",
                       pt."type_code" AS "product_type", po."condition_code", po."price",
                       po."currency_code", GREATEST(po."stock_quantity" - po."reserved_quantity", 0)
                           AS "available_quantity", uo."price_delta", uo."display_name",
                       uo."description", uo."is_default", uo."minimum_quantity",
                       uo."maximum_quantity", uo."display_order", uo."is_enabled"
                FROM "product_upgrade_options" uo
                JOIN "product_offers" po ON po."offer_id" = uo."offer_id"
                JOIN "products" p ON p."product_id" = po."product_id"
                JOIN "product_types" pt ON pt."product_type_id" = p."product_type_id"
                WHERE uo."upgrade_group_id" = ? AND (? OR uo."is_enabled")
                  AND (? OR (po."offer_status" = 'ACTIVE'
                             AND p."product_status" = 'ACTIVE'
                             AND po."condition_code" = 'NEW'))
                ORDER BY uo."display_order", uo."upgrade_option_id"
                """, (rs, row) -> mapUpgradeOption(rs),
                groupId, includeDisabled, includeDisabled);
    }

    private UpgradeOption mapUpgradeOption(ResultSet rs) throws SQLException {
        return new UpgradeOption(
                rs.getString("upgrade_option_id"), rs.getString("offer_id"), rs.getString("product_id"),
                rs.getString("model_code"), rs.getString("product_name"), rs.getString("product_type"),
                rs.getString("condition_code"), rs.getBigDecimal("price"), rs.getString("currency_code"),
                rs.getInt("available_quantity"), rs.getBigDecimal("price_delta"),
                rs.getString("display_name"), rs.getString("description"),
                rs.getBoolean("is_default"), rs.getInt("minimum_quantity"),
                rs.getInt("maximum_quantity"), rs.getInt("display_order"),
                rs.getBoolean("is_enabled"));
    }

    private List<Bundle> bundles(
            BigDecimal productId, boolean includeDisabled, String currency) {
        List<Bundle> result = jdbc.query("""
                SELECT "bundle_id", "bundle_name", "bundle_description", "discount_type",
                       "discount_value", "eligibility_json"::text AS "eligibility_json",
                       "starts_at", "ends_at", "display_order", "is_enabled"
                FROM "product_bundles"
                WHERE "product_id" = ? AND (? OR "is_enabled")
                ORDER BY "display_order", "bundle_id"
                """, (rs, row) -> new Bundle(
                rs.getString("bundle_id"), rs.getString("bundle_name"),
                rs.getString("bundle_description"), rs.getString("discount_type"),
                rs.getBigDecimal("discount_value"), readConditions(rs.getString("eligibility_json")),
                localDateTime(rs, "starts_at"), localDateTime(rs, "ends_at"),
                rs.getInt("display_order"), rs.getBoolean("is_enabled"),
                bundleItems(new BigDecimal(rs.getString("bundle_id")), includeDisabled, currency)),
                productId, includeDisabled);
        return result;
    }

    private List<BundleItem> bundleItems(
            BigDecimal bundleId, boolean includeDisabled, String currency) {
        return jdbc.query("""
                SELECT po."offer_id"::text AS "offer_id", p."product_id"::text AS "product_id",
                       p."model_code", p."product_name", pt."type_code" AS "product_type",
                       po."condition_code", po."price", po."currency_code",
                       GREATEST(po."stock_quantity" - po."reserved_quantity", 0)::integer
                           AS "available_quantity", item."is_required",
                       item."is_default_selected", item."display_order", item."is_enabled"
                FROM "product_bundle_items" item
                JOIN "product_offers" po ON po."offer_id" = item."offer_id"
                JOIN "products" p ON p."product_id" = po."product_id"
                JOIN "product_types" pt ON pt."product_type_id" = p."product_type_id"
                WHERE item."bundle_id" = ? AND (? OR item."is_enabled")
                  AND (CAST(? AS TEXT) IS NULL OR po."currency_code" = CAST(? AS TEXT))
                  AND (? OR (po."offer_status" = 'ACTIVE' AND p."product_status" = 'ACTIVE'))
                ORDER BY item."display_order", po."offer_id"
                """, (rs, row) -> new BundleItem(
                rs.getString("offer_id"), rs.getString("product_id"), rs.getString("model_code"),
                rs.getString("product_name"), rs.getString("product_type"),
                rs.getString("condition_code"), rs.getBigDecimal("price"),
                rs.getString("currency_code"), rs.getInt("available_quantity"),
                rs.getBoolean("is_required"), rs.getBoolean("is_default_selected"),
                rs.getInt("display_order"), rs.getBoolean("is_enabled")),
                bundleId, includeDisabled, currency, currency, includeDisabled);
    }

    private List<RelatedProduct> relatedProducts(BigDecimal productId) {
        return jdbc.query("""
                SELECT p."product_id"::text AS "product_id", p."model_code", p."product_name",
                       pt."type_code" AS "product_type", po."offer_id"::text AS "offer_id",
                       po."price", po."currency_code",
                       GREATEST(po."stock_quantity" - po."reserved_quantity", 0)::integer
                           AS "available_quantity", rel."display_order"
                FROM "product_relationships" rel
                JOIN "products" p ON p."product_id" = rel."target_product_id"
                JOIN "product_types" pt ON pt."product_type_id" = p."product_type_id"
                JOIN LATERAL (
                    SELECT offer."offer_id", offer."price", offer."currency_code",
                           offer."stock_quantity", offer."reserved_quantity"
                    FROM "product_offers" offer
                    WHERE offer."product_id" = p."product_id"
                      AND offer."offer_status" = 'ACTIVE'
                    ORDER BY CASE WHEN offer."condition_code" = 'NEW' THEN 0 ELSE 1 END,
                             offer."price", offer."offer_id"
                    LIMIT 1
                ) po ON TRUE
                WHERE rel."source_product_id" = ?
                  AND rel."relationship_type" = 'CROSS_SELL'
                  AND rel."status_code" = 'ACTIVE'
                  AND p."product_status" = 'ACTIVE'
                ORDER BY rel."display_order", rel."relationship_id"
                """, (rs, row) -> new RelatedProduct(
                rs.getString("product_id"), rs.getString("model_code"), rs.getString("product_name"),
                rs.getString("product_type"), rs.getString("offer_id"),
                rs.getBigDecimal("price"), rs.getString("currency_code"),
                rs.getInt("available_quantity"), rs.getInt("display_order")), productId);
    }

    private Product findProduct(String modelCode, boolean allowDraft) {
        List<Product> products = jdbc.query("""
                SELECT p."product_id", p."model_code", pt."type_code", p."product_status"
                FROM "products" p
                JOIN "product_types" pt ON pt."product_type_id" = p."product_type_id"
                WHERE p."model_code" = ? AND (? OR p."product_status" = 'ACTIVE')
                """, (rs, row) -> new Product(
                rs.getBigDecimal("product_id"), rs.getString("model_code"),
                rs.getString("type_code"), rs.getString("product_status")),
                modelCode, allowDraft);
        if (products.size() != 1) throw notFound("Không tìm thấy sản phẩm.");
        return products.getFirst();
    }

    private BaseOffer findBaseOffer(BigDecimal productId, String offerId) {
        if (offerId == null || !offerId.matches("[0-9]{1,20}")) {
            throw badRequest("Ưu đãi cơ sở không hợp lệ.");
        }
        List<BaseOffer> offers = jdbc.query("""
                SELECT "condition_code", "currency_code", "offer_status"
                FROM "product_offers"
                WHERE "offer_id" = ? AND "product_id" = ?
                """, (rs, row) -> new BaseOffer(
                rs.getString("condition_code"), rs.getString("currency_code"),
                rs.getString("offer_status")), new BigDecimal(offerId), productId);
        if (offers.size() != 1 || !"ACTIVE".equals(offers.getFirst().status())
                || !"NEW".equals(offers.getFirst().condition())) {
            throw badRequest("Cấu hình nâng cấp chỉ khả dụng cho ưu đãi NEW đang hoạt động.");
        }
        return offers.getFirst();
    }

    private Offer findOffer(String offerId) {
        if (offerId == null || !offerId.matches("[0-9]{1,20}")) {
            throw badRequest("Ưu đãi thành phần không hợp lệ.");
        }
        List<Offer> offers = jdbc.query("""
                SELECT po."offer_id", po."product_id", p."model_code", p."product_name",
                       pt."type_code" AS "product_type", po."condition_code", po."price",
                       po."currency_code", po."offer_status", p."product_status",
                       GREATEST(po."stock_quantity" - po."reserved_quantity", 0)::integer
                           AS "available_quantity"
                FROM "product_offers" po
                JOIN "products" p ON p."product_id" = po."product_id"
                JOIN "product_types" pt ON pt."product_type_id" = p."product_type_id"
                WHERE po."offer_id" = ?
                """, (rs, row) -> new Offer(
                rs.getBigDecimal("offer_id"), rs.getBigDecimal("product_id"),
                rs.getString("model_code"), rs.getString("product_name"),
                rs.getString("product_type"), rs.getString("condition_code"),
                rs.getBigDecimal("price"), rs.getString("currency_code"),
                rs.getString("offer_status"), rs.getString("product_status"),
                rs.getInt("available_quantity")), new BigDecimal(offerId));
        if (offers.size() != 1) throw badRequest("Không tìm thấy ưu đãi.");
        return offers.getFirst();
    }

    private boolean isScheduleActive(Bundle bundle) {
        LocalDateTime now = LocalDateTime.now();
        return bundle.enabled()
                && (bundle.startsAt() == null || !now.isBefore(bundle.startsAt()))
                && (bundle.endsAt() == null || now.isBefore(bundle.endsAt()));
    }

    private List<String> readConditions(String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode conditions = root == null ? null : root.get("conditions");
            if (conditions == null || !conditions.isArray()) return List.of();
            List<String> values = new ArrayList<>();
            for (JsonNode condition : conditions) {
                if (condition.isTextual() && CONDITIONS.contains(condition.asText())) {
                    values.add(condition.asText());
                }
            }
            return List.copyOf(values);
        } catch (JacksonException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Cấu hình điều kiện gói sản phẩm bị lỗi.", exception);
        }
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Could not serialize product configuration.", exception);
        }
    }

    private static LocalDateTime localDateTime(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toLocalDateTime();
    }

    private static BigDecimal parseId(String value) {
        if (value == null || !value.matches("[0-9]{1,20}")) {
            throw badRequest("Mã sản phẩm hoặc ưu đãi không hợp lệ.");
        }
        return new BigDecimal(value);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String blankToNull(String value) {
        return hasText(value) ? value.trim() : null;
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }

    private record Product(BigDecimal id, String modelCode, String type, String status) {}

    private record BaseOffer(String condition, String currency, String status) {}

    private record SavedBundle(SaveBundle request, BigDecimal id) {}

    public record ComponentSubstitution(
            BigDecimal baseProductId,
            BigDecimal selectedProductId,
            String modelCode,
            BigDecimal offerId,
            int baseQuantityPerPc,
            int quantityPerPc) {}

    public record BundleOffer(
            BigDecimal offerId, BigDecimal productId, String modelCode, int quantityPerPc) {}

    public record ResolvedConfiguration(
            List<UpgradeSelection> upgrades,
            List<BundleSelection> bundles,
            BigDecimal componentPriceDifference,
            BigDecimal bundleSubtotal,
            BigDecimal bundleDiscount,
            List<ComponentSubstitution> substitutions,
            List<BundleOffer> bundleOffers,
            String snapshot,
            boolean available,
            String availabilityMessage) {
        public CartConfiguration cartView() {
            return new CartConfiguration(
                    upgrades, bundles, componentPriceDifference, bundleSubtotal,
                    bundleDiscount, available, availabilityMessage);
        }
    }

    private record ConfigurationSnapshot(
            List<UpgradeSelection> upgrades,
            List<BundleSelection> bundles,
            BigDecimal componentPriceDifference,
            BigDecimal bundleSubtotal,
            BigDecimal bundleDiscount,
            List<ComponentSubstitution> substitutions,
            List<BundleOffer> bundleOffers) {}

    private record Offer(
            BigDecimal id, BigDecimal productId, String modelCode, String productName,
            String productType, String condition, BigDecimal price, String currency,
            String offerStatus, String productStatus, int availableQuantity) {
        boolean active() {
            return "ACTIVE".equals(offerStatus) && "ACTIVE".equals(productStatus);
        }

        boolean activeNew() {
            return active() && "NEW".equals(condition);
        }
    }
}
