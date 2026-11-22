package com.pc_builder_store.auth;

import com.pc_builder_store.auth.AccountDtos.PasswordChangeRequest;
import com.pc_builder_store.auth.AccountDtos.PinLoginRequest;
import com.pc_builder_store.auth.AccountDtos.Profile;
import com.pc_builder_store.auth.AccountDtos.ProfileUpdateRequest;
import com.pc_builder_store.auth.AccountDtos.QuickPinRequest;
import com.pc_builder_store.auth.AccountDtos.RegisterRequest;
import com.pc_builder_store.auth.AccountDtos.UsernameAvailability;
import com.pc_builder_store.auth.AccountDtos.VerificationSent;
import com.pc_builder_store.common.ApiErrorResponse;
import com.pc_builder_store.cart.CartException;
import com.pc_builder_store.cart.CartService;
import com.pc_builder_store.cart.GuestCartTokenService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
    private final AccountService accounts;
    private final LoginAttemptLimiter limiter;
    private final AccountStateCache states;
    private final AuthUserRepository users;
    private final PasswordResetService passwordResets;
    private final RegistrationVerificationService verifications;
    private final QuickPinService quickPins;

    public AuthController(
            AuthenticationManager authenticationManager,
            SecurityContextRepository securityContextRepository,
            SessionAuthenticationStrategy sessionAuthenticationStrategy,
            CartService cartService,
            GuestCartTokenService guestCartTokens,
            AccountService accounts,
            LoginAttemptLimiter limiter,
            AccountStateCache states,
            AuthUserRepository users,
            PasswordResetService passwordResets,
            RegistrationVerificationService verifications,
            QuickPinService quickPins) {
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.sessionAuthenticationStrategy = sessionAuthenticationStrategy;
        this.cartService = cartService;
        this.guestCartTokens = guestCartTokens;
        this.accounts = accounts;
        this.limiter = limiter;
        this.states = states;
        this.users = users;
        this.passwordResets = passwordResets;
        this.verifications = verifications;
        this.quickPins = quickPins;
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
        String clientIp = servletRequest.getRemoteAddr();
        limiter.checkLogin(request.identifier(), clientIp);
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(request.identifier(), request.password()));
        } catch (DisabledException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiErrorResponse.of("ACCOUNT_LOCKED",
                    "Tài khoản đã bị khóa. Vui lòng liên hệ cửa hàng để được hỗ trợ."));
        } catch (BadCredentialsException exception) {
            limiter.recordFailure(request.identifier(), clientIp);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiErrorResponse.of("INVALID_CREDENTIALS", "Email/tên đăng nhập hoặc mật khẩu không đúng."));
        } catch (AuthenticationException exception) {
            throw exception;
        }
        limiter.recordSuccess(request.identifier());
        return completeLogin(authentication, servletRequest, servletResponse);
    }

    /** Customer quick login: username + the 8-digit PIN they set on the account page. */
    @PostMapping("/login/pin")
    public ResponseEntity<?> loginWithPin(
            @RequestBody PinLoginRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        String username = request == null || request.username() == null ? "" : request.username();
        // Separate counter from the password login: 5 wrong PINs lock the PIN for that username for 15 minutes.
        String limiterKey = "pin:" + username.trim().toLowerCase(java.util.Locale.ROOT).replaceFirst("^@", "");
        String clientIp = servletRequest.getRemoteAddr();
        limiter.checkLogin(limiterKey, clientIp);
        AuthUserPrincipal user;
        try {
            user = quickPins.authenticate(username, request == null ? null : request.pin());
        } catch (DisabledException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiErrorResponse.of("ACCOUNT_LOCKED",
                    "Tài khoản đã bị khóa. Vui lòng liên hệ cửa hàng để được hỗ trợ."));
        }
        if (user == null) {
            limiter.recordFailure(limiterKey, clientIp);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiErrorResponse.of("INVALID_QUICK_LOGIN",
                    "Tên đăng nhập hoặc mã PIN không đúng (hoặc tài khoản chưa bật đăng nhập nhanh)."));
        }
        limiter.recordSuccess(limiterKey);
        return completeLogin(UsernamePasswordAuthenticationToken.authenticated(user, null, user.getAuthorities()),
                servletRequest, servletResponse);
    }

    private ResponseEntity<?> completeLogin(
            Authentication authentication, HttpServletRequest servletRequest, HttpServletResponse servletResponse) {
        AuthUserPrincipal user = (AuthUserPrincipal) authentication.getPrincipal();
        try {
            users.markLogin(user.userId());
        } catch (org.springframework.dao.DataAccessException exception) {
            // The login itself succeeded; the "last login" stamp is informational.
        }
        return startSession(authentication, HttpStatus.OK, servletRequest, servletResponse);
    }

    /** Step 1 of sign-up: checks the form and emails a 6-digit code to the address. */
    @PostMapping("/register/verification")
    public VerificationSent sendRegistrationCode(
            @RequestBody RegisterRequest request, HttpServletRequest servletRequest) {
        AccountService.NewAccount account = accounts.validateRegistration(request);
        limiter.checkAction("signup-code-ip:" + servletRequest.getRemoteAddr(), 20, java.time.Duration.ofHours(1),
                "Bạn đã yêu cầu quá nhiều mã xác minh. Vui lòng thử lại sau.");
        limiter.checkAction("signup-code-email:" + account.email(), 5, java.time.Duration.ofHours(1),
                "Email này đã nhận quá nhiều mã trong 1 giờ. Vui lòng thử lại sau.");
        return verifications.send(account.email(), account.fullName());
    }

    /** Step 2 of sign-up: creates the customer once the emailed code is right, signs it in and keeps the guest cart. */
    @PostMapping("/register")
    public ResponseEntity<?> register(
            @RequestBody RegisterRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        limiter.checkAction("register:" + servletRequest.getRemoteAddr(), 30, java.time.Duration.ofHours(1),
                "Bạn đã thử đăng ký quá nhiều lần trong thời gian ngắn. Vui lòng thử lại sau.");
        AccountService.NewAccount account = accounts.validateRegistration(request);
        verifications.consume(account.email(), request.verificationCode());
        AuthUserPrincipal user = accounts.createCustomer(account);
        Authentication authentication =
                UsernamePasswordAuthenticationToken.authenticated(user, null, user.getAuthorities());
        return startSession(authentication, HttpStatus.CREATED, servletRequest, servletResponse);
    }

    /** Live check for the sign-up and account forms. Signed-in users may keep their own name. */
    @GetMapping("/username-availability")
    public UsernameAvailability usernameAvailability(
            @RequestParam(name = "username", required = false) String username,
            @AuthenticationPrincipal AuthUserPrincipal user,
            HttpServletRequest servletRequest) {
        limiter.checkAction("username-check:" + servletRequest.getRemoteAddr(), 120, java.time.Duration.ofMinutes(10),
                "Bạn kiểm tra quá nhiều lần. Vui lòng thử lại sau ít phút.");
        return accounts.usernameAvailability(username, user);
    }

    /** Turns quick login on or changes the PIN (customers only, current password required). */
    @PutMapping("/quick-pin")
    public Map<String, String> setQuickPin(
            @AuthenticationPrincipal AuthUserPrincipal user, @RequestBody QuickPinRequest request) {
        quickPins.setPin(user, request == null ? null : request.currentPassword(), request == null ? null : request.pin());
        return Map.of("message", "Đã bật đăng nhập nhanh. Lần sau chỉ cần nhập tên đăng nhập và mã PIN.");
    }

    @DeleteMapping("/quick-pin")
    public Map<String, String> removeQuickPin(@AuthenticationPrincipal AuthUserPrincipal user) {
        quickPins.removePin(user);
        return Map.of("message", "Đã tắt đăng nhập nhanh bằng mã PIN.");
    }

    @GetMapping("/me")
    public ResponseEntity<AuthSessionResponse> me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return ResponseEntity.ok(new AuthSessionResponse(false, null));
        }
        AuthUserPrincipal user = (AuthUserPrincipal) authentication.getPrincipal();
        AuthUserRepository.AccountState state = states.get(user.userId());
        return ResponseEntity.ok(new AuthSessionResponse(
                true, AuthUserResponse.from(user, state != null && state.mustChangePassword())));
    }

    public record PasswordResetRequest(String email) {}

    public record PasswordResetConfirmation(String token, String newPassword) {}

    /** Emails a reset link when the account exists; the answer is the same either way. */
    @PostMapping("/password-reset/request")
    public Map<String, String> requestPasswordReset(
            @RequestBody PasswordResetRequest request, HttpServletRequest servletRequest) {
        String email = request == null || request.email() == null ? "" : request.email().trim().toLowerCase(java.util.Locale.ROOT);
        limiter.checkAction("reset-ip:" + servletRequest.getRemoteAddr(), 10, java.time.Duration.ofHours(1),
                "Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau.");
        limiter.checkAction("reset-email:" + email, 3, java.time.Duration.ofMinutes(15),
                "Link đặt lại mật khẩu vừa được gửi. Vui lòng kiểm tra email hoặc thử lại sau 15 phút.");
        passwordResets.request(email);
        return Map.of("message", "Nếu email đã đăng ký, chúng tôi đã gửi link đặt lại mật khẩu. Link có hiệu lực trong 30 phút.");
    }

    @PostMapping("/password-reset/confirm")
    public Map<String, String> confirmPasswordReset(@RequestBody PasswordResetConfirmation request) {
        passwordResets.confirm(request == null ? null : request.token(), request == null ? null : request.newPassword());
        return Map.of("message", "Đã đặt mật khẩu mới. Bạn có thể đăng nhập.");
    }

    @GetMapping("/profile")
    public Profile profile(@AuthenticationPrincipal AuthUserPrincipal user) {
        return accounts.profile(user);
    }

    @PutMapping("/profile")
    public Profile updateProfile(
            @AuthenticationPrincipal AuthUserPrincipal user,
            @RequestBody ProfileUpdateRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        AuthUserPrincipal refreshed = accounts.updateProfile(user, request);
        // Keep the session principal in step so /me shows the new name straight away.
        saveContext(UsernamePasswordAuthenticationToken.authenticated(
                refreshed, null, refreshed.getAuthorities()), servletRequest, servletResponse);
        return accounts.profile(refreshed);
    }

    @PostMapping("/password")
    public Map<String, String> changePassword(
            @AuthenticationPrincipal AuthUserPrincipal user,
            @RequestBody PasswordChangeRequest request) {
        boolean quickPinRemoved = accounts.changePassword(user, request);
        states.evict(user.userId());
        return Map.of("message", quickPinRemoved
                ? "Đã đổi mật khẩu. Để bảo mật, mã PIN đăng nhập nhanh đã được tắt; bạn có thể đặt lại bên dưới."
                : "Đã đổi mật khẩu.");
    }

    private ResponseEntity<?> startSession(
            Authentication authentication,
            HttpStatus status,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
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
        saveContext(authentication, servletRequest, servletResponse);
        return ResponseEntity.status(status).body(AuthUserResponse.from(user));
    }

    private void saveContext(
            Authentication authentication,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, servletRequest, servletResponse);
    }
}
