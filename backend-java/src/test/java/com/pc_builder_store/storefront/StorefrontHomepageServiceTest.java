package com.pc_builder_store.storefront;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;

import com.pc_builder_store.catalog.dto.CatalogBomComponent;
import com.pc_builder_store.catalog.dto.CatalogFacets;
import com.pc_builder_store.catalog.dto.CatalogPagination;
import com.pc_builder_store.catalog.dto.CatalogOffer;
import com.pc_builder_store.catalog.dto.CatalogOption;
import com.pc_builder_store.catalog.dto.CatalogProduct;
import com.pc_builder_store.catalog.dto.CatalogProductPage;
import com.pc_builder_store.catalog.service.CatalogService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class StorefrontHomepageServiceTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    @Mock
    private CatalogService catalog;

    @InjectMocks
    private StorefrontHomepageService homepage;

    @Test
    void buildsNonEmptyCollectionsFromCatalogMetadataAndOnlyValidDiscounts() throws Exception {
        CatalogProduct gaming = pc("1", "Gaming", "Intel Core i5", discountedOffer("1", "100", "125"));
        CatalogProduct amd = pc("2", "Gaming 1440p", "AMD Ryzen 7", discountedOffer("2", "200", "250"));
        CatalogProduct workstation = pc("3", "Workstation / render", "Intel Xeon", regularOffer("3", "300"));
        CatalogProduct office = pc("4", "Office and study", "Intel Core i5", regularOffer("4", "400"));
        CatalogProduct ai = pcWithoutTargetUse(
                "5", "PC AI Developer Ryzen 9", "AMD Ryzen 9", regularOffer("5", "500"));
        CatalogProduct noDiscount = component("6", "GPU", regularOffer("6", "600"));
        CatalogProduct gpuSale = component("7", "GPU", discountedOffer("7", "700", "800"));
        CatalogProduct monitor = accessory("18", "24G2SP Gaming Monitor", "{\"monitor_resolution\":\"FHD\"}");
        CatalogProduct keyboard = accessory("19", "BlackWidow V3", "{\"keyboard_switch_type\":\"Mechanical\"}");
        CatalogProduct microphone = accessory("20", "AM8 USB/XLR Dynamic Microphone", "{}");
        CatalogProduct cloudHeadset = accessory("21", "Cloud III Gaming Headset", "{\"headset_driver_size_mm\":53}");
        CatalogProduct duplicateCloudHeadset = accessory("22", "Cloud III Gaming Headset", "{\"headset_driver_size_mm\":53}");
        List<CatalogProduct> cpuProducts = java.util.stream.IntStream.range(0, 10)
                .mapToObj(index -> component(
                        Integer.toString(8 + index), "CPU",
                        regularOffer(Integer.toString(8 + index), "900")))
                .toList();

        when(catalog.getFacets()).thenReturn(new CatalogFacets(
                List.of(
                        new CatalogOption("PC", "Complete PC"),
                        new CatalogOption("GPU", "Graphics Card"),
                        new CatalogOption("CPU", "Processor"),
                        new CatalogOption("ACCESSORY", "Accessory")),
                List.of(), List.of(), List.of()));
        when(catalog.getProducts(anyMap())).thenAnswer(invocation -> {
            Map<String, String[]> query = invocation.getArgument(0);
            if (query.containsKey("sale")) {
                return page(gaming, amd, gpuSale);
            }
            return switch (query.get("type")[0]) {
                case "PC" -> page(gaming, amd, workstation, office, ai);
                case "GPU" -> page(noDiscount, gpuSale, gpuSale);
                case "CPU" -> new CatalogProductPage(
                        cpuProducts.subList(0, 8),
                        new CatalogPagination(1, 8, 10, 2));
                case "ACCESSORY" -> page(
                        monitor, keyboard, microphone, cloudHeadset, duplicateCloudHeadset);
                default -> page();
            };
        });

        StorefrontHomepageResponse response = homepage.getHomepage();

        assertEquals(List.of(
                "hot-sale", "pc-gaming", "pc-workstation-creator", "pc-amd-gaming",
                "pc-office", "pc-ai-development", "component-gpu", "component-cpu",
                "gear-monitor", "gear-keyboard", "gear-headset", "gear-accessory"),
                response.sections().stream().map(StorefrontHomepageResponse.Section::key).toList());
        assertEquals(List.of("1", "2", "7"), response.sections().get(0).products().stream()
                .map(CatalogProduct::productId).toList());
        assertEquals(2, response.sections().get(1).productCount());
        assertEquals(List.of("1", "2"), response.sections().get(1).products().stream()
                .map(CatalogProduct::productId).toList());
        assertEquals(List.of("2"), response.sections().get(3).products().stream()
                .map(CatalogProduct::productId).toList());
        assertEquals(List.of("4"), response.sections().get(4).products().stream()
                .map(CatalogProduct::productId).toList());
        assertEquals(List.of("5"), response.sections().get(5).products().stream()
                .map(CatalogProduct::productId).toList());
        assertEquals(List.of("6", "7"), response.sections().get(6).products().stream()
                .map(CatalogProduct::productId).toList());
        assertFalse(response.sections().stream()
                .anyMatch(section -> section.products().isEmpty()));
        assertTrue(response.sections().get(1).href().contains("type=PC"));
        assertTrue(response.sections().get(1).links().stream()
                .anyMatch(link -> link.href().contains("category=PREBUILT_PC")));
        assertTrue(response.sections().get(6).href().contains("type=GPU"));
        assertEquals(10, response.sections().get(7).productCount());
        assertEquals(8, response.sections().get(7).products().size());
        assertEquals(8, response.sections().get(7).products().stream()
                .map(CatalogProduct::productId).distinct().count());
        assertEquals(List.of("18"), response.sections().get(8).products().stream()
                .map(CatalogProduct::productId).toList());
        assertTrue(response.sections().get(8).href().contains("accessoryType=monitor"));
        assertEquals(List.of("21"), response.sections().get(10).products().stream()
                .map(CatalogProduct::productId).toList());
        assertEquals(1, response.sections().get(10).productCount());
        assertEquals(List.of("20"), response.sections().get(11).products().stream()
                .map(CatalogProduct::productId).toList());
        verify(catalog, times(5)).getProducts(anyMap());
        verify(catalog).getFacets();
    }

    @Test
    void returnsNoEmptySectionsForAnEmptyCatalog() {
        when(catalog.getFacets()).thenReturn(new CatalogFacets(
                List.of(), List.of(), List.of(), List.of()));

        assertTrue(homepage.getHomepage().sections().isEmpty());
    }

    private static CatalogProductPage page(CatalogProduct... products) {
        return new CatalogProductPage(
                List.of(products),
                new CatalogPagination(1, 100, products.length, products.length == 0 ? 0 : 1));
    }

    private static CatalogProduct pc(
            String id, String targetUse, String cpuName, CatalogOffer offer) throws Exception {
        return pcWithTargetUse(id, "PC " + targetUse, targetUse, cpuName, offer);
    }

    private static CatalogProduct pcWithoutTargetUse(
            String id, String productName, String cpuName, CatalogOffer offer) throws Exception {
        return pcWithTargetUse(id, productName, "", cpuName, offer);
    }

    private static CatalogProduct pcWithTargetUse(
            String id, String productName, String targetUse, String cpuName, CatalogOffer offer)
            throws Exception {
        return new CatalogProduct(
                id, "PC-" + id, productName, null, null, "ACTIVE",
                "PC", "Complete PC", "PREBUILT_PC", "Prebuilt PCs", "Brand",
                List.of(offer),
                JSON.readTree("{\"target_use\":\"" + targetUse + "\"}"),
                Map.of(), Map.of(), List.of(), false,
                List.of(new CatalogBomComponent(
                        "cpu-" + id, "CPU-" + id, cpuName, "CPU", 1,
                        null, "CPU", 0, null, null)),
                null, true, 0);
    }

    private static CatalogProduct component(String id, String type, CatalogOffer offer) {
        return new CatalogProduct(
                id, type + "-" + id, type + " product " + id, null, null, "ACTIVE",
                type, type, type, type, "Brand", List.of(offer),
                null, Map.of(), Map.of(), List.of(), false,
                List.of(), null, false, 0);
    }

    private static CatalogProduct accessory(String id, String name, String specifications)
            throws Exception {
        return new CatalogProduct(
                id, "ACCESSORY-" + id, name, null, null, "ACTIVE",
                "ACCESSORY", "Accessory", "ACCESSORY", "Phụ kiện", "Brand",
                List.of(regularOffer(id, "1000")), JSON.readTree(specifications),
                Map.of(), Map.of(), List.of(), false,
                List.of(), null, false, 0);
    }

    private static CatalogOffer regularOffer(String id, String price) {
        return offer(id, price, price);
    }

    private static CatalogOffer discountedOffer(String id, String price, String compareAt) {
        return offer(id, price, compareAt);
    }

    private static CatalogOffer offer(String id, String price, String compareAt) {
        return new CatalogOffer(
                id, "NEW", new BigDecimal(price), new BigDecimal(price), BigDecimal.ZERO,
                "VND", 10, 0, 10, 24L, "ACTIVE", 0, null, null, null,
                List.of(), List.of(), new BigDecimal(compareAt));
    }
}
