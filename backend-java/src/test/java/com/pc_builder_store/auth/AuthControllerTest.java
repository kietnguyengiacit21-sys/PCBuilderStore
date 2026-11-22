package com.pc_builder_store.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.pc_builder_store.auth.AccountDtos.VerificationSent;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.server.ResponseStatusException;

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

    @MockitoBean
    private QuickPinService quickPinService;

    @MockitoBean
    private RegistrationVerificationService verificationService;

    @MockitoBean
    private AccountService accountService;

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
        when(authUserRepository.loadUserByUsername("khoa.tran"))
                .thenReturn(new AuthUserPrincipal(
                        "21",
                        "Khoa Tran",
                        "khoa@example.test",
                        passwordEncoder.encode(PASSWORD),
                        "CUSTOMER",
                        "IT",
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
        // A wrong password never reveals that an account is locked...
        assertLoginRejected("inactive@example.test", "wrong-password");
        // ...only the right password does, so the owner knows to contact the store.
        CsrfFixture csrf = csrfFixture();
        mockMvc.perform(post("/api/auth/login")
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType("application/json")
                        .content("""
                                {"email":"inactive@example.test","password":"%s"}
                                """.formatted(PASSWORD)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCOUNT_LOCKED"));
    }

    @Test
    void locksOutAnEmailAfterRepeatedWrongPasswords() throws Exception {
        for (int attempt = 0; attempt < LoginAttemptLimiter.MAX_FAILURES_PER_EMAIL; attempt++) {
            assertLoginRejected("sales@example.test", "wrong-password-" + attempt);
        }
        CsrfFixture csrf = csrfFixture();
        mockMvc.perform(post("/api/auth/login")
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType("application/json")
                        .content("""
                                {"email":"sales@example.test","password":"%s"}
                                """.formatted(PASSWORD)))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void sharedLoginAuthenticatesEachBackendAssignedRole() throws Exception {
        assertRoleLogin("customer@example.test", "CUSTOMER");
        assertRoleLogin("sales@example.test", "SALES");
        assertRoleLogin("admin@example.test", "ADMIN");
    }

    @Test
    void passwordLoginAlsoAcceptsTheUsername() throws Exception {
        CsrfFixture csrf = csrfFixture();
        mockMvc.perform(post("/api/auth/login")
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType("application/json")
                        .content("""
                                {"identifier":"khoa.tran","password":"%s"}
                                """.formatted(PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("khoa@example.test"));
    }

    @Test
    void quickPinLoginStartsASession() throws Exception {
        when(quickPinService.authenticate("khoa.tran", "40718263")).thenReturn(new AuthUserPrincipal(
                "21", "Khoa Tran", "khoa@example.test", "x", "CUSTOMER", "IT", "ACTIVE"));
        CsrfFixture csrf = csrfFixture();
        MvcResult login = mockMvc.perform(post("/api/auth/login/pin")
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType("application/json")
                        .content("""
                                {"username":"khoa.tran","pin":"40718263"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roleCode").value("CUSTOMER"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andReturn();

        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);
        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(jsonPath("$.authenticated").value(true))
                .andExpect(jsonPath("$.user.userId").value("21"));
    }

    @Test
    void locksTheQuickPinAfterFiveWrongTries() throws Exception {
        for (int attempt = 0; attempt < LoginAttemptLimiter.MAX_FAILURES_PER_EMAIL; attempt++) {
            pinLogin("pin.guesser", "1000000" + attempt)
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.error.code").value("INVALID_QUICK_LOGIN"));
        }
        pinLogin("pin.guesser", "40718263").andExpect(status().isTooManyRequests());
    }

    @Test
    void quickPinSettingsAreForSignedInCustomersOnly() throws Exception {
        CsrfFixture csrf = csrfFixture();
        mockMvc.perform(put("/api/auth/quick-pin")
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType("application/json")
                        .content("""
                                {"currentPassword":"x","pin":"40718263"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void signUpNeedsTheEmailedCodeBeforeTheAccountIsCreated() throws Exception {
        AccountService.NewAccount account = new AccountService.NewAccount(
                "Khoa Tran", "new@example.test", "Password123", null, "UNSPECIFIED", "khoa.new");
        when(accountService.validateRegistration(any())).thenReturn(account);
        when(verificationService.send("new@example.test", "Khoa Tran"))
                .thenReturn(new VerificationSent("new@example.test", 600, 60, null));
        doThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã xác minh không đúng. Bạn còn 4 lần thử."))
                .when(verificationService).consume("new@example.test", "000000");
        String form = """
                {"fullName":"Khoa Tran","email":"new@example.test","username":"khoa.new","password":"Password123","verificationCode":"%s"}
                """;

        CsrfFixture csrf = csrfFixture();
        mockMvc.perform(post("/api/auth/register/verification")
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType("application/json")
                        .content(form.formatted("")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("new@example.test"))
                .andExpect(jsonPath("$.developmentCode").doesNotExist());

        mockMvc.perform(post("/api/auth/register")
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType("application/json")
                        .content(form.formatted("000000")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("Mã xác minh không đúng. Bạn còn 4 lần thử."));
        verify(accountService, never()).createCustomer(any());
    }

    private org.springframework.test.web.servlet.ResultActions pinLogin(String username, String pin) throws Exception {
        CsrfFixture csrf = csrfFixture();
        return mockMvc.perform(post("/api/auth/login/pin")
                .cookie(csrf.cookie())
                .header("X-XSRF-TOKEN", csrf.token())
                .contentType("application/json")
                .content("""
                        {"username":"%s","pin":"%s"}
                        """.formatted(username, pin)));
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
