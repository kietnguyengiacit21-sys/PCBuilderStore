package com.pc_builder_store.cart;

import static com.pc_builder_store.cart.CartDtos.CartItem;
import static com.pc_builder_store.cart.CartDtos.CartResponse;
import static com.pc_builder_store.cart.CartDtos.ConfigurationSelectionRequest;
import com.pc_builder_store.auth.AuthUserPrincipal;
import com.pc_builder_store.catalog.dto.ProductUpgradeDtos.BundleSelection;
import com.pc_builder_store.catalog.dto.ProductUpgradeDtos.CartConfiguration;
import com.pc_builder_store.catalog.dto.ProductUpgradeDtos.UpgradeSelection;
import com.pc_builder_store.catalog.service.ProductUpgradeService;
import com.pc_builder_store.inventory.ComponentInventoryService;
import com.pc_builder_store.promotions.PromotionPricingService;
import com.pc_builder_store.promotions.PromotionDtos.GiftSelection;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@Service
public class CartService {

    private static final int MAX_QUANTITY = 100;
    private final JdbcTemplate jdbc;
    private final GuestCartTokenService tokens;
    private final ComponentInventoryService componentInventory;
    private final PromotionPricingService promotionPricing;
    private final ProductUpgradeService upgrades;

    @Autowired
    public CartService(
            JdbcTemplate jdbc,
            GuestCartTokenService tokens,
            ComponentInventoryService componentInventory,
            PromotionPricingService promotionPricing,
            ProductUpgradeService upgrades) {
        this.jdbc = jdbc;
        this.tokens = tokens;
        this.componentInventory = componentInventory;
        this.promotionPricing = promotionPricing;
        this.upgrades = upgrades;
    }

    public CartService(JdbcTemplate jdbc, GuestCartTokenService tokens) {
        this(jdbc, tokens,
                new ComponentInventoryService(jdbc, JsonMapper.builder().build()),
                new PromotionPricingService(jdbc, JsonMapper.builder().build()),
                new ProductUpgradeService(jdbc, JsonMapper.builder().build()));
    }

    @Transactional
    public CartResponse getCart(String userId, String guestToken) {
        BigDecimal cartId = findOrCreateCart(userId, guestToken);
        return readCart(cartId);
    }

    @Transactional
    public CartResponse setConfiguration(
            String userId,
            String guestToken,
            String offerId,
            ConfigurationSelectionRequest request) {
        BigDecimal cartId = findOrCreateCart(userId, guestToken);
        BigDecimal offerKey = parseOfferId(offerId);
        Map<String, Object> line;
        try {
            line = jdbc.queryForMap("""
                    SELECT ci."cart_item_id", ci."quantity", p."product_id",
                           pt."type_code" AS "product_type", po."condition_code",
                           po."currency_code"
                    FROM "cart_items" ci
                    JOIN "product_offers" po ON po."offer_id" = ci."offer_id"
                    JOIN "products" p ON p."product_id" = po."product_id"
                    JOIN "product_types" pt ON pt."product_type_id" = p."product_type_id"
                    WHERE ci."cart_id" = ? AND ci."offer_id" = ?
                    FOR UPDATE OF ci
                    """, cartId, offerKey);
        } catch (EmptyResultDataAccessException exception) {
            throw new CartException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm trong giỏ hàng.");
        }
        if (!"PC".equals(line.get("product_type"))
                || !"NEW".equals(line.get("condition_code"))) {
            throw new CartException(HttpStatus.BAD_REQUEST,
                    "Cấu hình nâng cấp chỉ áp dụng cho PC lắp sẵn mới.");
        }
        BigDecimal cartItemId = (BigDecimal) line.get("cart_item_id");
        int quantity = ((Number) line.get("quantity")).intValue();
        ProductUpgradeService.ResolvedConfiguration resolved = upgrades.resolve(
                (BigDecimal) line.get("product_id"),
                String.valueOf(line.get("condition_code")),
                String.valueOf(line.get("currency_code")),
                quantity,
                request == null ? null : request.upgrades(),
                request == null ? null : request.bundles());
        int available = componentInventory.sellableQuantity(
                (BigDecimal) line.get("product_id"), resolved.substitutions());
        if (!resolved.available() || available < quantity) {
            throw new CartException(HttpStatus.CONFLICT,
                    "Cấu hình đã chọn hiện không đủ tồn kho.");
        }
        jdbc.update("DELETE FROM \"cart_item_upgrade_selections\" WHERE \"cart_item_id\" = ?",
                cartItemId);
        for (UpgradeSelection selection : resolved.upgrades()) {
            jdbc.update("""
                    INSERT INTO "cart_item_upgrade_selections"
                        ("cart_item_id", "upgrade_group_id", "upgrade_option_id", "quantity")
                    VALUES (?, CAST(? AS BIGINT), CAST(? AS BIGINT), ?)
                    """, cartItemId, selection.groupId(), selection.optionId(), selection.quantity());
        }
        jdbc.update("DELETE FROM \"cart_item_bundle_selections\" WHERE \"cart_item_id\" = ?",
                cartItemId);
        for (BundleSelection selection : resolved.bundles()) {
            for (String selectedOfferId : selection.offerIds()) {
                jdbc.update("""
                        INSERT INTO "cart_item_bundle_selections"
                            ("cart_item_id", "bundle_id", "offer_id")
                        VALUES (?, CAST(? AS BIGINT), CAST(? AS NUMERIC))
                        """, cartItemId, selection.bundleId(), selectedOfferId);
            }
        }
        touchCart(cartId);
        return readCart(cartId);
    }

