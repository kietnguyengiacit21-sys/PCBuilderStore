package com.pc_builder_store.catalog.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.pc_builder_store.catalog.dto.CatalogProduct;
import com.pc_builder_store.catalog.dto.PcBuilderCompatibilityRequest;
import com.pc_builder_store.catalog.exception.InvalidCatalogQueryException;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class PcBuilderCompatibilityServiceTest {

    private final CatalogService catalog = mock(CatalogService.class);
    private final PcBuilderCompatibilityService service = new PcBuilderCompatibilityService(catalog);
    private final JsonMapper mapper = JsonMapper.builder().build();

    @Test
    void reportsCompatibleForMatchingCpuAndMotherboardSockets() throws Exception {
        when(catalog.getCompatibilityProduct("CPU-A")).thenReturn(product("CPU-A", "CPU", """
                {"socket":"AM5","memory_types_supported":["DDR5"]}
                """));
        when(catalog.getCompatibilityProduct("BOARD-A")).thenReturn(product("BOARD-A", "MOTHERBOARD", """
                {"socket":"AM5","memory_type":"DDR5"}
                """));
        when(catalog.getCompatibilityProduct("RAM-A")).thenReturn(product("RAM-A", "RAM", """
                {"memory_type":"DDR5"}
                """));

        var result = service.validate(new PcBuilderCompatibilityRequest(Map.of(
                "CPU", "CPU-A",
                "MOTHERBOARD", "BOARD-A",
                "RAM", "RAM-A")));

        assertEquals("COMPATIBLE", result.status());
        assertEquals(3, result.checks().size());
        assertEquals("COMPATIBLE", result.checks().get(0).status());
        assertEquals("COMPATIBLE", result.checks().get(1).status());
        assertEquals("COMPATIBLE", result.checks().get(2).status());
    }

    @Test
    void reportsIncompatibleForDifferentCpuAndMotherboardSockets() throws Exception {
        when(catalog.getCompatibilityProduct("CPU-A")).thenReturn(product("CPU-A", "CPU", """
                {"socket":"AM4"}
                """));
        when(catalog.getCompatibilityProduct("BOARD-A")).thenReturn(product("BOARD-A", "MOTHERBOARD", """
                {"socket":"AM5"}
                """));

        var result = service.validate(new PcBuilderCompatibilityRequest(Map.of(
                "CPU", "CPU-A",
                "MOTHERBOARD", "BOARD-A")));

        assertEquals("INCOMPATIBLE", result.status());
        assertEquals("INCOMPATIBLE", result.checks().get(0).status());
    }

    @Test
    void reportsInsufficientDataInsteadOfGuessingCompatibility() throws Exception {
        when(catalog.getCompatibilityProduct("CPU-A")).thenReturn(product("CPU-A", "CPU", "{}"));
        when(catalog.getCompatibilityProduct("BOARD-A")).thenReturn(product("BOARD-A", "MOTHERBOARD", "{}"));

        var result = service.validate(new PcBuilderCompatibilityRequest(Map.of(
                "CPU", "CPU-A",
                "MOTHERBOARD", "BOARD-A")));

        assertEquals("INSUFFICIENT_DATA", result.status());
        assertEquals("INSUFFICIENT_DATA", result.checks().get(0).status());
        assertEquals(2, result.warnings().size());
    }

    @Test
    void comparesGpuPowerRecommendationWithRatedPsuCapacity() throws Exception {
        when(catalog.getCompatibilityProduct("GPU-A")).thenReturn(product("GPU-A", "GPU", """
                {"recommended_psu_watt":550}
                """));
        when(catalog.getCompatibilityProduct("PSU-A")).thenReturn(product("PSU-A", "PSU", """
                {"wattage":650}
                """));

        var result = service.validate(new PcBuilderCompatibilityRequest(Map.of(
                "GPU", "GPU-A",
                "PSU", "PSU-A")));

        assertEquals("COMPATIBLE", result.status());
        assertEquals("GPU_PSU_RECOMMENDATION", result.checks().get(0).code());
        assertTrue(result.checks().get(0).detail().contains("W"));
    }

    @Test
    void rejectsProductsThatDoNotMatchTheirComponentSlot() throws Exception {
        when(catalog.getCompatibilityProduct("RAM-A")).thenReturn(product("RAM-A", "RAM", "{}"));

        assertThrows(InvalidCatalogQueryException.class, () -> service.validate(
                new PcBuilderCompatibilityRequest(Map.of("CPU", "RAM-A"))));
    }

    @Test
    void validatesAM5BuildWithVendorPrefixedCoolerSocketAndSupportedRadiator() throws Exception {
        when(catalog.getCompatibilityProduct("CPU-A")).thenReturn(product("CPU-A", "CPU", """
                {"socket":"AM5","memory_types_supported":["DDR5"]}
                """));
        when(catalog.getCompatibilityProduct("BOARD-A")).thenReturn(product("BOARD-A", "MOTHERBOARD", """
                {"socket":"AM5","memory_type":"DDR5","form_factor":"ATX"}
                """));
        when(catalog.getCompatibilityProduct("RAM-A")).thenReturn(product("RAM-A", "RAM", """
                {"memory_type":"DDR5"}
                """));
        when(catalog.getCompatibilityProduct("GPU-A")).thenReturn(product("GPU-A", "GPU", """
                {"board_length_mm":345,"recommended_psu_watt":850}
                """));
        when(catalog.getCompatibilityProduct("PSU-A")).thenReturn(product("PSU-A", "PSU", """
                {"wattage":850}
                """));
        when(catalog.getCompatibilityProduct("CASE-A")).thenReturn(product("CASE-A", "CASE", """
                {"motherboard_form_factors":["ATX"],"max_gpu_length_mm":365,
                 "max_cooler_height_mm":365,"radiator_support":["Top 360mm"]}
                """));
        when(catalog.getCompatibilityProduct("COOLER-A")).thenReturn(product("COOLER-A", "COOLER", """
                {"cooler_type":"AIO Liquid","supported_sockets":["AMD AM5"],
                 "cooler_height_mm":0,"radiator_dimensions_mm":[240,120,27]}
                """));

        var result = service.validate(new PcBuilderCompatibilityRequest(Map.of(
                "CPU", "CPU-A",
                "MOTHERBOARD", "BOARD-A",
                "RAM", "RAM-A",
                "GPU", "GPU-A",
                "PSU", "PSU-A",
                "CASE", "CASE-A",
                "COOLER", "COOLER-A")));

        assertEquals("COMPATIBLE", result.status());
        assertEquals(8, result.checks().size());
        assertTrue(result.checks().stream().allMatch(check -> "COMPATIBLE".equals(check.status())));
    }

    private CatalogProduct product(String modelCode, String type, String specifications) throws Exception {
        return new CatalogProduct(
                modelCode, modelCode, modelCode, null, null, "ACTIVE", type, type,
                type, type, null, List.of(), mapper.readTree(specifications),
                Map.of(), Map.of(), List.of(), false, List.of(), null, false, 0);
    }
}
