import type { CatalogAttributeDefinition } from "../catalog-api";

export interface SpecificationGroupMetadata {
  id: string;
  label: string;
  order: number;
  codes: string[];
}

interface ProductSpecificationMetadata {
  groups: SpecificationGroupMetadata[];
  highlights: string[];
  required: string[];
}

const layouts: Record<string, ProductSpecificationMetadata> = {
  CPU: {
    groups: [
      { id: "identity", label: "Nhận diện và kiến trúc", order: 0, codes: ["socket", "architecture"] },
      { id: "compute", label: "Nhân xử lý và xung nhịp", order: 1, codes: ["core_count", "thread_count", "base_clock_ghz", "max_boost_clock_ghz", "cache_l2_mb", "cache_l3_mb"] },
      { id: "memory", label: "Hỗ trợ bộ nhớ", order: 2, codes: ["memory_types_supported", "max_memory_gb", "max_memory_data_rate_mt_s", "memory_channels"] },
      { id: "graphics", label: "Đồ họa tích hợp", order: 3, codes: ["integrated_graphics"] },
      { id: "power", label: "Điện năng và nhiệt", order: 4, codes: ["tdp_watt", "max_turbo_power_watt", "max_operating_temp_c"] },
      { id: "expansion", label: "Kết nối và tập lệnh", order: 5, codes: ["pcie_generation", "instruction_sets"] },
    ],
    highlights: ["core_count", "thread_count", "max_boost_clock_ghz", "socket", "tdp_watt"],
    required: ["socket", "core_count", "thread_count"],
  },
  GPU: {
    groups: [
      { id: "processor", label: "Bộ xử lý đồ họa", order: 0, codes: ["gpu_chip", "architecture", "processor_unit_label", "processor_unit_count", "base_clock_mhz", "boost_clock_mhz"] },
      { id: "memory", label: "Bộ nhớ", order: 1, codes: ["vram_gb", "memory_type", "memory_bus_width_bit", "memory_clock_mhz", "memory_data_rate_gbps", "memory_bandwidth_gbs"] },
      { id: "interface", label: "Giao tiếp", order: 2, codes: ["pcie_generation", "pcie_link_width"] },
      { id: "outputs", label: "Cổng xuất hình", order: 3, codes: ["display_outputs"] },
      { id: "display", label: "Hiển thị", order: 4, codes: ["max_display_resolution", "max_display_refresh_rate_hz", "display_stream_compression", "max_simultaneous_displays", "hdcp_version"] },
      { id: "power", label: "Nguồn", order: 5, codes: ["board_power_watt", "recommended_psu_watt", "power_connectors"] },
      { id: "technology", label: "Công nghệ", order: 6, codes: ["directx_support", "opengl_version", "vulkan_version", "gpu_technologies"] },
      { id: "cooling", label: "Tản nhiệt và kích thước", order: 7, codes: ["cooling_design", "fan_count", "board_length_mm", "board_width_mm", "board_height_mm", "slot_thickness"] },
      { id: "compatibility", label: "Tương thích", order: 8, codes: ["supported_operating_systems", "multi_gpu_support"] },
      { id: "accessories", label: "Phụ kiện", order: 9, codes: ["included_accessories", "included_documentation"] },
    ],
    highlights: ["vram_gb", "memory_type", "memory_bus_width_bit", "recommended_psu_watt"],
    required: ["gpu_chip", "vram_gb", "memory_type", "memory_bus_width_bit"],
  },
  MOTHERBOARD: {
    groups: [
      { id: "identity", label: "Nền tảng", order: 0, codes: ["socket", "chipset", "form_factor"] },
      { id: "memory", label: "Bộ nhớ", order: 1, codes: ["memory_type", "memory_slot_count", "max_memory_gb", "max_memory_data_rate_mt_s"] },
      { id: "expansion", label: "Khe cắm và lưu trữ", order: 2, codes: ["pcie_slots", "m2_slot_count", "sata_port_count"] },
      { id: "connectivity", label: "Kết nối", order: 3, codes: ["usb_ports", "ethernet_speed_gbps", "wireless_standards", "bluetooth_version", "internal_connectors"] },
      { id: "audio", label: "Âm thanh", order: 4, codes: ["audio_codec", "audio_channels"] },
      { id: "bios", label: "BIOS", order: 5, codes: ["bios_features"] },
      { id: "physical", label: "Kích thước", order: 6, codes: ["board_dimensions_mm"] },
    ],
    highlights: ["socket", "chipset", "form_factor", "memory_type"],
    required: ["socket", "chipset", "form_factor", "memory_type"],
  },
  RAM: {
    groups: [
      { id: "identity", label: "Nhận diện và kiểu thanh", order: 0, codes: ["memory_type", "form_factor"] },
      { id: "memory", label: "Dung lượng và bộ kit", order: 1, codes: ["capacity_gb", "module_capacity_gb", "modules_per_kit"] },
      { id: "performance", label: "Tốc độ và độ trễ", order: 2, codes: ["speed_mhz", "data_rate_mt_s", "cas_latency_cycles", "memory_timings_cycles"] },
      { id: "power", label: "Điện áp", order: 3, codes: ["voltage_v"] },
      { id: "features", label: "Tính năng", order: 4, codes: ["memory_profiles", "ecc", "registered"] },
      { id: "physical", label: "Thiết kế", order: 5, codes: ["module_height_mm", "lighting"] },
    ],
    highlights: ["capacity_gb", "memory_type", "data_rate_mt_s", "speed_mhz", "cas_latency_cycles"],
    required: ["capacity_gb", "memory_type"],
  },
  STORAGE: {
    groups: [
      { id: "identity", label: "Loại ổ và định dạng", order: 0, codes: ["drive_type", "capacity_gb", "form_factor"] },
      { id: "interface", label: "Giao tiếp và giao thức", order: 1, codes: ["interface", "protocol", "pcie_generation"] },
      { id: "technology", label: "Công nghệ lưu trữ", order: 2, codes: ["nand_type", "controller", "dram_cache", "cache_mb"] },
      { id: "performance", label: "Hiệu năng", order: 3, codes: ["sequential_read_mb_s", "sequential_write_mb_s", "random_read_iops", "random_write_iops"] },
      { id: "endurance", label: "Độ bền và độ tin cậy", order: 4, codes: ["endurance_tbw", "mtbf_hours"] },
      { id: "physical", label: "Kích thước và tốc độ quay", order: 5, codes: ["rpm", "dimensions_mm", "weight_g"] },
    ],
    highlights: ["capacity_gb", "drive_type", "interface", "sequential_read_mb_s", "sequential_write_mb_s"],
    required: ["drive_type", "capacity_gb", "form_factor", "interface"],
  },
  PSU: {
    groups: [
      { id: "identity", label: "Định dạng và tiêu chuẩn", order: 0, codes: ["wattage", "atx_version", "efficiency_rating", "modularity"] },
      { id: "electrical", label: "Đầu ra và điện áp", order: 1, codes: ["rail_12v_output_watt", "rail_12v_current_a", "input_voltage_range_v", "hold_up_time_ms"] },
      { id: "connectors", label: "Đầu nối", order: 2, codes: ["connectors"] },
      { id: "cooling", label: "Quạt và độ ồn", order: 3, codes: ["fan_size_mm", "noise_db_a"] },
      { id: "protection", label: "Bảo vệ và nhiệt độ", order: 4, codes: ["protection_features", "operating_temperature_c"] },
      { id: "physical", label: "Kích thước và khối lượng", order: 5, codes: ["dimensions_mm", "weight_kg"] },
    ],
    highlights: ["wattage", "efficiency_rating", "atx_version", "modularity"],
    required: ["wattage"],
  },
  CASE: {
    groups: [
      { id: "identity", label: "Kiểu dáng", order: 0, codes: ["case_form_factor"] },
      { id: "compatibility", label: "Tương thích bo mạch", order: 1, codes: ["motherboard_form_factors"] },
      { id: "clearance", label: "Khoảng trống lắp đặt", order: 2, codes: ["max_gpu_length_mm", "max_cooler_height_mm", "max_psu_length_mm", "cable_clearance_mm"] },
      { id: "cooling", label: "Quạt và radiator", order: 3, codes: ["included_fans", "fan_mounts", "radiator_support"] },
      { id: "storage", label: "Khay lưu trữ và khe mở rộng", order: 4, codes: ["drive_bays", "expansion_slot_count"] },
      { id: "io", label: "Cổng kết nối", order: 5, codes: ["front_io_ports"] },
      { id: "physical", label: "Kích thước và khối lượng", order: 6, codes: ["dimensions_mm", "weight_kg"] },
    ],
    highlights: ["motherboard_form_factors", "max_gpu_length_mm", "max_cooler_height_mm", "max_psu_length_mm"],
    required: ["motherboard_form_factors"],
  },
  COOLER: {
    groups: [
      { id: "identity", label: "Loại tản nhiệt", order: 0, codes: ["cooler_type"] },
      { id: "compatibility", label: "Socket hỗ trợ", order: 1, codes: ["supported_sockets"] },
      { id: "radiator", label: "Radiator và quạt", order: 2, codes: ["radiator_dimensions_mm", "fan_size_mm", "fan_count", "fan_speed_rpm"] },
      { id: "performance", label: "Hiệu năng và độ ồn", order: 3, codes: ["airflow_cfm", "static_pressure_mmh2o", "noise_db_a", "pump_speed_rpm"] },
      { id: "electrical", label: "Đầu nối", order: 4, codes: ["connector_types"] },
      { id: "physical", label: "Kích thước và khối lượng", order: 5, codes: ["cooler_height_mm", "dimensions_mm", "weight_kg"] },
    ],
    highlights: ["cooler_type", "supported_sockets", "cooler_height_mm", "fan_size_mm"],
    required: ["cooler_type", "supported_sockets"],
  },
  ACCESSORY: {
    groups: [
      { id: "identity", label: "Loại phụ kiện", order: 0, codes: ["accessory_type"] },
      { id: "display", label: "Màn hình", order: 1, codes: ["monitor_panel_size_in", "monitor_resolution", "monitor_panel_type", "monitor_refresh_rate_hz", "monitor_response_time_ms", "monitor_brightness_nits", "monitor_video_inputs"] },
      { id: "input", label: "Chuột và bàn phím", order: 2, codes: ["mouse_max_dpi", "mouse_polling_rate_hz", "mouse_button_count", "mouse_connectivity_modes", "keyboard_layout", "keyboard_switch_type", "keyboard_connectivity_modes", "keyboard_key_count", "keyboard_backlight"] },
      { id: "audio", label: "Tai nghe", order: 3, codes: ["headset_driver_size_mm", "headset_impedance_ohm", "headset_microphone_type", "headset_connectivity_modes"] },
    ],
    highlights: ["accessory_type", "monitor_resolution", "monitor_refresh_rate_hz", "mouse_max_dpi", "keyboard_layout", "headset_driver_size_mm"],
    required: ["accessory_type"],
  },
  PC: {
    groups: [
      { id: "configuration", label: "Cấu hình được ghi nhận", order: 0, codes: ["configuration_summary", "configuration_items"] },
      { id: "identity", label: "Trạng thái thông tin", order: 1, codes: ["bom_status"] },
      { id: "physical", label: "Kích thước hệ thống", order: 2, codes: ["system_dimensions_mm"] },
    ],
    highlights: ["configuration_items", "configuration_summary", "bom_status"],
    required: ["bom_status", "configuration_summary"],
  },
};

