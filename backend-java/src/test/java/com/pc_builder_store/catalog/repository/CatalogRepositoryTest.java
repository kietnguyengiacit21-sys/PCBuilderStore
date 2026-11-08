package com.pc_builder_store.catalog.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.pc_builder_store.catalog.CatalogInternalLedger;
import com.pc_builder_store.catalog.dto.CatalogAttributeDefinition;
import com.pc_builder_store.catalog.dto.CatalogFacets;
import com.pc_builder_store.catalog.dto.CatalogProduct;
import com.pc_builder_store.catalog.dto.CatalogQuery;
import com.pc_builder_store.catalog.dto.CatalogVerificationStatus;
import com.pc_builder_store.catalog.dto.CatalogQuery.AttributeFilter;
import com.pc_builder_store.catalog.dto.CatalogQuery.Direction;
import com.pc_builder_store.catalog.dto.CatalogQuery.Sort;
import com.pc_builder_store.catalog.exception.InvalidCatalogQueryException;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import tools.jackson.databind.json.JsonMapper;

class CatalogRepositoryTest {

    private final NamedParameterJdbcTemplate jdbcTemplate =
            mock(NamedParameterJdbcTemplate.class);
    private final CatalogRepository repository =
            new CatalogRepository(
                    jdbcTemplate,
                    JsonMapper.builder().build(),
                    new CatalogInternalLedger(new ClassPathResource(
                            "catalog-internal/catalog-attribute-internal-ledger.csv")));

    @Test
    void buildsParameterizedSearchAndAttributeFilters() {
        CatalogQuery query = new CatalogQuery(
                2, 15, "unsafe%' OR TRUE --", "GPU", null, "Acme",
                null, null, Sort.NAME, Direction.DESC,
                List.of(new AttributeFilter("vram_gb", "8")));

        CatalogRepository.SqlQuery where = repository.productWhere(query);

        assertTrue(where.sql().contains(":search"));
        assertTrue(where.sql().contains(":type"));
        assertTrue(where.sql().contains(":brand"));
        assertTrue(where.sql().contains("p.\"model_code\" IN (:publicModelCodes0)"));
        assertTrue(where.sql().contains("CAST(:attributeValue0 AS jsonb)"));
        assertFalse(where.sql().contains("unsafe"));
        assertEquals("%unsafe%' OR TRUE --%", where.parameters().getValue("search"));
        assertEquals("8", where.parameters().getValue("attributeValue0"));
        assertTrue(((List<?>) where.parameters().getValue("publicModelCodes0"))
                .contains("DUAL-RTX4060-O8G"));
    }

    @Test
    void keepsPriceBoundsOnTheSameActiveOffer() {
        CatalogQuery query = new CatalogQuery(
                1, 20, null, null, null, null,
                new BigDecimal("100.00"), new BigDecimal("200.00"),
                Sort.PRICE, Direction.DESC, List.of());

        CatalogRepository.SqlQuery where = repository.productWhere(query);

        assertEquals(1, countOccurrences(where.sql(), "EXISTS (SELECT 1 FROM \"product_offers\" pf"));
        assertTrue(where.sql().contains("pf.\"price\" >= :minPrice"));
        assertTrue(where.sql().contains("pf.\"price\" <= :maxPrice"));
        assertTrue(where.sql().contains("pf.\"offer_status\" = 'ACTIVE'"));
        assertEquals(new BigDecimal("100.00"), where.parameters().getValue("minPrice"));
        assertEquals(new BigDecimal("200.00"), where.parameters().getValue("maxPrice"));
    }

    @Test
    void treatsWhitespaceAttributeValuesAsJsonStrings() {
        CatalogRepository.SqlQuery where = repository.productWhere(new CatalogQuery(
                1, 20, null, null, null, null, null, null,
                Sort.NAME, Direction.ASC,
                List.of(new AttributeFilter("vram_gb", "   "))));

        assertEquals("\"   \"", where.parameters().getValue("attributeValue0"));
    }

