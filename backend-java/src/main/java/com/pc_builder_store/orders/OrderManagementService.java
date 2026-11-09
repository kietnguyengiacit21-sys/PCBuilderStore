package com.pc_builder_store.orders;

import static com.pc_builder_store.orders.OrderDtos.FulfillmentStatus;

import com.pc_builder_store.auth.AuthUserPrincipal;
import com.pc_builder_store.catalog.dto.ProductUpgradeDtos.BundleSelection;
import com.pc_builder_store.catalog.dto.ProductUpgradeDtos.UpgradeSelection;
import com.pc_builder_store.catalog.service.ProductUpgradeService;
import com.pc_builder_store.inventory.ComponentInventoryService;
import com.pc_builder_store.promotions.PromotionPricingService;
import com.pc_builder_store.orders.OrderDtos.CancellationDecisionRequest;
import com.pc_builder_store.orders.OrderDtos.CheckoutItem;
import com.pc_builder_store.orders.OrderDtos.CheckoutRequest;
import com.pc_builder_store.orders.OrderDtos.GuestCheckoutRequest;
import com.pc_builder_store.orders.OrderDtos.OrderDetail;
import com.pc_builder_store.orders.OrderDtos.OrderItem;
import com.pc_builder_store.orders.OrderDtos.OrderSummary;
import com.pc_builder_store.orders.OrderDtos.ShippingUpdateRequest;
import com.pc_builder_store.orders.OrderDtos.StatusHistory;
import com.pc_builder_store.orders.OrderDtos.StatusUpdateRequest;
import com.pc_builder_store.orders.PaymentGateway.PaymentResult;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.PreparedStatement;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import tools.jackson.databind.json.JsonMapper;

@Service
public class OrderManagementService {

    private static final List<FulfillmentStatus> PRE_SHIPPING_STATUSES = List.of(
            FulfillmentStatus.PENDING_CONFIRMATION,
            FulfillmentStatus.CONFIRMED,
            FulfillmentStatus.PROCESSING,
            FulfillmentStatus.READY_TO_SHIP);

    private final JdbcTemplate jdbc;
    private final PaymentGateway paymentGateway;
    private final ComponentInventoryService componentInventory;
    private final PromotionPricingService promotionPricing;
    private final ProductUpgradeService upgrades;

    @Autowired
    public OrderManagementService(
            JdbcTemplate jdbc,
            PaymentGateway paymentGateway,
            ComponentInventoryService componentInventory,
            PromotionPricingService promotionPricing,
            ProductUpgradeService upgrades) {
        this.jdbc = jdbc;
        this.paymentGateway = paymentGateway;
        this.componentInventory = componentInventory;
        this.promotionPricing = promotionPricing;
        this.upgrades = upgrades;
    }

    public OrderManagementService(JdbcTemplate jdbc, PaymentGateway paymentGateway) {
        this(jdbc, paymentGateway,
                new ComponentInventoryService(jdbc, JsonMapper.builder().build()),
                new PromotionPricingService(jdbc, JsonMapper.builder().build()),
                new ProductUpgradeService(jdbc, JsonMapper.builder().build()));
    }

    @Transactional(readOnly = true)
    public List<OrderSummary> listAdminOrders(
            String statusFilter, String paymentFilter, String search) {
        StringBuilder sql = new StringBuilder("""
                SELECT "order_number", "customer_name", "customer_email", "customer_phone",
                       "order_status", "payment_method", "payment_status", "shipment_status",
                       "shipping_carrier", "tracking_number",
                       (SELECT CASE WHEN COUNT(DISTINCT oi."currency_code") = 1
                                    THEN MIN(oi."currency_code") END
                        FROM "order_items" oi
                        WHERE oi."order_id" = "orders"."order_id") AS "currency_code",
                       (SELECT COUNT(*) > 0 AND COUNT(DISTINCT oi."currency_code") = 1
                        FROM "order_items" oi
                        WHERE oi."order_id" = "orders"."order_id") AS "show_financials",
                       "total_amount",
                       "placed_at"::text AS "placed_at_text", "updated_at"::text AS "updated_at_text"
                FROM "orders"
                WHERE TRUE
                """);
        List<Object> parameters = new ArrayList<>();
        if (StringUtils.hasText(statusFilter)) {
            FulfillmentStatus status = parseStatus(statusFilter);
            sql.append(" AND \"order_status\" = ?");
            parameters.add(status.name());
        }
        if (StringUtils.hasText(paymentFilter)) {
            sql.append(" AND UPPER(\"payment_status\") = UPPER(?)");
            parameters.add(paymentFilter.trim());
        }
        if (StringUtils.hasText(search)) {
            sql.append("""
                     AND ("order_number" ILIKE ? OR "customer_name" ILIKE ?
                          OR "customer_email" ILIKE ? OR COALESCE("customer_phone", '') ILIKE ?)
                    """);
            String like = "%" + search.trim() + "%";
            parameters.add(like);
            parameters.add(like);
            parameters.add(like);
            parameters.add(like);
        }
        sql.append(" ORDER BY \"placed_at\" DESC, \"order_id\" DESC LIMIT 200");
        return jdbc.query(
                sql.toString(),
                (result, rowNumber) -> mapSummary(result, rowNumber),
                parameters.toArray());
    }

    @Transactional(readOnly = true)
    public List<OrderSummary> listCustomerOrders(String userId) {
        return jdbc.query("""
                SELECT "order_number", "customer_name", "customer_email", "customer_phone",
                       "order_status", "payment_method", "payment_status", "shipment_status",
                       "shipping_carrier", "tracking_number",
                       (SELECT CASE WHEN COUNT(DISTINCT oi."currency_code") = 1
                                    THEN MIN(oi."currency_code") END
                        FROM "order_items" oi
                        WHERE oi."order_id" = "orders"."order_id") AS "currency_code",
                       (SELECT COUNT(*) > 0 AND COUNT(DISTINCT oi."currency_code") = 1
                        FROM "order_items" oi
                        WHERE oi."order_id" = "orders"."order_id") AS "show_financials",
                       "total_amount",
                       "placed_at"::text AS "placed_at_text", "updated_at"::text AS "updated_at_text"
                FROM "orders"
                WHERE "user_id" = ?
                ORDER BY "placed_at" DESC, "order_id" DESC
                LIMIT 200
                """, (result, rowNumber) -> mapSummary(result, rowNumber), Long.parseLong(userId));
    }

    @Transactional(readOnly = true)
    public OrderDetail getCustomerOrder(String orderNumber, String userId) {
        return findDetail(orderNumber, Long.parseLong(userId));
    }

    @Transactional(readOnly = true)
    public OrderDetail lookupGuestOrder(String orderNumber, String customerPhone) {
        String normalizedPhone = normalizePhone(customerPhone);
        if (!StringUtils.hasText(orderNumber) || normalizedPhone.isEmpty()) {
            throw guestOrderNotFound();
        }
        List<String> matches = jdbc.query("""
                SELECT "order_number"
                FROM "orders"
                WHERE "order_number" = ?
                  AND "user_id" IS NULL
                  AND regexp_replace(COALESCE("customer_phone", '') COLLATE "C",
                                     '[^0-9]', '', 'g') = ?
                """, (rs, row) -> rs.getString(1), orderNumber.trim(), normalizedPhone);
        if (matches.isEmpty()) throw guestOrderNotFound();
        return findDetail(matches.getFirst(), null, true);
    }

    @Transactional(readOnly = true)
    public OrderDetail getAdminOrder(String orderNumber) {
        return findDetail(orderNumber, null);
    }