    @Transactional
    public CartResponse addItem(
            String userId, String guestToken, String offerId, int quantity) {
        validateQuantity(quantity);
        BigDecimal cartId = findOrCreateCart(userId, guestToken);
        BigDecimal offerKey = parseOfferId(offerId);
        Offer offer = lockOffer(offerKey);
        int existing = quantityInCart(cartId, offerKey);
        int requested = existing + quantity;
        validatePurchasable(offer, requested);
        jdbc.update("""
                INSERT INTO "cart_items" ("cart_id", "offer_id", "quantity")
                VALUES (?, ?, ?)
                ON CONFLICT ("cart_id", "offer_id")
                DO UPDATE SET "quantity" = EXCLUDED."quantity"
                """, cartId, offerKey, requested);
        touchCart(cartId);
        return readCart(cartId);
    }

    @Transactional
    public CartResponse updateQuantity(
            String userId, String guestToken, String offerId, int quantity) {
        validateQuantity(quantity);
        BigDecimal cartId = findOrCreateCart(userId, guestToken);
        BigDecimal offerKey = parseOfferId(offerId);
        Offer offer = lockOffer(offerKey);
        if (quantityInCart(cartId, offerKey) == 0) {
            throw new CartException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm trong giỏ hàng.");
        }
        validatePurchasable(offer, quantity);
        jdbc.update("""
                UPDATE "cart_items" SET "quantity" = ?
                WHERE "cart_id" = ? AND "offer_id" = ?
                """, quantity, cartId, offerKey);
        touchCart(cartId);
        return readCart(cartId);
    }

    @Transactional
    public CartResponse removeItem(String userId, String guestToken, String offerId) {
        BigDecimal cartId = findOrCreateCart(userId, guestToken);
        jdbc.update("""
                DELETE FROM "cart_items"
                WHERE "cart_id" = ? AND "offer_id" = ?
                """, cartId, parseOfferId(offerId));
        touchCart(cartId);
        return readCart(cartId);
    }

    @Transactional
    public CartResponse clearCart(String userId, String guestToken) {
        BigDecimal cartId = findOrCreateCart(userId, guestToken);
        jdbc.update("DELETE FROM \"cart_items\" WHERE \"cart_id\" = ?", cartId);
        touchCart(cartId);
        return readCart(cartId);
    }

