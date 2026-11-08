package com.pc_builder_store.auth;

import com.pc_builder_store.common.ApiErrorResponse;
import com.pc_builder_store.cart.CartException;
import com.pc_builder_store.cart.CartService;
import com.pc_builder_store.cart.GuestCartTokenService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;
    private final CartService cartService;
    private final GuestCartTokenService guestCartTokens;

    public AuthController(
            AuthenticationManager authenticationManager,
            SecurityContextRepository securityContextRepository,
            SessionAuthenticationStrategy sessionAuthenticationStrategy,
            CartService cartService,
            GuestCartTokenService guestCartTokens) {
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.sessionAuthenticationStrategy = sessionAuthenticationStrategy;
        this.cartService = cartService;
        this.guestCartTokens = guestCartTokens;
    }

    @GetMapping("/csrf")
    public CsrfResponse csrf(CsrfToken csrfToken) {
        return new CsrfResponse(csrfToken.getToken());
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    org.springframework.security.authentication.UsernamePasswordAuthenticationToken
                            .unauthenticated(request.email(), request.password()));
        } catch (BadCredentialsException | DisabledException exception) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiErrorResponse.of("INVALID_CREDENTIALS", "Invalid email or password."));
        } catch (AuthenticationException exception) {
            throw exception;
        }

        AuthUserPrincipal user = (AuthUserPrincipal) authentication.getPrincipal();
        if ("CUSTOMER".equals(user.roleCode())) {
            String guestToken = guestCartTokens.tokenFrom(servletRequest);
            if (guestToken != null) {
                try {
                    cartService.mergeGuestCart(guestToken, user);
                    servletResponse.addHeader(
                            org.springframework.http.HttpHeaders.SET_COOKIE,
                            guestCartTokens.clearCookie().toString());
                } catch (CartException exception) {
                    return ResponseEntity.status(exception.status())
                            .body(ApiErrorResponse.of(
                                    "GUEST_CART_MERGE_FAILED", exception.getMessage()));
                }
            }
        }

        sessionAuthenticationStrategy.onAuthentication(
                authentication, servletRequest, servletResponse);
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, servletRequest, servletResponse);

        return ResponseEntity.ok(AuthUserResponse.from(user));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthSessionResponse> me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return ResponseEntity.ok(new AuthSessionResponse(false, null));
        }
        return ResponseEntity.ok(new AuthSessionResponse(
                true,
                AuthUserResponse.from((AuthUserPrincipal) authentication.getPrincipal())));
    }
}
