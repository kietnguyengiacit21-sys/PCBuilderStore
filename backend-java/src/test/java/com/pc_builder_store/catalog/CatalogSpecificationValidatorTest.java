package com.pc_builder_store.catalog;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.pc_builder_store.catalog.exception.InvalidCatalogQueryException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class CatalogSpecificationValidatorTest {

    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Test
    void acceptsTypedGpuValuesIncludingRepeatedConnectorsAndLongText() throws Exception {
        Map<String, JsonNode> values = new LinkedHashMap<>();
        values.put("memory_clock_mhz", jsonMapper.readTree("2500.5"));
        values.put("max_display_refresh_rate_hz", jsonMapper.readTree("480"));
        values.put("display_stream_compression", jsonMapper.readTree("true"));
        values.put("memory_type", jsonMapper.readTree("\"GDDR7\""));
        values.put("display_outputs", jsonMapper.readTree("""
                [{"type":"DisplayPort","count":3,"version":"2.1a"},
                 {"type":"HDMI","count":1,"version":"2.1b"}]
                """));
        values.put("gpu_technologies", jsonMapper.readTree("\"Feature one\\nFeature two\""));
        values.put("included_accessories", jsonMapper.readTree("[\"Adapter\", \"Bracket\"]"));
        values.put("board_length_mm", jsonMapper.readTree("305.5"));

        assertDoesNotThrow(() -> CatalogSpecificationValidator.validateGpuValues(values));
    }

    @Test
    void rejectsWrongTypesInvalidOptionsAndUnknownFields() throws Exception {
        assertInvalid(Map.of("fan_count", jsonMapper.readTree("2.5")));
        assertInvalid(Map.of("memory_type", jsonMapper.readTree("\"GDDR8\"")));
        assertInvalid(Map.of("display_outputs", jsonMapper.readTree("42")));
        assertInvalid(Map.of("display_outputs", jsonMapper.readTree("""
                {"type":"DisplayPort","count":3,"version":"2.1a"}
                """)));
        assertInvalid(Map.of("made_up_gpu_field", jsonMapper.readTree("\"value\"")));
    }

    @Test
    void permitsNullsToClearOptionalValues() {
        Map<String, JsonNode> values = new LinkedHashMap<>();
        values.put("vulkan_version", null);

        assertDoesNotThrow(() -> CatalogSpecificationValidator.validateGpuValues(values));
    }

    private void assertInvalid(Map<String, JsonNode> values) {
        assertThrows(
                InvalidCatalogQueryException.class,
                () -> CatalogSpecificationValidator.validateGpuValues(values));
    }
}