    @Test
    void sendsFilterValuesAsParametersWhenExecutingQueries() {
        when(jdbcTemplate.queryForObject(
                anyString(), any(SqlParameterSource.class), eq(Long.class))).thenReturn(1L);
        when(jdbcTemplate.query(
                anyString(), any(SqlParameterSource.class), any(RowMapper.class))).thenReturn(List.of());

        repository.findProducts(new CatalogQuery(
                1, 20, "model", "GPU", "GRAPHICS_CARD", "Acme",
                new BigDecimal("10.00"), new BigDecimal("20.00"),
                Sort.PRICE, Direction.ASC, List.of()));

        org.mockito.ArgumentCaptor<String> sqlCaptor =
                org.mockito.ArgumentCaptor.forClass(String.class);
        org.mockito.ArgumentCaptor<SqlParameterSource> parametersCaptor =
                org.mockito.ArgumentCaptor.forClass(SqlParameterSource.class);
        org.mockito.Mockito.verify(jdbcTemplate).queryForObject(
                sqlCaptor.capture(), parametersCaptor.capture(), eq(Long.class));
        assertTrue(sqlCaptor.getValue().contains(":search"));
        assertTrue(sqlCaptor.getValue().contains(":minPrice"));
        assertFalse(sqlCaptor.getValue().contains("10.00"));
        assertEquals("%model%", parametersCaptor.getValue().getValue("search"));
        assertEquals("GPU", parametersCaptor.getValue().getValue("type"));
    }

    @Test
    void appliesPriceSortAndPaginationWithBoundParameters() {
        when(jdbcTemplate.queryForObject(
                anyString(), any(SqlParameterSource.class), eq(Long.class))).thenReturn(25L);
        when(jdbcTemplate.query(
                anyString(), any(SqlParameterSource.class), any(RowMapper.class))).thenReturn(List.of());

        repository.findProducts(new CatalogQuery(
                3, 10, null, null, null, null, null, null,
                Sort.PRICE, Direction.DESC, List.of()));

        org.mockito.ArgumentCaptor<String> sqlCaptor =
                org.mockito.ArgumentCaptor.forClass(String.class);
        org.mockito.ArgumentCaptor<SqlParameterSource> parametersCaptor =
                org.mockito.ArgumentCaptor.forClass(SqlParameterSource.class);
        org.mockito.Mockito.verify(jdbcTemplate).query(
                sqlCaptor.capture(), parametersCaptor.capture(), any(RowMapper.class));
        assertTrue(sqlCaptor.getValue().contains("DESC NULLS LAST, p.\"product_name\" ASC"));
        assertTrue(sqlCaptor.getValue().contains("LIMIT :limit OFFSET :offset"));
        assertEquals(10, parametersCaptor.getValue().getValue("limit"));
        assertEquals(20L, parametersCaptor.getValue().getValue("offset"));
    }

    @Test
    void rejectsAttributeCodesNotMarkedAsFilterable() {
        when(jdbcTemplate.queryForList(
                anyString(), org.mockito.ArgumentMatchers.<Map<String, ?>>any(), eq(String.class)))
                .thenReturn(List.of());

        assertThrows(InvalidCatalogQueryException.class, () -> repository.findProducts(
                new CatalogQuery(
                        1, 20, null, "GPU", null, null, null, null,
                        Sort.NAME, Direction.ASC,
                        List.of(new AttributeFilter("vram_gb", "value")))));
    }

