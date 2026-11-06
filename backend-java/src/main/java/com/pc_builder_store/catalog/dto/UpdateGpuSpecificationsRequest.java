package com.pc_builder_store.catalog.dto;

import java.util.Map;
import tools.jackson.databind.JsonNode;

public record UpdateGpuSpecificationsRequest(Map<String, JsonNode> specifications) {
}
