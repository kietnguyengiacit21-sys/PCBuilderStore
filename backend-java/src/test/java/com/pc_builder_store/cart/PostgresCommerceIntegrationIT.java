package com.pc_builder_store.cart;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

import com.pc_builder_store.auth.AuthUserPrincipal;
import com.pc_builder_store.catalog.dto.ProductUpgradeDtos.BundleSelection;
import com.pc_builder_store.catalog.dto.ProductUpgradeDtos.SaveBundle;
import com.pc_builder_store.catalog.dto.ProductUpgradeDtos.SaveBundleItem;
import com.pc_builder_store.catalog.dto.ProductUpgradeDtos.SaveConfiguration;
import com.pc_builder_store.catalog.dto.ProductUpgradeDtos.SaveRelatedProduct;
import com.pc_builder_store.catalog.dto.ProductUpgradeDtos.SaveUpgradeGroup;
import com.pc_builder_store.catalog.dto.ProductUpgradeDtos.SaveUpgradeOption;
import com.pc_builder_store.catalog.dto.ProductUpgradeDtos.UpgradeSelection;
import com.pc_builder_store.catalog.service.ProductUpgradeService;
import com.pc_builder_store.inventory.ComponentInventoryService;
import com.pc_builder_store.orders.OrderDtos;
import com.pc_builder_store.orders.OrderManagementException;
import com.pc_builder_store.orders.OrderManagementService;
import com.pc_builder_store.orders.PaymentGateway;
import com.pc_builder_store.promotions.PromotionDtos.GiftSelection;
import jakarta.servlet.http.Cookie;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@ActiveProfiles("postgres-it")
class PostgresCommerceIntegrationIT {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private CartService cartService;

    @Autowired
    private CartController cartController;

    @Autowired
    private GuestCartTokenService guestTokens;

    @Autowired
    private ComponentInventoryService componentInventory;

    @Autowired
    private OrderManagementService orderService;

    @Autowired
    private ProductUpgradeService upgradeService;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PaymentGateway paymentGateway;

    private String prefix;
    private final List<String> createdTypeCodes = new ArrayList<>();
    private final List<String> createdRoleCodes = new ArrayList<>();
    private final List<String> createdGuestTokens = new ArrayList<>();
    private BigDecimal brandId;
    private BigDecimal categoryId;
    private BigDecimal pcTypeId;
    private BigDecimal cpuTypeId;
    private BigDecimal ramTypeId;
    private BigDecimal accessoryTypeId;
    private ProductFixture products;
    private UserFixture customer;
    private UserFixture secondCustomer;
    private UserFixture admin;
    private String guestToken;

    @BeforeEach
    void setUp() {
        assertEquals("true", System.getenv("TEST_DATABASE_DISPOSABLE"),
                "PostgreSQL integration tests require TEST_DATABASE_DISPOSABLE=true.");
        String database = jdbc.queryForObject("SELECT current_database()", String.class);
        assertTrue(database.endsWith("_it") || database.endsWith("_test"),
                "PostgreSQL integration tests must use an isolated _it or _test database.");

        prefix = "COM-IT-" + UUID.randomUUID().toString().replace("-", "") + "-";
        createdTypeCodes.clear();
        createdRoleCodes.clear();
        createdGuestTokens.clear();
        guestToken = guestTokens.createToken();
        createdGuestTokens.add(guestToken);

        brandId = jdbc.queryForObject("""
                INSERT INTO "brands" ("brand_name", "is_active")
                VALUES (?, TRUE)
                RETURNING "brand_id"
                """, BigDecimal.class, prefix + "Brand");
        categoryId = jdbc.queryForObject("""
                INSERT INTO "categories" ("category_code", "category_name", "is_active")
                VALUES (?, ?, TRUE)
                RETURNING "category_id"
                """, BigDecimal.class, prefix + "CAT", prefix + "Category");
        pcTypeId = ensureType("PC", "Complete PC", false);
        cpuTypeId = ensureType("CPU", "Processor", true);
        ramTypeId = ensureType("RAM", "Memory", true);
        accessoryTypeId = ensureType("ACCESSORY", "Accessory", false);

        BigDecimal pcProductId = createProduct(pcTypeId, "PC");
        BigDecimal cpuProductId = createProduct(cpuTypeId, "CPU");
        BigDecimal ramProductId = createProduct(ramTypeId, "RAM");
        BigDecimal giftProductId = createProduct(accessoryTypeId, "GIFT");

        BigDecimal pcOfferId = createOffer(pcProductId, "PC", "1000.00", 0);
        BigDecimal cpuOfferId = createOffer(cpuProductId, "CPU", "100.00", 10);
        BigDecimal ramOfferId = createOffer(ramProductId, "RAM", "50.00", 10);
        BigDecimal giftOfferId = createOffer(giftProductId, "GIFT", "25.00", 10);

        jdbc.update("""
                INSERT INTO "product_bom_components"
                  ("parent_product_id", "component_product_id", "quantity",
                   "display_category", "display_order", "customer_visible")
                VALUES (?, ?, 1, 'CPU', 1, TRUE), (?, ?, 1, 'RAM', 2, TRUE)
                """, pcProductId, cpuProductId, pcProductId, ramProductId);
        products = new ProductFixture(
                pcProductId, pcOfferId, cpuOfferId, ramOfferId, giftOfferId);

        customer = createUser("CUSTOMER", "Customer One");
        secondCustomer = createUser("CUSTOMER", "Customer Two");
        admin = createUser("ADMIN", "Test Admin");
    }