    @Transactional
    public CartResponse setSelectedGifts(
            String userId,
            String guestToken,
            String offerId,
            List<GiftSelection> selected) {
        BigDecimal cartId = findOrCreateCart(userId, guestToken);
        BigDecimal offerKey = parseOfferId(offerId);
        Map<String, Object> cartLine;
        try {
            cartLine = jdbc.queryForMap("""
                    SELECT ci."cart_item_id", ci."quantity", po."condition_code",
                           po."price", po."currency_code", p."product_id", p."product_name"
                    FROM "cart_items" ci
                    JOIN "product_offers" po ON po."offer_id" = ci."offer_id"
                    JOIN "products" p ON p."product_id" = po."product_id"
                    WHERE ci."cart_id" = ? AND ci."offer_id" = ?
                    FOR UPDATE OF ci
                    """, cartId, offerKey);
        } catch (EmptyResultDataAccessException exception) {
            throw new CartException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm trong giỏ hàng.");
        }
        PromotionPricingService.Pricing pricing = promotionPricing.price(
                (BigDecimal) cartLine.get("product_id"),
                String.valueOf(cartLine.get("condition_code")),
                (BigDecimal) cartLine.get("price"),
                String.valueOf(cartLine.get("currency_code")));
        Map<String, PromotionPricingService.GiftOffer> eligible = new java.util.HashMap<>();
        for (PromotionPricingService.GiftOffer gift : pricing.availableGifts()) {
            eligible.put(gift.promotionId() + ":" + gift.offerId(), gift);
        }
        List<GiftSelection> requested = selected == null ? List.of() : List.copyOf(selected);
        java.util.Set<String> selectedKeys = new java.util.HashSet<>();
        for (GiftSelection gift : requested) {
            if (gift == null || gift.promotionId() == null
                    || !gift.promotionId().matches("[0-9]{1,18}")
                    || gift.offerId() == null || !gift.offerId().matches("[0-9]{1,20}")
                    || gift.quantity() < 1 || !selectedKeys.add(gift.promotionId() + ":" + gift.offerId())) {
                throw new CartException(HttpStatus.BAD_REQUEST, "Lựa chọn quà tặng không hợp lệ.");
            }
            PromotionPricingService.GiftOffer definition =
                    eligible.get(gift.promotionId() + ":" + gift.offerId());
            if (definition == null || !definition.active()
                    || gift.quantity() != definition.quantity()
                    || definition.availableQuantity()
                            < gift.quantity() * ((Number) cartLine.get("quantity")).intValue()) {
                throw new CartException(HttpStatus.CONFLICT,
                        "Quà tặng không còn đủ điều kiện hoặc số lượng tồn kho.");
            }
        }
        for (PromotionPricingService.GiftOffer gift : pricing.availableGifts()) {
            if (gift.selectionRequired()
                    && !selectedKeys.contains(gift.promotionId() + ":" + gift.offerId())) {
                throw new CartException(HttpStatus.BAD_REQUEST,
                        "Vui lòng chọn đầy đủ quà tặng bắt buộc.");
            }
        }
        BigDecimal cartItemId = (BigDecimal) cartLine.get("cart_item_id");
        jdbc.update("DELETE FROM \"cart_item_gifts\" WHERE \"cart_item_id\" = ?", cartItemId);
        for (GiftSelection gift : requested) {
            jdbc.update("""
                    INSERT INTO "cart_item_gifts" (
                        "cart_item_id", "promotion_id", "gift_offer_id", "quantity"
                    ) VALUES (?, ?, ?, ?)
                    """, cartItemId, new BigDecimal(gift.promotionId()),
                    parseOfferId(gift.offerId()), gift.quantity());
        }
        touchCart(cartId);
        return readCart(cartId);
    }

