package com.pc_builder_store.cart;

import static com.pc_builder_store.cart.CartDtos.AddItemRequest;
import static com.pc_builder_store.cart.CartDtos.CartResponse;
import static com.pc_builder_store.cart.CartDtos.QuantityRequest;
import static com.pc_builder_store.cart.CartDtos.GiftSelectionRequest;
import static com.pc_builder_store.cart.CartDtos.ConfigurationSelectionRequest;
import com.pc_builder_store.auth.AuthUserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final CartService carts;
    private final GuestCartTokenService tokens;

    public CartController(CartService carts, GuestCartTokenService tokens) {
        this.carts = carts;
        this.tokens = tokens;
    }

    @GetMapping
    public CartResponse getCart(
            @AuthenticationPrincipal AuthUserPrincipal principal,
            HttpServletRequest request,
            HttpServletResponse response) {
        Owner owner = owner(principal, request, response);
        return carts.getCart(owner.userId(), owner.token());
    }

    @PostMapping("/items")
    public CartResponse addItem(
            @Valid @RequestBody AddItemRequest body,
            @AuthenticationPrincipal AuthUserPrincipal principal,
            HttpServletRequest request,
            HttpServletResponse response) {
        Owner owner = owner(principal, request, response);
        return carts.addItem(owner.userId(), owner.token(), body.offerId(), body.quantity());
    }

    @PutMapping("/items/{offerId}")
    public CartResponse updateQuantity(
            @PathVariable String offerId,
            @Valid @RequestBody QuantityRequest body,
            @AuthenticationPrincipal AuthUserPrincipal principal,
            HttpServletRequest request,
            HttpServletResponse response) {
        Owner owner = owner(principal, request, response);
        return carts.updateQuantity(owner.userId(), owner.token(), offerId, body.quantity());
    }

    @PutMapping("/items/{offerId}/gifts")
    public CartResponse setSelectedGifts(
            @PathVariable String offerId,
            @RequestBody GiftSelectionRequest body,
            @AuthenticationPrincipal AuthUserPrincipal principal,
            HttpServletRequest request,
            HttpServletResponse response) {
        Owner owner = owner(principal, request, response);
        return carts.setSelectedGifts(
                owner.userId(),
                owner.token(),
                offerId,
                body == null ? null : body.gifts());
    }

    @PutMapping("/items/{offerId}/configuration")
    public CartResponse setConfiguration(
            @PathVariable String offerId,
            @RequestBody ConfigurationSelectionRequest body,
            @AuthenticationPrincipal AuthUserPrincipal principal,
            HttpServletRequest request,
            HttpServletResponse response) {
        Owner owner = owner(principal, request, response);
        return carts.setConfiguration(owner.userId(), owner.token(), offerId, body);
    }

    @DeleteMapping("/items/{offerId}")
    public CartResponse removeItem(
            @PathVariable String offerId,
            @AuthenticationPrincipal AuthUserPrincipal principal,
            HttpServletRequest request,
            HttpServletResponse response) {
        Owner owner = owner(principal, request, response);
        return carts.removeItem(owner.userId(), owner.token(), offerId);
    }

    @DeleteMapping
    public CartResponse clearCart(
            @AuthenticationPrincipal AuthUserPrincipal principal,
            HttpServletRequest request,
            HttpServletResponse response) {
        Owner owner = owner(principal, request, response);
        return carts.clearCart(owner.userId(), owner.token());
    }

    private Owner owner(
            AuthUserPrincipal principal,
            HttpServletRequest request,
            HttpServletResponse response) {
        if (principal != null) {
            if (!"CUSTOMER".equals(principal.roleCode())) {
                throw new CartException(
                        org.springframework.http.HttpStatus.FORBIDDEN,
                        "Chỉ tài khoản khách hàng mới sử dụng được giỏ hàng.");
            }
            return new Owner(principal.userId(), null);
        }
        String token = tokens.tokenFrom(request);
        if (!StringUtils.hasText(token)) {
            token = tokens.createToken();
            response.addHeader(HttpHeaders.SET_COOKIE, tokens.cookie(token).toString());
        }
        return new Owner(null, token);
    }

    private record Owner(String userId, String token) {}
}
