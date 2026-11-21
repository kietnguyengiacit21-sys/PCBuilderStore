package com.pc_builder_store.catalog.service;

import com.pc_builder_store.catalog.dto.CatalogProduct;
import com.pc_builder_store.catalog.dto.PcBuilderCompatibilityRequest;
import com.pc_builder_store.catalog.dto.PcBuilderCompatibilityResponse;
import com.pc_builder_store.catalog.exception.InvalidCatalogQueryException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;

@Service
public class PcBuilderCompatibilityService {

    /** Every size in "120/140/240/280/360mm" or "Top 360mm"; the unit may follow only the last one. */
    private static final Pattern RADIATOR_SIZE = Pattern.compile("(?<![\\d.])(\\d{3})(?=\\s*(?:MM|/))",
            Pattern.CASE_INSENSITIVE);
    private static final List<BigDecimal> STANDARD_RADIATOR_SIZES = List.of(
            new BigDecimal("120"), new BigDecimal("140"), new BigDecimal("240"), new BigDecimal("280"),
            new BigDecimal("360"), new BigDecimal("420"), new BigDecimal("480"));
    private static final Set<String> COMPONENT_SLOTS = Set.of(
            "CPU", "MOTHERBOARD", "RAM", "GPU", "STORAGE", "PSU", "CASE", "COOLER");
    /** Advisory result: the build works, but the customer should know something. */
    private static final String WARNING = "WARNING";
    /** Motherboard, RAM, storage and fans on top of the CPU and GPU budget. */
    private static final BigDecimal BASE_SYSTEM_WATT = new BigDecimal("100");
    private static final BigDecimal POWER_HEADROOM = new BigDecimal("1.2");
    private static final BigDecimal ATX_PSU_WIDTH = new BigDecimal("150");
    private static final BigDecimal ATX_PSU_HEIGHT = new BigDecimal("86");
    private static final Pattern SIXTEEN_PIN = Pattern.compile("16-PIN|12VHPWR|12V-2X6");
    private static final Pattern GPU_EIGHT_PIN = Pattern.compile("(\\d+)\\s*X\\s*8-PIN");
    private static final Pattern LEADING_COUNT = Pattern.compile("^(\\d+)\\s*X\\b");
    private static final Pattern TRAILING_COUNT = Pattern.compile("\\bX\\s*(\\d+)$");
    private final CatalogService catalogService;