    @Test
    void includesOnlyLedgerAllowlistedValuesInAttributeFacets() throws Exception {
        when(jdbcTemplate.query(
                        anyString(),
                        org.mockito.ArgumentMatchers.<Map<String, ?>>any(),
                        any(RowMapper.class)))
                .thenAnswer(invocation -> {
                    String sql = invocation.getArgument(0);
                    if (!sql.contains("AS \"valueJson\"")) {
                        return List.of();
                    }
                    RowMapper<?> rowMapper = invocation.getArgument(2);
                    List<Object> rows = new ArrayList<>();
                    rows.add(rowMapper.mapRow(facetRow(
                            "GPU", "DUAL-RTX4060-O8G", "gpu_chip", "GPU Chip",
                            "\"NVIDIA GeForce RTX 4060\""), 0));
                    rows.add(rowMapper.mapRow(facetRow(
                            "GPU", "DUAL-RTX4060-O8G", "architecture", "Architecture",
                            "\"Ada Lovelace\""), 1));
                    rows.add(rowMapper.mapRow(facetRow(
                            "GPU", "DUAL-RTX4060-O8G", "unlisted_attribute", "Unlisted",
                            "\"must not appear\""), 2));
                    return rows;
                });

        CatalogFacets facets = repository.getFacets();

        assertEquals(1, facets.attributes().size());
        assertEquals("gpu_chip", facets.attributes().getFirst().code());
        assertEquals(
                List.of(new com.pc_builder_store.catalog.dto.CatalogAttributeFacet.Value(
                        "NVIDIA GeForce RTX 4060", "\"NVIDIA GeForce RTX 4060\"")),
                facets.attributes().getFirst().values());
    }

    @Test
    void mapsPostgresJsonTextToTypedResponseFields() throws Exception {
        ResultSet row = mock(ResultSet.class);
        when(row.getString("productId")).thenReturn("18446744073709551615");
        when(row.getString("modelCode")).thenReturn("KF432C16BB/8");
        when(row.getString("productName")).thenReturn("Memory kit");
        when(row.getString("status")).thenReturn("ACTIVE");
        when(row.getString("productType")).thenReturn("MEMORY");
        when(row.getString("productTypeName")).thenReturn("Memory");
        when(row.getString("categoryCode")).thenReturn("RAM");
        when(row.getString("categoryName")).thenReturn("Memory");
        when(row.getString("offersJson")).thenReturn("""
                [{"offerId":"18446744073709551615","condition":"NEW","price":123.45,"currency":"VND",
                  "stockQuantity":10,"reservedQuantity":3,"availableQuantity":7,
                  "warrantyMonths":12,"status":"ACTIVE"}]
                """);
        when(row.getString("specificationsJson")).thenReturn(
                "{\"capacity_gb\":16,\"supports_xmp\":true}");
        when(row.getString("specificationQualityJson")).thenReturn(
                "{\"capacity_gb\":{\"valueQuality\":\"MANUFACTURER_SOURCE\","
                        + "\"displayLabel\":\"Theo thông số hãng\",\"reviewNote\":\"private\"}}");
        when(row.getString("verificationMetadataJson")).thenReturn("""
                {
                  "capacity_gb":{"verificationStatus":"VERIFIED_EXACT_MODEL","sourceUrl":"https://example.com/spec","sourceLocator":"Capacity","verificationScope":"EXACT_MODEL"},
                  "memory_type":{"verificationStatus":"VERIFIED_EXACT_VARIANT","sourceUrl":"https://example.com/variant","sourceLocator":"Memory type","verificationScope":"EXACT_VARIANT"},
                  "supports_xmp":{"verificationStatus":"NEEDS_REVIEW"},
                  "missing_field":{"verificationStatus":"UNKNOWN"}
                }
                """);
        when(row.getString("imagesJson")).thenReturn("""
                [{"url":"https://user:password@example.com/image.png","altText":"bad","isPrimary":true},
                 {"url":"https://example.com:99999/image.png","altText":"bad port","isPrimary":true},
                 {"url":"https://example.com/image.png","altText":"good","isPrimary":false}]
                """);
        when(row.getString("bomComponentsJson")).thenReturn("""
                [{"componentProductId":"2","modelCode":"CPU-1","productName":"Processor",
                  "productType":"CPU","quantity":1,"warrantyMonths":24,
                  "displayCategory":"CPU","displayOrder":0}]
                """);
        when(row.getString("contentSectionsJson")).thenReturn(
                "[{\"title\":\"Overview\",\"body\":\"Customer content\"}]");
        when(row.getBoolean("demoData")).thenReturn(true);

        CatalogProduct product = repository.mapProduct(row, 0);

        assertEquals("18446744073709551615", product.productId());
        assertEquals("KF432C16BB/8", product.modelCode());
        assertEquals(new BigDecimal("123.45"), product.offers().get(0).price());
        assertEquals(7, product.offers().get(0).availableQuantity());
        assertEquals("18446744073709551615", product.offers().get(0).offerId());
        assertEquals(16, product.specifications().path("capacity_gb").intValue());
        assertTrue(product.specifications().path("supports_xmp").booleanValue());
        assertEquals("MANUFACTURER_SOURCE",
                product.specificationQuality().get("capacity_gb").valueQuality());
        assertEquals("Theo thông số hãng",
                product.specificationQuality().get("capacity_gb").displayLabel());
        assertEquals(
                CatalogVerificationStatus.VERIFIED_EXACT_MODEL,
                product.verificationMetadata().get("capacity_gb").verificationStatus());
        assertEquals("https://example.com/spec",
                product.verificationMetadata().get("capacity_gb").sourceUrl());
        assertEquals("Capacity", product.verificationMetadata().get("capacity_gb").sourceLocator());
        assertEquals("EXACT_MODEL",
                product.verificationMetadata().get("capacity_gb").verificationScope());
        assertEquals(CatalogVerificationStatus.VERIFIED_EXACT_VARIANT,
                product.verificationMetadata().get("memory_type").verificationStatus());
        assertEquals("EXACT_VARIANT",
                product.verificationMetadata().get("memory_type").verificationScope());
        assertEquals(CatalogVerificationStatus.NEEDS_REVIEW,
                product.verificationMetadata().get("supports_xmp").verificationStatus());
        assertEquals(CatalogVerificationStatus.UNKNOWN,
                product.verificationMetadata().get("missing_field").verificationStatus());
        assertEquals(1, product.images().size());
        assertEquals("https://example.com/image.png", product.images().get(0).url());
        assertEquals(1, product.bomComponents().size());
        assertEquals("CPU-1", product.bomComponents().getFirst().modelCode());
        assertEquals("Customer content", product.contentSections().get(0).path("body").asString());
        assertTrue(product.demoData());
    }

