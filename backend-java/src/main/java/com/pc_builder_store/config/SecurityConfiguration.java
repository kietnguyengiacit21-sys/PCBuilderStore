package com.pc_builder_store.config;

import com.pc_builder_store.auth.AccountSessionRefreshFilter;
import com.pc_builder_store.auth.AccountStateCache;
import com.pc_builder_store.auth.AuthUserRepository;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.firewall.HttpFirewall;
import org.springframework.security.web.firewall.StrictHttpFirewall;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;

@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class SecurityConfiguration {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public UserDetailsService userDetailsService(AuthUserRepository repository) {
        return repository;
    }

    @Bean
    public AuthenticationProvider authenticationProvider(
            UserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        // Check the password before the account status, so "account locked" is only revealed to
        // someone who already knows the password; wrong passwords look the same for every account.
        provider.setPreAuthenticationChecks(user -> { });
        provider.setPostAuthenticationChecks(user -> {
            if (!user.isEnabled()) {
                throw new org.springframework.security.authentication.DisabledException("Account is locked.");
            }
        });
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    public SessionAuthenticationStrategy sessionAuthenticationStrategy() {
        return new ChangeSessionIdAuthenticationStrategy();
    }

    @Bean
    public HttpFirewall httpFirewall() {
        StrictHttpFirewall firewall = new StrictHttpFirewall();
        firewall.setAllowUrlEncodedSlash(true);
        return firewall;
    }

    @Bean
    public WebSecurityCustomizer webSecurityCustomizer(HttpFirewall httpFirewall) {
        return web -> web.httpFirewall(httpFirewall);
    }

    @Bean
    public CsrfTokenRepository csrfTokenRepository(
            @Value("${server.servlet.session.cookie.same-site:lax}") String sameSite,
            @Value("${server.servlet.session.cookie.secure:false}") boolean secure) {
        CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        repository.setCookiePath("/");
        repository.setCookieCustomizer(cookie -> cookie
                .sameSite(sameSite)
                .secure(secure));
        return repository;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            CsrfTokenRepository csrfTokenRepository,
            SecurityContextRepository securityContextRepository,
            SessionAuthenticationStrategy sessionAuthenticationStrategy,
            AccountStateCache accountStates) throws Exception {
        http
                // Locked accounts lose their session and role changes apply on the next request.
                .addFilterAfter(new AccountSessionRefreshFilter(accountStates, securityContextRepository),
                        SecurityContextHolderFilter.class)
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfTokenRepository)
                        .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
                .securityContext(context -> context
                        .securityContextRepository(securityContextRepository))
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                        .sessionFixation(fixation -> fixation.changeSessionId())
                        .sessionAuthenticationStrategy(sessionAuthenticationStrategy))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(
                                "/api/health",
                                "/api/health/**",
                                "/api/auth/csrf",
                                "/api/auth/login",
                                "/api/auth/login/pin",
                                "/api/auth/register",
                                "/api/auth/register/verification",
                                "/api/auth/username-availability",
                                "/api/auth/me",
                                "/api/auth/password-reset/request",
                                "/api/auth/password-reset/confirm",
                                "/api/cart",
                                "/api/cart/**")
                        .permitAll()
                        .requestMatchers("/api/catalog/admin/**")
                        .hasRole("ADMIN")
                        .requestMatchers("/api/storefront/**")
                        .permitAll()
                        // Sales staff run the order desk; retrying a failed refund stays with the admin.
                        .requestMatchers("/api/orders/admin/*/refund-retries", "/api/orders/admin/*/refund-confirmation")
                        .hasRole("ADMIN")
                        .requestMatchers("/api/orders/admin", "/api/orders/admin/**")
                        .hasAnyRole("ADMIN", "SALES")
                        .requestMatchers(
                                "/api/admin/accounts", "/api/admin/accounts/**",
                                "/api/admin/imports", "/api/admin/imports/**")
                        .hasRole("ADMIN")
                        .requestMatchers(
                                "/api/admin/dashboard",
                                "/api/admin/customers", "/api/admin/customers/**",
                                "/api/admin/reviews", "/api/admin/reviews/**")
                        .hasAnyRole("ADMIN", "SALES")
                        .requestMatchers("/api/reviews", "/api/reviews/**")
                        .hasRole("CUSTOMER")
                        .requestMatchers(HttpMethod.GET, "/api/builds/mine")
                        .authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/builds/**")
                        .authenticated()
                        .requestMatchers("/api/builds", "/api/builds/**")
                        .permitAll()
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/orders/guest",
                                "/api/orders/guest/lookup",
                                "/api/orders/guest/*/payments",
                                "/api/catalog/pc-builder/compatibility")
                        .permitAll()
                        .requestMatchers("/api/orders", "/api/orders/**")
                        .hasRole("CUSTOMER")
                        .requestMatchers(request ->
                                "GET".equals(request.getMethod())
                                        && request.getRequestURI().startsWith(
                                                request.getContextPath() + "/api/catalog/"))
                        .permitAll()
                        .requestMatchers(request ->
                                "POST".equals(request.getMethod())
                                        && request.getRequestURI().startsWith(
                                                request.getContextPath() + "/api/catalog/products/")
                                        && request.getRequestURI().endsWith("/gaming-performance"))
                        .permitAll()
                        .requestMatchers("/api/auth/quick-pin")
                        .hasRole("CUSTOMER")
                        .requestMatchers("/api/auth/logout", "/api/auth/profile", "/api/auth/password")
                        .authenticated()
                        .anyRequest()
                        .denyAll())
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .deleteCookies("PCBS_SESSION")
                        .logoutSuccessHandler((request, response, authentication) -> {
                            response.setStatus(HttpServletResponse.SC_OK);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write("{\"message\":\"Logged out.\"}");
                        }))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, exception) ->
                                writeError(response, HttpServletResponse.SC_UNAUTHORIZED,
                                        "UNAUTHENTICATED", "Vui lòng đăng nhập để tiếp tục."))
                        .accessDeniedHandler(accessDeniedHandler()));
        return http.build();
    }

    private AccessDeniedHandler accessDeniedHandler() {
        return (request, response, exception) -> {
            if (exception instanceof org.springframework.security.web.csrf.CsrfException) {
                // Usually an expired session or a tab left open for a long time.
                writeError(response, HttpStatus.FORBIDDEN.value(), "CSRF_INVALID",
                        "Phiên làm việc đã hết hạn. Vui lòng tải lại trang rồi thử lại.");
                return;
            }
            writeError(response, HttpStatus.FORBIDDEN.value(), "ACCESS_DENIED",
                    "Bạn không có quyền thực hiện thao tác này.");
        };
    }

    private void writeError(
            HttpServletResponse response, int status, String code, String message) throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding(java.nio.charset.StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(
                "{\"error\":{\"code\":\"" + code + "\",\"message\":\"" + message + "\"}}");
    }
}
