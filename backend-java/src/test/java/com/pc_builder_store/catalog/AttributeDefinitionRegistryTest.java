package com.pc_builder_store.catalog;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

class AttributeDefinitionRegistryTest {

    @Test
    void providesBroadTypedDictionaryAndDistinctUnits() {
        assertTrue(AttributeDefinitionRegistry.all().size() >= 150);
        assertEquals(Set.of(
                "ACCESSORY", "CASE", "COOLER", "CPU", "GPU",
                "MOTHERBOARD", "PC", "PSU", "RAM", "STORAGE"),
                AttributeDefinitionRegistry.all().stream()
                        .map(AttributeDefinitionRegistry.Definition::productType)
                        .collect(java.util.stream.Collectors.toSet()));

        assertEquals("MHz", AttributeDefinitionRegistry.find("RAM", "speed_mhz").orElseThrow().unit());
        assertEquals("MT/s", AttributeDefinitionRegistry.find("RAM", "data_rate_mt_s").orElseThrow().unit());
        assertEquals("W", AttributeDefinitionRegistry.find("CPU", "tdp_watt").orElseThrow().unit());
        assertEquals("W", AttributeDefinitionRegistry.find("CPU", "max_turbo_power_watt").orElseThrow().unit());
        assertEquals("rail_12v_output_watt",
                AttributeDefinitionRegistry.find("PSU", "rail_12v_output_watt").orElseThrow().code());
        assertFalse(AttributeDefinitionRegistry.find("ACCESSORY", "monitor_refresh_rate_hz")
                .orElseThrow().subtype().isBlank());
    }

    @Test
    void rejectsUnknownDefinitionLookupsWithoutInventingMetadata() {
        assertTrue(AttributeDefinitionRegistry.find("GPU", "unsupported_field").isEmpty());
    }

    @Test
    void includesExpandedTypedGpuDictionaryAndEditorOptions() {
        Set<String> gpuCodes = AttributeDefinitionRegistry.all().stream()
                .filter(definition -> "GPU".equals(definition.productType()))
                .map(AttributeDefinitionRegistry.Definition::code)
                .collect(java.util.stream.Collectors.toSet());
        assertTrue(gpuCodes.containsAll(Set.of(
                "gpu_chip", "architecture", "processor_unit_label", "processor_unit_count",
                "base_clock_mhz", "boost_clock_mhz", "vram_gb", "memory_type",
                "memory_bus_width_bit", "memory_data_rate_gbps", "memory_bandwidth_gbs",
                "memory_clock_mhz", "pcie_generation", "pcie_link_width", "display_outputs",
                "max_display_resolution", "max_display_refresh_rate_hz", "display_stream_compression",
                "max_simultaneous_displays", "hdcp_version", "board_power_watt",
                "recommended_psu_watt", "power_connectors", "directx_support", "opengl_version",
                "vulkan_version", "gpu_technologies", "cooling_design", "fan_count",
                "board_length_mm", "board_width_mm", "board_height_mm", "slot_thickness",
                "supported_operating_systems", "multi_gpu_support", "included_accessories",
                "included_documentation", "ai_accelerator_unit_count", "av1_decode_support",
                "av1_encode_support", "hdmi_version", "displayport_version", "ray_accelerator_unit_count",
                "rop_units", "tensor_core_count", "texture_mapping_units", "vr_ready")));
        assertEquals(Map.of(
                "memory_clock_mhz", "DECIMAL",
                "max_display_refresh_rate_hz", "INTEGER",
                "display_stream_compression", "BOOLEAN",
                "display_outputs", "JSON",
                "gpu_technologies", "TEXT"),
                Map.of(
                        "memory_clock_mhz", AttributeDefinitionRegistry.find("GPU", "memory_clock_mhz")
                                .orElseThrow().dataType(),
                        "max_display_refresh_rate_hz", AttributeDefinitionRegistry.find(
                                "GPU", "max_display_refresh_rate_hz").orElseThrow().dataType(),
                        "display_stream_compression", AttributeDefinitionRegistry.find(
                                "GPU", "display_stream_compression").orElseThrow().dataType(),
                        "display_outputs", AttributeDefinitionRegistry.find("GPU", "display_outputs")
                                .orElseThrow().dataType(),
                        "gpu_technologies", AttributeDefinitionRegistry.find("GPU", "gpu_technologies")
                                .orElseThrow().dataType()));
        assertEquals("TEXTAREA",
                AttributeDefinitionRegistry.find("GPU", "gpu_technologies").orElseThrow().inputMode());
        assertTrue(AttributeDefinitionRegistry.find("GPU", "memory_type").orElseThrow()
                .options().contains("GDDR7"));
        assertEquals("GPU_SILICON",
                AttributeDefinitionRegistry.find("GPU", "processor_unit_count").orElseThrow()
                        .specificationScope());
        assertEquals("BOARD_VARIANT",
                AttributeDefinitionRegistry.find("GPU", "display_outputs").orElseThrow()
                        .specificationScope());
        for (String code : Set.of(
                "directx_support", "opengl_version", "vulkan_version", "gpu_technologies")) {
            assertEquals("GPU_SILICON",
                    AttributeDefinitionRegistry.find("GPU", code).orElseThrow().specificationScope());
        }
        assertEquals(348, AttributeDefinitionRegistry.all().size());
    }
}