    @Transactional
    public void mergeGuestCart(String guestToken, AuthUserPrincipal customer) {
        if (!tokens.isValid(guestToken)) return;
        requireCustomer(customer);
        BigDecimal userKey = parseUserId(customer.userId());
        String guestHash = tokens.hash(guestToken);
        lockOwner("USER:" + userKey);
        BigDecimal guestCartId = findCart(null, guestHash, true);
        if (guestCartId == null) return;

        BigDecimal customerCartId = findOrCreateCart(customer.userId(), null);
        if (guestCartId.equals(customerCartId)) return;
        List<GuestLine> lines = jdbc.query("""
                SELECT "offer_id", "quantity"
                FROM "cart_items"
                WHERE "cart_id" = ?
                ORDER BY "offer_id"
                FOR UPDATE
                """, (rs, row) -> new GuestLine(rs.getBigDecimal("offer_id"),
                rs.getInt("quantity")), guestCartId);

        for (GuestLine line : lines) {
            Offer offer = lockOffer(line.offerId());
            int existing = quantityInCart(customerCartId, line.offerId());
            int combined = existing + line.quantity();
            validatePurchasable(offer, combined);
            BigDecimal guestCartItemId = jdbc.queryForObject("""
                    SELECT "cart_item_id" FROM "cart_items"
                    WHERE "cart_id" = ? AND "offer_id" = ?
                    FOR UPDATE
                    """, BigDecimal.class, guestCartId, line.offerId());
            BigDecimal existingCustomerCartItemId = existing == 0 ? null
                    : jdbc.queryForObject("""
                            SELECT "cart_item_id" FROM "cart_items"
                            WHERE "cart_id" = ? AND "offer_id" = ?
                            FOR UPDATE
                            """, BigDecimal.class, customerCartId, line.offerId());
            jdbc.update("""
                    INSERT INTO "cart_items" ("cart_id", "offer_id", "quantity")
                    VALUES (?, ?, ?)
                    ON CONFLICT ("cart_id", "offer_id")
                    DO UPDATE SET "quantity" = EXCLUDED."quantity"
                    """, customerCartId, line.offerId(), combined);

            List<Map<String, Object>> guestGifts = jdbc.queryForList("""
                    SELECT "promotion_id", "gift_offer_id", "quantity"
                    FROM "cart_item_gifts"
                    WHERE "cart_item_id" = ?
                    ORDER BY "promotion_id", "gift_offer_id"
                    """, guestCartItemId);
            List<Map<String, Object>> customerGifts = existingCustomerCartItemId == null
                    ? List.of()
                    : jdbc.queryForList("""
                            SELECT "promotion_id", "gift_offer_id", "quantity"
                            FROM "cart_item_gifts"
                            WHERE "cart_item_id" = ?
                            ORDER BY "promotion_id", "gift_offer_id"
                            """, existingCustomerCartItemId);
            if (existingCustomerCartItemId != null && !guestGifts.equals(customerGifts)) {
                throw new CartException(HttpStatus.CONFLICT,
                        "Không thể gộp giỏ hàng vì lựa chọn quà tặng của cùng sản phẩm không khớp.");
            }
            if (existingCustomerCartItemId == null && !guestGifts.isEmpty()) {
                BigDecimal customerCartItemId = jdbc.queryForObject("""
                        SELECT "cart_item_id" FROM "cart_items"
                        WHERE "cart_id" = ? AND "offer_id" = ?
                        FOR UPDATE
                        """, BigDecimal.class, customerCartId, line.offerId());
                for (Map<String, Object> gift : guestGifts) {
                    jdbc.update("""
                            INSERT INTO "cart_item_gifts"
                              ("cart_item_id", "promotion_id", "gift_offer_id", "quantity")
                            VALUES (?, ?, ?, ?)
                            """,
                            customerCartItemId,
                            gift.get("promotion_id"),
                            gift.get("gift_offer_id"),
                            gift.get("quantity"));
                }
            }
            BigDecimal destinationCartItemId = existingCustomerCartItemId == null
                    ? jdbc.queryForObject("""
                            SELECT "cart_item_id" FROM "cart_items"
                            WHERE "cart_id" = ? AND "offer_id" = ?
                            """, BigDecimal.class, customerCartId, line.offerId())
                    : existingCustomerCartItemId;
            List<UpgradeSelection> guestUpgrades = selectedUpgrades(guestCartItemId);
            List<UpgradeSelection> customerUpgrades = selectedUpgrades(destinationCartItemId);
            List<BundleSelection> guestBundles = selectedBundles(guestCartItemId);
            List<BundleSelection> customerBundles = selectedBundles(destinationCartItemId);
            if (existingCustomerCartItemId != null
                    && (!guestUpgrades.equals(customerUpgrades)
                            || !guestBundles.equals(customerBundles))) {
                throw new CartException(HttpStatus.CONFLICT,
                        "Không thể gộp giỏ hàng vì cấu hình PC của cùng sản phẩm không khớp.");
            }
            if (existingCustomerCartItemId == null) {
                copyConfiguration(guestCartItemId, destinationCartItemId);
            }
        }
        jdbc.update("DELETE FROM \"cart_items\" WHERE \"cart_id\" = ?", guestCartId);
        jdbc.update("""
                UPDATE "carts"
                SET "cart_status" = 'MERGED', "user_id" = ?, "guest_token" = NULL,
                    "updated_at" = CURRENT_TIMESTAMP
                WHERE "cart_id" = ?
                """, userKey, guestCartId);
        touchCart(customerCartId);
    }

