package com.pc_builder_store.catalog.controller;

import static org.mockito.ArgumentMatchers.argThat;
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
    void returnsAllTypedAttributeDefinitionsWithoutChangingFacetContract() throws Exception {
        when(catalogRepository.getAttributeDefinitions()).thenReturn(List.of(
                new CatalogAttributeDefinition("CPU", "core_count", "Core Count", "INTEGER", "cores", true),
                new CatalogAttributeDefinition("CPU", "architecture", "Architecture", "TEXT", null, false),
                new CatalogAttributeDefinition(
                        "GPU", "memory_type", "Loại bộ nhớ đồ họa", "TEXT", null, false,
                        "Graphics memory type", null, "SELECT", List.of("GDDR6", "GDDR7"), "BOARD_VARIANT")));

        mockMvc.perform(get("/api/catalog/attribute-definitions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].productType").value("CPU"))
                .andExpect(jsonPath("$.data[0].code").value("core_count"))
                .andExpect(jsonPath("$.data[0].dataType").value("INTEGER"))
                .andExpect(jsonPath("$.data[0].unit").value("cores"))
                .andExpect(jsonPath("$.data[0].filterable").value(true))
                .andExpect(jsonPath("$.data[0].englishLabel").value("Core Count"))
                .andExpect(jsonPath("$.data[0].subtype").doesNotExist())
                .andExpect(jsonPath("$.data[1].dataType").value("TEXT"))
                .andExpect(jsonPath("$.data[1].filterable").value(false))
                .andExpect(jsonPath("$.data[2].inputMode").value("SELECT"))
                .andExpect(jsonPath("$.data[2].options[1]").value("GDDR7"))
                .andExpect(jsonPath("$.data[2].specificationScope").value("BOARD_VARIANT"));
    }

    @Test
    void returnsPaginatedProductListWithNestedContractFields() throws Exception {
        when(catalogRepository.findProducts(org.mockito.ArgumentMatchers.any()))
                .thenReturn(new CatalogRepository.ProductPage(List.of(product()), 1));

        mockMvc.perform(get("/api/catalog/products")
                        .param("page", "2")
                        .param("limit", "10")
                        .param("sort", "price")
                        .param("order", "desc")
                        .param("attribute", "capacity_gb=16"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].productId").value("12345678901234567890"))
                .andExpect(jsonPath("$.data[0].offers[0].price").value(123.45))
                .andExpect(jsonPath("$.data[0].offers[0].availableQuantity").value(7))
                .andExpect(jsonPath("$.data[0].specifications.capacity_gb").value(16))
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
    void returnsVerificationMetadataSeparatelyFromUnchangedSpecificationValues() throws Exception {
        CatalogProduct base = product();
        CatalogProduct verified = new CatalogProduct(
                base.productId(),
                "VERIFIED-MODEL",
                base.productName(),
                base.shortDescription(),
                base.description(),
                base.status(),
                base.productType(),
                base.productTypeName(),
                base.categoryCode(),
                base.categoryName(),
                base.brandName(),
                base.offers(),
                base.specifications(),
                Map.of("capacity_gb", new CatalogAttributeVerification(
                        CatalogVerificationStatus.VERIFIED_EXACT_MODEL,
                        "https://example.com/spec",
                        "Capacity",
                        "EXACT_MODEL")),
                base.images(),
                base.demoData());
        when(catalogRepository.findActiveProduct("VERIFIED-MODEL"))
                .thenReturn(Optional.of(verified));

        mockMvc.perform(get("/api/catalog/products/VERIFIED-MODEL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.specifications.capacity_gb").value(16))
                .andExpect(jsonPath("$.data.verificationMetadata.capacity_gb.verificationStatus")
                        .value("VERIFIED_EXACT_MODEL"))
                .andExpect(jsonPath("$.data.verificationMetadata.capacity_gb.sourceUrl")
                        .value("https://example.com/spec"))
                .andExpect(jsonPath("$.data.verificationMetadata.capacity_gb.sourceLocator")
                        .value("Capacity"))
                .andExpect(jsonPath("$.data.verificationMetadata.capacity_gb.verificationScope")
                        .value("EXACT_MODEL"));
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
        when(catalogRepository.findActiveProduct("GPU-TEST")).thenReturn(Optional.of(gpuProduct()));

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