    public PcBuilderCompatibilityService(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    public PcBuilderCompatibilityResponse validate(PcBuilderCompatibilityRequest request) {
        if (request == null || request.components() == null
                || request.components().size() > COMPONENT_SLOTS.size()) {
            throw new InvalidCatalogQueryException("PC configuration is invalid.");
        }

        Map<String, CatalogProduct> products = new LinkedHashMap<>();
        for (Map.Entry<String, String> component : request.components().entrySet()) {
            String slot = component.getKey();
            String modelCode = component.getValue();
            if (!COMPONENT_SLOTS.contains(slot) || modelCode == null || modelCode.isBlank()) {
                throw new InvalidCatalogQueryException("PC configuration contains an invalid component.");
            }
            CatalogProduct product = catalogService.getCompatibilityProduct(modelCode);
            if (!matchesSlot(slot, product.productType())) {
                throw new InvalidCatalogQueryException(
                        "Selected product does not match the " + slot + " component slot.");
            }
            products.put(slot, product);
        }

        List<PcBuilderCompatibilityResponse.Check> checks = new ArrayList<>();
        checkEqual(
                products, checks, "CPU_MOTHERBOARD_SOCKET", "Socket CPU và bo mạch chủ",
                "CPU", "socket", "MOTHERBOARD", "socket");
        checkEqual(
                products, checks, "RAM_MOTHERBOARD_TYPE", "Thế hệ RAM và bo mạch chủ",
                "RAM", "memory_type", "MOTHERBOARD", "memory_type");
        checkSupportedList(
                products, checks, "CPU_RAM_TYPE", "CPU hỗ trợ chuẩn RAM",
                "CPU", "memory_types_supported", "RAM", "memory_type");
        checkSupportedList(
                products, checks, "COOLER_CPU_SOCKET", "Tản nhiệt hỗ trợ socket CPU",
                "COOLER", "supported_sockets", "CPU", "socket");
        checkSupportedList(
                products, checks, "CASE_MOTHERBOARD_FORM_FACTOR", "Case hỗ trợ kích thước bo mạch",
                "CASE", "motherboard_form_factors", "MOTHERBOARD", "form_factor");
        checkMaximum(
                products, checks, "CASE_GPU_CLEARANCE", "Chiều dài GPU và giới hạn case",
                "CASE", "max_gpu_length_mm", "GPU", "board_length_mm", "mm");
        checkCoolerClearance(products, checks);
        checkMaximum(
                products, checks, "GPU_PSU_RECOMMENDATION", "Nguồn theo khuyến nghị của GPU",
                "PSU", "wattage", "GPU", "recommended_psu_watt", "W");
        // Deeper checks below run only when both sides carry the data they need; a missing
        // value skips the check (see the "chưa được kiểm tra" warning) instead of guessing.
        checkMemoryLimits(products, checks);
        checkMemorySpeed(products, checks);
        checkStorageConnection(products, checks);
        checkSystemPower(products, checks);
        checkGpuPowerConnectors(products, checks);
        checkPsuLength(products, checks);
        checkDisplayOutput(products, checks);

        String status = checks.stream().anyMatch(check -> "INCOMPATIBLE".equals(check.status()))
                ? "INCOMPATIBLE"
                : checks.isEmpty() || checks.stream().anyMatch(
                        check -> "INSUFFICIENT_DATA".equals(check.status()))
                        ? "INSUFFICIENT_DATA"
                        : "COMPATIBLE";
        List<String> warnings = new ArrayList<>();
        warnings.add("Chỉ xác nhận các ràng buộc được trả về; các quan hệ không có trường dữ liệu tương ứng chưa được kiểm tra.");
        if (status.equals("INSUFFICIENT_DATA")) {
            warnings.add("Thiếu thông số kỹ thuật để xác nhận một hoặc nhiều điều kiện tương thích.");
        }
        return new PcBuilderCompatibilityResponse(status, checks, warnings);
    }

    private void checkEqual(
            Map<String, CatalogProduct> products,
            List<PcBuilderCompatibilityResponse.Check> checks,
            String code,
            String label,
            String leftSlot,
            String leftAttribute,
            String rightSlot,
            String rightAttribute) {
        if (!products.containsKey(leftSlot) || !products.containsKey(rightSlot)) return;
        String left = text(products.get(leftSlot), leftAttribute);
        String right = text(products.get(rightSlot), rightAttribute);
        if (left == null || right == null) {
            checks.add(check(code, label, "INSUFFICIENT_DATA",
                    "Thiếu thông số " + leftAttribute + " hoặc " + rightAttribute + "."));
        } else if (normalize(left).equals(normalize(right))) {
            checks.add(check(code, label, "COMPATIBLE", "Thông số hai linh kiện khớp nhau."));
        } else {
            checks.add(check(code, label, "INCOMPATIBLE", left + " không khớp " + right + "."));
        }
    }

    private void checkSupportedList(
            Map<String, CatalogProduct> products,
            List<PcBuilderCompatibilityResponse.Check> checks,
            String code,
            String label,
            String listSlot,
            String listAttribute,
            String valueSlot,
            String valueAttribute) {
        if (!products.containsKey(listSlot) || !products.containsKey(valueSlot)) return;
        JsonNode supported = specification(products.get(listSlot), listAttribute);
        String value = text(products.get(valueSlot), valueAttribute);
        if (supported == null || !supported.isArray() || value == null) {
            checks.add(check(code, label, "INSUFFICIENT_DATA", "Thiếu danh sách hỗ trợ hoặc thông số cần đối chiếu."));
            return;
        }
        boolean matches = false;
        for (JsonNode option : supported) {
            if (option.isTextual()
                    && normalizeCompatibilityValue(code, option.asString())
                            .equals(normalizeCompatibilityValue(code, value))) {
                matches = true;
                break;
            }
        }
        checks.add(matches
                ? check(code, label, "COMPATIBLE", "Thông số được liệt kê trong danh sách hỗ trợ.")
                : check(code, label, "INCOMPATIBLE", value + " không có trong danh sách hỗ trợ."));
    }

    private void checkMaximum(
            Map<String, CatalogProduct> products,
            List<PcBuilderCompatibilityResponse.Check> checks,
            String code,
            String label,
            String maximumSlot,
            String maximumAttribute,
            String actualSlot,
            String actualAttribute,
            String unit) {
        if (!products.containsKey(maximumSlot) || !products.containsKey(actualSlot)) return;
        BigDecimal maximum = number(products.get(maximumSlot), maximumAttribute);
        BigDecimal actual = number(products.get(actualSlot), actualAttribute);
        if (maximum == null || actual == null) {
            checks.add(check(code, label, "INSUFFICIENT_DATA", "Thiếu kích thước để xác nhận độ vừa vặn."));
        } else if (actual.compareTo(maximum) <= 0) {
            checks.add(check(code, label, "COMPATIBLE", actual.stripTrailingZeros().toPlainString()
                    + " " + unit + " không vượt giới hạn "
                    + maximum.stripTrailingZeros().toPlainString() + " " + unit + "."));
        } else {
            checks.add(check(code, label, "INCOMPATIBLE", actual.stripTrailingZeros().toPlainString()
                    + " " + unit + " vượt giới hạn "
                    + maximum.stripTrailingZeros().toPlainString() + " " + unit + "."));
        }
    }

    private void checkCoolerClearance(
            Map<String, CatalogProduct> products,
            List<PcBuilderCompatibilityResponse.Check> checks) {
        if (!products.containsKey("CASE") || !products.containsKey("COOLER")) return;
        CatalogProduct cooler = products.get("COOLER");
        BigDecimal coolerHeight = number(cooler, "cooler_height_mm");
        if (coolerHeight != null) {
            checkMaximum(
                    products, checks, "CASE_COOLER_CLEARANCE", "Chiều cao tản nhiệt và giới hạn case",
                    "CASE", "max_cooler_height_mm", "COOLER", "cooler_height_mm", "mm");
            return;
        }

        BigDecimal radiatorSize = nominalRadiatorSize(
                firstArrayNumber(specification(cooler, "radiator_dimensions_mm")));
        JsonNode supportedRadiators = specification(products.get("CASE"), "radiator_support");
        BigDecimal maximumSupportedRadiator = maximumRadiatorSize(supportedRadiators);
        if (!isLiquidCooler(text(cooler, "cooler_type"))
                || radiatorSize == null || maximumSupportedRadiator == null) {
            checks.add(check(
                    "CASE_COOLER_CLEARANCE", "Chiều cao tản nhiệt và giới hạn case",
                    "INSUFFICIENT_DATA", "Thiếu thông số để xác nhận độ vừa vặn của tản nhiệt."));
        } else if (radiatorSize.compareTo(maximumSupportedRadiator) <= 0) {
            checks.add(check(
                    "CASE_COOLER_CLEARANCE", "Khả năng hỗ trợ radiator của case",
                    "COMPATIBLE", radiatorSize.stripTrailingZeros().toPlainString()
                            + " mm không vượt vị trí hỗ trợ "
                            + maximumSupportedRadiator.stripTrailingZeros().toPlainString() + " mm."));
        } else {
            checks.add(check(
                    "CASE_COOLER_CLEARANCE", "Khả năng hỗ trợ radiator của case",
                    "INCOMPATIBLE", radiatorSize.stripTrailingZeros().toPlainString()
                            + " mm vượt vị trí hỗ trợ "
                            + maximumSupportedRadiator.stripTrailingZeros().toPlainString() + " mm."));
        }
    }

    private BigDecimal firstArrayNumber(JsonNode values) {
        if (values == null || !values.isArray() || values.isEmpty() || !values.get(0).isNumber()) {
            return null;
        }
        BigDecimal number = values.get(0).decimalValue();
        return number.signum() > 0 ? number : null;
    }

    private boolean isLiquidCooler(String coolerType) {
        if (coolerType == null) return false;
        String normalized = normalize(coolerType);
        return normalized.contains("AIO") || normalized.contains("LIQUID") || normalized.contains("NƯỚC");
    }

    /**
     * Radiators are stored either by nominal size (240) or by physical length (277 for a
     * 240 mm unit, 458 for a 420 mm unit); case support is always nominal. Snap to the
     * largest standard size that fits within the stored length.
     */
    private BigDecimal nominalRadiatorSize(BigDecimal length) {
        if (length == null) return null;
        BigDecimal nominal = null;
        for (BigDecimal standard : STANDARD_RADIATOR_SIZES) {
            if (standard.compareTo(length) <= 0) nominal = standard;
        }
        return nominal == null ? length : nominal;
    }

    private BigDecimal maximumRadiatorSize(JsonNode supportedRadiators) {
        if (supportedRadiators == null
                || !supportedRadiators.isArray() && !supportedRadiators.isObject()) return null;
        BigDecimal maximum = null;
        // Arrays list positions as text; objects map a position ("top", "front") to sizes.
        // Iterating either node yields its elements or its field values.
        for (JsonNode supportedRadiator : supportedRadiators) {
            if (!supportedRadiator.isString()) continue;
            Matcher matcher = RADIATOR_SIZE.matcher(supportedRadiator.asString());
            while (matcher.find()) {
                BigDecimal size = new BigDecimal(matcher.group(1));
                if (maximum == null || size.compareTo(maximum) > 0) maximum = size;
            }
        }
        return maximum;
    }

    private void checkMemoryLimits(
            Map<String, CatalogProduct> products,
            List<PcBuilderCompatibilityResponse.Check> checks) {
        CatalogProduct ram = products.get("RAM");
        CatalogProduct board = products.get("MOTHERBOARD");
        if (ram == null || board == null) return;
        BigDecimal capacity = number(ram, "capacity_gb");
        BigDecimal maxCapacity = number(board, "max_memory_gb");
        if (capacity != null && maxCapacity != null) {
            checks.add(capacity.compareTo(maxCapacity) <= 0
                    ? check("RAM_MOTHERBOARD_CAPACITY", "Dung lượng RAM và giới hạn bo mạch chủ", "COMPATIBLE",
                            plain(capacity) + " GB không vượt mức tối đa " + plain(maxCapacity) + " GB của bo mạch.")
                    : check("RAM_MOTHERBOARD_CAPACITY", "Dung lượng RAM và giới hạn bo mạch chủ", "INCOMPATIBLE",
                            plain(capacity) + " GB vượt mức tối đa " + plain(maxCapacity) + " GB của bo mạch."));
        }
        BigDecimal modules = number(ram, "modules_per_kit");
        BigDecimal slots = number(board, "memory_slot_count");
        if (modules != null && slots != null) {
            checks.add(modules.compareTo(slots) <= 0
                    ? check("RAM_MOTHERBOARD_SLOTS", "Số thanh RAM và khe cắm", "COMPATIBLE",
                            "Kit " + plain(modules) + " thanh, bo mạch có " + plain(slots) + " khe RAM.")
                    : check("RAM_MOTHERBOARD_SLOTS", "Số thanh RAM và khe cắm", "INCOMPATIBLE",
                            "Kit " + plain(modules) + " thanh nhưng bo mạch chỉ có " + plain(slots) + " khe RAM."));
        }
    }

    private void checkMemorySpeed(
            Map<String, CatalogProduct> products,
            List<PcBuilderCompatibilityResponse.Check> checks) {
        CatalogProduct ram = products.get("RAM");
        CatalogProduct board = products.get("MOTHERBOARD");
        if (ram == null || board == null) return;
        BigDecimal ramRate = number(ram, "data_rate_mt_s");
        BigDecimal boardRate = number(board, "max_memory_data_rate_mt_s");
        if (ramRate == null || boardRate == null) return;
        checks.add(ramRate.compareTo(boardRate) <= 0
                ? check("RAM_MOTHERBOARD_SPEED", "Tốc độ RAM và bo mạch chủ", "COMPATIBLE",
                        "RAM " + plain(ramRate) + " MT/s nằm trong mức bo mạch hỗ trợ " + plain(boardRate) + " MT/s.")
                : check("RAM_MOTHERBOARD_SPEED", "Tốc độ RAM và bo mạch chủ", WARNING,
                        "RAM " + plain(ramRate) + " MT/s cao hơn mức bo mạch hỗ trợ " + plain(boardRate)
                                + " MT/s; RAM vẫn chạy nhưng ở tốc độ thấp hơn."));
    }

    private void checkStorageConnection(
            Map<String, CatalogProduct> products,
            List<PcBuilderCompatibilityResponse.Check> checks) {
        CatalogProduct storage = products.get("STORAGE");
        CatalogProduct board = products.get("MOTHERBOARD");
        if (storage == null || board == null) return;
        String description = normalize(String.join(" ",
                java.util.Objects.requireNonNullElse(text(storage, "interface"), ""),
                java.util.Objects.requireNonNullElse(text(storage, "form_factor"), "")));
        boolean usesM2 = description.contains("M.2") || description.contains("NVME") || description.contains("PCIE");
        boolean usesSata = !usesM2 && description.contains("SATA");
        String attribute = usesM2 ? "m2_slot_count" : usesSata ? "sata_port_count" : null;
        if (attribute == null) return;
        BigDecimal available = numberOrZero(board, attribute);
        if (available == null) return;
        String connection = usesM2 ? "khe M.2" : "cổng SATA";
        checks.add(available.signum() > 0
                ? check("STORAGE_MOTHERBOARD_CONNECTION", "Kết nối ổ lưu trữ với bo mạch chủ", "COMPATIBLE",
                        "Bo mạch có " + plain(available) + " " + connection + " cho ổ này.")
                : check("STORAGE_MOTHERBOARD_CONNECTION", "Kết nối ổ lưu trữ với bo mạch chủ", "INCOMPATIBLE",
                        "Ổ cần " + connection + " nhưng bo mạch không có."));
    }

    private void checkSystemPower(
            Map<String, CatalogProduct> products,
            List<PcBuilderCompatibilityResponse.Check> checks) {
        CatalogProduct cpu = products.get("CPU");
        CatalogProduct psu = products.get("PSU");
        if (cpu == null || psu == null) return;
        BigDecimal wattage = number(psu, "wattage");
        BigDecimal cpuWatt = java.util.Objects.requireNonNullElse(
                number(cpu, "max_turbo_power_watt"), java.util.Objects.requireNonNullElse(number(cpu, "tdp_watt"), BigDecimal.ZERO));
        BigDecimal gpuWatt = products.containsKey("GPU") ? number(products.get("GPU"), "board_power_watt") : BigDecimal.ZERO;
        if (wattage == null || cpuWatt.signum() == 0 || gpuWatt == null) return;
        BigDecimal estimate = BASE_SYSTEM_WATT.add(cpuWatt).add(gpuWatt);
        BigDecimal withHeadroom = estimate.multiply(POWER_HEADROOM);
        BigDecimal suggested = withHeadroom.divide(new BigDecimal("50"), 0, java.math.RoundingMode.CEILING)
                .multiply(new BigDecimal("50"));
        String breakdown = "ước tính " + plain(estimate) + " W (CPU " + plain(cpuWatt) + " W"
                + (gpuWatt.signum() > 0 ? " + VGA " + plain(gpuWatt) + " W" : "")
                + " + khoảng " + plain(BASE_SYSTEM_WATT) + " W linh kiện khác)";
        if (wattage.compareTo(estimate) < 0) {
            checks.add(check("SYSTEM_POWER_BUDGET", "Tổng công suất hệ thống", "INCOMPATIBLE",
                    "Nguồn " + plain(wattage) + " W không đủ cho mức " + breakdown + "; nên chọn từ "
                            + plain(suggested) + " W."));
        } else if (wattage.compareTo(withHeadroom) < 0) {
            checks.add(check("SYSTEM_POWER_BUDGET", "Tổng công suất hệ thống", WARNING,
                    "Nguồn " + plain(wattage) + " W đủ cho mức " + breakdown + " nhưng dư địa dưới 20%; nên chọn từ "
                            + plain(suggested) + " W."));
        } else {
            checks.add(check("SYSTEM_POWER_BUDGET", "Tổng công suất hệ thống", "COMPATIBLE",
                    "Nguồn " + plain(wattage) + " W đủ cho mức " + breakdown + "."));
        }
    }

    private void checkGpuPowerConnectors(
            Map<String, CatalogProduct> products,
            List<PcBuilderCompatibilityResponse.Check> checks) {
        CatalogProduct gpu = products.get("GPU");
        CatalogProduct psu = products.get("PSU");
        if (gpu == null || psu == null) return;
        String gpuConnectors = normalize(String.join(" ", textList(specification(gpu, "power_connectors"))));
        if (gpuConnectors.isEmpty()) return;
        String label = "Đầu cấp nguồn VGA";
        if (SIXTEEN_PIN.matcher(gpuConnectors).find()) {
            checks.add(psuHasNativeSixteenPin(psu)
                    ? check("GPU_PSU_CONNECTORS", label, "COMPATIBLE", "Nguồn có cáp 16-pin (12V-2x6/12VHPWR) gốc cho VGA.")
                    : check("GPU_PSU_CONNECTORS", label, WARNING,
                            "VGA dùng đầu 16-pin nhưng nguồn không ghi rõ cáp 16-pin gốc; cần dùng cáp chuyển đi kèm VGA."));
            return;
        }
        int needed = countConnectors(gpuConnectors, GPU_EIGHT_PIN);
        Integer available = pcieConnectorCount(psu);
        if (needed == 0 || available == null) return;
        checks.add(available >= needed
                ? check("GPU_PSU_CONNECTORS", label, "COMPATIBLE",
                        "VGA cần " + needed + " đầu 8-pin, nguồn có " + available + " đầu PCIe 6+2-pin.")
                : check("GPU_PSU_CONNECTORS", label, "INCOMPATIBLE",
                        "VGA cần " + needed + " đầu 8-pin nhưng nguồn chỉ có " + available + " đầu PCIe 6+2-pin."));
    }

    private void checkPsuLength(
            Map<String, CatalogProduct> products,
            List<PcBuilderCompatibilityResponse.Check> checks) {
        CatalogProduct psu = products.get("PSU");
        CatalogProduct pcCase = products.get("CASE");
        if (psu == null || pcCase == null) return;
        BigDecimal maximum = number(pcCase, "max_psu_length_mm");
        BigDecimal length = atxPsuLength(specification(psu, "dimensions_mm"));
        if (maximum == null || length == null) return;
        checks.add(length.compareTo(maximum) <= 0
                ? check("CASE_PSU_LENGTH", "Chiều dài nguồn và giới hạn case", "COMPATIBLE",
                        plain(length) + " mm không vượt giới hạn " + plain(maximum) + " mm.")
                : check("CASE_PSU_LENGTH", "Chiều dài nguồn và giới hạn case", "INCOMPATIBLE",
                        plain(length) + " mm vượt giới hạn " + plain(maximum) + " mm."));
    }

    private void checkDisplayOutput(
            Map<String, CatalogProduct> products,
            List<PcBuilderCompatibilityResponse.Check> checks) {
        CatalogProduct cpu = products.get("CPU");
        if (cpu == null || products.containsKey("GPU")) return;
        String graphics = text(cpu, "integrated_graphics");
        if (graphics == null) return;
        String normalized = normalize(graphics);
        boolean none = normalized.startsWith("KHÔNG") || normalized.equals("NONE")
                || normalized.equals("NO") || normalized.equals("FALSE");
        checks.add(none
                ? check("CPU_DISPLAY_OUTPUT", "Xuất hình khi chưa chọn VGA", "INCOMPATIBLE",
                        "CPU không có đồ họa tích hợp; cần chọn card đồ họa rời để có hình.")
                : check("CPU_DISPLAY_OUTPUT", "Xuất hình khi chưa chọn VGA", "COMPATIBLE",
                        "CPU có đồ họa tích hợp (" + graphics + "), xuất hình qua cổng trên bo mạch chủ."));
    }

    private boolean psuHasNativeSixteenPin(CatalogProduct psu) {
        String nativeConnector = text(psu, "native_16pin_connector");
        if (nativeConnector != null && isFirmSixteenPin(normalize(nativeConnector))) return true;
        return textList(specification(psu, "connectors")).stream()
                .map(this::normalize)
                .anyMatch(this::isFirmSixteenPin);
    }

    /** "12V-2x6" or "12VHPWR" without hedges such as "adapter", "tùy model", "không có". */
    private boolean isFirmSixteenPin(String connector) {
        return SIXTEEN_PIN.matcher(connector).find()
                && !connector.contains("KHÔNG") && !connector.contains("ADAPTER") && !connector.contains("TÙY");
    }

    private Integer pcieConnectorCount(CatalogProduct psu) {
        Integer total = null;
        for (String connector : textList(specification(psu, "connectors"))) {
            String normalized = normalize(connector);
            if (!normalized.contains("PCIE")) continue;
            Matcher leading = LEADING_COUNT.matcher(normalized);
            Matcher trailing = TRAILING_COUNT.matcher(normalized);
            Integer count = leading.find() ? Integer.valueOf(leading.group(1))
                    : trailing.find() ? Integer.valueOf(trailing.group(1)) : null;
            if (count == null) return null;
            total = (total == null ? 0 : total) + count;
        }
        return total;
    }

    private int countConnectors(String connectors, Pattern pattern) {
        int total = 0;
        Matcher matcher = pattern.matcher(connectors);
        while (matcher.find()) total += Integer.parseInt(matcher.group(1));
        return total;
    }

    /** Length of an ATX unit stored as three sides in any order: drop the 150 mm width and 86 mm height. */
    private BigDecimal atxPsuLength(JsonNode dimensions) {
        if (dimensions == null || !dimensions.isArray() || dimensions.size() != 3) return null;
        List<BigDecimal> sides = new ArrayList<>();
        for (JsonNode side : dimensions) {
            if (!side.isNumber()) return null;
            sides.add(side.decimalValue());
        }
        if (!removeSide(sides, ATX_PSU_WIDTH) || !removeSide(sides, ATX_PSU_HEIGHT)) return null;
        return sides.getFirst();
    }

    private boolean removeSide(List<BigDecimal> sides, BigDecimal side) {
        for (int index = 0; index < sides.size(); index++) {
            if (sides.get(index).compareTo(side) == 0) {
                sides.remove(index);
                return true;
            }
        }
        return false;
    }

    private List<String> textList(JsonNode values) {
        List<String> texts = new ArrayList<>();
        if (values == null) return texts;
        if (values.isString()) {
            texts.add(values.asString());
        } else if (values.isArray()) {
            for (JsonNode value : values) {
                if (value.isString()) texts.add(value.asString());
            }
        }
        return texts;
    }

    /** Like {@link #number} but keeps an explicit 0 (e.g. a board without SATA ports). */
    private BigDecimal numberOrZero(CatalogProduct product, String attribute) {
        String value = text(product, attribute);
        if (value == null) return null;
        try {
            BigDecimal number = new BigDecimal(value);
            return number.signum() >= 0 ? number : null;
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private String plain(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }

    private PcBuilderCompatibilityResponse.Check check(
            String code, String label, String status, String detail) {
        return new PcBuilderCompatibilityResponse.Check(code, label, status, detail);
    }

    private boolean matchesSlot(String slot, String productType) {
        if ("MOTHERBOARD".equals(slot)) return "MOTHERBOARD".equals(productType) || "MAINBOARD".equals(productType);
        return slot.equals(productType);
    }

    private JsonNode specification(CatalogProduct product, String attribute) {
        return product.specifications() == null ? null : product.specifications().get(attribute);
    }

    private String text(CatalogProduct product, String attribute) {
        JsonNode value = specification(product, attribute);
        if (value == null || value.isNull() || !value.isValueNode()) return null;
        String text = value.asString().trim();
        return text.isEmpty() ? null : text;
    }

    private BigDecimal number(CatalogProduct product, String attribute) {
        String value = text(product, attribute);
        if (value == null) return null;
        try {
            BigDecimal number = new BigDecimal(value);
            return number.signum() > 0 ? number : null;
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private String normalize(String value) {
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeCompatibilityValue(String checkCode, String value) {
        String normalized = normalize(value);
        return "COOLER_CPU_SOCKET".equals(checkCode)
                ? normalized.replaceFirst("^(AMD|INTEL)\\s+", "")
                : normalized;
    }
}
