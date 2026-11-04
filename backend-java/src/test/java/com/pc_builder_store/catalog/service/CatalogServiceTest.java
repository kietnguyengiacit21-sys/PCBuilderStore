package com.pc_builder_store.catalog.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

import com.pc_builder_store.catalog.dto.CatalogQuery;
import com.pc_builder_store.catalog.exception.InvalidCatalogQueryException;
import com.pc_builder_store.catalog.repository.CatalogRepository;
import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.Test;

class CatalogServiceTest {

    private final CatalogService service = new CatalogService(mock(CatalogRepository.class));

    @Test
    void appliesPaginationDefaults() {
        CatalogQuery query = service.parseQuery(Map.of());

        assertEquals(1, query.page());
        assertEquals(20, query.limit());
        assertEquals(CatalogQuery.Sort.NAME, query.sort());
        assertEquals(CatalogQuery.Direction.ASC, query.order());
    }

    @Test
    void validatesPricePrecisionRangeAndOrdering() {
        CatalogQuery query = service.parseQuery(Map.of(
                "minPrice", new String[]{"0.10"},
                "maxPrice", new String[]{"9999999999999.99"}));

        assertEquals(new BigDecimal("0.10"), query.minPrice());
        assertEquals(new BigDecimal("9999999999999.99"), query.maxPrice());
        assertInvalid(Map.of("minPrice", new String[]{"1.001"}));
        assertInvalid(Map.of("minPrice", new String[]{"10000000000000"}));
        assertInvalid(Map.of(
                "minPrice", new String[]{"20"},
                "maxPrice", new String[]{"10"}));
    }

    @Test
    void rejectsOutOfRangePaginationAndUnsupportedParameters() {
        assertInvalid(Map.of("page", new String[]{"0"}));
        assertInvalid(Map.of("page", new String[]{"100001"}));
        assertInvalid(Map.of("limit", new String[]{"101"}));
        assertInvalid(Map.of("unexpected", new String[]{"value"}));
    }

    @Test
    void rejectsLongSearchAndInvalidSortOrOrder() {
        assertInvalid(Map.of("q", new String[]{"x".repeat(201)}));
        assertInvalid(Map.of("sort", new String[]{"created"}));
        assertInvalid(Map.of("order", new String[]{"sideways"}));
    }

    @Test
    void parsesRepeatedAttributesAndRejectsBadOrDuplicateCodes() {
        CatalogQuery query = service.parseQuery(Map.of(
                "attribute", new String[]{"memory_type=DDR5", "capacity_gb=16"}));
        assertEquals(2, query.attributes().size());

        assertInvalid(Map.of("attribute", new String[]{"MemoryType=DDR5"}));
        assertInvalid(Map.of("attribute", new String[]{"memory_type=DDR4", "memory_type=DDR5"}));
        assertInvalid(Map.of("attribute", new String[]{"=value"}));
    }

    private void assertInvalid(Map<String, String[]> parameters) {
        assertThrows(InvalidCatalogQueryException.class, () -> service.parseQuery(parameters));
    }
}
