package com.pc_builder_store.auth;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {

    private static final String EMAIL = "customer@example.test";
    private static final String PASSWORD = "LocalTestPassword@2026";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private AuthUserRepository authUserRepository;

    @BeforeEach
    void setUp() {
        when(authUserRepository.loadUserByUsername(EMAIL))
                .thenReturn(new AuthUserPrincipal(
                        "18446744073709551614",
                        "Test Customer",
                        EMAIL,
                        passwordEncoder.encode(PASSWORD),
                        "CUSTOMER",
                        "IT",
                        "ACTIVE"));
        when(authUserRepository.loadUserByUsername("inactive@example.test"))
                .thenReturn(new AuthUserPrincipal(
                        "15",
                        "Inactive Customer",
                        "inactive@example.test",
                        passwordEncoder.encode(PASSWORD),
                        "CUSTOMER",
                        "IT",
                        "INACTIVE"));
        when(authUserRepository.loadUserByUsername("sales@example.test"))
                .thenReturn(new AuthUserPrincipal(
                        "16",
                        "Test Sales",
                        "sales@example.test",
                        passwordEncoder.encode(PASSWORD),
                        "SALES",
                        null,
                        "ACTIVE"));
        when(authUserRepository.loadUserByUsername("admin@example.test"))
                .thenReturn(new AuthUserPrincipal(
                        "17",
                        "Test Admin",
                        "admin@example.test",
                        passwordEncoder.encode(PASSWORD),
                        "ADMIN",
                        null,
                        "ACTIVE"));
        when(authUserRepository.loadUserByUsername("unknown@example.test"))
                .thenThrow(new UsernameNotFoundException("Invalid email or password."));
    }

    @Test
    void csrfProtectsLoginAndSessionAuthenticatesMeUntilLogout() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(false));

        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                                {"email":"customer@example.test","password":"LocalTestPassword@2026"}
                                """))
                .andExpect(status().isForbidden());

        CsrfFixture csrf = csrfFixture();
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType("application/json")
                        .content("""
                                {"email":"customer@example.test","password":"LocalTestPassword@2026"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value("18446744073709551614"))
                .andExpect(jsonPath("$.roleCode").value("CUSTOMER"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andReturn();

        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);
        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(true))
                .andExpect(jsonPath("$.user.email").value(EMAIL))
                .andExpect(jsonPath("$.user.customerSegment").value("IT"));

        mockMvc.perform(post("/api/auth/logout")
                        .session(session)
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token()))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(false));
    }

    @Test
    void rejectsWrongPasswordUnknownEmailAndInactiveAccounts() throws Exception {
        assertLoginRejected("customer@example.test", "wrong-password");
        assertLoginRejected("unknown@example.test", PASSWORD);
        assertLoginRejected("inactive@example.test", PASSWORD);
    }

    @Test
    void sharedLoginAuthenticatesEachBackendAssignedRole() throws Exception {
        assertRoleLogin("customer@example.test", "CUSTOMER");
        assertRoleLogin("sales@example.test", "SALES");
        assertRoleLogin("admin@example.test", "ADMIN");
    }

    private void assertRoleLogin(String email, String role) throws Exception {
        CsrfFixture csrf = csrfFixture();
        mockMvc.perform(post("/api/auth/login")
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType("application/json")
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roleCode").value(role))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    private void assertLoginRejected(String email, String password) throws Exception {
        CsrfFixture csrf = csrfFixture();
        mockMvc.perform(post("/api/auth/login")
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType("application/json")
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, password)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_CREDENTIALS"));
    }

    private CsrfFixture csrfFixture() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk())
                .andReturn();
        String body = result.getResponse().getContentAsString();
        String token = JsonPath.read(body, "$.token");
        Cookie cookie = result.getResponse().getCookie("XSRF-TOKEN");
        if (cookie == null) {
            throw new AssertionError("CSRF response did not set its cookie.");
        }
        return new CsrfFixture(token, cookie);
    }

    private record CsrfFixture(String token, Cookie cookie) {
    }
}
