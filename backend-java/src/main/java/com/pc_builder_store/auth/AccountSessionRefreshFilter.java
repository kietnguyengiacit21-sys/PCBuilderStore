package com.pc_builder_store.auth;

import com.pc_builder_store.auth.AuthUserRepository.AccountState;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Keeps logged-in sessions in step with the database: a locked account loses its session on the
 * next request, and a role change (e.g. SALES revoked) applies immediately instead of at the next
 * login. Registered inside the security chain only (not as a standalone servlet filter).
 */
public class AccountSessionRefreshFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(AccountSessionRefreshFilter.class);

    private final AccountStateCache states;
    private final SecurityContextRepository contexts;

    public AccountSessionRefreshFilter(AccountStateCache states, SecurityContextRepository contexts) {
        this.states = states;
        this.contexts = contexts;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthUserPrincipal principal) {
            AccountState state = null;
            try {
                state = states.get(principal.userId());
            } catch (DataAccessException exception) {
                // Database trouble surfaces on the request itself; keep the session as it is.
                logger.warn("Could not refresh account state for user {}", principal.userId());
            }
            if (state != null && !"ACTIVE".equals(state.accountStatus())) {
                SecurityContextHolder.clearContext();
                HttpSession session = request.getSession(false);
                if (session != null) session.invalidate();
            } else if (state != null && (!state.roleCode().equals(principal.roleCode())
                    || !state.fullName().equals(principal.fullName()))) {
                AuthUserPrincipal refreshed = new AuthUserPrincipal(
                        principal.userId(), state.fullName(), principal.email(), principal.passwordHash(),
                        state.roleCode(), principal.customerSegment(), state.accountStatus());
                SecurityContext context = SecurityContextHolder.createEmptyContext();
                context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                        refreshed, null, refreshed.getAuthorities()));
                SecurityContextHolder.setContext(context);
                contexts.saveContext(context, request, response);
            }
        }
        chain.doFilter(request, response);
    }
}
