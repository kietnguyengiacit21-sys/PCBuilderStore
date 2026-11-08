package com.pc_builder_store.cart;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

import com.pc_builder_store.auth.AuthUserPrincipal;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CartServiceTest {

    @Mock
    private JdbcTemplate jdbc;

    @Test
    void rejectsInvalidQuantitiesBeforeAccessingTheDatabase() {
        CartService service = new CartService(jdbc, new GuestCartTokenService(false));

        CartException error = assertThrows(CartException.class,
                () -> service.addItem(null, null, "25", 0));

        assertEquals(HttpStatus.BAD_REQUEST, error.status());
        verifyNoInteractions(jdbc);
    }

    @Test
    void rejectsCartMergingForNonCustomerAccounts() {
        GuestCartTokenService tokens = new GuestCartTokenService(false);
        CartService service = new CartService(jdbc, tokens);
        AuthUserPrincipal sales = new AuthUserPrincipal(
                "12", "Sales", "sales@example.test", "", "SALES", null, "ACTIVE");

        CartException error = assertThrows(CartException.class,
                () -> service.mergeGuestCart(tokens.createToken(), sales));

        assertEquals(HttpStatus.FORBIDDEN, error.status());
        verifyNoInteractions(jdbc);
    }

    @Test
    @SuppressWarnings("unchecked")
    void attachesTheGuestCartToTheCustomerAndClearsItsGuestOwnership() {
        GuestCartTokenService tokens = new GuestCartTokenService(false);
        CartService service = new CartService(jdbc, tokens);
        String guestToken = tokens.createToken();
        String tokenHash = tokens.hash(guestToken);
        BigDecimal guestCartId = BigDecimal.ONE;
        BigDecimal customerCartId = BigDecimal.TEN;
        BigDecimal customerId = new BigDecimal("25");
        AuthUserPrincipal customer = new AuthUserPrincipal(
                customerId.toString(), "Customer", "customer@example.test", "",
                "CUSTOMER", "IT", "ACTIVE");
        when(jdbc.queryForObject(
                contains("WHERE \"guest_token\""),
                eq(BigDecimal.class),
                eq(tokenHash))).thenReturn(guestCartId);
        when(jdbc.queryForObject(
                contains("WHERE \"user_id\""),
                eq(BigDecimal.class),
                eq(customerId))).thenReturn(customerCartId);
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenReturn(List.of());

        service.mergeGuestCart(guestToken, customer);

        verify(jdbc).update(
                contains("SET \"cart_status\" = 'MERGED'"),
                eq(customerId),
                eq(guestCartId));
        verify(jdbc).update(
                contains("UPDATE \"carts\" SET \"updated_at\""),
                eq(customerCartId));
    }

    @Test
    @SuppressWarnings("unchecked")
    void mergesDuplicateOffersByAddingQuantitiesWhenStockAllows() {
        GuestCartTokenService tokens = new GuestCartTokenService(false);
        CartService service = new CartService(jdbc, tokens);
        String guestToken = tokens.createToken();
        BigDecimal offerId = new BigDecimal("42");
        BigDecimal guestCartId = BigDecimal.ONE;
        BigDecimal customerCartId = BigDecimal.TEN;
        BigDecimal customerId = new BigDecimal("25");
        AuthUserPrincipal customer = new AuthUserPrincipal(
                customerId.toString(), "Customer", "customer@example.test", "",
                "CUSTOMER", "IT", "ACTIVE");
        stubMergeInputs(tokens.hash(guestToken), guestCartId, customerCartId, customerId,
                offerId, 3, 10, List.of(new CartService.GuestLine(offerId, 2)));

        service.mergeGuestCart(guestToken, customer);

        verify(jdbc).update(
                contains("ON CONFLICT (\"cart_id\", \"offer_id\")"),
                eq(customerCartId),
                eq(offerId),
                eq(5));
        verify(jdbc).update(
                contains("DELETE FROM \"cart_items\" WHERE \"cart_id\""),
                eq(guestCartId));
    }

    @Test
    @SuppressWarnings("unchecked")
    void retainsGuestCartWhenMergedQuantityExceedsAvailableStock() {
        GuestCartTokenService tokens = new GuestCartTokenService(false);
        CartService service = new CartService(jdbc, tokens);
        String guestToken = tokens.createToken();
        BigDecimal offerId = new BigDecimal("42");
        BigDecimal guestCartId = BigDecimal.ONE;
        BigDecimal customerCartId = BigDecimal.TEN;
        BigDecimal customerId = new BigDecimal("25");
        AuthUserPrincipal customer = new AuthUserPrincipal(
                customerId.toString(), "Customer", "customer@example.test", "",
                "CUSTOMER", "IT", "ACTIVE");
        stubMergeInputs(tokens.hash(guestToken), guestCartId, customerCartId, customerId,
                offerId, 4, 5, List.of(new CartService.GuestLine(offerId, 2)));

        CartException error = assertThrows(
                CartException.class, () -> service.mergeGuestCart(guestToken, customer));

        assertEquals(HttpStatus.CONFLICT, error.status());
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @SuppressWarnings("unchecked")
    private void stubMergeInputs(
            String guestHash,
            BigDecimal guestCartId,
            BigDecimal customerCartId,
            BigDecimal customerId,
            BigDecimal offerId,
            int currentQuantity,
            int stockQuantity,
            List<CartService.GuestLine> guestLines) {
        when(jdbc.queryForObject(
                contains("WHERE \"guest_token\""),
                eq(BigDecimal.class),
                eq(guestHash))).thenReturn(guestCartId);
        when(jdbc.queryForObject(
                contains("WHERE \"user_id\""),
                eq(BigDecimal.class),
                eq(customerId))).thenReturn(customerCartId);
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenReturn(guestLines);
        when(jdbc.queryForObject(
                contains("FOR UPDATE OF po"),
                any(RowMapper.class),
                eq(offerId))).thenReturn(new CartService.Offer(
                        offerId,
                        new BigDecimal("1000"),
                        "VND",
                        stockQuantity,
                        0,
                        "ACTIVE",
                        "ACTIVE",
                        "Product",
                        "MODEL-42",
                        new BigDecimal("90"),
                        "CPU",
                        "NEW"));
        when(jdbc.queryForObject(
                contains("SELECT \"quantity\""),
                eq(Integer.class),
                eq(customerCartId),
                eq(offerId))).thenReturn(currentQuantity);
    }
}
