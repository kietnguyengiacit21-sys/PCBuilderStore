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

    @Test
    void flagsRamBeyondBoardCapacitySlotsAndSpeed() throws Exception {
        when(catalog.getCompatibilityProduct("RAM-A")).thenReturn(product("RAM-A", "RAM", """
                {"memory_type":"DDR5","capacity_gb":192,"modules_per_kit":4,"data_rate_mt_s":6000}
                """));
        when(catalog.getCompatibilityProduct("BOARD-A")).thenReturn(product("BOARD-A", "MOTHERBOARD", """
                {"memory_type":"DDR5","max_memory_gb":128,"memory_slot_count":2,"max_memory_data_rate_mt_s":5600}
                """));

        var result = service.validate(new PcBuilderCompatibilityRequest(Map.of(
                "RAM", "RAM-A",
                "MOTHERBOARD", "BOARD-A")));

        assertEquals("INCOMPATIBLE", result.status());
        assertEquals("INCOMPATIBLE", checkStatus(result, "RAM_MOTHERBOARD_CAPACITY"));
        assertEquals("INCOMPATIBLE", checkStatus(result, "RAM_MOTHERBOARD_SLOTS"));
        assertEquals("WARNING", checkStatus(result, "RAM_MOTHERBOARD_SPEED"));
    }

    @Test
    void estimatesSystemPowerFromCpuAndGpuDraw() throws Exception {
        when(catalog.getCompatibilityProduct("CPU-A")).thenReturn(product("CPU-A", "CPU", """
                {"max_turbo_power_watt":253,"tdp_watt":125}
                """));
        when(catalog.getCompatibilityProduct("GPU-A")).thenReturn(product("GPU-A", "GPU", """
                {"board_power_watt":320,"recommended_psu_watt":700}
                """));
        when(catalog.getCompatibilityProduct("PSU-750")).thenReturn(product("PSU-750", "PSU", """
                {"wattage":750}
                """));
        when(catalog.getCompatibilityProduct("PSU-650")).thenReturn(product("PSU-650", "PSU", """
                {"wattage":650}
                """));

        var tight = service.validate(new PcBuilderCompatibilityRequest(Map.of(
                "CPU", "CPU-A", "GPU", "GPU-A", "PSU", "PSU-750")));
        var tooSmall = service.validate(new PcBuilderCompatibilityRequest(Map.of(
                "CPU", "CPU-A", "GPU", "GPU-A", "PSU", "PSU-650")));

        // 100 W base + 253 W CPU + 320 W GPU = 673 W; 20 % headroom rounds up to 850 W.
        assertEquals("WARNING", checkStatus(tight, "SYSTEM_POWER_BUDGET"));
        assertEquals("COMPATIBLE", tight.status());
        assertTrue(checkDetail(tight, "SYSTEM_POWER_BUDGET").contains("850 W"));
        assertEquals("INCOMPATIBLE", checkStatus(tooSmall, "SYSTEM_POWER_BUDGET"));
    }

    @Test
    void comparesGpuPowerConnectorsWithThePsu() throws Exception {
        when(catalog.getCompatibilityProduct("GPU-8PIN")).thenReturn(product("GPU-8PIN", "GPU", """
                {"power_connectors":["2 x 8-pin"]}
                """));
        when(catalog.getCompatibilityProduct("GPU-16PIN")).thenReturn(product("GPU-16PIN", "GPU", """
                {"power_connectors":["1 x 16-pin"]}
                """));
        when(catalog.getCompatibilityProduct("PSU-A")).thenReturn(product("PSU-A", "PSU", """
                {"native_16pin_connector":"Không có 16-pin native",
                 "connectors":["24-pin ATX x1","EPS 4+4-pin x2","PCIe 6+2-pin x4"]}
                """));

        var eightPin = service.validate(new PcBuilderCompatibilityRequest(Map.of(
                "GPU", "GPU-8PIN", "PSU", "PSU-A")));
        var sixteenPin = service.validate(new PcBuilderCompatibilityRequest(Map.of(
                "GPU", "GPU-16PIN", "PSU", "PSU-A")));

        assertEquals("COMPATIBLE", checkStatus(eightPin, "GPU_PSU_CONNECTORS"));
        assertEquals("WARNING", checkStatus(sixteenPin, "GPU_PSU_CONNECTORS"));
    }

    @Test
    void checksAtxPsuLengthAndStorageConnection() throws Exception {
        when(catalog.getCompatibilityProduct("PSU-A")).thenReturn(product("PSU-A", "PSU", """
                {"dimensions_mm":[150,210,86]}
                """));
        when(catalog.getCompatibilityProduct("CASE-A")).thenReturn(product("CASE-A", "CASE", """
                {"max_psu_length_mm":180}
                """));
        when(catalog.getCompatibilityProduct("SSD-A")).thenReturn(product("SSD-A", "STORAGE", """
                {"interface":"SATA III","form_factor":"SATA 2.5 inch"}
                """));
        when(catalog.getCompatibilityProduct("BOARD-A")).thenReturn(product("BOARD-A", "MOTHERBOARD", """
                {"sata_port_count":0,"m2_slot_count":2}
                """));

        var result = service.validate(new PcBuilderCompatibilityRequest(Map.of(
                "PSU", "PSU-A", "CASE", "CASE-A", "STORAGE", "SSD-A", "MOTHERBOARD", "BOARD-A")));

        assertEquals("INCOMPATIBLE", checkStatus(result, "CASE_PSU_LENGTH"));
        assertTrue(checkDetail(result, "CASE_PSU_LENGTH").startsWith("210 mm"));
        assertEquals("INCOMPATIBLE", checkStatus(result, "STORAGE_MOTHERBOARD_CONNECTION"));
    }

    @Test
    void requiresADiscreteGpuWhenTheCpuHasNoIntegratedGraphics() throws Exception {
        when(catalog.getCompatibilityProduct("CPU-F")).thenReturn(product("CPU-F", "CPU", """
                {"integrated_graphics":"Không có"}
                """));
        when(catalog.getCompatibilityProduct("CPU-G")).thenReturn(product("CPU-G", "CPU", """
                {"integrated_graphics":"Intel UHD Graphics 770"}
                """));

        var withoutGraphics = service.validate(new PcBuilderCompatibilityRequest(Map.of("CPU", "CPU-F")));
        var withGraphics = service.validate(new PcBuilderCompatibilityRequest(Map.of("CPU", "CPU-G")));

        assertEquals("INCOMPATIBLE", checkStatus(withoutGraphics, "CPU_DISPLAY_OUTPUT"));
        assertEquals("COMPATIBLE", checkStatus(withGraphics, "CPU_DISPLAY_OUTPUT"));
    }

    @Test
    void readsRadiatorSupportObjectsAndPhysicalRadiatorLengths() throws Exception {
        // 458 mm long = a 420 mm radiator; case support is stored per position as an object.
        when(catalog.getCompatibilityProduct("AIO-420")).thenReturn(product("AIO-420", "COOLER", """
                {"cooler_type":"Liquid AIO 420mm","radiator_dimensions_mm":[458,138,38]}
                """));
        // 277 mm long = a 240 mm radiator.
        when(catalog.getCompatibilityProduct("AIO-240")).thenReturn(product("AIO-240", "COOLER", """
                {"cooler_type":"AIO Liquid","radiator_dimensions_mm":[277,120,27]}
                """));
        when(catalog.getCompatibilityProduct("CASE-360")).thenReturn(product("CASE-360", "CASE", """
                {"radiator_support":{"top":"120/140/240/280/360mm","rear":"120mm"}}
                """));
        when(catalog.getCompatibilityProduct("CASE-240")).thenReturn(product("CASE-240", "CASE", """
                {"radiator_support":["Top 240mm"]}
                """));

        var tooLarge = service.validate(new PcBuilderCompatibilityRequest(Map.of(
                "COOLER", "AIO-420", "CASE", "CASE-360")));
        var exactFit = service.validate(new PcBuilderCompatibilityRequest(Map.of(
                "COOLER", "AIO-240", "CASE", "CASE-240")));

        assertEquals("INCOMPATIBLE", checkStatus(tooLarge, "CASE_COOLER_CLEARANCE"));
        assertTrue(checkDetail(tooLarge, "CASE_COOLER_CLEARANCE").startsWith("420 mm"));
        assertEquals("COMPATIBLE", checkStatus(exactFit, "CASE_COOLER_CLEARANCE"));
    }

    @Test
    void skipsDeeperChecksWhenTheirDataIsMissing() throws Exception {
        when(catalog.getCompatibilityProduct("RAM-A")).thenReturn(product("RAM-A", "RAM", """
                {"memory_type":"DDR5"}
                """));
        when(catalog.getCompatibilityProduct("BOARD-A")).thenReturn(product("BOARD-A", "MOTHERBOARD", """
                {"memory_type":"DDR5"}
                """));

        var result = service.validate(new PcBuilderCompatibilityRequest(Map.of(
                "RAM", "RAM-A", "MOTHERBOARD", "BOARD-A")));

        assertEquals("COMPATIBLE", result.status());
        assertEquals(1, result.checks().size());
    }

    private String checkStatus(
            com.pc_builder_store.catalog.dto.PcBuilderCompatibilityResponse result, String code) {
        return result.checks().stream().filter(check -> code.equals(check.code())).findFirst().orElseThrow().status();
    }

    private String checkDetail(
            com.pc_builder_store.catalog.dto.PcBuilderCompatibilityResponse result, String code) {
        return result.checks().stream().filter(check -> code.equals(check.code())).findFirst().orElseThrow().detail();
    }

    private CatalogProduct product(String modelCode, String type, String specifications) throws Exception {
        return new CatalogProduct(
                modelCode, modelCode, modelCode, null, null, "ACTIVE", type, type,
                type, type, null, List.of(), mapper.readTree(specifications),
                Map.of(), Map.of(), List.of(), false, List.of(), null, false, 0);
    }
}