    private BigDecimal findOrCreateCart(String userId, String guestToken) {
        boolean customer = userId != null;
        String ownerKey;
        String guestHash = null;
        BigDecimal userKey = null;
        if (customer) {
            userKey = parseUserId(userId);
            ownerKey = "USER:" + userKey;
        } else {
            if (!tokens.isValid(guestToken)) {
                throw new CartException(HttpStatus.BAD_REQUEST, "Mã giỏ hàng không hợp lệ.");
            }
            guestHash = tokens.hash(guestToken);
            ownerKey = "GUEST:" + guestHash;
        }
        lockOwner(ownerKey);
        BigDecimal cartId = findCart(userKey, guestHash, true);
        if (cartId != null) return cartId;
        if (customer) {
            return jdbc.queryForObject("""
                    INSERT INTO "carts" ("user_id", "cart_status")
                    VALUES (?, 'ACTIVE')
                    RETURNING "cart_id"
                    """, BigDecimal.class, userKey);
        }
        return jdbc.queryForObject("""
                INSERT INTO "carts" ("guest_token", "cart_status")
                VALUES (?, 'ACTIVE')
                RETURNING "cart_id"
                """, BigDecimal.class, guestHash);
    }

    private BigDecimal findCart(BigDecimal userId, String guestHash, boolean lock) {
        String sql;
        Object owner;
        if (userId != null) {
            sql = """
                    SELECT "cart_id" FROM "carts"
                    WHERE "user_id" = ? AND "cart_status" = 'ACTIVE'
                    ORDER BY "cart_id" LIMIT 1
                    """ + (lock ? " FOR UPDATE" : "");
            owner = userId;
        } else {
            sql = """
                    SELECT "cart_id" FROM "carts"
                    WHERE "guest_token" = ? AND "cart_status" = 'ACTIVE'
                    """ + (lock ? " FOR UPDATE" : "");
            owner = guestHash;
        }
        try {
            return jdbc.queryForObject(sql, BigDecimal.class, owner);
        } catch (EmptyResultDataAccessException exception) {
            return null;
        }
    }

    private void lockOwner(String key) {
        jdbc.queryForObject(
                "SELECT pg_advisory_xact_lock(hashtextextended(?, 0))",
                (rs, row) -> {
                    rs.getObject(1);
                    return 1;
                },
                key);
    }

    private Offer lockOffer(BigDecimal offerId) {
        try {
            return jdbc.queryForObject("""
                    SELECT po."offer_id", po."price", po."currency_code",
                           po."stock_quantity", po."reserved_quantity",
                           po."offer_status", p."product_status",
                           p."product_name", p."model_code", p."product_id",
                           pt."type_code" AS "product_type", po."condition_code"
                    FROM "product_offers" po
                    JOIN "products" p ON p."product_id" = po."product_id"
                    JOIN "product_types" pt ON pt."product_type_id" = p."product_type_id"
                    WHERE po."offer_id" = ?
                    FOR UPDATE OF po
                    """, CartService::mapOffer, offerId);
        } catch (EmptyResultDataAccessException exception) {
            throw new CartException(HttpStatus.NOT_FOUND, "Không tìm thấy ưu đãi sản phẩm.");
        }
    }

