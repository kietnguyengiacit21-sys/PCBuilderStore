package com.pc_builder_store.storefront;

import com.pc_builder_store.catalog.dto.CatalogFacets;
import com.pc_builder_store.catalog.dto.CatalogPagination;
import com.pc_builder_store.catalog.dto.CatalogOption;
import com.pc_builder_store.catalog.dto.CatalogProduct;
import com.pc_builder_store.catalog.dto.CatalogProductPage;
import com.pc_builder_store.catalog.service.CatalogService;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class StorefrontHomepageService {

    private static final int CATALOG_READ_LIMIT = 100;
    private static final int COMPONENT_READ_LIMIT = 8;
    private static final int SECTION_PRODUCT_LIMIT = 8;
    private static final Pattern AI_TERM = Pattern.compile("(?<![\\p{L}\\p{N}])ai(?![\\p{L}\\p{N}])");
    private static final List<String> COMPONENT_TYPE_ORDER = List.of(
            "GPU", "CPU", "MOTHERBOARD", "RAM", "STORAGE", "PSU", "CASE",
            "COOLER", "MONITOR", "KEYBOARD", "MOUSE", "HEADSET");
    private static final List<AccessoryCollection> ACCESSORY_COLLECTIONS = List.of(
            new AccessoryCollection("monitor", "Màn hình"),
            new AccessoryCollection("keyboard", "Bàn phím"),
            new AccessoryCollection("mouse", "Chuột"),
            new AccessoryCollection("headset", "Tai nghe"),
            new AccessoryCollection("accessory", "Phụ kiện khác"));
    private final CatalogService catalog;

    public StorefrontHomepageService(CatalogService catalog) {
        this.catalog = catalog;
    }

    public StorefrontHomepageResponse getHomepage() {
        CatalogFacets facets = catalog.getFacets();
        if (facets.productTypes().isEmpty()) {
            return new StorefrontHomepageResponse(List.of());
        }
        Map<String, List<CatalogProduct>> productsByType = new LinkedHashMap<>();
        Map<String, Long> productCounts = new LinkedHashMap<>();
        for (CatalogOption type : facets.productTypes()) {
            int limit = "PC".equals(type.value()) || "ACCESSORY".equals(type.value())
                    ? CATALOG_READ_LIMIT : COMPONENT_READ_LIMIT;
            CatalogProductPage page = catalog.getProducts(productQuery(type.value(), limit, false));
            productsByType.put(type.value(), page.data());
            productCounts.put(type.value(), page.pagination().total());
        }

        List<StorefrontHomepageResponse.Section> sections = new ArrayList<>();
        CatalogProductPage salePage = catalog.getProducts(productQuery(null, CATALOG_READ_LIMIT, true));
        List<CatalogProduct> discountedProducts = uniqueProducts(salePage.data()).stream()
                .filter(StorefrontHomepageService::hasAvailableDiscount)
                .sorted(Comparator.comparing(StorefrontHomepageService::discountPercentage)
                        .reversed()
                        .thenComparing(CatalogProduct::displayOrder)
                        .thenComparing(CatalogProduct::productName))
                .toList();
        List<CatalogProduct> hotSale = discountedProducts.stream()
                .limit(SECTION_PRODUCT_LIMIT)
                .toList();
        addSection(sections, "hot-sale", "Hot Sale", "Giá ưu đãi theo sản phẩm đang bán",
                "/customer/parts?sale=true", "hot-sale", hotSale, salePage.pagination().total());

        List<CatalogProduct> pcs = productsByType.getOrDefault("PC", List.of());
        addPcCollection(sections, pcs, "gaming", "PC Gaming & Streaming",
                "Máy tính chơi game và sáng tạo nội dung", "gaming");
        addPcCollection(sections, pcs, "workstation-creator", "PC Workstation & Creator",
                "Máy tính cho đồ họa, dựng phim và sáng tạo", "workstation");
        addPcCollection(sections, pcs, "amd-gaming", "PC AMD Gaming",
                "Nền tảng AMD dành cho chơi game", "amd-gaming");
        addPcCollection(sections, pcs, "office", "PC Văn phòng & Học tập",
                "Máy tính cho công việc và học tập", "office");
        addPcCollection(sections, pcs, "ai-development", "PC AI & Development",
                "Cấu hình được phân loại cho phát triển và tác vụ AI", "ai");

        for (String type : componentTypes(productsByType.keySet())) {
            List<CatalogProduct> products = productsByType.getOrDefault(type, List.of());
            addSection(sections, "component-" + type.toLowerCase(Locale.ROOT),
                    componentTitle(type, facets.productTypes()),
                    "Linh kiện và thiết bị trong danh mục",
                    productTypeHref(type), "component", products,
                    productCounts.getOrDefault(type, 0L));
        }
        addAccessoryCollections(
                sections,
                productsByType.getOrDefault("ACCESSORY", List.of()));

        return new StorefrontHomepageResponse(List.copyOf(sections));
    }

    private Map<String, String[]> productQuery(String type, int limit, boolean saleOnly) {
        Map<String, String[]> query = new LinkedHashMap<>();
        query.put("page", new String[] {"1"});
        query.put("limit", new String[] {Integer.toString(limit)});
        query.put("sort", new String[] {"name"});
        query.put("order", new String[] {"asc"});
        if (type != null) query.put("type", new String[] {type});
        if (saleOnly) query.put("sale", new String[] {"true"});
        return query;
    }

    private void addPcCollection(
            List<StorefrontHomepageResponse.Section> sections,
            List<CatalogProduct> pcs,
            String key,
            String title,
            String eyebrow,
            String variant) {
        List<CatalogProduct> products = pcs.stream()
                .filter(product -> belongsToCollection(product, key))
                .toList();
        addSection(sections, "pc-" + key, title, eyebrow,
                productTypeHref("PC") + "&pcCollection=" + encode(key),
                variant, products, uniqueProducts(products).size());
    }

    private void addSection(
            List<StorefrontHomepageResponse.Section> sections,
            String key,
            String title,
            String eyebrow,
            String href,
            String variant,
            List<CatalogProduct> products,
            long productCount) {
        if (products.isEmpty()) return;
        List<StorefrontHomepageResponse.Link> links = categoryLinks(products, href);
        sections.add(new StorefrontHomepageResponse.Section(
                key, title, eyebrow, href, variant, productCount, links,
                ordered(products)));
    }

    private List<StorefrontHomepageResponse.Link> categoryLinks(
            List<CatalogProduct> products, String sectionHref) {
        Map<String, StorefrontHomepageResponse.Link> links = new LinkedHashMap<>();
        for (CatalogProduct product : products) {
            if (product.categoryCode() == null || product.categoryCode().isBlank()
                    || product.categoryName() == null || product.categoryName().isBlank()) {
                continue;
            }
            String href = sectionHref + "&category=" + encode(product.categoryCode());
            links.putIfAbsent(product.categoryCode(),
                    new StorefrontHomepageResponse.Link(product.categoryName(), href));
            if (links.size() == 3) break;
        }
        return List.copyOf(links.values());
    }

    private List<String> componentTypes(Set<String> availableTypes) {
        List<String> ordered = new ArrayList<>();
        COMPONENT_TYPE_ORDER.stream()
                .filter(availableTypes::contains)
                .forEach(ordered::add);
        availableTypes.stream()
                .filter(type -> !"PC".equals(type)
                        && !"ACCESSORY".equals(type)
                        && !ordered.contains(type))
                .sorted()
                .forEach(ordered::add);
        return ordered;
    }

    private void addAccessoryCollections(
            List<StorefrontHomepageResponse.Section> sections,
            List<CatalogProduct> accessories) {
        if (accessories.isEmpty()) return;
        for (AccessoryCollection collection : ACCESSORY_COLLECTIONS) {
            List<CatalogProduct> products = accessories.stream()
                    .filter(product -> isAccessoryType(product, collection.key()))
                    .toList();
            if (products.isEmpty()) continue;
            addSection(
                    sections,
                    "gear-" + collection.key(),
                    collection.title(),
                    "Màn hình và thiết bị ngoại vi trong danh mục",
                    productTypeHref("ACCESSORY") + "&accessoryType=" + encode(collection.key()),
                    "component",
                    products,
                    uniqueProducts(products).size());
        }
    }

    private boolean isAccessoryType(CatalogProduct product, String accessoryType) {
        String productName = product.productName().toLowerCase(Locale.ROOT);
        return switch (accessoryType) {
            case "monitor" -> hasAttributePrefix(product, "monitor_")
                    || containsAny(productName, "monitor", "inch", "g24f", "xg27", "vg27", "vg249");
            case "keyboard" -> hasAttributePrefix(product, "keyboard_")
                    || containsAny(productName, "keyboard", "blackwidow", "k552", "k617",
                            "k70", "k8 pro", "f75", "s98 pro");
            case "mouse" -> hasAttributePrefix(product, "mouse_")
                    || containsAny(productName, "mouse", "deathadder", "superlight",
                            "g102", "g304", "g502", "viper");
            case "headset" -> hasAttributePrefix(product, "headset_")
                    || containsAny(productName, "headset", "blackshark", "cloud iii", "kraken", "g733");
            case "accessory" -> ACCESSORY_COLLECTIONS.stream()
                    .filter(collection -> !"accessory".equals(collection.key()))
                    .noneMatch(collection -> isAccessoryType(product, collection.key()));
            default -> false;
        };
    }

    private static boolean hasAttributePrefix(CatalogProduct product, String prefix) {
        if (product.specifications() == null || !product.specifications().isObject()) return false;
        for (var property : product.specifications().properties()) {
            if (property.getKey().startsWith(prefix)) return true;
        }
        return false;
    }

    private String componentTitle(String type, List<CatalogOption> types) {
        return types.stream()
                .filter(option -> option.value().equals(type))
                .map(CatalogOption::label)
                .findFirst()
                .orElse(type);
    }

    private String productTypeHref(String type) {
        return "/customer/parts?type=" + encode(type);
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static List<CatalogProduct> ordered(List<CatalogProduct> products) {
        return uniqueProducts(products).stream()
                .sorted(Comparator.comparing(CatalogProduct::featured).reversed()
                        .thenComparingInt(CatalogProduct::displayOrder)
                        .thenComparing(CatalogProduct::productName))
                .limit(SECTION_PRODUCT_LIMIT)
                .toList();
    }

    private static List<CatalogProduct> uniqueProducts(List<CatalogProduct> products) {
        Map<String, CatalogProduct> unique = new LinkedHashMap<>();
        Set<String> seen = new HashSet<>();
        products.forEach(product -> {
            String modelCode = product.modelCode().trim().toUpperCase(Locale.ROOT);
            String normalizedName = Normalizer.normalize(
                            product.productName().trim().toLowerCase(Locale.ROOT),
                            Normalizer.Form.NFD)
                    .replaceAll("\\p{M}+", "")
                    .replaceAll("[^\\p{L}\\p{N}]+", "");
            if (seen.add("id:" + product.productId())
                    && seen.add("model:" + modelCode)
                    && seen.add("name:" + normalizedName)) {
                unique.put(product.productId(), product);
            }
        });
        return List.copyOf(unique.values());
    }

    private static boolean belongsToCollection(CatalogProduct product, String collection) {
        String targetUse = product.specifications() == null
                ? ""
                : product.specifications().path("target_use").asText("").toLowerCase(Locale.ROOT);
        String productName = product.productName().toLowerCase(Locale.ROOT);
        return switch (collection) {
            case "gaming" -> containsAny(targetUse, "gaming", "stream")
                    || containsAny(productName, "gaming", "stream", "esports");
            case "workstation-creator" -> containsAny(
                    targetUse, "workstation", "creator", "render", "dựng phim", "edit video")
                    || containsAny(productName, "workstation", "creator", "render");
            case "amd-gaming" -> (targetUse.contains("gaming")
                    || containsAny(productName, "gaming"))
                    && product.bomComponents().stream()
                            .filter(component -> "CPU".equals(component.productType()))
                            .anyMatch(component -> containsAny(
                                    component.productName() + " " + component.modelCode(), "amd", "ryzen"));
            case "office" -> containsAny(targetUse, "office", "văn phòng", "học tập")
                    || containsAny(productName, "office", "văn phòng", "học tập");
            case "ai-development" -> AI_TERM.matcher(targetUse).find()
                    || containsAny(targetUse, "development", "developer", "phát triển")
                    || AI_TERM.matcher(productName).find()
                    || containsAny(productName, "development", "developer");
            default -> false;
        };
    }

    private static boolean containsAny(String value, String... terms) {
        if (value == null) return false;
        String normalized = value.toLowerCase(Locale.ROOT);
        for (String term : terms) {
            if (normalized.contains(term.toLowerCase(Locale.ROOT))) return true;
        }
        return false;
    }

    private static boolean hasAvailableDiscount(CatalogProduct product) {
        return product.offers().stream().anyMatch(offer ->
                "ACTIVE".equals(offer.status())
                        && offer.availableQuantity() > 0
                        && originalPrice(offer).compareTo(offer.price()) > 0);
    }

    private static BigDecimal discountPercentage(CatalogProduct product) {
        return product.offers().stream()
                .filter(offer -> "ACTIVE".equals(offer.status()) && offer.availableQuantity() > 0)
                .map(offer -> {
                    BigDecimal original = originalPrice(offer);
                    if (original.compareTo(offer.price()) <= 0 || original.signum() <= 0) {
                        return BigDecimal.ZERO;
                    }
                    return original.subtract(offer.price())
                            .multiply(BigDecimal.valueOf(100))
                            .divide(original, 4, java.math.RoundingMode.HALF_UP);
                })
                .max(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);
    }

    private static BigDecimal originalPrice(com.pc_builder_store.catalog.dto.CatalogOffer offer) {
        return offer.compareAtPrice() != null
                && offer.compareAtPrice().compareTo(offer.price()) > 0
                        ? offer.compareAtPrice()
                        : BigDecimal.ZERO;
    }

    private record AccessoryCollection(String key, String title) {
    }
}
