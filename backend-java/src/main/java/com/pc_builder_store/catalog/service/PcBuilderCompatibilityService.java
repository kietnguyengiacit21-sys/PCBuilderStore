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

    private static final Pattern RADIATOR_SIZE = Pattern.compile("(\\d+(?:\\.\\d+)?)\\s*MM",
            Pattern.CASE_INSENSITIVE);
    private static final Set<String> COMPONENT_SLOTS = Set.of(
            "CPU", "MOTHERBOARD", "RAM", "GPU", "STORAGE", "PSU", "CASE", "COOLER");
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

        BigDecimal radiatorSize = firstArrayNumber(specification(cooler, "radiator_dimensions_mm"));
        JsonNode supportedRadiators = specification(products.get("CASE"), "radiator_support");
        BigDecimal maximumSupportedRadiator = maximumRadiatorSize(supportedRadiators);
        if (!"AIO LIQUID".equals(normalize(text(cooler, "cooler_type")))
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

    private BigDecimal maximumRadiatorSize(JsonNode supportedRadiators) {
        if (supportedRadiators == null || !supportedRadiators.isArray()) return null;
        BigDecimal maximum = null;
        for (JsonNode supportedRadiator : supportedRadiators) {
            if (!supportedRadiator.isTextual()) continue;
            Matcher matcher = RADIATOR_SIZE.matcher(supportedRadiator.asString());
            while (matcher.find()) {
                BigDecimal size = new BigDecimal(matcher.group(1));
                if (maximum == null || size.compareTo(maximum) > 0) maximum = size;
            }
        }
        return maximum;
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