function accessoryKind(specifications?: Record<string, unknown>): string | undefined {
  const raw = specifications?.accessory_type;
  if (typeof raw !== "string") return undefined;
  const value = raw.trim().toUpperCase();
  if (value.includes("MOUSE")) return "MOUSE";
  if (value.includes("KEYBOARD")) return "KEYBOARD";
  if (value.includes("MONITOR")) return "MONITOR";
  if (value.includes("HEADSET") || value.includes("HEADPHONE")) return "HEADSET";
  return undefined;
}

function accessorySubtypeFromCode(code: string): string | undefined {
  if (code.startsWith("mouse_")) return "MOUSE";
  if (code.startsWith("keyboard_")) return "KEYBOARD";
  if (code.startsWith("monitor_")) return "MONITOR";
  if (code.startsWith("headset_")) return "HEADSET";
  return undefined;
}

export function getSpecificationGroups(productType: string): SpecificationGroupMetadata[] {
  return layouts[productType]?.groups ?? [];
}

export function specificationGroupFor(productType: string, code: string): SpecificationGroupMetadata {
  const groups = getSpecificationGroups(productType);
  return groups.find((group) => group.codes.includes(code)) ?? {
    id: "other",
    label: "Thông số khác",
    order: Number.MAX_SAFE_INTEGER,
    codes: [],
  };
}