    @Transactional
    public OrderDetail updateStatus(
            String orderNumber, StatusUpdateRequest request, AuthUserPrincipal actor) {
        if (request == null || request.status() == null) {
            throw new OrderManagementException(HttpStatus.BAD_REQUEST, "A valid status is required.");
        }
        Map<String, Object> row = lockOrder(orderNumber);
        if (request.status() == OrderDtos.FulfillmentStatus.SHIPPING
                && "SIMULATED_ONLINE".equals(row.get("payment_method"))
                && !"PAID".equals(row.get("payment_status"))) {
            throw new OrderManagementException(
                    HttpStatus.CONFLICT,
                    "Không thể chuyển đơn hàng sang giao hàng khi thanh toán trực tuyến chưa thành công.");
        }
        FulfillmentStatus previous = statusFrom(row);
        FulfillmentStatus next = request.status();
        if (previous == next) {
            return findDetail(orderNumber, null);
        }
        long orderId = number(row.get("order_id"));
        if (next == FulfillmentStatus.CANCELLATION_REQUESTED) {
            if (!PRE_SHIPPING_STATUSES.contains(previous)) {
                throw new OrderManagementException(HttpStatus.CONFLICT,
                        "Cancellation is not available for this order status.");
            }
            updateStatusRow(orderId, next);
            insertHistory(row, previous, next, "ADMIN_CANCELLATION_REQUESTED", actor, request.note());
            return findDetail(orderNumber, null);
        }
        if (next == FulfillmentStatus.CANCELLED) {
            if (!PRE_SHIPPING_STATUSES.contains(previous)
                    && previous != FulfillmentStatus.CANCELLATION_REQUESTED) {
                throw new OrderManagementException(HttpStatus.CONFLICT,
                        "Cancellation is not available for this order status.");
            }
            releaseInventoryReservations(orderId);
            issueSimulatedRefundIfPaid(row);
            updateStatusRow(orderId, next);
            insertHistory(row, previous, next, "ADMIN_CANCELLATION_APPROVED", actor, request.note());
            return findDetail(orderNumber, null);
        }
        if (!isAllowedTransition(previous, next)) {
            throw new OrderManagementException(HttpStatus.CONFLICT,
                    "The requested status transition is not allowed.");
        }
        if (next == FulfillmentStatus.SHIPPING) {
            consumeInventoryReservations(orderId);
        }
        updateStatusRow(orderId, next);
        insertHistory(row, previous, next, "ADMIN_STATUS_CHANGED", actor, request.note());
        return findDetail(orderNumber, null);
    }

    @Transactional
    public OrderDetail requestCancellation(
            String orderNumber, String reason, AuthUserPrincipal actor) {
        Map<String, Object> row = lockOrder(orderNumber);
        if (row.get("user_id") == null
                || number(row.get("user_id")) != Long.parseLong(actor.userId())) {
            throw new OrderManagementException(HttpStatus.NOT_FOUND, "Order not found.");
        }
        FulfillmentStatus previous = statusFrom(row);
        if (!Set.of(
                FulfillmentStatus.PENDING_CONFIRMATION,
                FulfillmentStatus.CONFIRMED,
                FulfillmentStatus.PROCESSING,
                FulfillmentStatus.READY_TO_SHIP).contains(previous)) {
            throw new OrderManagementException(
                    HttpStatus.CONFLICT, "Cancellation is not available for this order status.");
        }
        FulfillmentStatus next = FulfillmentStatus.CANCELLATION_REQUESTED;
        updateStatusRow(number(row.get("order_id")), next);
        insertHistory(row, previous, next, "CUSTOMER_CANCELLATION_REQUESTED", actor, reason);
        return findDetail(orderNumber, number(row.get("user_id")));
    }

    @Transactional
    public OrderDetail processSimulatedPayment(
            String orderNumber, String idempotencyKey, AuthUserPrincipal customer) {
        if (customer == null || customer.userId() == null) {
            throw new OrderManagementException(HttpStatus.NOT_FOUND, "Order not found.");
        }
        return processSimulatedPayment(
                orderNumber, idempotencyKey, Long.parseLong(customer.userId()), null, false);
    }

    @Transactional
    public OrderDetail processGuestPayment(
            String orderNumber, String idempotencyKey, String customerPhone) {
        return processSimulatedPayment(
                orderNumber, idempotencyKey, null, normalizePhone(customerPhone), true);
    }

    private OrderDetail processSimulatedPayment(
            String orderNumber,
            String idempotencyKey,
            Long customerId,
            String normalizedPhone,
            boolean guestOnly) {
        if (!StringUtils.hasText(idempotencyKey) || idempotencyKey.length() > 120) {
            throw new OrderManagementException(HttpStatus.BAD_REQUEST,
                    "A valid payment idempotency key is required.");
        }
        Map<String, Object> row = lockOrder(orderNumber);
        if (guestOnly
                ? row.get("user_id") != null
                        || !phoneMatches(row.get("customer_phone"), normalizedPhone)
                : row.get("user_id") == null || number(row.get("user_id")) != customerId) {
            throw new OrderManagementException(HttpStatus.NOT_FOUND, "Order not found.");
        }
        FulfillmentStatus fulfillmentStatus = statusFrom(row);
        if (fulfillmentStatus == FulfillmentStatus.CANCELLED
                || fulfillmentStatus == FulfillmentStatus.CANCELLATION_REQUESTED
                || fulfillmentStatus == FulfillmentStatus.DELIVERED
                || fulfillmentStatus == FulfillmentStatus.SHIPPING) {
            throw new OrderManagementException(HttpStatus.CONFLICT,
                    "Payment is not available for this fulfillment status.");
        }
        if (!"SIMULATED_ONLINE".equalsIgnoreCase(String.valueOf(row.get("payment_method")))) {
            throw new OrderManagementException(HttpStatus.CONFLICT,
                    "This order does not use simulated online payment.");
        }
        List<Map<String, Object>> existing = jdbc.queryForList("""
                SELECT "order_payment_transaction_id"
                FROM "order_payment_transactions"
                WHERE "order_id" = ? AND "idempotency_key" = ?
                """, number(row.get("order_id")), idempotencyKey);
        if (!existing.isEmpty()) {
            return findDetail(orderNumber, customerId, guestOnly);
        }
        if ("PAID".equalsIgnoreCase(String.valueOf(row.get("payment_status")))
                || "PENDING".equalsIgnoreCase(String.valueOf(row.get("payment_status")))) {
            return findDetail(orderNumber, customerId, guestOnly);
        }
        if (!hasActiveReservations(number(row.get("order_id")))) {
            reacquireOrderReservations(number(row.get("order_id")));
        }
        String currency = verifiedOrderCurrency(number(row.get("order_id")));
        BigDecimal amount = (BigDecimal) row.get("total_amount");
        PaymentResult result = paymentGateway.charge(amount, currency, idempotencyKey);
        jdbc.update("""
                INSERT INTO "order_payment_transactions" (
                    "order_id", "idempotency_key", "provider_code", "payment_method",
                    "outcome_code", "amount", "currency_code", "provider_reference"
                ) VALUES (?, ?, ?, 'SIMULATED_ONLINE', ?, ?, ?, ?)
                """,
                number(row.get("order_id")), idempotencyKey, result.providerCode(),
                result.outcomeCode(), amount, currency, result.reference());
        String paymentStatus = switch (result.outcomeCode()) {
            case "SUCCEEDED" -> "PAID";
            case "FAILED" -> "FAILED";
            case "PENDING" -> "PENDING";
            case "CANCELLED" -> "CANCELLED";
            default -> throw new IllegalStateException("Unsupported payment provider outcome.");
        };
        jdbc.update("""
                UPDATE "orders"
                SET "payment_status" = ?, "payment_reference" = ?, "updated_at" = CURRENT_TIMESTAMP
                WHERE "order_id" = ?
                """, paymentStatus, result.reference(), number(row.get("order_id")));
        if ("FAILED".equals(paymentStatus) || "CANCELLED".equals(paymentStatus)) {
            releaseInventoryReservations(number(row.get("order_id")));
        }
        return findDetail(orderNumber, customerId, guestOnly);
    }

    @Transactional
    public OrderDetail createOrder(
            CheckoutRequest request, String idempotencyKey, AuthUserPrincipal customer) {
        if (customer == null || customer.userId() == null) {
            throw new OrderManagementException(HttpStatus.UNAUTHORIZED,
                    "Customer authentication is required.");
        }
        CheckoutOwner owner = new CheckoutOwner(
                Long.parseLong(customer.userId()),
                customer.email(),
                null,
                customer.userId(),
                customer.fullName(),
                customer.roleCode(),
                false);
        return createOrder(request, idempotencyKey, owner);
    }

