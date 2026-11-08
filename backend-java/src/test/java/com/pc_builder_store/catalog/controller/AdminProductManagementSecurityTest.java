package com.pc_builder_store.catalog.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.pc_builder_store.catalog.dto.AdminCatalogDtos.AdminProductPage;
import com.pc_builder_store.catalog.service.AdminCatalogService;
import com.pc_builder_store.catalog.service.ProductUpgradeService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;

@SpringBootTest
@AutoConfigureMockMvc
class AdminProductManagementSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdminCatalogService adminCatalogService;

    @MockitoBean
    private ProductUpgradeService productUpgradeService;

    @MockitoBean
    private PlatformTransactionManager transactionManager;

    @Test
    void managementApiIsRestrictedToAdministrators() throws Exception {
        when(adminCatalogService.listProducts(null, null, null, 1, 50))
                .thenReturn(new AdminProductPage(List.of(), 1, 50, 0));

        mockMvc.perform(get("/api/catalog/admin/management/products"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/catalog/admin/management/products")
                        .with(user("customer").roles("CUSTOMER")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/catalog/admin/management/products")
                        .with(user("sales").roles("SALES")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/catalog/admin/management/products")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isEmpty())
                .andExpect(jsonPath("$.total").value(0));

        verify(adminCatalogService).listProducts(null, null, null, 1, 50);
    }

    @Test
    void customerAndSalesCannotCreateProducts() throws Exception {
        for (String role : List.of("CUSTOMER", "SALES")) {
            mockMvc.perform(post("/api/catalog/admin/management/products")
                            .with(user("non-admin").roles(role))
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isForbidden());
        }

        verifyNoInteractions(adminCatalogService);
    }

    @Test
    void customerAndSalesCannotReadOrSaveUpgradeConfiguration() throws Exception {
        String path = "/api/catalog/admin/management/products/TEST-PC/upgrade-config";

        mockMvc.perform(get(path))
                .andExpect(status().isUnauthorized());
        for (String role : List.of("CUSTOMER", "SALES")) {
            mockMvc.perform(get(path).with(user("non-admin").roles(role)))
                    .andExpect(status().isForbidden());
            mockMvc.perform(put(path)
                            .with(user("non-admin").roles(role))
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isForbidden());
        }

        verifyNoInteractions(productUpgradeService);
    }
}