    private static Offer mapOffer(ResultSet rs, int row) throws SQLException {
        return new Offer(
                rs.getBigDecimal("offer_id"),
                rs.getBigDecimal("price"),
                rs.getString("currency_code"),
                rs.getInt("stock_quantity"),
                rs.getInt("reserved_quantity"),
                rs.getString("offer_status"),
                rs.getString("product_status"),
                rs.getString("product_name"),
                rs.getString("model_code"),
                rs.getBigDecimal("product_id"),
                rs.getString("product_type"),
                rs.getString("condition_code"));
    }

    private int quantityInCart(BigDecimal cartId, BigDecimal offerId) {
        try {
            return jdbc.queryForObject("""
                    SELECT "quantity" FROM "cart_items"
                    WHERE "cart_id" = ? AND "offer_id" = ?
                    """, Integer.class, cartId, offerId);
        } catch (EmptyResultDataAccessException exception) {
            return 0;
        }
    }

    private void validatePurchasable(Offer offer, int quantity) {
        validateQuantity(quantity);
        if (!"ACTIVE".equals(offer.offerStatus()) || !"ACTIVE".equals(offer.productStatus())) {
            throw new CartException(HttpStatus.CONFLICT, "Sản phẩm hiện không thể mua.");
        }
        if (offer.price() == null || offer.price().signum() < 0
                || offer.currency() == null || !offer.currency().matches("[A-Z]{3}")) {
            throw new CartException(HttpStatus.CONFLICT,
                    "Thông tin giá hoặc đơn vị tiền tệ của sản phẩm chưa hợp lệ.");
        }
        int available = isNewPrebuilt(offer)
                ? componentInventory.sellableQuantity(offer.productId())
                : offer.availableQuantity();
        if (available < quantity) {
            throw new CartException(HttpStatus.CONFLICT,
                    "Số lượng sản phẩm còn lại không đủ cho yêu cầu này.");
        }
    }

    private CartResponse readCart(BigDecimal cartId) {
        List<CartItem> items = jdbc.query("""
                SELECT po."offer_id"::text AS "offerId",
                       ci."cart_item_id" AS "cartItemId",
                       p."product_name" AS "productName",
                       p."model_code" AS "modelCode",
                       ci."quantity"::integer AS "quantity",
                       po."price" AS "unitPrice",
                       po."currency_code" AS "currency",
                       (po."price" * ci."quantity") AS "subtotal",
                       GREATEST(po."stock_quantity" - po."reserved_quantity", 0)::integer
                           AS "availableQuantity",
                       po."offer_status" AS "offerStatus",
                       p."product_status" AS "productStatus",
                       p."product_id" AS "productId",
                       pt."type_code" AS "productType",
                       po."condition_code" AS "conditionCode"
                FROM "cart_items" ci
                JOIN "product_offers" po ON po."offer_id" = ci."offer_id"
                JOIN "products" p ON p."product_id" = po."product_id"
                JOIN "product_types" pt ON pt."product_type_id" = p."product_type_id"
                WHERE ci."cart_id" = ?
                ORDER BY ci."added_at", ci."cart_item_id"
                """, this::mapCartItem, cartId);
        int itemCount = items.stream().mapToInt(CartItem::quantity).sum();
        return new CartResponse(List.copyOf(items), itemCount);
    }