    @Transactional
    public OrderDetail createGuestOrder(
            GuestCheckoutRequest request, String idempotencyKey, String guestCartTokenHash) {
        if (request == null || !StringUtils.hasText(request.customerEmail())
                || !request.customerEmail().trim().matches(
                        "(?i)^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new OrderManagementException(HttpStatus.BAD_REQUEST,
                    "A valid customer email is required for guest checkout.");
        }
        if (!StringUtils.hasText(guestCartTokenHash)
                || !guestCartTokenHash.matches("[0-9a-f]{64}")) {
            throw new OrderManagementException(HttpStatus.BAD_REQUEST,
                    "A valid guest cart token is required.");
        }
        CheckoutOwner owner = new CheckoutOwner(
                null,
                request.customerEmail().trim(),
                guestCartTokenHash,
                null,
                "Guest customer",
                "GUEST",
                true);
        return createOrder(request.toCheckoutRequest(), idempotencyKey, owner);
    }

    private OrderDetail createOrder(
            CheckoutRequest request, String idempotencyKey, CheckoutOwner owner) {
        if (request == null || request.items() == null || request.items().isEmpty()
                || !StringUtils.hasText(request.paymentMethod())
                || !StringUtils.hasText(idempotencyKey) || idempotencyKey.length() > 120) {
            throw new OrderManagementException(HttpStatus.BAD_REQUEST,
                    "Checkout details and a valid idempotency key are required.");
        }
        String paymentMethod = request.paymentMethod().trim().toUpperCase();
        if (!Set.of("COD", "SIMULATED_ONLINE").contains(paymentMethod)) {
            throw new OrderManagementException(HttpStatus.BAD_REQUEST,
                    "Choose COD or simulated online payment.");
        }
        String storedIdempotencyKey = owner.guest()
                ? guestIdempotencyKey(owner.guestCartTokenHash(), idempotencyKey)
                : idempotencyKey;
        ConnectionCallback<Object> acquireIdempotencyLock = connection -> {
            try (PreparedStatement statement = connection.prepareStatement(
                    "SELECT pg_advisory_xact_lock(hashtextextended(?, 0))")) {
                statement.setString(1, storedIdempotencyKey);
                statement.execute();
            }
            return null;
        };
        jdbc.execute(acquireIdempotencyLock);
        List<Map<String, Object>> existing = jdbc.queryForList("""
                SELECT "order_number", "user_id"
                FROM "orders" WHERE "idempotency_key" = ?
                """, storedIdempotencyKey);
        if (!existing.isEmpty()) {
            Map<String, Object> prior = existing.getFirst();
            if (owner.guest()
                    ? prior.get("user_id") != null
                    : prior.get("user_id") == null
                            || number(prior.get("user_id")) != owner.userId()) {
                throw new OrderManagementException(HttpStatus.CONFLICT,
                        "The checkout idempotency key is already associated with another order.");
            }
            return findDetail(
                    String.valueOf(prior.get("order_number")), owner.userId(), owner.guest());
        }

        Map<String, Integer> quantities = new TreeMap<>();
        for (CheckoutItem item : request.items()) {
            if (item == null || !StringUtils.hasText(item.offerId())
                    || item.quantity() < 1 || item.quantity() > 100) {
                throw new OrderManagementException(HttpStatus.BAD_REQUEST,
                        "Each checkout item needs a valid offer and quantity.");
            }
            String offerId = item.offerId().trim();
            if (!offerId.matches("\\d{1,20}")) {
                throw new OrderManagementException(HttpStatus.BAD_REQUEST,
                        "Each checkout item needs a valid offer and quantity.");
            }
            quantities.merge(offerId, item.quantity(), Integer::sum);
        }
        if (quantities.values().stream().anyMatch(quantity -> quantity > 100)) {
            throw new OrderManagementException(HttpStatus.BAD_REQUEST,
                    "The total quantity for an offer cannot exceed 100.");
        }
        BigDecimal guestCartId = owner.guest()
                ? lockAndVerifyGuestCart(owner.guestCartTokenHash(), quantities)
                : null;

        List<Map<String, Object>> offers = new ArrayList<>();
        String currencyCode = null;
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal baseSubtotal = BigDecimal.ZERO;
        for (Map.Entry<String, Integer> item : quantities.entrySet()) {
            List<Map<String, Object>> rows = jdbc.queryForList("""
                    SELECT po."offer_id", po."offer_code", po."condition_code", po."price",
                           po."currency_code", po."stock_quantity", po."reserved_quantity",
                           p."product_id", p."product_name", pt."type_code" AS "product_type"
                    FROM "product_offers" po
                    JOIN "products" p ON p."product_id" = po."product_id"
                    JOIN "product_types" pt ON pt."product_type_id" = p."product_type_id"
                    WHERE po."offer_id" = CAST(? AS NUMERIC)
                      AND po."offer_status" = 'ACTIVE'
                      AND p."product_status" = 'ACTIVE'
                    FOR UPDATE OF po
                    """, item.getKey());
            if (rows.isEmpty()) {
                throw new OrderManagementException(HttpStatus.CONFLICT,
                        "One or more selected offers are unavailable.");
            }
            Map<String, Object> offer = rows.getFirst();
            BigDecimal price = (BigDecimal) offer.get("price");
            String offerCurrency = String.valueOf(offer.get("currency_code")).trim();
            if (price == null || price.signum() < 0 || !offerCurrency.matches("[A-Z]{3}")) {
                throw new OrderManagementException(HttpStatus.CONFLICT,
                        "A selected offer has invalid stored price or currency information.");
            }
            boolean componentInventoryProduct = "PC".equals(offer.get("product_type"))
                    && "NEW".equals(offer.get("condition_code"));
            ProductUpgradeService.ResolvedConfiguration configuration =
                    componentInventoryProduct
                            ? checkoutConfiguration(
                                    owner.userId(), guestCartId, item.getKey(),
                                    (BigDecimal) offer.get("product_id"),
                                    String.valueOf(offer.get("condition_code")),
                                    offerCurrency, item.getValue())
                            : null;
            long available = componentInventoryProduct
                    ? componentInventory.sellableQuantity(
                            (BigDecimal) offer.get("product_id"), configuration.substitutions())
                    : number(offer.get("stock_quantity")) - number(offer.get("reserved_quantity"));
            if (configuration != null) {
                if (!configuration.available()) {
                    throw new OrderManagementException(HttpStatus.CONFLICT,
                            configuration.availabilityMessage());
                }
                for (ProductUpgradeService.BundleOffer selected : configuration.bundleOffers()) {
                    available = Math.min(available,
                            availableOfferQuantity(selected.offerId()) / selected.quantityPerPc());
                }
            }
            if (available < item.getValue()) {
                throw new OrderManagementException(HttpStatus.CONFLICT,
                        componentInventoryProduct
                                ? "There is not enough NEW component stock to assemble this PC."
                                : "There is not enough available stock for a selected offer.");
            }
            if (currencyCode != null && !currencyCode.equals(offerCurrency)) {
                throw new OrderManagementException(HttpStatus.CONFLICT,
                        "An order cannot contain offers in different currencies.");
            }
            currencyCode = offerCurrency;
            PromotionPricingService.Pricing pricing = promotionPricing.price(
                    (BigDecimal) offer.get("product_id"),
                    String.valueOf(offer.get("condition_code")),
                    price,
                    offerCurrency);
            BigDecimal componentDelta = configuration == null
                    ? BigDecimal.ZERO : configuration.componentPriceDifference();
            BigDecimal bundleSubtotal = configuration == null
                    ? BigDecimal.ZERO : configuration.bundleSubtotal();
            BigDecimal bundleDiscount = configuration == null
                    ? BigDecimal.ZERO : configuration.bundleDiscount();
            BigDecimal configuredBase = price.add(componentDelta).add(bundleSubtotal)
                    .max(BigDecimal.ZERO);
            BigDecimal configuredPayable = pricing.payablePrice().add(componentDelta)
                    .max(BigDecimal.ZERO).add(bundleSubtotal.subtract(bundleDiscount));
            baseSubtotal = baseSubtotal.add(
                    configuredBase.multiply(BigDecimal.valueOf(item.getValue())));
            subtotal = subtotal.add(
                    configuredPayable.multiply(BigDecimal.valueOf(item.getValue())));
            offer.put("checkout_quantity", item.getValue());
            offer.put("promotion_pricing", pricing);
            offer.put("configuration", configuration);
            offer.put("configured_base_unit_price", configuredBase);
            offer.put("configured_unit_price", configuredPayable);
            offers.add(offer);
        }

        String orderNumber = "ORD-" + UUID.randomUUID().toString().toUpperCase();
        long orderId = jdbc.queryForObject("""
                INSERT INTO "orders" (
                    "order_number", "user_id", "customer_name", "customer_email", "customer_phone",
                    "shipping_address", "shipping_region", "shipping_postal_code", "order_status",
                    "payment_method", "payment_status", "shipment_status", "subtotal", "shipping_fee",
                    "discount_amount", "total_amount", "idempotency_key"
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_CONFIRMATION', ?, ?, 'NOT_SHIPPED',
                          ?, 0, ?, ?, ?)
                RETURNING "order_id"
                """,
                Long.class,
                orderNumber,
                    owner.userId(),
                request.customerName().trim(),
                    owner.customerEmail(),
                request.customerPhone().trim(),
                request.shippingAddress().trim(),
                blankToNull(request.shippingRegion()),
                blankToNull(request.shippingPostalCode()),
                paymentMethod,
                "UNPAID",
                subtotal,
                baseSubtotal.subtract(subtotal),
                subtotal,
                storedIdempotencyKey);
        for (Map<String, Object> offer : offers) {
            int quantity = Math.toIntExact(number(offer.get("checkout_quantity")));
            BigDecimal baseUnitPrice = (BigDecimal) offer.get("configured_base_unit_price");
            PromotionPricingService.Pricing pricing =
                    (PromotionPricingService.Pricing) offer.get("promotion_pricing");
            BigDecimal unitPrice = (BigDecimal) offer.get("configured_unit_price");
            ProductUpgradeService.ResolvedConfiguration configuration =
                    (ProductUpgradeService.ResolvedConfiguration) offer.get("configuration");
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(quantity));
            List<Map<String, Object>> selectedGifts = selectedGiftsForCheckout(
                    owner.userId(), guestCartId,
                    (BigDecimal) offer.get("offer_id"), quantity, pricing);
            Long orderItemId = jdbc.queryForObject("""
                    INSERT INTO "order_items" (
                        "order_id", "offer_id", "product_name_snapshot", "offer_code_snapshot",
                        "condition_snapshot", "quantity", "unit_price", "line_total", "currency_code",
                        "base_unit_price_snapshot", "promotion_id_snapshot",
                        "campaign_name_snapshot", "promotion_display_copy_snapshot",
                        "promotion_discount_type_snapshot", "promotion_discount_value_snapshot",
                        "promotion_discount_amount_snapshot", "promotion_snapshot",
                        "configuration_snapshot"
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb),
                              CAST(? AS jsonb))
                    RETURNING "order_item_id"
                    """,
                    Long.class,
                    orderId,
                    number(offer.get("offer_id")),
                    offer.get("product_name"),
                    offer.get("offer_code"),
                    offer.get("condition_code"),
                    quantity,
                    unitPrice,
                    lineTotal,
                    currencyCode,
                    baseUnitPrice,
                    pricing.primaryPromotionId() == 0 ? null : pricing.primaryPromotionId(),
                    pricing.campaignNames(),
                    pricing.displayCopy(),
                    pricing.appliedPromotions().isEmpty()
                            ? null : pricing.appliedPromotions().getFirst().discountType(),
                    pricing.appliedPromotions().isEmpty()
                            ? null : pricing.appliedPromotions().getFirst().discountValue(),
                    pricing.discountAmount().multiply(BigDecimal.valueOf(quantity)),
                    promotionPricing.snapshot(pricing),
                    configuration == null ? "{}" : configuration.snapshot());
            BigDecimal itemKey = BigDecimal.valueOf(orderItemId);
            if ("PC".equals(offer.get("product_type"))
                    && "NEW".equals(offer.get("condition_code"))) {
                String snapshot = componentInventory.reserveForPcOrderItem(
                        (BigDecimal) offer.get("product_id"), itemKey, quantity,
                        configuration == null ? List.of() : configuration.substitutions());
                jdbc.update("""
                        UPDATE "order_items"
                        SET "inventory_components_snapshot" = CAST(? AS jsonb)
                        WHERE "order_item_id" = ?
                        """, snapshot, itemKey);
            } else {
                componentInventory.reserveOffer(
                        itemKey, (BigDecimal) offer.get("offer_id"), quantity);
            }
            if (configuration != null) {
                for (ProductUpgradeService.BundleOffer selected : configuration.bundleOffers()) {
                    componentInventory.reserveOffer(
                            itemKey, selected.offerId(),
                            Math.multiplyExact(selected.quantityPerPc(), quantity));
                }
            }
            createGiftOrderItems(orderId, itemKey, quantity, selectedGifts, pricing, currencyCode);
        }
        if (owner.guest()) {
            for (String offerId : quantities.keySet()) {
                jdbc.update("""
                        DELETE FROM "cart_items"
                        WHERE "cart_id" = ? AND "offer_id" = CAST(? AS NUMERIC)
                        """, guestCartId, offerId);
            }
        } else {
            for (String offerId : quantities.keySet()) {
                jdbc.update("""
                        DELETE FROM "cart_items" ci
                        USING "carts" c
                        WHERE ci."cart_id" = c."cart_id"
                          AND c."user_id" = ?
                          AND c."cart_status" = 'ACTIVE'
                          AND ci."offer_id" = CAST(? AS NUMERIC)
                        """, owner.userId(), offerId);
            }
        }
        insertHistory(orderId, null, FulfillmentStatus.PENDING_CONFIRMATION.name(),
                "ORDER_CREATED", owner.actorUserId(), owner.actorName(), owner.actorRole(), null);
        return findDetail(orderNumber, owner.userId(), owner.guest());
    }

    private ProductUpgradeService.ResolvedConfiguration checkoutConfiguration(
            Long userId,
            BigDecimal guestCartId,
            String offerId,
            BigDecimal productId,
            String condition,
            String currency,
            int quantity) {
        List<BigDecimal> cartItemIds = guestCartId != null
                ? jdbc.query("""
                SELECT ci."cart_item_id"
                FROM "cart_items" ci
                WHERE ci."cart_id" = ? AND ci."offer_id" = CAST(? AS NUMERIC)
                """, (rs, row) -> rs.getBigDecimal(1), guestCartId, offerId)
                : jdbc.query("""
                SELECT ci."cart_item_id"
                FROM "cart_items" ci
                JOIN "carts" c ON c."cart_id" = ci."cart_id"
                WHERE c."user_id" = ? AND c."cart_status" = 'ACTIVE'
                  AND ci."offer_id" = CAST(? AS NUMERIC)
                """, (rs, row) -> rs.getBigDecimal(1), userId, offerId);
        if (cartItemIds.isEmpty()) {
            return upgrades.resolve(productId, condition, currency, quantity, List.of(), List.of());
        }
        BigDecimal cartItemId = cartItemIds.getFirst();
        List<UpgradeSelection> selectedUpgrades = jdbc.query("""
                SELECT "upgrade_group_id"::text, "upgrade_option_id"::text, "quantity"
                FROM "cart_item_upgrade_selections"
                WHERE "cart_item_id" = ? ORDER BY "upgrade_group_id"
                """, (rs, row) -> new UpgradeSelection(
                rs.getString(1), rs.getString(2), rs.getInt(3)), cartItemId);
        Map<String, List<String>> bundleOffers = new java.util.LinkedHashMap<>();
        jdbc.query("""
                SELECT "bundle_id"::text, "offer_id"::text
                FROM "cart_item_bundle_selections"
                WHERE "cart_item_id" = ? ORDER BY "bundle_id", "offer_id"
                """, (org.springframework.jdbc.core.RowCallbackHandler) rs ->
                        bundleOffers.computeIfAbsent(
                                rs.getString(1), ignored -> new ArrayList<>()).add(rs.getString(2)),
                cartItemId);
        List<BundleSelection> selectedBundles = bundleOffers.entrySet().stream()
                .map(item -> new BundleSelection(item.getKey(), List.copyOf(item.getValue())))
                .toList();
        return upgrades.resolve(
                productId, condition, currency, quantity, selectedUpgrades, selectedBundles);
    }

    private long availableOfferQuantity(BigDecimal offerId) {
        List<Long> available = jdbc.query("""
                SELECT GREATEST(po."stock_quantity" - po."reserved_quantity", 0)::bigint
                FROM "product_offers" po
                JOIN "products" p ON p."product_id" = po."product_id"
                WHERE po."offer_id" = ? AND po."offer_status" = 'ACTIVE'
                  AND p."product_status" = 'ACTIVE'
                """, (rs, row) -> rs.getLong(1), offerId);
        return available.isEmpty() ? 0 : available.getFirst();
    }

    @Transactional
    public OrderDetail decideCancellation(
            String orderNumber, CancellationDecisionRequest request, AuthUserPrincipal actor) {
        if (request == null) {
            throw new OrderManagementException(HttpStatus.BAD_REQUEST, "A cancellation decision is required.");
        }
        Map<String, Object> row = lockOrder(orderNumber);
        FulfillmentStatus current = statusFrom(row);
        if (current != FulfillmentStatus.CANCELLATION_REQUESTED) {
            throw new OrderManagementException(
                    HttpStatus.CONFLICT, "This order has no pending cancellation request.");
        }
        long orderId = number(row.get("order_id"));
        if (request.approve()) {
            releaseInventoryReservations(orderId);
            issueSimulatedRefundIfPaid(row);
            updateStatusRow(orderId, FulfillmentStatus.CANCELLED);
            insertHistory(row, current, FulfillmentStatus.CANCELLED,
                    "ADMIN_CANCELLATION_APPROVED", actor, request.note());
        } else {
            List<Map<String, Object>> priorStatuses = jdbc.queryForList("""
                    SELECT "previous_status"
                    FROM "order_status_history"
                    WHERE "order_id" = ? AND "action_code" = 'CUSTOMER_CANCELLATION_REQUESTED'
                    ORDER BY "created_at" DESC, "order_status_history_id" DESC
                    LIMIT 1
                    """, orderId);
            if (priorStatuses.isEmpty() || priorStatuses.getFirst().get("previous_status") == null) {
                throw new OrderManagementException(HttpStatus.CONFLICT,
                        "The prior status for this cancellation request is unavailable.");
            }
            FulfillmentStatus restored = parseStatus(
                    String.valueOf(priorStatuses.getFirst().get("previous_status")));
            updateStatusRow(orderId, restored);
            insertHistory(row, current, restored,
                    "ADMIN_CANCELLATION_REJECTED", actor, request.note());
        }
        return findDetail(orderNumber, null);
    }

    @Transactional
    public OrderDetail retryFailedRefund(
            String orderNumber, String idempotencyKey, String note, AuthUserPrincipal actor) {
        if (!StringUtils.hasText(idempotencyKey) || idempotencyKey.length() > 120) {
            throw new OrderManagementException(HttpStatus.BAD_REQUEST,
                    "A valid refund idempotency key is required.");
        }
        Map<String, Object> row = lockOrder(orderNumber);
        long orderId = number(row.get("order_id"));
        List<Map<String, Object>> existingAttempt = jdbc.queryForList("""
                SELECT "refund_status"
                FROM "order_refund_transactions"
                WHERE "order_id" = ? AND "idempotency_key" = ?
                """, orderId, idempotencyKey);
        if (!existingAttempt.isEmpty()) {
            return findDetail(orderNumber, null);
        }

        List<Map<String, Object>> priorAttempts = jdbc.queryForList("""
                SELECT "refund_status", "amount", "currency_code",
                       EXISTS (
                           SELECT 1 FROM "order_refund_transactions"
                           WHERE "order_id" = ? AND "refund_status" = 'SUCCEEDED'
                       ) AS "has_succeeded",
                       EXISTS (
                           SELECT 1 FROM "order_refund_transactions"
                           WHERE "order_id" = ? AND "refund_status" = 'PENDING'
                       ) AS "has_pending"
                FROM "order_refund_transactions"
                WHERE "order_id" = ?
                ORDER BY "created_at" DESC, "order_refund_transaction_id" DESC
                LIMIT 1
                """, orderId, orderId, orderId);
        if (priorAttempts.isEmpty()) {
            throw new OrderManagementException(HttpStatus.CONFLICT,
                    "There is no failed refund to retry.");
        }
        Map<String, Object> prior = priorAttempts.getFirst();
        String priorStatus = String.valueOf(prior.get("refund_status"));
        if (Boolean.TRUE.equals(prior.get("has_succeeded"))
                || Boolean.TRUE.equals(prior.get("has_pending"))
                || (!"FAILED".equals(priorStatus) && !"CANCELLED".equals(priorStatus))) {
            throw new OrderManagementException(HttpStatus.CONFLICT,
                    "Only a failed refund can be retried; pending or successful refunds cannot be repeated.");
        }

        String currencyCode = String.valueOf(prior.get("currency_code")).trim();
        PaymentResult refund = paymentGateway.refund(
                (BigDecimal) prior.get("amount"), currencyCode, idempotencyKey);
        jdbc.update("""
                INSERT INTO "order_refund_transactions" (
                    "order_id", "idempotency_key", "provider_code", "refund_status",
                    "amount", "currency_code", "provider_reference"
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                orderId, idempotencyKey, refund.providerCode(), refund.outcomeCode(),
                prior.get("amount"), currencyCode, refund.reference());
        jdbc.update("""
                UPDATE "orders" SET "payment_status" = ?, "updated_at" = CURRENT_TIMESTAMP
                WHERE "order_id" = ?
                """, refundPaymentStatus(refund.outcomeCode()), orderId);
        FulfillmentStatus current = statusFrom(row);
        insertHistory(row, current, current, "ADMIN_REFUND_RETRIED", actor, note);
        return findDetail(orderNumber, null);
    }

    @Transactional
    public OrderDetail updateShipping(
            String orderNumber, ShippingUpdateRequest request, AuthUserPrincipal actor) {
        if (request == null) {
            throw new OrderManagementException(HttpStatus.BAD_REQUEST, "Shipping details are required.");
        }
        Map<String, Object> row = lockOrder(orderNumber);
        FulfillmentStatus current = statusFrom(row);
        if (current != FulfillmentStatus.READY_TO_SHIP
                && current != FulfillmentStatus.SHIPPING
                && current != FulfillmentStatus.DELIVERED) {
            throw new OrderManagementException(HttpStatus.CONFLICT,
                    "Shipping details can only be edited when an order is ready to ship or later.");
        }
        jdbc.update("""
                UPDATE "orders"
                SET "shipping_carrier" = ?, "tracking_number" = ?, "updated_at" = CURRENT_TIMESTAMP
                WHERE "order_id" = ?
                """, blankToNull(request.carrier()), blankToNull(request.trackingNumber()),
                number(row.get("order_id")));
        insertHistory(row, current, current, "ADMIN_SHIPPING_DETAILS_UPDATED", actor, request.note());
        return findDetail(orderNumber, null);
    }

    private OrderDetail findDetail(String orderNumber, Long customerId) {
        return findDetail(orderNumber, customerId, false);
    }

    private OrderDetail findDetail(String orderNumber, Long customerId, boolean guestOnly) {
        String sql = """
                SELECT "order_id", "order_number", "user_id", "customer_name", "customer_email",
                       "customer_phone", "shipping_address", "shipping_region", "shipping_postal_code",
                       "order_status", "payment_method", "payment_status", "shipment_status",
                       "shipping_carrier", "tracking_number", "subtotal", "shipping_fee",
                       "discount_amount",
                       (SELECT CASE WHEN COUNT(DISTINCT oi."currency_code") = 1
                                    THEN MIN(oi."currency_code") END
                        FROM "order_items" oi
                        WHERE oi."order_id" = "orders"."order_id") AS "currency_code",
                       (SELECT COUNT(*) > 0 AND COUNT(DISTINCT oi."currency_code") = 1
                        FROM "order_items" oi
                        WHERE oi."order_id" = "orders"."order_id") AS "show_financials",
                       (
                           COALESCE((
                               SELECT "refund_status"
                               FROM "order_refund_transactions" r
                               WHERE r."order_id" = "orders"."order_id"
                               ORDER BY r."created_at" DESC, r."order_refund_transaction_id" DESC
                               LIMIT 1
                           ), '') IN ('FAILED', 'CANCELLED')
                           AND NOT EXISTS (
                               SELECT 1 FROM "order_refund_transactions" r
                               WHERE r."order_id" = "orders"."order_id"
                                 AND r."refund_status" IN ('PENDING', 'SUCCEEDED')
                           )
                       ) AS "refund_retry_available",
                       "total_amount", "placed_at"::text AS "placed_at_text",
                       "updated_at"::text AS "updated_at_text"
                FROM "orders" WHERE "order_number" = ?
                """ + (customerId != null
                        ? " AND \"user_id\" = ?"
                        : guestOnly ? " AND \"user_id\" IS NULL" : "");
        List<Map<String, Object>> rows = customerId != null
                ? jdbc.queryForList(sql, orderNumber, customerId)
                : jdbc.queryForList(sql, orderNumber);
        if (rows.isEmpty()) {
            throw new OrderManagementException(HttpStatus.NOT_FOUND, "Order not found.");
        }
        Map<String, Object> row = rows.getFirst();
        long orderId = number(row.get("order_id"));
        List<OrderItem> items = jdbc.query("""
                SELECT oi."product_name_snapshot", oi."condition_snapshot",
                       oi."quantity", oi."currency_code", oi."unit_price", oi."line_total"
                FROM "order_items" oi
                WHERE oi."order_id" = ?
                ORDER BY oi."order_item_id"
                """, (rs, index) -> new OrderItem(
                rs.getString("product_name_snapshot"),
                rs.getString("condition_snapshot"),
                rs.getInt("quantity"),
                rs.getString("currency_code"),
                rs.getBigDecimal("unit_price"),
                rs.getBigDecimal("line_total")), orderId);
        List<StatusHistory> history = jdbc.query("""
                SELECT "previous_status", "new_status", "action_code", "actor_name",
                       "actor_role_code", "note", "created_at"::text AS "created_at_text"
                FROM "order_status_history"
                WHERE "order_id" = ?
                ORDER BY "created_at", "order_status_history_id"
                """, (rs, index) -> new StatusHistory(
                rs.getString("previous_status"),
                rs.getString("new_status"),
                rs.getString("action_code"),
                rs.getString("actor_name"),
                rs.getString("actor_role_code"),
                rs.getString("note"),
                rs.getString("created_at_text")), orderId);
        OrderSummary summary = mapSummary(row);
        return new OrderDetail(
                summary,
                (String) row.get("shipping_address"),
                (String) row.get("shipping_region"),
                (String) row.get("shipping_postal_code"),
                (BigDecimal) row.get("subtotal"),
                (BigDecimal) row.get("shipping_fee"),
                (BigDecimal) row.get("discount_amount"),
                items,
                history,
                Boolean.TRUE.equals(row.get("refund_retry_available")));
    }

    private Map<String, Object> lockOrder(String orderNumber) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT * FROM "orders" WHERE "order_number" = ? FOR UPDATE
                """, orderNumber);
        if (rows.isEmpty()) {
            throw new OrderManagementException(HttpStatus.NOT_FOUND, "Order not found.");
        }
        return rows.getFirst();
    }

    private void updateStatusRow(long orderId, FulfillmentStatus status) {
        String shipmentStatus = switch (status) {
            case SHIPPING -> "IN_TRANSIT";
            case DELIVERED -> "DELIVERED";
            case CANCELLED -> "CANCELLED";
            default -> "NOT_SHIPPED";
        };
        jdbc.update("""
                UPDATE "orders"
                SET "order_status" = ?, "shipment_status" = ?, "updated_at" = CURRENT_TIMESTAMP
                WHERE "order_id" = ?
                """, status.name(), shipmentStatus, orderId);
    }

    private void insertHistory(
            Map<String, Object> order,
            FulfillmentStatus previous,
            FulfillmentStatus next,
            String action,
            AuthUserPrincipal actor,
            String note) {
        insertHistory(number(order.get("order_id")), previous.name(), next.name(), action,
                actor.userId(), actor.fullName(), actor.roleCode(), note);
    }

    private void insertHistory(
            long orderId,
            String previousStatus,
            String nextStatus,
            String action,
            String actorUserId,
            String actorName,
            String actorRole,
            String note) {
        jdbc.update("""
                INSERT INTO "order_status_history" (
                    "order_id", "previous_status", "new_status", "action_code",
                    "actor_user_id", "actor_name", "actor_role_code", "note"
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                orderId,
                previousStatus,
                nextStatus,
                action,
                actorUserId == null ? null : Long.parseLong(actorUserId),
                actorName,
                actorRole,
                blankToNull(note));
    }

    private BigDecimal lockAndVerifyGuestCart(
            String guestCartTokenHash, Map<String, Integer> requestedQuantities) {
        List<BigDecimal> cartIds = jdbc.query("""
                SELECT "cart_id"
                FROM "carts"
                WHERE "guest_token" = ? AND "cart_status" = 'ACTIVE'
                FOR UPDATE
                """, (rs, row) -> rs.getBigDecimal(1), guestCartTokenHash);
        if (cartIds.isEmpty()) {
            throw new OrderManagementException(HttpStatus.CONFLICT,
                    "The guest cart is empty or no longer available.");
        }
        BigDecimal cartId = cartIds.getFirst();
        Map<String, Integer> cartQuantities = new TreeMap<>();
        jdbc.query("""
                SELECT "offer_id"::text, "quantity"
                FROM "cart_items"
                WHERE "cart_id" = ?
                ORDER BY "offer_id"
                FOR UPDATE
                """, (org.springframework.jdbc.core.RowCallbackHandler) rs ->
                        cartQuantities.put(rs.getString(1), rs.getInt(2)),
                cartId);
        if (cartQuantities.isEmpty() || !cartQuantities.equals(requestedQuantities)) {
            throw new OrderManagementException(HttpStatus.CONFLICT,
                    "Checkout items must exactly match the current guest cart.");
        }
        return cartId;
    }

    private static String guestIdempotencyKey(String guestCartTokenHash, String requestKey) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(
                    (guestCartTokenHash + "\u0000" + requestKey)
                            .getBytes(StandardCharsets.UTF_8));
            return "GUEST:" + HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is required for guest checkout idempotency.", exception);
        }
    }

    private static String normalizePhone(String phone) {
        return phone == null ? "" : phone.replaceAll("[^0-9]", "");
    }

    private static boolean phoneMatches(Object storedPhone, String normalizedPhone) {
        return storedPhone != null && !normalizedPhone.isEmpty()
                && normalizePhone(String.valueOf(storedPhone)).equals(normalizedPhone);
    }

    private static OrderManagementException guestOrderNotFound() {
        return new OrderManagementException(HttpStatus.NOT_FOUND, "Order not found.");
    }

    private void releaseInventoryReservations(long orderId) {
        List<Map<String, Object>> reservations = jdbc.queryForList("""
                SELECT r."order_inventory_reservation_id", r."offer_id", r."quantity"
                FROM "order_inventory_reservations" r
                JOIN "order_items" oi ON oi."order_item_id" = r."order_item_id"
                WHERE oi."order_id" = ? AND r."reservation_status" = 'ACTIVE'
                FOR UPDATE OF r
                """, orderId);
        for (Map<String, Object> reservation : reservations) {
            int changed = jdbc.update("""
                    UPDATE "product_offers"
                    SET "reserved_quantity" = "reserved_quantity" - ?, "updated_at" = CURRENT_TIMESTAMP
                    WHERE "offer_id" = ? AND "reserved_quantity" >= ?
                    """,
                    number(reservation.get("quantity")),
                    number(reservation.get("offer_id")),
                    number(reservation.get("quantity")));
            if (changed != 1) {
                throw new OrderManagementException(HttpStatus.CONFLICT,
                        "The inventory reservation is inconsistent; cancellation was not applied.");
            }
            jdbc.update("""
                    UPDATE "order_inventory_reservations"
                    SET "reservation_status" = 'RELEASED', "updated_at" = CURRENT_TIMESTAMP
                    WHERE "order_inventory_reservation_id" = ?
                    """, number(reservation.get("order_inventory_reservation_id")));
        }
    }

    private boolean hasActiveReservations(long orderId) {
        Boolean active = jdbc.queryForObject("""
                        SELECT EXISTS (
                            SELECT 1
                            FROM "order_inventory_reservations" r
                            JOIN "order_items" oi ON oi."order_item_id" = r."order_item_id"
                            WHERE oi."order_id" = ? AND r."reservation_status" = 'ACTIVE'
                        )
                        """, Boolean.class, orderId);
        return Boolean.TRUE.equals(active);
    }

    private void reacquireOrderReservations(long orderId) {
        List<Map<String, Object>> items = jdbc.queryForList("""
                        SELECT oi."order_item_id", oi."offer_id", oi."quantity",
                               oi."inventory_components_snapshot"::text AS "components_snapshot"
                        FROM "order_items" oi
                        WHERE oi."order_id" = ?
                        ORDER BY oi."order_item_id"
                        FOR UPDATE OF oi
                        """, orderId);
        if (items.isEmpty()) {
                    throw new OrderManagementException(
                            HttpStatus.CONFLICT, "The order has no inventory lines to reserve.");
        }
        for (Map<String, Object> item : items) {
                    BigDecimal orderItemId = (BigDecimal) item.get("order_item_id");
                    String snapshot = (String) item.get("components_snapshot");
                    if (snapshot != null) {
                        componentInventory.reserveFromSnapshot(snapshot, orderItemId);
                    } else {
                        componentInventory.reserveOffer(
                                orderItemId,
                                (BigDecimal) item.get("offer_id"),
                                Math.toIntExact(number(item.get("quantity"))));
                    }
        }
    }

    private List<Map<String, Object>> selectedGiftsForCheckout(
                        Long userId,
                        BigDecimal guestCartId,
                        BigDecimal offerId,
                        int orderQuantity,
                        PromotionPricingService.Pricing pricing) {
                    List<Map<String, Object>> selections = guestCartId != null
                            ? jdbc.queryForList("""
                            SELECT cig."promotion_id", cig."gift_offer_id", cig."quantity",
                                   ci."quantity" AS "cart_quantity"
                            FROM "cart_items" ci
                            JOIN "cart_item_gifts" cig ON cig."cart_item_id" = ci."cart_item_id"
                            WHERE ci."cart_id" = ? AND ci."offer_id" = ?
                            ORDER BY cig."promotion_id", cig."gift_offer_id"
                            """, guestCartId, offerId)
                            : jdbc.queryForList("""
                            SELECT cig."promotion_id", cig."gift_offer_id", cig."quantity",
                                   ci."quantity" AS "cart_quantity"
                            FROM "carts" c
                            JOIN "cart_items" ci ON ci."cart_id" = c."cart_id"
                            JOIN "cart_item_gifts" cig ON cig."cart_item_id" = ci."cart_item_id"
                            WHERE c."user_id" = ? AND c."cart_status" = 'ACTIVE'
                              AND ci."offer_id" = ?
                            ORDER BY cig."promotion_id", cig."gift_offer_id"
                            """, userId, offerId);
                    Map<String, PromotionPricingService.GiftOffer> eligible = new java.util.HashMap<>();
                    for (PromotionPricingService.GiftOffer gift : pricing.availableGifts()) {
                        eligible.put(gift.promotionId() + ":" + gift.offerId(), gift);
                    }
                    Set<String> selected = new java.util.HashSet<>();
                    for (Map<String, Object> selection : selections) {
                        String key = number(selection.get("promotion_id")) + ":"
                                + number(selection.get("gift_offer_id"));
                        PromotionPricingService.GiftOffer gift = eligible.get(key);
                        int giftUnitQuantity = Math.toIntExact(number(selection.get("quantity")));
                        int cartQuantity = Math.toIntExact(number(selection.get("cart_quantity")));
                        if (gift == null || !gift.active() || giftUnitQuantity != gift.quantity()
                                || cartQuantity != orderQuantity
                                || gift.availableQuantity() < giftUnitQuantity * orderQuantity
                                || !selected.add(key)) {
                            throw new OrderManagementException(HttpStatus.CONFLICT,
                                    "A selected gift is no longer available for this order.");
                        }
                    }
                    for (PromotionPricingService.GiftOffer gift : pricing.availableGifts()) {
                        if (gift.selectionRequired()
                                && !selected.contains(gift.promotionId() + ":" + gift.offerId())) {
                            throw new OrderManagementException(HttpStatus.CONFLICT,
                                    "Select every required gift before checkout.");
                        }
                    }
                    if (!selections.isEmpty() && selections.stream().anyMatch(selection ->
                            !eligible.containsKey(number(selection.get("promotion_id")) + ":"
                                    + number(selection.get("gift_offer_id"))))) {
                        throw new OrderManagementException(HttpStatus.CONFLICT,
                                "A selected gift no longer belongs to an active promotion.");
                    }
                    return selections;
        }

        private void createGiftOrderItems(
                        long orderId,
                        BigDecimal parentOrderItemId,
                        int parentQuantity,
                        List<Map<String, Object>> selectedGifts,
                        PromotionPricingService.Pricing pricing,
                        String currencyCode) {
                    Map<Long, PromotionPricingService.AppliedPromotion> promotions = new java.util.HashMap<>();
                    for (PromotionPricingService.AppliedPromotion promotion : pricing.appliedPromotions()) {
                        promotions.put(promotion.promotionId(), promotion);
                    }
                    for (Map<String, Object> selection : selectedGifts) {
                        long promotionId = number(selection.get("promotion_id"));
                        BigDecimal giftOfferId = (BigDecimal) selection.get("gift_offer_id");
                        int unitQuantity = Math.toIntExact(number(selection.get("quantity")));
                        int quantity = Math.multiplyExact(unitQuantity, parentQuantity);
                        PromotionPricingService.GiftOffer gift =
                                pricing.availableGifts().stream()
                                        .filter(item -> item.promotionId() == promotionId
                                                && item.offerId().equals(giftOfferId.toPlainString()))
                                        .findFirst()
                                        .orElseThrow(() -> new OrderManagementException(
                                                HttpStatus.CONFLICT, "A selected gift is no longer eligible."));
                        PromotionPricingService.AppliedPromotion promotion = promotions.get(promotionId);
                        if (promotion == null) {
                            throw new OrderManagementException(
                                    HttpStatus.CONFLICT, "A selected gift promotion is no longer active.");
                        }
                        Map<String, Object> giftOffer;
                        try {
                            giftOffer = jdbc.queryForMap("""
                                    SELECT po."offer_code", po."condition_code", po."currency_code",
                                           p."product_name"
                                    FROM "product_offers" po
                                    JOIN "products" p ON p."product_id" = po."product_id"
                                    WHERE po."offer_id" = ? AND po."condition_code" = 'NEW'
                                      AND po."offer_status" = 'ACTIVE'
                                      AND p."product_status" = 'ACTIVE'
                                    FOR UPDATE OF po
                                    """, giftOfferId);
                        } catch (org.springframework.dao.EmptyResultDataAccessException exception) {
                            throw new OrderManagementException(
                                    HttpStatus.CONFLICT, "A selected gift is no longer active.");
                        }
                        if (!currencyCode.equals(String.valueOf(giftOffer.get("currency_code")).trim())) {
                            throw new OrderManagementException(
                                    HttpStatus.CONFLICT, "A selected gift uses a different currency.");
                        }
                        Long giftItemId = jdbc.queryForObject("""
                                INSERT INTO "order_items" (
                                    "order_id", "offer_id", "product_name_snapshot", "offer_code_snapshot",
                                    "condition_snapshot", "quantity", "unit_price", "line_total",
                                    "currency_code", "base_unit_price_snapshot", "promotion_id_snapshot",
                                    "campaign_name_snapshot", "promotion_display_copy_snapshot",
                                    "promotion_discount_amount_snapshot", "promotion_snapshot",
                                    "is_gift_snapshot", "gift_parent_order_item_id"
                                ) VALUES (?, ?, ?, ?, 'NEW', ?, 0, 0, ?, 0, ?, ?, ?, 0,
                                          CAST(? AS jsonb), TRUE, ?)
                                RETURNING "order_item_id"
                                """, Long.class,
                                orderId, giftOfferId, gift.productName(), giftOffer.get("offer_code"),
                                quantity, currencyCode, promotionId, promotion.campaignName(),
                                promotion.displayCopy(),
                                promotionPricing.giftSnapshot(gift, promotion, parentQuantity),
                                parentOrderItemId);
                        componentInventory.reserveGiftOffer(
                                BigDecimal.valueOf(giftItemId), giftOfferId, quantity);
                    }
        }

    private void consumeInventoryReservations(long orderId) {
        List<Map<String, Object>> reservations = jdbc.queryForList("""
                SELECT r."order_inventory_reservation_id", r."offer_id", r."quantity"
                FROM "order_inventory_reservations" r
                JOIN "order_items" oi ON oi."order_item_id" = r."order_item_id"
                WHERE oi."order_id" = ? AND r."reservation_status" = 'ACTIVE'
                FOR UPDATE OF r
                """, orderId);
        for (Map<String, Object> reservation : reservations) {
            int quantity = Math.toIntExact(number(reservation.get("quantity")));
            int changed = jdbc.update("""
                    UPDATE "product_offers"
                    SET "stock_quantity" = "stock_quantity" - ?,
                        "reserved_quantity" = "reserved_quantity" - ?,
                        "updated_at" = CURRENT_TIMESTAMP
                    WHERE "offer_id" = ? AND "stock_quantity" >= ? AND "reserved_quantity" >= ?
                    """,
                    quantity, quantity, number(reservation.get("offer_id")), quantity, quantity);
            if (changed != 1) {
                throw new OrderManagementException(HttpStatus.CONFLICT,
                        "The inventory reservation is inconsistent; shipping was not applied.");
            }
            jdbc.update("""
                    UPDATE "order_inventory_reservations"
                    SET "reservation_status" = 'CONSUMED', "updated_at" = CURRENT_TIMESTAMP
                    WHERE "order_inventory_reservation_id" = ?
                    """, number(reservation.get("order_inventory_reservation_id")));
        }
    }

    private void issueSimulatedRefundIfPaid(Map<String, Object> order) {
        if (!"PAID".equalsIgnoreCase(String.valueOf(order.get("payment_status")))) {
            return;
        }
        String currencyCode = verifiedOrderCurrency(number(order.get("order_id")));
        PaymentResult refund = paymentGateway.refund(
                (BigDecimal) order.get("total_amount"), currencyCode,
                "cancellation-refund-" + order.get("order_number"));
        jdbc.update("""
                INSERT INTO "order_refund_transactions" (
                    "order_id", "idempotency_key", "provider_code", "refund_status",
                    "amount", "currency_code", "provider_reference"
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT ("order_id", "idempotency_key") DO NOTHING
                """,
                number(order.get("order_id")),
                "cancellation-refund-" + order.get("order_number"),
                refund.providerCode(),
                refund.outcomeCode(),
                order.get("total_amount"),
                currencyCode,
                refund.reference());
        jdbc.update("""
                UPDATE "orders" SET "payment_status" = ?, "updated_at" = CURRENT_TIMESTAMP
                WHERE "order_id" = ?
                """,
                refundPaymentStatus(refund.outcomeCode()),
                number(order.get("order_id")));
    }

    private String refundPaymentStatus(String outcomeCode) {
        return switch (outcomeCode) {
            case "SUCCEEDED" -> "REFUNDED";
            case "PENDING" -> "REFUND_PENDING";
            case "FAILED", "CANCELLED" -> "REFUND_FAILED";
            default -> throw new IllegalStateException("Unsupported simulated refund outcome.");
        };
    }

    private String verifiedOrderCurrency(long orderId) {
        List<Map<String, Object>> currencies = jdbc.queryForList("""
                SELECT COUNT(DISTINCT "currency_code") AS "currency_count",
                       MIN("currency_code") AS "currency_code"
                FROM "order_items" oi
                WHERE "order_id" = ?
                """, orderId);
        Map<String, Object> currency = currencies.getFirst();
        if (number(currency.get("currency_count")) != 1
                || currency.get("currency_code") == null
                || !String.valueOf(currency.get("currency_code")).matches("[A-Z]{3}")) {
            throw new OrderManagementException(HttpStatus.CONFLICT,
                    "Payment cannot be simulated because the order currency is invalid.");
        }
        return String.valueOf(currency.get("currency_code"));
    }

    private OrderSummary mapSummary(java.sql.ResultSet result, int rowNumber)
            throws java.sql.SQLException {
        return new OrderSummary(
                result.getString("order_number"),
                result.getString("customer_name"),
                result.getString("customer_email"),
                stringOrEmpty(result.getString("customer_phone")),
                parseStatus(result.getString("order_status")),
                stringOrEmpty(result.getString("payment_method")),
                stringOrEmpty(result.getString("payment_status")),
                stringOrEmpty(result.getString("shipment_status")),
                stringOrEmpty(result.getString("shipping_carrier")),
                stringOrEmpty(result.getString("tracking_number")),
                result.getString("currency_code"),
                result.getBoolean("show_financials"),
                result.getBigDecimal("total_amount"),
                result.getString("placed_at_text"),
                result.getString("updated_at_text"));
    }

    private OrderSummary mapSummary(Map<String, Object> row) {
        return new OrderSummary(
                (String) row.get("order_number"),
                (String) row.get("customer_name"),
                (String) row.get("customer_email"),
                stringOrEmpty(row.get("customer_phone")),
                statusFrom(row),
                stringOrEmpty(row.get("payment_method")),
                stringOrEmpty(row.get("payment_status")),
                stringOrEmpty(row.get("shipment_status")),
                stringOrEmpty(row.get("shipping_carrier")),
                stringOrEmpty(row.get("tracking_number")),
                (String) row.get("currency_code"),
                Boolean.TRUE.equals(row.get("show_financials")),
                (BigDecimal) row.get("total_amount"),
                String.valueOf(row.getOrDefault("placed_at_text", "")),
                String.valueOf(row.getOrDefault("updated_at_text", "")));
    }

    private FulfillmentStatus statusFrom(Map<String, Object> row) {
        return parseStatus(String.valueOf(row.get("order_status")));
    }

    private boolean isAllowedTransition(FulfillmentStatus previous, FulfillmentStatus next) {
        if (previous == FulfillmentStatus.SHIPPING) {
            return next == FulfillmentStatus.DELIVERED;
        }
        if (!PRE_SHIPPING_STATUSES.contains(previous) || next == FulfillmentStatus.DELIVERED) {
            return false;
        }
        return PRE_SHIPPING_STATUSES.contains(next) || next == FulfillmentStatus.SHIPPING;
    }

    private FulfillmentStatus parseStatus(String value) {
        if ("PENDING".equalsIgnoreCase(value)) {
            return FulfillmentStatus.PENDING_CONFIRMATION;
        }
        try {
            return FulfillmentStatus.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new OrderManagementException(HttpStatus.CONFLICT,
                    "The order has an unsupported fulfillment status.");
        }
    }

    private long number(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(String.valueOf(value));
    }

    private String stringOrEmpty(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private record CheckoutOwner(
            Long userId,
            String customerEmail,
            String guestCartTokenHash,
            String actorUserId,
            String actorName,
            String actorRole,
            boolean guest) {}
}
