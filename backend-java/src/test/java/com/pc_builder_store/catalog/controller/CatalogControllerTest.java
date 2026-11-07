package com.pc_builder_store.catalog.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

import com.pc_builder_store.catalog.dto.CatalogAttributeFacet;
import com.pc_builder_store.catalog.dto.CatalogAttributeDefinition;
import com.pc_builder_store.catalog.dto.CatalogAttributeVerification;
import com.pc_builder_store.catalog.dto.CatalogFacets;
import com.pc_builder_store.catalog.dto.CatalogImage;
import com.pc_builder_store.catalog.dto.CatalogOffer;
import com.pc_builder_store.catalog.dto.CatalogOption;
import com.pc_builder_store.catalog.dto.CatalogProduct;
import com.pc_builder_store.catalog.dto.CatalogVerificationStatus;
import com.pc_builder_store.catalog.repository.CatalogRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest
@AutoConfigureMockMvc
class CatalogControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CatalogRepository catalogRepository;

    @MockitoBean
    private PlatformTransactionManager transactionManager;

    @Test
    void returnsFacetResponseInFrontendShape() throws Exception {
        when(catalogRepository.getFacets()).thenReturn(new CatalogFacets(
                List.of(new CatalogOption("MEMORY", "Memory")),
                List.of(new CatalogOption("RAM", "Memory")),
                List.of(new CatalogOption("Acme", "Acme")),
                List.of(new CatalogAttributeFacet(
                        "MEMORY",
                        "capacity_gb",
                        "Capacity",
                        List.of(new CatalogAttributeFacet.Value("16", "16"))))));

        mockMvc.perform(get("/api/catalog/facets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.productTypes[0].value").value("MEMORY"))
                .andExpect(jsonPath("$.data.categories[0].label").value("Memory"))
                .andExpect(jsonPath("$.data.brands[0].value").value("Acme"))
                .andExpect(jsonPath("$.data.attributes[0].values[0].value").value("16"));
    }

    @Test
    void filtersPublicAttributeDefinitionsAndKeepsFullAdminDefinitions() throws Exception {
        when(catalogRepository.getAttributeDefinitions()).thenReturn(List.of(
                new CatalogAttributeDefinition(
                        "GPU", "gpu_chip", "GPU Chip", "TEXT", null, true,
                        "GPU chip", "GPU", "TEXT", List.of(), "BOARD_VARIANT"),
                new CatalogAttributeDefinition(
                        "GPU", "architecture", "Architecture", "TEXT", null, false,
                        "Architecture", "GPU", "TEXT", List.of(), "BOARD_VARIANT"),
                new CatalogAttributeDefinition(
                        "GPU", "unlisted_attribute", "Unlisted", "TEXT", null, false,
                        "Unlisted internal label", "GPU", "SELECT", List.of("private option"),
                        "BOARD_VARIANT")));

        mockMvc.perform(get("/api/catalog/attribute-definitions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].productType").value("GPU"))
                .andExpect(jsonPath("$.data[0].code").value("gpu_chip"))
                .andExpect(jsonPath("$.data[0].label").value("GPU Chip"))
                .andExpect(jsonPath("$.data[0].dataType").value("TEXT"))
                .andExpect(jsonPath("$.data[0].unit").doesNotExist())
                .andExpect(jsonPath("$.data[0].subtype").doesNotExist())
                .andExpect(jsonPath("$.data[0].inputMode").doesNotExist())
                .andExpect(jsonPath("$.data[0].options").doesNotExist())
                .andExpect(jsonPath("$.data[0].englishLabel").doesNotExist())
                .andExpect(jsonPath("$.data[0].specificationScope").doesNotExist())
                .andExpect(jsonPath("$.data[0].filterable").doesNotExist())
                .andExpect(jsonPath("$.data[?(@.code == 'architecture')]").doesNotExist())
                .andExpect(jsonPath("$.data[?(@.code == 'unlisted_attribute')]").doesNotExist());

        mockMvc.perform(get("/api/catalog/admin/attribute-definitions"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/catalog/admin/attribute-definitions")
                        .with(user("customer").roles("CUSTOMER")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/catalog/admin/attribute-definitions")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(3))
                .andExpect(jsonPath("$.data[0].specificationScope").value("BOARD_VARIANT"))
                .andExpect(jsonPath("$.data[2].options[0]").value("private option"))
                .andExpect(jsonPath("$.data[2].englishLabel").value("Unlisted internal label"));
    }

    @Test
    void returnsPaginatedProductListWithNestedContractFields() throws Exception {
        when(catalogRepository.findProducts(org.mockito.ArgumentMatchers.any()))
                .thenReturn(new CatalogRepository.ProductPage(List.of(publicGpuProduct()), 1));

        mockMvc.perform(get("/api/catalog/products")
                        .param("page", "2")
                        .param("limit", "10")
                        .param("sort", "price")
                        .param("order", "desc")
                        .param("attribute", "vram_gb=8"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].productId").value("12345678901234567890"))
                .andExpect(jsonPath("$.data[0].offers[0].price").value(123.45))
                .andExpect(jsonPath("$.data[0].offers[0].availableQuantity").value(7))
                .andExpect(jsonPath("$.data[0].specifications.gpu_chip")
                        .value("NVIDIA GeForce RTX 4060"))
                .andExpect(jsonPath("$.data[0].specifications.architecture").doesNotExist())
                .andExpect(jsonPath("$.data[0].verificationMetadata").doesNotExist())
                .andExpect(jsonPath("$.data[0].images[0].url").value("https://example.com/image.png"))
                .andExpect(jsonPath("$.data[0].demoData").value(true))
                .andExpect(jsonPath("$.pagination.page").value(2))
                .andExpect(jsonPath("$.pagination.limit").value(10))
                .andExpect(jsonPath("$.pagination.total").value(1))
                .andExpect(jsonPath("$.pagination.totalPages").value(1))
                .andExpect(jsonPath("$.notice").isNotEmpty());

        verify(catalogRepository).findProducts(argThat(query ->
                query.page() == 2
                        && query.limit() == 10
                        && query.sort().name().equals("PRICE")
                        && query.order().name().equals("DESC")
                        && query.attributes().size() == 1));
    }

    @Test
    void filtersPublicProductDetailsAndSearchWithoutChangingStoredValues() throws Exception {
        CatalogProduct internalProduct = publicGpuProduct();
        when(catalogRepository.findActiveProduct("DUAL-RTX4060-O8G"))
                .thenReturn(Optional.of(internalProduct));
        when(catalogRepository.findProducts(org.mockito.ArgumentMatchers.any()))
                .thenReturn(new CatalogRepository.ProductPage(List.of(internalProduct), 1));

        String detailResponse = mockMvc.perform(get("/api/catalog/products/DUAL-RTX4060-O8G"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.specifications.gpu_chip")
                        .value("NVIDIA GeForce RTX 4060"))
                .andExpect(jsonPath("$.data.specifications.architecture").doesNotExist())
                .andExpect(jsonPath("$.data.specifications.unlisted_attribute").doesNotExist())
                .andExpect(jsonPath("$.data.verificationMetadata").doesNotExist())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String searchResponse = mockMvc.perform(get("/api/catalog/products")
                        .param("q", "DUAL-RTX4060-O8G"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].specifications.gpu_chip")
                        .value("NVIDIA GeForce RTX 4060"))
                .andExpect(jsonPath("$.data[0].specifications.architecture").doesNotExist())
                .andExpect(jsonPath("$.data[0].verificationMetadata").doesNotExist())
                .andReturn()
                .getResponse()
                .getContentAsString();

        for (String response : List.of(detailResponse, searchResponse)) {
            assertFalse(response.contains("https://www.asus.com/motherboards-components/graphics-cards/dual/dual-rtx4060-o8g/techspec/"));
            assertFalse(response.contains("Graphic Engine"));
            assertFalse(response.contains("Exact ASUS model specification page reviewed"));
            assertFalse(response.contains("2026-11-06"));
            assertFalse(response.contains("verification_status"));
            assertFalse(response.contains("public_visibility"));
            assertFalse(response.contains("source_url"));
            assertFalse(response.contains("source_locator"));
            assertFalse(response.contains("specification_scope"));
            assertFalse(response.contains("review_note"));
            assertFalse(response.contains("review_date"));
        }

        assertEquals("Ada Lovelace", internalProduct.specifications().path("architecture").asString());
        verify(catalogRepository, never()).updateGpuSpecifications(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void adminEndpointRetainsInternalValuesAndRequiresAdminRole() throws Exception {
        CatalogProduct internalProduct = publicGpuProduct();
        when(catalogRepository.findAdminActiveProduct("DUAL-RTX4060-O8G"))
                .thenReturn(Optional.of(internalProduct));

        mockMvc.perform(get("/api/catalog/admin/products/DUAL-RTX4060-O8G"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/catalog/admin/products/DUAL-RTX4060-O8G")
                        .with(user("customer").roles("CUSTOMER")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/catalog/admin/products/DUAL-RTX4060-O8G")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.specifications.gpu_chip")
                        .value("NVIDIA GeForce RTX 4060"))
                .andExpect(jsonPath("$.data.specifications.architecture").value("Ada Lovelace"))
                .andExpect(jsonPath("$.data.verificationMetadata.architecture.verificationStatus")
                        .value("NEEDS_REVIEW"));
    }

    @Test
    void internalLedgerCsvHasNoDownloadRoute() throws Exception {
        for (String resource : List.of(
                "catalog-attribute-internal-ledger.csv",
                "catalog-image-sources.csv",
                "catalog-verified-attribute-values.csv")) {
            mockMvc.perform(get("/catalog-internal/" + resource))
                    .andExpect(status().is4xxClientError())
                    .andExpect(result -> assertFalse(
                            result.getResponse().getContentAsString().contains("public_visibility")));
        }
    }

    @Test
    void forwardsMinMaxAndSortingRules() throws Exception {
        when(catalogRepository.findProducts(org.mockito.ArgumentMatchers.any()))
                .thenReturn(new CatalogRepository.ProductPage(List.of(), 0));

        mockMvc.perform(get("/api/catalog/products")
                        .param("minPrice", "100.25")
                        .param("maxPrice", "200.50")
                        .param("sort", "price")
                        .param("order", "desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isEmpty())
                .andExpect(jsonPath("$.pagination.totalPages").value(0));

        verify(catalogRepository).findProducts(argThat(query ->
                query.minPrice().compareTo(new BigDecimal("100.25")) == 0
                        && query.maxPrice().compareTo(new BigDecimal("200.50")) == 0));
    }

    @Test
    void returnsProductDetailAndSafeNotFoundError() throws Exception {
        when(catalogRepository.findActiveProduct("KF432C16BB/8"))
                .thenReturn(Optional.of(product()));
        mockMvc.perform(get("/api/catalog/products/KF432C16BB/8"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.modelCode").value("KF432C16BB/8"))
                .andExpect(jsonPath("$.data.productTypeName").value("Memory"))
                .andExpect(jsonPath("$.data.offers[0].isDemo").value(true))
                .andExpect(jsonPath("$.notice").isNotEmpty());

        when(catalogRepository.findActiveProduct("missing")).thenReturn(Optional.empty());
        mockMvc.perform(get("/api/catalog/products/missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("PRODUCT_NOT_FOUND"))
                .andExpect(jsonPath("$.error.message").value("The requested product was not found."))
                .andExpect(jsonPath("$.error.timestamp").doesNotExist());
    }

    @Test
    void returnsSafeBadRequestForInvalidQueryParameters() throws Exception {
        mockMvc.perform(get("/api/catalog/products")
                        .param("limit", "101"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_CATALOG_QUERY"))
                .andExpect(jsonPath("$.error.message").value(
                        "Query parameter \"limit\" must be between 1 and 100."));
    }

    @Test
    void deniesUnauthenticatedGpuSpecificationUpdates() throws Exception {
        mockMvc.perform(put("/api/catalog/admin/products/GPU-TEST/specifications")
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"specifications\":{\"vram_gb\":16}}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deniesCustomerGpuSpecificationUpdates() throws Exception {
        mockMvc.perform(put("/api/catalog/admin/products/GPU-TEST/specifications")
                        .with(csrf())
                        .with(user("customer").roles("CUSTOMER"))
                        .contentType("application/json")
                        .content("{\"specifications\":{\"vram_gb\":16}}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void deniesSalesGpuSpecificationUpdates() throws Exception {
        mockMvc.perform(put("/api/catalog/admin/products/GPU-TEST/specifications")
                        .with(csrf())
                        .with(user("sales").roles("SALES"))
                        .contentType("application/json")
                        .content("{\"specifications\":{\"vram_gb\":16}}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void persistsGpuSpecificationUpdatesThroughTheCatalogRepository() throws Exception {
        when(catalogRepository.findAdminActiveProduct("GPU-TEST")).thenReturn(Optional.of(gpuProduct()));

        mockMvc.perform(put("/api/catalog/admin/products/GPU-TEST/specifications")
                        .with(csrf())
                        .with(user("admin").roles("ADMIN"))
                        .contentType("application/json")
                        .content("""
                                {"specifications":{
                                  "vram_gb":16,
                                  "memory_type":"GDDR7",
                                  "display_outputs":[
                                    {"type":"DisplayPort","count":3,"version":"2.1a"},
                                    {"type":"HDMI","count":1,"version":"2.1b"}
                                  ]
                                }}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.productType").value("GPU"));

        verify(catalogRepository).updateGpuSpecifications(
                org.mockito.ArgumentMatchers.eq("GPU-TEST"),
                org.mockito.ArgumentMatchers.argThat(specifications ->
                        specifications.get("display_outputs").isArray()
                                && "GDDR7".equals(specifications.get("memory_type").textValue())));
    }

    @Test
    void returnsSanitizedServiceUnavailableWhenCatalogDatabaseFails() throws Exception {
        when(catalogRepository.findProducts(org.mockito.ArgumentMatchers.any()))
                .thenThrow(new DataAccessResourceFailureException(
                        "database failure with internal connection details"));

        mockMvc.perform(get("/api/catalog/products"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error.code").value("DATABASE_UNAVAILABLE"))
                .andExpect(jsonPath("$.error.message").value("Database is unavailable."))
                .andExpect(result -> org.junit.jupiter.api.Assertions.assertFalse(
                        result.getResponse().getContentAsString()
                                .contains("internal connection details")));
    }

    private CatalogProduct product() {
        return new CatalogProduct(
                "12345678901234567890",
                "KF432C16BB/8",
                "Memory kit",
                null,
                "Description",
                "ACTIVE",
                "MEMORY",
                "Memory",
                "RAM",
                "Memory",
                "Acme",
                List.of(new CatalogOffer(
                        "DEMO-KF432C16BB/8",
                        "NEW",
                        new BigDecimal("123.45"),
                        "VND",
                        10,
                        3,
                        7,
                        12L,
                        "ACTIVE",
                        true)),
                JsonMapper.builder().build().readTree("{\"capacity_gb\":16}"),
                List.of(new CatalogImage("https://example.com/image.png", null, true)),
                true);
    }

    private CatalogProduct publicGpuProduct() throws Exception {
        CatalogProduct base = product();
        return new CatalogProduct(
                base.productId(),
                "DUAL-RTX4060-O8G",
                "ASUS Dual GeForce RTX 4060 8GB",
                base.shortDescription(),
                base.description(),
                base.status(),
                "GPU",
                "Graphics card",
                "GPU",
                "Graphics card",
                base.brandName(),
                base.offers(),
                JsonMapper.builder().build().readTree("""
                        {
                          "gpu_chip":"NVIDIA GeForce RTX 4060",
                          "architecture":"Ada Lovelace",
                          "unlisted_attribute":"must not be returned"
                        }
                        """),
                Map.of(
                        "gpu_chip", new CatalogAttributeVerification(
                                CatalogVerificationStatus.VERIFIED_EXACT_VARIANT,
                                "https://www.asus.com/motherboards-components/graphics-cards/dual/dual-rtx4060-o8g/techspec/",
                                "Graphic Engine",
                                "EXACT_VARIANT"),
                        "architecture", new CatalogAttributeVerification(
                                CatalogVerificationStatus.NEEDS_REVIEW,
                                "https://www.asus.com/motherboards-components/graphics-cards/dual/dual-rtx4060-o8g/techspec/",
                                "Not listed on the exact-model specification page",
                                null)),
                base.images(),
                true);
    }

    private CatalogProduct gpuProduct() throws Exception {
        CatalogProduct product = product();
        return new CatalogProduct(
                product.productId(),
                "GPU-TEST",
                "Graphics card",
                null,
                "GPU description",
                "ACTIVE",
                "GPU",
                "Graphics card",
                "GPU",
                "Graphics card",
                "Manufacturer",
                product.offers(),
                JsonMapper.builder().build().readTree("{\"vram_gb\":16}"),
                product.images(),
                true);
    }
}
