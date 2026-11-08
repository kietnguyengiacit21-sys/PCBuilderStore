package com.pc_builder_store.auth;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.pc_builder_store.auth.StaffAccountDtos.Account;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class StaffAccountControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StaffAccountService staffAccountService;

    @Test
    void onlyAdminCanSearchAccounts() throws Exception {
        when(staffAccountService.listAccounts("customer")).thenReturn(List.of(
                new Account("3", "Customer", "customer@example.test", "CUSTOMER",
                        "ACTIVE", LocalDateTime.parse("2026-11-08T10:00:00"))));

        mockMvc.perform(get("/api/admin/accounts").param("q", "customer")
                        .with(user(principal("ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].userId").value("3"))
                .andExpect(jsonPath("$[0].roleCode").value("CUSTOMER"))
                .andExpect(jsonPath("$[0].passwordHash").doesNotExist());

        mockMvc.perform(get("/api/admin/accounts").with(user(principal("SALES"))))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/accounts").with(user(principal("CUSTOMER"))))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/accounts"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void onlyAdminCanChangeCustomerOrSalesRole() throws Exception {
        Account updated = new Account(
                "3", "Customer", "customer@example.test", "SALES",
                "ACTIVE", LocalDateTime.parse("2026-11-08T10:00:00"));
        when(staffAccountService.changeRole("3", "SALES", principal("ADMIN")))
                .thenReturn(updated);

        mockMvc.perform(patch("/api/admin/accounts/3/role")
                        .with(user(principal("ADMIN")))
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"roleCode\":\"SALES\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roleCode").value("SALES"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
        verify(staffAccountService).changeRole("3", "SALES", principal("ADMIN"));

        mockMvc.perform(patch("/api/admin/accounts/3/role")
                        .with(user(principal("SALES")))
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"roleCode\":\"CUSTOMER\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/admin/accounts/3/role")
                        .with(user(principal("CUSTOMER")))
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"roleCode\":\"SALES\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/admin/accounts/3/role")
                        .with(user(principal("ADMIN")))
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"roleCode\":\"ADMIN\"}"))
                .andExpect(status().isBadRequest());
    }

    private AuthUserPrincipal principal(String role) {
        return new AuthUserPrincipal("1", "Test " + role, role.toLowerCase() + "@example.test",
                "not-used", role, null, "ACTIVE");
    }
}
