package com.pc_builder_store.inventory;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

@ExtendWith(MockitoExtension.class)
class ComponentInventoryServiceTest {

    @Mock
    private JdbcTemplate jdbc;

    @Test
    void allocatesComponentStockFromActiveNewOffersInStableOfferOrder() {
        when(jdbc.queryForList(
                contains("\"condition_code\" = 'NEW'"),
                any(Object[].class)))
                .thenReturn(List.of(
                        offer("101", "10", 1, 0),
                        offer("102", "10", 3, 0),
                        offer("201", "20", 2, 0)));
        when(jdbc.update(anyString(), any(Object[].class))).thenReturn(1);

        ComponentInventoryService service = new ComponentInventoryService(
                jdbc, JsonMapper.builder().build());
        service.reserveFromSnapshot("""
                [
                  {"productId":"10","modelCode":"CPU-TEST","quantity":3},
                  {"productId":"20","modelCode":"RAM-TEST","quantity":1}
                ]
                """, new BigDecimal("500"));

        verify(jdbc).queryForList(
                contains("ORDER BY po.\"offer_id\""),
                any(Object[].class));
        verify(jdbc).queryForList(
                contains("po.\"condition_code\" = 'NEW'"),
                any(Object[].class));
        verify(jdbc, org.mockito.Mockito.times(6))
                .update(anyString(), any(Object[].class));
    }

    @Test
    void refusesReservationWhenAnyRequiredComponentHasNoNewStock() {
        when(jdbc.queryForList(
                contains("\"condition_code\" = 'NEW'"),
                any(Object[].class)))
                .thenReturn(List.of(offer("101", "10", 1, 0)));
        when(jdbc.update(anyString(), any(Object[].class))).thenReturn(1);

        ComponentInventoryService service = new ComponentInventoryService(
                jdbc, JsonMapper.builder().build());

        assertThrows(ResponseStatusException.class, () -> service.reserveFromSnapshot("""
                [
                  {"productId":"10","modelCode":"CPU-TEST","quantity":1},
                  {"productId":"20","modelCode":"RAM-TEST","quantity":1}
                ]
                """, new BigDecimal("501")));
    }

    @Test
    void rejectsMalformedHistoricalComponentSnapshots() {
        ComponentInventoryService service = new ComponentInventoryService(
                jdbc, JsonMapper.builder().build());

        assertThrows(ResponseStatusException.class, () -> service.readSnapshot("""
                [{"productId":"10","modelCode":"CPU-TEST","quantity":0}]
                """));
    }

    @Test
    void reservationsUseTheSnapshotOfferInsteadOfSubstitutingAnotherActiveNewOffer() {
        when(jdbc.queryForList(
                contains("\"condition_code\" = 'NEW'"),
                any(Object[].class)))
                .thenReturn(List.of(offer("101", "10", 8, 0)));
        ComponentInventoryService service = new ComponentInventoryService(
                jdbc, JsonMapper.builder().build());

        assertThrows(ResponseStatusException.class, () -> service.reserveFromSnapshot("""
                [{"productId":"10","modelCode":"CPU-TEST","quantity":1,"offerId":102}]
                """, new BigDecimal("502")));

        verify(jdbc, never()).update(
                contains("WHERE \"offer_id\" = ?"), any(Object[].class));
    }

    @Test
    void readsSelectedOfferFromConfigurationInventorySnapshot() {
        ComponentInventoryService service = new ComponentInventoryService(
                jdbc, JsonMapper.builder().build());

        List<ComponentInventoryService.ComponentRequirement> snapshot = service.readSnapshot("""
                [{"productId":"10","modelCode":"CPU-TEST","quantity":2,"offerId":102}]
                """);

        assertEquals(new BigDecimal("102"), snapshot.getFirst().offerId());
        assertEquals(2, snapshot.getFirst().quantity());
    }

    private static Map<String, Object> offer(
            String offerId, String productId, int stock, int reserved) {
        return Map.of(
                "offer_id", new BigDecimal(offerId),
                "product_id", new BigDecimal(productId),
                "stock_quantity", stock,
                "reserved_quantity", reserved);
    }
}