    @Test
    void registryMetadataOverridesStaleStoredGpuLabelsAndUnits() throws Exception {
        when(jdbcTemplate.query(
                anyString(),
                org.mockito.ArgumentMatchers.<Map<String, ?>>any(),
                any(RowMapper.class)))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    RowMapper<CatalogAttributeDefinition> rowMapper = invocation.getArgument(2);
                    ResultSet row = mock(ResultSet.class);
                    when(row.getString("productType")).thenReturn("GPU");
                    when(row.getString("code")).thenReturn("vram_gb");
                    when(row.getString("label")).thenReturn("Old VRAM label");
                    when(row.getString("dataType")).thenReturn("DECIMAL");
                    when(row.getString("unit")).thenReturn("old-unit");
                    when(row.getBoolean("filterable")).thenReturn(false);
                    return List.of(rowMapper.mapRow(row, 0));
                });

        CatalogAttributeDefinition definition = repository.getAttributeDefinitions().stream()
                .filter(item -> item.productType().equals("GPU") && item.code().equals("vram_gb"))
                .findFirst()
                .orElseThrow();

        assertEquals("Dung lượng VRAM", definition.label());
        assertEquals("VRAM capacity", definition.englishLabel());
        assertEquals("INTEGER", definition.dataType());
        assertEquals("GB", definition.unit());
        assertTrue(definition.filterable());
        assertEquals("BOARD_VARIANT", definition.specificationScope());
    }

    private int countOccurrences(String value, String match) {
        int count = 0;
        int index = 0;
        while ((index = value.indexOf(match, index)) >= 0) {
            count++;
            index += match.length();
        }
        return count;
    }

    private ResultSet facetRow(
            String productType,
            String modelCode,
            String code,
            String label,
            String valueJson) throws Exception {
        ResultSet row = mock(ResultSet.class);
        when(row.getString("productType")).thenReturn(productType);
        when(row.getString("modelCode")).thenReturn(modelCode);
        when(row.getString("code")).thenReturn(code);
        when(row.getString("label")).thenReturn(label);
        when(row.getString("valueJson")).thenReturn(valueJson);
        return row;
    }
}