    private CartItem mapCartItem(ResultSet rs, int row) throws SQLException {
        int available = rs.getInt("availableQuantity");
        int quantity = rs.getInt("quantity");
        boolean active = "ACTIVE".equals(rs.getString("offerStatus"))
                && "ACTIVE".equals(rs.getString("productStatus"));
        ProductUpgradeService.ResolvedConfiguration resolved = null;
        if (active && "PC".equals(rs.getString("productType"))
                && "NEW".equals(rs.getString("conditionCode"))) {
            resolved = upgrades.resolve(
                    rs.getBigDecimal("productId"), rs.getString("conditionCode"), rs.getString("currency"),
                    quantity, selectedUpgrades(rs.getBigDecimal("cartItemId")),
                    selectedBundles(rs.getBigDecimal("cartItemId")));
            available = componentInventory.sellableQuantity(
                    rs.getBigDecimal("productId"), resolved.substitutions());
            for (ProductUpgradeService.BundleOffer item : resolved.bundleOffers()) {
                available = Math.min(available, itemAvailable(item.offerId())
                        / item.quantityPerPc());
            }
        }
        BigDecimal unitPrice = rs.getBigDecimal("unitPrice");
        String currency = rs.getString("currency");
        PromotionPricingService.Pricing pricing = promotionPricing.price(
                rs.getBigDecimal("productId"),
                rs.getString("conditionCode"),
                unitPrice,
                currency);
        String availability = !active ? "UNAVAILABLE"
                : unitPrice == null || unitPrice.signum() < 0
                        || currency == null || !currency.matches("[A-Z]{3}") ? "INVALID_PRICE"
                : resolved != null && !resolved.available() ? "INSUFFICIENT_STOCK"
                : available <= 0 ? "OUT_OF_STOCK"
                : available < quantity ? "INSUFFICIENT_STOCK" : "AVAILABLE";
        String message = switch (availability) {
            case "UNAVAILABLE" -> "Sản phẩm hiện không thể mua.";
            case "INVALID_PRICE" -> "Thông tin giá của sản phẩm chưa được xác minh.";
            case "OUT_OF_STOCK" -> "Sản phẩm hiện đã hết hàng.";
            case "INSUFFICIENT_STOCK" -> "Số lượng trong giỏ vượt quá số lượng còn lại.";
            default -> "";
        };
        BigDecimal priceDifference = resolved == null
                ? BigDecimal.ZERO : resolved.componentPriceDifference();
        BigDecimal bundleSubtotal = resolved == null
                ? BigDecimal.ZERO : resolved.bundleSubtotal();
        BigDecimal bundleDiscount = resolved == null
                ? BigDecimal.ZERO : resolved.bundleDiscount();
        BigDecimal configuredBase = pricing.basePrice().add(priceDifference).add(bundleSubtotal)
                .max(BigDecimal.ZERO);
        BigDecimal configuredPrice = pricing.payablePrice().add(priceDifference)
                .max(BigDecimal.ZERO).add(bundleSubtotal.subtract(bundleDiscount));
        BigDecimal configuredDiscount = configuredBase.subtract(configuredPrice).max(BigDecimal.ZERO);
        return new CartItem(
                rs.getString("offerId"),
                rs.getString("productName"),
                rs.getString("modelCode"),
                quantity,
                configuredPrice,
                configuredBase,
                configuredDiscount,
                currency,
                configuredPrice.multiply(BigDecimal.valueOf(quantity)),
                available,
                availability,
                message,
                pricing.campaignNames(),
                pricing.displayCopy(),
                pricing.saleBadge(),
                pricing.appliedPromotions(),
                pricing.availableGifts(),
                selectedGifts(rs.getBigDecimal("cartItemId")),
                resolved == null ? null : resolved.cartView());
    }

    private List<UpgradeSelection> selectedUpgrades(BigDecimal cartItemId) {
        return jdbc.query("""
                SELECT "upgrade_group_id"::text, "upgrade_option_id"::text, "quantity"
                FROM "cart_item_upgrade_selections"
                WHERE "cart_item_id" = ?
                ORDER BY "upgrade_group_id"
                """, (rs, row) -> new UpgradeSelection(
                rs.getString(1), rs.getString(2), rs.getInt(3)), cartItemId);
    }

    private List<BundleSelection> selectedBundles(BigDecimal cartItemId) {
        Map<String, List<String>> byBundle = new java.util.LinkedHashMap<>();
        jdbc.query("""
                SELECT "bundle_id"::text, "offer_id"::text
                FROM "cart_item_bundle_selections"
                WHERE "cart_item_id" = ?
                ORDER BY "bundle_id", "offer_id"
                """, (org.springframework.jdbc.core.RowCallbackHandler) rs ->
                        byBundle.computeIfAbsent(
                                rs.getString(1), ignored -> new java.util.ArrayList<>())
                                .add(rs.getString(2)), cartItemId);
        return byBundle.entrySet().stream()
                .map(item -> new BundleSelection(item.getKey(), List.copyOf(item.getValue())))
                .toList();
    }