    @AfterEach
    void cleanUp() {
        if (prefix == null) return;

        String userPattern = prefix + "%";
        jdbc.update("""
                DELETE FROM "order_inventory_reservations"
                WHERE "order_item_id" IN (
                    SELECT oi."order_item_id"
                    FROM "order_items" oi
                    JOIN "orders" o ON o."order_id" = oi."order_id"
                    WHERE o."user_id" IN (SELECT "user_id" FROM "users" WHERE "email" LIKE ?)
                )
                """, userPattern);
        jdbc.update("""
                DELETE FROM "order_payment_transactions"
                WHERE "order_id" IN (SELECT "order_id" FROM "orders"
                                     WHERE "user_id" IN (SELECT "user_id" FROM "users" WHERE "email" LIKE ?))
                """, userPattern);
        jdbc.update("""
                DELETE FROM "order_refund_transactions"
                WHERE "order_id" IN (SELECT "order_id" FROM "orders"
                                     WHERE "user_id" IN (SELECT "user_id" FROM "users" WHERE "email" LIKE ?))
                """, userPattern);
        jdbc.update("""
                DELETE FROM "order_status_history"
                WHERE "order_id" IN (SELECT "order_id" FROM "orders"
                                     WHERE "user_id" IN (SELECT "user_id" FROM "users" WHERE "email" LIKE ?))
                """, userPattern);
        jdbc.update("""
                DELETE FROM "order_items"
                WHERE "order_id" IN (SELECT "order_id" FROM "orders"
                                     WHERE "user_id" IN (SELECT "user_id" FROM "users" WHERE "email" LIKE ?))
                """, userPattern);
        jdbc.update("""
                DELETE FROM "orders"
                WHERE "user_id" IN (SELECT "user_id" FROM "users" WHERE "email" LIKE ?)
                """, userPattern);

        jdbc.update("""
                DELETE FROM "cart_item_gifts"
                WHERE "cart_item_id" IN (
                    SELECT ci."cart_item_id"
                    FROM "cart_items" ci
                    JOIN "carts" c ON c."cart_id" = ci."cart_id"
                    WHERE c."user_id" IN (SELECT "user_id" FROM "users" WHERE "email" LIKE ?)
                       OR c."guest_token" = ?
                )
                """, userPattern, guestTokens.hash(guestToken));
        jdbc.update("""
                DELETE FROM "cart_items"
                WHERE "cart_id" IN (
                    SELECT "cart_id" FROM "carts"
                    WHERE "user_id" IN (SELECT "user_id" FROM "users" WHERE "email" LIKE ?)
                       OR "guest_token" = ?
                )
                """, userPattern, guestTokens.hash(guestToken));
        jdbc.update("""
                DELETE FROM "carts"
                WHERE "user_id" IN (SELECT "user_id" FROM "users" WHERE "email" LIKE ?)
                   OR "guest_token" = ?
                """, userPattern, guestTokens.hash(guestToken));
        for (String token : createdGuestTokens) {
            if (token.equals(guestToken)) continue;
            String tokenHash = guestTokens.hash(token);
            jdbc.update("""
                    DELETE FROM "cart_item_gifts"
                    WHERE "cart_item_id" IN (
                        SELECT ci."cart_item_id"
                        FROM "cart_items" ci
                        JOIN "carts" c ON c."cart_id" = ci."cart_id"
                        WHERE c."guest_token" = ?
                    )
                    """, tokenHash);
            jdbc.update("""
                    DELETE FROM "cart_items"
                    WHERE "cart_id" IN (SELECT "cart_id" FROM "carts" WHERE "guest_token" = ?)
                    """, tokenHash);
            jdbc.update("DELETE FROM \"carts\" WHERE \"guest_token\" = ?", tokenHash);
        }

        jdbc.update("""
                DELETE FROM "promotion_gifts"
                WHERE "promotion_id" IN (
                    SELECT pp."promotion_id"
                    FROM "product_promotions" pp
                    JOIN "products" p ON p."product_id" = pp."product_id"
                    WHERE p."model_code" LIKE ?
                )
                """, prefix + "%");
        jdbc.update("""
                DELETE FROM "product_promotions"
                WHERE "product_id" IN (SELECT "product_id" FROM "products" WHERE "model_code" LIKE ?)
                """, prefix + "%");
        jdbc.update("DELETE FROM \"promotion_campaigns\" WHERE \"campaign_code\" = ?",
                prefix + "Campaign");
        jdbc.update("""
                DELETE FROM "product_bom_components"
                WHERE "parent_product_id" IN (
                    SELECT "product_id" FROM "products" WHERE "model_code" LIKE ?
                ) OR "component_product_id" IN (
                    SELECT "product_id" FROM "products" WHERE "model_code" LIKE ?
                )
                """, prefix + "%", prefix + "%");
        jdbc.update("""
                DELETE FROM "product_bundle_items"
                WHERE "bundle_id" IN (
                    SELECT "bundle_id" FROM "product_bundles"
                    WHERE "product_id" IN (SELECT "product_id" FROM "products" WHERE "model_code" LIKE ?)
                )
                """, prefix + "%");
        jdbc.update("""
                DELETE FROM "product_bundles"
                WHERE "product_id" IN (SELECT "product_id" FROM "products" WHERE "model_code" LIKE ?)
                """, prefix + "%");
        jdbc.update("""
                DELETE FROM "product_upgrade_options"
                WHERE "upgrade_group_id" IN (
                    SELECT "upgrade_group_id" FROM "product_upgrade_groups"
                    WHERE "product_id" IN (SELECT "product_id" FROM "products" WHERE "model_code" LIKE ?)
                )
                """, prefix + "%");
        jdbc.update("""
                DELETE FROM "product_upgrade_groups"
                WHERE "product_id" IN (SELECT "product_id" FROM "products" WHERE "model_code" LIKE ?)
                """, prefix + "%");
        jdbc.update("""
                DELETE FROM "product_relationships"
                WHERE "source_product_id" IN (SELECT "product_id" FROM "products" WHERE "model_code" LIKE ?)
                   OR "target_product_id" IN (SELECT "product_id" FROM "products" WHERE "model_code" LIKE ?)
                """, prefix + "%", prefix + "%");
        jdbc.update("""
                DELETE FROM "product_offers"
                WHERE "product_id" IN (SELECT "product_id" FROM "products" WHERE "model_code" LIKE ?)
                """, prefix + "%");
        jdbc.update("DELETE FROM \"products\" WHERE \"model_code\" LIKE ?", prefix + "%");
        jdbc.update("DELETE FROM \"brands\" WHERE \"brand_id\" = ?", brandId);
        jdbc.update("DELETE FROM \"categories\" WHERE \"category_id\" = ?", categoryId);
        jdbc.update("""
                DELETE FROM "users" WHERE "email" LIKE ?
                """, userPattern);
        for (String roleCode : createdRoleCodes) {
            jdbc.update("""
                    DELETE FROM "roles" r
                    WHERE r."role_code" = ?
                      AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u."role_id" = r."role_id")
                    """, roleCode);
        }
        for (String typeCode : createdTypeCodes) {
            jdbc.update("""
                    DELETE FROM "product_types" pt
                    WHERE pt."type_code" = ?
                      AND NOT EXISTS (
                          SELECT 1 FROM "products" p WHERE p."product_type_id" = pt."product_type_id"
                      )
                    """, typeCode);
        }
    }