export function specificationDefinitionsFor(
  productType: string,
  definitions: CatalogAttributeDefinition[],
  specifications?: Record<string, unknown>,
): CatalogAttributeDefinition[] {
  const subtype = productType === "ACCESSORY" ? accessoryKind(specifications) : undefined;
  return definitions
    .filter((definition) => definition.productType === productType)
    .filter((definition) => {
      if (!subtype) return true;
      const fieldSubtype = definition.subtype ?? accessorySubtypeFromCode(definition.code);
      return !fieldSubtype || fieldSubtype === subtype;
    })
    .sort((left, right) => {
      const leftGroup = specificationGroupFor(productType, left.code);
      const rightGroup = specificationGroupFor(productType, right.code);
      if (leftGroup.order !== rightGroup.order) return leftGroup.order - rightGroup.order;
      const leftPosition = leftGroup.codes.indexOf(left.code);
      const rightPosition = rightGroup.codes.indexOf(right.code);
      if (leftPosition !== rightPosition) {
        return (leftPosition < 0 ? Number.MAX_SAFE_INTEGER : leftPosition)
          - (rightPosition < 0 ? Number.MAX_SAFE_INTEGER : rightPosition);
      }
      return left.label.localeCompare(right.label);
    });
}

export function specificationHighlightPriority(productType: string): string[] {
  return layouts[productType]?.highlights ?? [];
}

export function specificationDisplayPolicy(
  productType: string,
  definition: CatalogAttributeDefinition,
): "required" | "conditional" | "optional" {
  if (definition.subtype
      || (productType === "ACCESSORY" && accessorySubtypeFromCode(definition.code))
      || (productType === "PC" && definition.code === "configuration_items")) {
    return "conditional";
  }
  return layouts[productType]?.required.includes(definition.code) ? "required" : "optional";
}