    private int itemAvailable(BigDecimal offerId) {
        return jdbc.query("""
                SELECT GREATEST(po."stock_quantity" - po."reserved_quantity", 0)::integer
                FROM "product_offers" po
                JOIN "products" p ON p."product_id" = po."product_id"
                WHERE po."offer_id" = ? AND po."offer_status" = 'ACTIVE'
                  AND p."product_status" = 'ACTIVE'
                """, (rs, row) -> rs.getInt(1), offerId).stream().findFirst().orElse(0);
    }

    private void copyConfiguration(BigDecimal sourceCartItemId, BigDecimal targetCartItemId) {
        jdbc.update("""
                INSERT INTO "cart_item_upgrade_selections"
                    ("cart_item_id", "upgrade_group_id", "upgrade_option_id", "quantity")
                SELECT ?, "upgrade_group_id", "upgrade_option_id", "quantity"
                FROM "cart_item_upgrade_selections" WHERE "cart_item_id" = ?
                """, targetCartItemId, sourceCartItemId);
        jdbc.update("""
                INSERT INTO "cart_item_bundle_selections" ("cart_item_id", "bundle_id", "offer_id")
                SELECT ?, "bundle_id", "offer_id"
                FROM "cart_item_bundle_selections" WHERE "cart_item_id" = ?
                """, targetCartItemId, sourceCartItemId);
    }

    private List<GiftSelection> selectedGifts(BigDecimal cartItemId) {
        return jdbc.query("""
                SELECT "promotion_id"::text, "gift_offer_id"::text, "quantity"
                FROM "cart_item_gifts"
                WHERE "cart_item_id" = ?
                ORDER BY "promotion_id", "gift_offer_id"
                """, (rs, row) -> new GiftSelection(
                rs.getString(1), rs.getString(2), rs.getInt(3)), cartItemId);
    }

    private void touchCart(BigDecimal cartId) {
        jdbc.update("UPDATE \"carts\" SET \"updated_at\" = CURRENT_TIMESTAMP WHERE \"cart_id\" = ?", cartId);
    }

    private static BigDecimal parseOfferId(String offerId) {
        if (offerId == null || !offerId.matches("[0-9]{1,20}")) {
            throw new CartException(HttpStatus.BAD_REQUEST, "Mã ưu đãi không hợp lệ.");
        }
        return new BigDecimal(offerId);
    }

    private static BigDecimal parseUserId(String userId) {
        if (userId == null || !userId.matches("[0-9]{1,20}")) {
            throw new CartException(HttpStatus.FORBIDDEN, "Tài khoản không hợp lệ.");
        }
        return new BigDecimal(userId);
    }

    private static void validateQuantity(int quantity) {
        if (quantity < 1 || quantity > MAX_QUANTITY) {
            throw new CartException(HttpStatus.BAD_REQUEST, "Số lượng phải từ 1 đến 100.");
        }
    }

    private static void requireCustomer(AuthUserPrincipal customer) {
        if (customer == null || !"CUSTOMER".equals(customer.roleCode())) {
            throw new CartException(HttpStatus.FORBIDDEN, "Chỉ tài khoản khách hàng mới sử dụng được giỏ hàng.");
        }
    }

    record Offer(
            BigDecimal offerId,
            BigDecimal price,
            String currency,
            int stockQuantity,
            int reservedQuantity,
            String offerStatus,
            String productStatus,
            String productName,
            String modelCode,
            BigDecimal productId,
            String productType,
            String conditionCode) {
        private int availableQuantity() {
            return Math.max(stockQuantity - reservedQuantity, 0);
        }
    }

    record GuestLine(BigDecimal offerId, int quantity) {}

    private static boolean isNewPrebuilt(Offer offer) {
        return "PC".equals(offer.productType()) && "NEW".equals(offer.conditionCode());
    }
}