    @Test
    void guestCartPersistsMergesDuplicateOffersAndPreservesSelectedGifts() {
        BigDecimal promotionId = createRequiredGiftPromotion();

        cartService.addItem(null, guestToken, products.pcOfferId().toString(), 1);
        CartDtos.CartResponse guestCart = cartService.getCart(null, guestToken);
        assertEquals(1, guestCart.items().get(0).quantity());
        assertEquals(new BigDecimal("1000.00"), guestCart.items().get(0).baseUnitPrice());

        String guestHash = guestTokens.hash(guestToken);
        String storedToken = jdbc.queryForObject(
                "SELECT \"guest_token\" FROM \"carts\" WHERE \"guest_token\" = ?",
                String.class, guestHash);
        assertNotEquals(guestToken, storedToken);

        List<GiftSelection> selectedGifts = List.of(
                new GiftSelection(promotionId.toString(), products.giftOfferId().toString(), 1));
        cartService.setSelectedGifts(
                null, guestToken, products.pcOfferId().toString(), selectedGifts);

        cartService.mergeGuestCart(guestToken, customer.principal());
        CartDtos.CartResponse merged = cartService.getCart(customer.id().toString(), null);

        assertEquals(1, merged.items().get(0).quantity());
        assertEquals(1, merged.items().get(0).selectedGifts().size());

        guestToken = guestTokens.createToken();
        cartService.addItem(null, guestToken, products.pcOfferId().toString(), 1);
        cartService.setSelectedGifts(
                null, guestToken, products.pcOfferId().toString(), selectedGifts);
        cartService.mergeGuestCart(guestToken, customer.principal());
        merged = cartService.getCart(customer.id().toString(), null);

        assertEquals(2, merged.items().get(0).quantity());
        assertEquals(1, merged.items().get(0).selectedGifts().size());
        assertEquals(new BigDecimal("900.00"), merged.items().get(0).unitPrice());
        assertEquals(2, cartService.getCart(customer.id().toString(), null).items().get(0).quantity());
        assertTrue(cartService.getCart(secondCustomer.id().toString(), null).items().isEmpty());
        assertEquals(1, jdbc.queryForObject("""
                SELECT count(*)
                FROM "cart_item_gifts" cig
                JOIN "cart_items" ci ON ci."cart_item_id" = cig."cart_item_id"
                JOIN "carts" c ON c."cart_id" = ci."cart_id"
                WHERE c."user_id" = ? AND cig."promotion_id" = ?
                """, Integer.class, customer.id(), promotionId));
        assertEquals(2, jdbc.queryForObject("""
                SELECT count(*) FROM "carts"
                WHERE "user_id" = ? AND "cart_status" = 'MERGED'
                """, Integer.class, customer.id()));
    }

    @Test
    void mergeRejectsDuplicateOffersWithDifferentGiftSelections() {
        BigDecimal promotionId = createRequiredGiftPromotion();
        cartService.addItem(null, guestToken, products.pcOfferId().toString(), 1);
        cartService.setSelectedGifts(
                null,
                guestToken,
                products.pcOfferId().toString(),
                List.of(new GiftSelection(
                        promotionId.toString(), products.giftOfferId().toString(), 1)));
        cartService.addItem(
                customer.id().toString(), null, products.pcOfferId().toString(), 1);

        CartException error = assertThrows(CartException.class,
                () -> cartService.mergeGuestCart(guestToken, customer.principal()));

        assertEquals(org.springframework.http.HttpStatus.CONFLICT, error.status());
        assertEquals(1, cartService.getCart(null, guestToken).items().get(0).quantity());
        assertEquals(1, cartService.getCart(customer.id().toString(), null)
                .items().get(0).quantity());
        assertEquals(1, cartService.getCart(null, guestToken).items().get(0)
                .selectedGifts().size());
        assertTrue(cartService.getCart(customer.id().toString(), null)
                .items().get(0).selectedGifts().isEmpty());
    }

    @Test
    void cartOperationsAreIsolatedByCustomerPrincipalAndGuestToken() {
        String offerId = products.pcOfferId().toString();
        cartService.addItem(secondCustomer.id().toString(), null, offerId, 1);

        assertTrue(cartController.getCart(
                customer.principal(), new MockHttpServletRequest(), new MockHttpServletResponse())
                .items().isEmpty());
        assertEquals(1, cartController.addItem(
                new CartDtos.AddItemRequest(offerId, 1),
                customer.principal(),
                new MockHttpServletRequest(),
                new MockHttpServletResponse()).items().get(0).quantity());
        assertEquals(2, cartController.updateQuantity(
                offerId,
                new CartDtos.QuantityRequest(2),
                customer.principal(),
                new MockHttpServletRequest(),
                new MockHttpServletResponse()).items().get(0).quantity());
        assertEquals(1, cartService.getCart(secondCustomer.id().toString(), null)
                .items().get(0).quantity());
        cartController.removeItem(
                offerId,
                customer.principal(),
                new MockHttpServletRequest(),
                new MockHttpServletResponse());
        assertEquals(1, cartService.getCart(secondCustomer.id().toString(), null)
                .items().get(0).quantity());
        assertEquals(org.springframework.http.HttpStatus.NOT_FOUND,
                assertThrows(CartException.class, () -> cartController.updateQuantity(
                        offerId,
                        new CartDtos.QuantityRequest(3),
                        customer.principal(),
                        new MockHttpServletRequest(),
                        new MockHttpServletResponse())).status());

        Long groupId = jdbc.queryForObject("""
                INSERT INTO "product_upgrade_groups"
                  ("product_id", "group_code", "display_name", "is_required",
                   "display_order", "is_enabled")
                VALUES (?, 'RAM', 'Bộ nhớ', TRUE, 1, TRUE)
                RETURNING "upgrade_group_id"
                """, Long.class, products.pcProductId());
        Long optionId = jdbc.queryForObject("""
                INSERT INTO "product_upgrade_options"
                  ("upgrade_group_id", "offer_id", "price_delta", "display_name",
                   "is_default", "minimum_quantity", "maximum_quantity", "display_order", "is_enabled")
                VALUES (?, ?, 0, 'RAM mặc định', TRUE, 1, 1, 1, TRUE)
                RETURNING "upgrade_option_id"
                """, Long.class, groupId, products.ramOfferId());
        CartDtos.ConfigurationSelectionRequest configuration =
                new CartDtos.ConfigurationSelectionRequest(
                        List.of(new UpgradeSelection(
                                groupId.toString(), optionId.toString(), 1)),
                        List.of());
        cartController.setConfiguration(
                offerId, configuration, secondCustomer.principal(),
                new MockHttpServletRequest(), new MockHttpServletResponse());
        assertEquals(org.springframework.http.HttpStatus.NOT_FOUND,
                assertThrows(CartException.class, () -> cartController.setConfiguration(
                        offerId, configuration, customer.principal(),
                        new MockHttpServletRequest(), new MockHttpServletResponse())).status());
        assertEquals(groupId.toString(), cartService.getCart(
                secondCustomer.id().toString(), null).items().getFirst()
                .configuration().upgrades().getFirst().groupId());

        String secondGuestToken = guestTokens.createToken();
        createdGuestTokens.add(secondGuestToken);
        cartService.addItem(null, secondGuestToken, offerId, 1);
        assertTrue(cartController.getCart(
                null, guestRequest(guestToken), new MockHttpServletResponse()).items().isEmpty());
        assertEquals(1, cartController.addItem(
                new CartDtos.AddItemRequest(offerId, 1),
                null,
                guestRequest(guestToken),
                new MockHttpServletResponse()).items().get(0).quantity());
        assertEquals(2, cartController.updateQuantity(
                offerId,
                new CartDtos.QuantityRequest(2),
                null,
                guestRequest(guestToken),
                new MockHttpServletResponse()).items().get(0).quantity());
        cartController.removeItem(
                offerId, null, guestRequest(guestToken), new MockHttpServletResponse());
        assertEquals(1, cartService.getCart(null, secondGuestToken).items().get(0).quantity());
    }

