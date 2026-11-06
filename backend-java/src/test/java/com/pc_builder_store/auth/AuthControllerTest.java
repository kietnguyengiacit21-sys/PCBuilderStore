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
        when(authUserRepository.loadUserByUsername("unknown@example.test"))
                .thenThrow(new UsernameNotFoundException("Invalid email or password."));
    }

    @Test
    void csrfProtectsLoginAndSessionAuthenticatesMeUntilLogout() throws Exception {
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
                .andExpect(jsonPath("$.email").value(EMAIL))
                .andExpect(jsonPath("$.customerSegment").value("IT"));

        mockMvc.perform(post("/api/auth/logout")
                        .session(session)
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token()))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsWrongPasswordUnknownEmailAndInactiveAccounts() throws Exception {
        assertLoginRejected("customer@example.test", "wrong-password");
        assertLoginRejected("unknown@example.test", PASSWORD);
        assertLoginRejected("inactive@example.test", PASSWORD);
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