    private MockHttpServletRequest guestRequest(String token) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie(GuestCartTokenService.COOKIE_NAME, token));
        return request;
    }

    @Test
    void duplicateMergeOverStockRollsBackBothCarts() {
        setComponentStock(1);
        cartService.addItem(null, guestToken, products.pcOfferId().toString(), 1);
        cartService.addItem(customer.id().toString(), null, products.pcOfferId().toString(), 1);

        CartException error = assertThrows(CartException.class,
                () -> cartService.mergeGuestCart(guestToken, customer.principal()));

        assertEquals(org.springframework.http.HttpStatus.CONFLICT, error.status());
        assertEquals(1, cartService.getCart(null, guestToken).items().get(0).quantity());
        assertEquals(1, cartService.getCart(customer.id().toString(), null).items().get(0).quantity());
        assertEquals(0, jdbc.queryForObject("""
                SELECT count(*) FROM "carts"
                WHERE "guest_token" = ? AND "cart_status" = 'MERGED'
                """, Integer.class, guestTokens.hash(guestToken)));
    }

    @Test
    void concurrentCheckoutsCannotOversellBomComponents() throws Exception {
        setComponentStock(1);
        cartService.addItem(customer.id().toString(), null, products.pcOfferId().toString(), 1);
        cartService.addItem(
                secondCustomer.id().toString(), null, products.pcOfferId().toString(), 1);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<OrderDtos.OrderDetail> first = executor.submit(() -> {
                ready.countDown();
                start.await();
                return checkout(customer, "SIMULATED_ONLINE");
            });
            Future<OrderDtos.OrderDetail> second = executor.submit(() -> {
                ready.countDown();
                start.await();
                return checkout(secondCustomer, "SIMULATED_ONLINE");
            });
            assertTrue(ready.await(5, TimeUnit.SECONDS));
            start.countDown();

            int successes = 0;
            int failures = 0;
            for (Future<OrderDtos.OrderDetail> result : List.of(first, second)) {
                try {
                    result.get(30, TimeUnit.SECONDS);
                    successes++;
                } catch (ExecutionException exception) {
                    assertInstanceOf(RuntimeException.class, exception.getCause());
                    failures++;
                }
            }
            assertEquals(1, successes);
            assertEquals(1, failures);
            assertEquals(BigDecimal.ONE, reservedQuantity(products.cpuOfferId()));
            assertEquals(BigDecimal.ONE, reservedQuantity(products.ramOfferId()));
            assertEquals(2, activeReservationCountForFixtureUsers());
            assertEquals(1, orderCountForFixtureUsers());
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void unavailableBomComponentLeavesNoPartialReservationOrOrder() {
        setComponentStock(1);
        BigDecimal orderId = jdbc.queryForObject("""
                INSERT INTO "orders"
                  ("order_number", "user_id", "customer_name", "customer_email",
                   "shipping_address", "order_status", "payment_method", "payment_status",
                   "subtotal", "shipping_fee", "discount_amount", "total_amount")
                VALUES (?, ?, ?, ?, 'Test address', 'PENDING_CONFIRMATION',
                        'SIMULATED_ONLINE', 'UNPAID', 1000.00, 0, 0, 1000.00)
                RETURNING "order_id"
                """, BigDecimal.class, prefix + "ROLLBACK", customer.id(),
                customer.name(), customer.email());
        BigDecimal orderItemId = jdbc.queryForObject("""
                INSERT INTO "order_items"
                  ("order_id", "offer_id", "product_name_snapshot", "offer_code_snapshot",
                   "condition_snapshot", "quantity", "unit_price", "line_total", "currency_code")
                VALUES (?, ?, ?, ?, 'NEW', 1, 1000.00, 1000.00, 'VND')
                RETURNING "order_item_id"
                """, BigDecimal.class, orderId, products.pcOfferId(),
                prefix + "PC", prefix + "PC-OFFER");

        jdbc.update("UPDATE \"product_offers\" SET \"stock_quantity\" = 0 WHERE \"offer_id\" = ?",
                products.ramOfferId());
        assertThrows(RuntimeException.class, () -> componentInventory.reserveForPcOrderItem(
                products.pcProductId(), orderItemId, 1));

        assertEquals(BigDecimal.ZERO, reservedQuantity(products.cpuOfferId()));
        assertEquals(BigDecimal.ZERO, reservedQuantity(products.ramOfferId()));
        assertEquals(0, jdbc.queryForObject("""
                SELECT count(*) FROM "order_inventory_reservations"
                WHERE "order_item_id" = ?
                """, Integer.class, orderItemId));

        setComponentStock(1);
        cartService.addItem(
                customer.id().toString(), null, products.pcOfferId().toString(), 1);
        jdbc.update("UPDATE \"product_offers\" SET \"stock_quantity\" = 0 WHERE \"offer_id\" = ?",
                products.ramOfferId());
        assertThrows(RuntimeException.class, () -> checkout(customer, "SIMULATED_ONLINE"));

        assertEquals(1, orderCountForFixtureUsers());
        assertEquals(0, activeReservationCountForFixtureUsers());
        assertEquals(BigDecimal.ZERO, reservedQuantity(products.cpuOfferId()));
    }

    @Test
    void failedPaymentReleasesReservationsAndRetryReacquiresThem() {
        when(paymentGateway.charge(any(BigDecimal.class), anyString(), anyString()))
                .thenReturn(
                        new PaymentGateway.PaymentResult("SIMULATED", "FAILED", prefix + "FAIL"),
                        new PaymentGateway.PaymentResult("SIMULATED", "SUCCEEDED", prefix + "RETRY"));
        OrderDtos.OrderDetail created = checkout(customer, "SIMULATED_ONLINE");

        OrderDtos.OrderDetail failed = orderService.processSimulatedPayment(
                created.order().orderNumber(), prefix + "PAY-1", customer.principal());
        assertEquals("FAILED", failed.order().paymentStatus());
        assertEquals(OrderDtos.FulfillmentStatus.PENDING_CONFIRMATION, failed.order().status());
        assertEquals(BigDecimal.ZERO, reservedQuantity(products.cpuOfferId()));
        assertEquals(BigDecimal.ZERO, reservedQuantity(products.ramOfferId()));

        OrderDtos.OrderDetail retried = orderService.processSimulatedPayment(
                created.order().orderNumber(), prefix + "PAY-2", customer.principal());
        assertEquals("PAID", retried.order().paymentStatus());
        assertEquals(OrderDtos.FulfillmentStatus.PENDING_CONFIRMATION, retried.order().status());
        assertEquals(BigDecimal.ONE, reservedQuantity(products.cpuOfferId()));
        assertEquals(BigDecimal.ONE, reservedQuantity(products.ramOfferId()));
        assertEquals(2, activeReservationCountForFixtureUsers());
    }

    @Test
    void cancellationReleasesComponentReservationsAndFailedOnlinePaymentCannotShip() {
        when(paymentGateway.charge(any(BigDecimal.class), anyString(), anyString()))
                .thenReturn(new PaymentGateway.PaymentResult(
                        "SIMULATED", "FAILED", prefix + "FAIL"));
        OrderDtos.OrderDetail onlineOrder = checkout(customer, "SIMULATED_ONLINE");
        orderService.processSimulatedPayment(
                onlineOrder.order().orderNumber(), prefix + "PAY-FAIL", customer.principal());
        updateToReadyToShip(onlineOrder.order().orderNumber());

        OrderManagementException shippingError = assertThrows(OrderManagementException.class,
                () -> orderService.updateStatus(
                        onlineOrder.order().orderNumber(),
                        new OrderDtos.StatusUpdateRequest(
                                OrderDtos.FulfillmentStatus.SHIPPING, "test"),
                        admin.principal()));
        assertEquals(org.springframework.http.HttpStatus.CONFLICT, shippingError.status());
        assertEquals(OrderDtos.FulfillmentStatus.READY_TO_SHIP,
                orderService.getAdminOrder(onlineOrder.order().orderNumber()).order().status());
        assertEquals(BigDecimal.ZERO, reservedQuantity(products.cpuOfferId()));

        OrderDtos.OrderDetail codOrder = checkout(secondCustomer, "COD");
        assertEquals(BigDecimal.ONE, reservedQuantity(products.cpuOfferId()));
        orderService.requestCancellation(
                codOrder.order().orderNumber(), "Test cancellation", secondCustomer.principal());
        OrderDtos.OrderDetail cancelled = orderService.decideCancellation(
                codOrder.order().orderNumber(),
                new OrderDtos.CancellationDecisionRequest(true, "Approved in isolated test"),
                admin.principal());

        assertEquals(OrderDtos.FulfillmentStatus.CANCELLED, cancelled.order().status());
        assertEquals(BigDecimal.ZERO, reservedQuantity(products.cpuOfferId()));
        assertEquals(BigDecimal.ZERO, reservedQuantity(products.ramOfferId()));
        assertEquals(new BigDecimal("10"), stockQuantity(products.cpuOfferId()));
        assertEquals(new BigDecimal("10"), stockQuantity(products.ramOfferId()));
    }

    @Test
    void adminUpgradeConfigurationPersistsOfferPricingBundleScheduleAndRelatedProducts() {
        BigDecimal alternateRamProduct = createProduct(ramTypeId, "RAM-ALT");
        BigDecimal alternateRamOffer = createOffer(alternateRamProduct, "RAM-ALT", "80.00", 10);
        BigDecimal relatedProductId = jdbc.queryForObject(
                "SELECT \"product_id\" FROM \"product_offers\" WHERE \"offer_id\" = ?",
                BigDecimal.class, products.giftOfferId());
        LocalDateTime startsAt = LocalDateTime.now().withNano(0).minusDays(1);
        LocalDateTime endsAt = startsAt.plusDays(2);
        SaveConfiguration request = new SaveConfiguration(
                List.of(new SaveUpgradeGroup(
                        "RAM", "Bộ nhớ", "Tùy chọn bộ nhớ", true, 1, true,
                        List.of(
                                new SaveUpgradeOption(
                                        products.ramOfferId().toString(), "Mặc định", null,
                                        true, 1, 1, 1, true),
                                new SaveUpgradeOption(
                                        alternateRamOffer.toString(), "Nâng cấp RAM", null,
                                        false, 1, 1, 2, true)))),
                List.of(new SaveBundle(
                        null, "Gói phụ kiện", "Phụ kiện tùy chọn", "FIXED_AMOUNT",
                        new BigDecimal("10.00"), List.of("NEW"), startsAt, endsAt, 1, true,
                        List.of(new SaveBundleItem(
                                products.giftOfferId().toString(), false, false, 1, true)))),
                List.of(new SaveRelatedProduct(relatedProductId.toString(), 1)));

        var saved = upgradeService.saveAdminConfiguration(
                prefix + "PC", request, admin.principal());

        assertEquals(1, saved.groups().size());
        assertEquals(2, saved.groups().getFirst().options().size());
        assertEquals(0, saved.groups().getFirst().options().get(0)
                .priceDifference().compareTo(BigDecimal.ZERO));
        assertEquals(0, saved.groups().getFirst().options().get(1)
                .priceDifference().compareTo(new BigDecimal("30.00")));
        assertEquals(1, saved.bundles().size());
        assertEquals(new BigDecimal("10.00"), saved.bundles().getFirst().discountValue());
        assertEquals(startsAt, saved.bundles().getFirst().startsAt());
        assertEquals(endsAt, saved.bundles().getFirst().endsAt());
        assertEquals(products.giftOfferId().toString(),
                saved.bundles().getFirst().items().getFirst().offerId());
        assertEquals(relatedProductId.toString(),
                saved.relatedProducts().getFirst().productId());
        assertEquals(1, jdbc.queryForObject("""
                SELECT count(*) FROM "admin_product_change_history"
                WHERE "entity_type" = 'PC_UPGRADE_CONFIG'
                  AND "actor_user_id" = ?
                """, Integer.class, admin.id()));
    }

    @Test
    void unavailableAndUsedUpgradeAlternativesCannotBeSelectedForNewPc() {
        BigDecimal unavailableRamProduct = createProduct(ramTypeId, "RAM-OUT-OF-STOCK");
        BigDecimal unavailableRamOffer = createOffer(
                unavailableRamProduct, "RAM-OUT-OF-STOCK", "80.00", 0);
        BigDecimal usedRamProduct = createProduct(ramTypeId, "RAM-USED");
        BigDecimal usedRamOffer = createOffer(usedRamProduct, "RAM-USED", "40.00", 10);
        jdbc.update("""
                UPDATE "product_offers" SET "condition_code" = 'USED'
                WHERE "offer_id" = ?
                """, usedRamOffer);
        Long groupId = jdbc.queryForObject("""
                INSERT INTO "product_upgrade_groups"
                  ("product_id", "group_code", "display_name", "is_required",
                   "display_order", "is_enabled")
                VALUES (?, 'RAM', 'Bộ nhớ', TRUE, 1, TRUE)
                RETURNING "upgrade_group_id"
                """, Long.class, products.pcProductId());
        Long unavailableOptionId = jdbc.queryForObject("""
                INSERT INTO "product_upgrade_options"
                  ("upgrade_group_id", "offer_id", "price_delta", "display_name",
                   "is_default", "minimum_quantity", "maximum_quantity", "display_order", "is_enabled")
                VALUES (?, ?, 30, 'RAM hết hàng', FALSE, 1, 1, 2, TRUE)
                RETURNING "upgrade_option_id"
                """, Long.class, groupId, unavailableRamOffer);
        Long usedOptionId = jdbc.queryForObject("""
                INSERT INTO "product_upgrade_options"
                  ("upgrade_group_id", "offer_id", "price_delta", "display_name",
                   "is_default", "minimum_quantity", "maximum_quantity", "display_order", "is_enabled")
                VALUES (?, ?, -10, 'RAM đã qua sử dụng', FALSE, 1, 1, 3, FALSE)
                RETURNING "upgrade_option_id"
                """, Long.class, groupId, usedRamOffer);
        jdbc.update("""
                INSERT INTO "product_upgrade_options"
                  ("upgrade_group_id", "offer_id", "price_delta", "display_name",
                   "is_default", "minimum_quantity", "maximum_quantity", "display_order", "is_enabled")
                VALUES (?, ?, 0, 'RAM mặc định', TRUE, 1, 1, 1, TRUE)
                """, groupId, products.ramOfferId());

        var publicConfiguration = upgradeService.getPublicConfiguration(
                prefix + "PC", products.pcOfferId().toString());
        assertEquals(1, publicConfiguration.groups().getFirst().options().size());

        cartService.addItem(
                customer.id().toString(), null, products.pcOfferId().toString(), 1);
        assertEquals(org.springframework.http.HttpStatus.CONFLICT,
                assertThrows(CartException.class, () -> cartService.setConfiguration(
                        customer.id().toString(), null, products.pcOfferId().toString(),
                        new CartDtos.ConfigurationSelectionRequest(
                                List.of(new UpgradeSelection(
                                        groupId.toString(), unavailableOptionId.toString(), 1)),
                                List.of()))).status());

        jdbc.update("""
                UPDATE "product_upgrade_options" SET "is_enabled" = TRUE
                WHERE "upgrade_option_id" = ?
                """, usedOptionId);
        assertThrows(ResponseStatusException.class, () -> cartService.setConfiguration(
                customer.id().toString(), null, products.pcOfferId().toString(),
                new CartDtos.ConfigurationSelectionRequest(
                        List.of(new UpgradeSelection(
                                groupId.toString(), usedOptionId.toString(), 1)),
                        List.of())));
    }

    @Test
    void configuredPcCartAndCheckoutUseStoredPricesAndReserveSelectedComponents()
            throws Exception {
        BigDecimal gpuType = ensureType("GPU", "GPU", false);
        BigDecimal baseGpuProduct = createProduct(gpuType, "GPU-BASE");
        BigDecimal baseGpuOffer = createOffer(baseGpuProduct, "GPU-BASE", "200.00", 10);
        BigDecimal alternateGpuProduct = createProduct(gpuType, "GPU-ALT");
        BigDecimal alternateGpuOffer = createOffer(alternateGpuProduct, "GPU-ALT", "250.00", 10);
        BigDecimal relatedProduct = createProduct(accessoryTypeId, "RELATED");
        BigDecimal relatedOffer = createOffer(relatedProduct, "RELATED", "40.00", 10);
        jdbc.update("""
                INSERT INTO "product_bom_components"
                  ("parent_product_id", "component_product_id", "quantity",
                   "display_category", "display_order", "customer_visible")
                VALUES (?, ?, 1, 'GPU', 3, TRUE)
                """, products.pcProductId(), baseGpuProduct);
        jdbc.update("""
                INSERT INTO "product_relationships"
                  ("source_product_id", "target_product_id", "relationship_type",
                   "status_code", "display_order")
                VALUES (?, ?, 'CROSS_SELL', 'ACTIVE', 1)
                """, products.pcProductId(), relatedProduct);
        Long groupId = jdbc.queryForObject("""
                INSERT INTO "product_upgrade_groups"
                  ("product_id", "group_code", "display_name", "is_required",
                   "display_order", "is_enabled")
                VALUES (?, 'GPU', 'Card đồ họa', TRUE, 1, TRUE)
                RETURNING "upgrade_group_id"
                """, Long.class, products.pcProductId());
        jdbc.queryForObject("""
                INSERT INTO "product_upgrade_options"
                  ("upgrade_group_id", "offer_id", "price_delta", "display_name",
                   "is_default", "minimum_quantity", "maximum_quantity", "display_order", "is_enabled")
                VALUES (?, ?, 0, 'GPU mặc định', TRUE, 1, 1, 1, TRUE)
                RETURNING "upgrade_option_id"
                """, Long.class, groupId, baseGpuOffer);
        Long alternateOptionId = jdbc.queryForObject("""
                INSERT INTO "product_upgrade_options"
                  ("upgrade_group_id", "offer_id", "price_delta", "display_name",
                   "is_default", "minimum_quantity", "maximum_quantity", "display_order", "is_enabled")
                VALUES (?, ?, 50, 'GPU nâng cấp', FALSE, 1, 1, 2, TRUE)
                RETURNING "upgrade_option_id"
                """, Long.class, groupId, alternateGpuOffer);

        Long bundleId = jdbc.queryForObject("""
                INSERT INTO "product_bundles"
                  ("product_id", "bundle_name", "discount_type", "discount_value",
                   "eligibility_json", "display_order", "is_enabled")
                VALUES (?, 'Bộ phụ kiện', 'FIXED_AMOUNT', 10,
                        '{"conditions":["NEW"]}'::jsonb, 1, TRUE)
                RETURNING "bundle_id"
                """, Long.class, products.pcProductId());
        jdbc.update("""
                INSERT INTO "product_bundle_items"
                  ("bundle_id", "offer_id", "is_required", "is_default_selected",
                   "display_order", "is_enabled")
                VALUES (?, ?, FALSE, FALSE, 1, TRUE)
                """, bundleId, products.giftOfferId());

        cartService.addItem(
                customer.id().toString(), null, products.pcOfferId().toString(), 1);
        CartDtos.ConfigurationSelectionRequest submittedWithForgedPrices =
                objectMapper.readValue("""
                        {
                          "upgrades": [{
                            "groupId": "%s",
                            "optionId": "%s",
                            "quantity": 1,
                            "priceDifference": -999999,
                            "unitPrice": 0
                          }],
                          "bundles": [{
                            "bundleId": "%s",
                            "offerIds": ["%s"],
                            "discount": 999999,
                            "subtotal": 0
                          }],
                          "unitPrice": 0,
                          "total": 0
                        }
                        """.formatted(
                        groupId, alternateOptionId, bundleId, products.giftOfferId()),
                        CartDtos.ConfigurationSelectionRequest.class);
        cartService.setConfiguration(
                customer.id().toString(), null, products.pcOfferId().toString(),
                submittedWithForgedPrices);
        CartDtos.CartItem cartItem = cartService.getCart(
                customer.id().toString(), null).items().getFirst();
        assertEquals(new BigDecimal("1065.00"), cartItem.unitPrice());
        assertEquals(new BigDecimal("1065.00"), cartItem.subtotal());
        cartService.addItem(
                customer.id().toString(), null, relatedOffer.toString(), 1);
        assertEquals(2, cartService.getCart(customer.id().toString(), null).items().size());
        var publicConfiguration = upgradeService.getPublicConfiguration(
                prefix + "PC", products.pcOfferId().toString());
        assertEquals(1, publicConfiguration.relatedProducts().size());
        assertEquals(relatedOffer.toString(),
                publicConfiguration.relatedProducts().getFirst().offerId());

        OrderDtos.OrderDetail order = orderService.createOrder(
                new OrderDtos.CheckoutRequest(
                        customer.name(), "5550000", "Test address", "Test region", "00000",
                        "COD",
                        List.of(
                                new OrderDtos.CheckoutItem(products.pcOfferId().toString(), 1),
                                new OrderDtos.CheckoutItem(relatedOffer.toString(), 1))),
                prefix + "CHECKOUT-RELATED-" + UUID.randomUUID(),
                customer.principal());
        List<Map<String, Object>> savedItems = jdbc.queryForList("""
                SELECT oi."offer_id"::text AS "offer_id", oi."product_name_snapshot",
                       oi."unit_price", oi."configuration_snapshot"::text AS "configuration_snapshot"
                FROM "order_items" oi
                JOIN "orders" o ON o."order_id" = oi."order_id"
                WHERE o."order_number" = ?
                ORDER BY oi."order_item_id"
                """, order.order().orderNumber());
        assertEquals(2, savedItems.size());
        Map<String, Object> savedPc = savedItems.stream()
                .filter(item -> products.pcOfferId().toString().equals(item.get("offer_id")))
                .findFirst().orElseThrow();
        Map<String, Object> savedRelated = savedItems.stream()
                .filter(item -> relatedOffer.toString().equals(item.get("offer_id")))
                .findFirst().orElseThrow();
        assertEquals(new BigDecimal("1065.00"), savedPc.get("unit_price"));
        assertTrue(String.valueOf(savedPc.get("configuration_snapshot"))
                .contains(alternateGpuOffer.toPlainString()));
        assertEquals(prefix + "RELATED", savedRelated.get("product_name_snapshot"));
        assertEquals(new BigDecimal("40.00"), savedRelated.get("unit_price"));
        assertEquals("{}", savedRelated.get("configuration_snapshot"));
        assertEquals(BigDecimal.ONE, reservedQuantity(alternateGpuOffer));
        assertEquals(BigDecimal.ZERO, reservedQuantity(baseGpuOffer));
        assertEquals(BigDecimal.ONE, reservedQuantity(products.cpuOfferId()));
        assertEquals(BigDecimal.ONE, reservedQuantity(products.ramOfferId()));
        assertEquals(BigDecimal.ONE, reservedQuantity(products.giftOfferId()));
        assertEquals(BigDecimal.ONE, reservedQuantity(relatedOffer));
        assertEquals(5, activeReservationCountForFixtureUsers());

        orderService.requestCancellation(
                order.order().orderNumber(), "Test configuration cancellation", customer.principal());
        orderService.decideCancellation(
                order.order().orderNumber(),
                new OrderDtos.CancellationDecisionRequest(true, "Restore selected stock"),
                admin.principal());
        assertEquals(BigDecimal.ZERO, reservedQuantity(alternateGpuOffer));
        assertEquals(BigDecimal.ZERO, reservedQuantity(baseGpuOffer));
        assertEquals(BigDecimal.ZERO, reservedQuantity(products.ramOfferId()));
        assertEquals(BigDecimal.ZERO, reservedQuantity(products.giftOfferId()));
        assertEquals(BigDecimal.ZERO, reservedQuantity(relatedOffer));
    }

    private OrderDtos.OrderDetail checkout(UserFixture user, String paymentMethod) {
        CartDtos.CartResponse cart = cartService.getCart(user.id().toString(), null);
        if (cart.items().isEmpty()) {
            cartService.addItem(user.id().toString(), null, products.pcOfferId().toString(), 1);
        }
        return orderService.createOrder(
                new OrderDtos.CheckoutRequest(
                        user.name(), "5550000", "Test address", "Test region", "00000",
                        paymentMethod,
                        List.of(new OrderDtos.CheckoutItem(products.pcOfferId().toString(), 1))),
                prefix + "CHECKOUT-" + UUID.randomUUID(),
                user.principal());
    }

    private void updateToReadyToShip(String orderNumber) {
        orderService.updateStatus(orderNumber,
                new OrderDtos.StatusUpdateRequest(
                        OrderDtos.FulfillmentStatus.CONFIRMED, "test"),
                admin.principal());
        orderService.updateStatus(orderNumber,
                new OrderDtos.StatusUpdateRequest(
                        OrderDtos.FulfillmentStatus.PROCESSING, "test"),
                admin.principal());
        orderService.updateStatus(orderNumber,
                new OrderDtos.StatusUpdateRequest(
                        OrderDtos.FulfillmentStatus.READY_TO_SHIP, "test"),
                admin.principal());
    }

    private BigDecimal createRequiredGiftPromotion() {
        Long campaignId = jdbc.queryForObject("""
                INSERT INTO "promotion_campaigns"
                  ("campaign_code", "campaign_name", "priority", "is_exclusive", "is_enabled")
                VALUES (?, ?, 100, TRUE, TRUE)
                RETURNING "campaign_id"
                """, Long.class, prefix + "Campaign", prefix + "Campaign");
        Long promotionId = jdbc.queryForObject("""
                INSERT INTO "product_promotions"
                  ("campaign_id", "product_id", "discount_type", "discount_value",
                   "discount_currency_code", "is_enabled", "priority", "is_exclusive")
                VALUES (?, ?, 'PERCENTAGE', 10, NULL, TRUE, 100, TRUE)
                RETURNING "promotion_id"
                """, Long.class, campaignId, products.pcProductId());
        jdbc.update("""
                INSERT INTO "promotion_gifts"
                  ("promotion_id", "gift_offer_id", "quantity", "selection_required", "display_order")
                VALUES (?, ?, 1, TRUE, 1)
                """, promotionId, products.giftOfferId());
        return BigDecimal.valueOf(promotionId);
    }

    private void setComponentStock(int quantity) {
        jdbc.update("UPDATE \"product_offers\" SET \"stock_quantity\" = ? WHERE \"offer_id\" = ?",
                quantity, products.cpuOfferId());
        jdbc.update("UPDATE \"product_offers\" SET \"stock_quantity\" = ? WHERE \"offer_id\" = ?",
                quantity, products.ramOfferId());
    }

    private BigDecimal reservedQuantity(BigDecimal offerId) {
        return jdbc.queryForObject(
                "SELECT \"reserved_quantity\" FROM \"product_offers\" WHERE \"offer_id\" = ?",
                BigDecimal.class, offerId);
    }

    private BigDecimal stockQuantity(BigDecimal offerId) {
        return jdbc.queryForObject(
                "SELECT \"stock_quantity\" FROM \"product_offers\" WHERE \"offer_id\" = ?",
                BigDecimal.class, offerId);
    }

    private int activeReservationCountForFixtureUsers() {
        return jdbc.queryForObject("""
                SELECT count(*)
                FROM "order_inventory_reservations" r
                JOIN "order_items" oi ON oi."order_item_id" = r."order_item_id"
                JOIN "orders" o ON o."order_id" = oi."order_id"
                WHERE o."user_id" IN (
                    SELECT "user_id" FROM "users" WHERE "email" LIKE ?
                ) AND r."reservation_status" = 'ACTIVE'
                """, Integer.class, prefix + "%");
    }

    private int orderCountForFixtureUsers() {
        return jdbc.queryForObject("""
                SELECT count(*) FROM "orders"
                WHERE "user_id" IN (SELECT "user_id" FROM "users" WHERE "email" LIKE ?)
                """, Integer.class, prefix + "%");
    }

    private BigDecimal ensureType(String code, String name, boolean component) {
        int inserted = jdbc.update("""
                INSERT INTO "product_types"
                  ("type_code", "type_name", "is_build_component", "is_active")
                VALUES (?, ?, ?, TRUE)
                ON CONFLICT ("type_code") DO NOTHING
                """, code, name, component);
        if (inserted == 1) createdTypeCodes.add(code);
        return jdbc.queryForObject(
                "SELECT \"product_type_id\" FROM \"product_types\" WHERE \"type_code\" = ?",
                BigDecimal.class, code);
    }

    private UserFixture createUser(String roleCode, String name) {
        int insertedRole = jdbc.update("""
                INSERT INTO "roles" ("role_code", "role_name")
                VALUES (?, ?)
                ON CONFLICT ("role_code") DO NOTHING
                """, roleCode, roleCode);
        if (insertedRole == 1) createdRoleCodes.add(roleCode);
        BigDecimal roleId = jdbc.queryForObject(
                "SELECT \"role_id\" FROM \"roles\" WHERE \"role_code\" = ?",
                BigDecimal.class, roleCode);
        String email = (prefix + roleCode + "-" + name.replace(" ", "") + "@example.test")
                .toLowerCase();
        String passwordHash = new BCryptPasswordEncoder().encode(UUID.randomUUID().toString());
        BigDecimal userId = jdbc.queryForObject("""
                INSERT INTO "users"
                  ("role_id", "full_name", "email", "password_hash", "account_status")
                VALUES (?, ?, ?, ?, 'ACTIVE')
                RETURNING "user_id"
                """, BigDecimal.class, roleId, name, email, passwordHash);
        return new UserFixture(userId, name, email,
                new AuthUserPrincipal(userId.toString(), name, email, passwordHash,
                        roleCode, "UNSPECIFIED", "ACTIVE"));
    }

    private BigDecimal createProduct(BigDecimal typeId, String suffix) {
        return jdbc.queryForObject("""
                INSERT INTO "products"
                  ("product_type_id", "category_id", "brand_id", "model_code",
                   "product_name", "product_status")
                VALUES (?, ?, ?, ?, ?, 'ACTIVE')
                RETURNING "product_id"
                """, BigDecimal.class, typeId, categoryId, brandId,
                prefix + suffix, prefix + suffix);
    }

    private BigDecimal createOffer(
            BigDecimal productId, String suffix, String price, int stock) {
        return jdbc.queryForObject("""
                INSERT INTO "product_offers"
                  ("product_id", "offer_code", "condition_code", "price", "currency_code",
                   "stock_quantity", "reserved_quantity", "warranty_months", "offer_status")
                VALUES (?, ?, 'NEW', ?, 'VND', ?, 0, 12, 'ACTIVE')
                RETURNING "offer_id"
                """, BigDecimal.class, productId, prefix + suffix + "-OFFER",
                new BigDecimal(price), stock);
    }

    private record ProductFixture(
            BigDecimal pcProductId,
            BigDecimal pcOfferId,
            BigDecimal cpuOfferId,
            BigDecimal ramOfferId,
            BigDecimal giftOfferId) {}

    private record UserFixture(
            BigDecimal id,
            String name,
            String email,
            AuthUserPrincipal principal) {}
}
