package com.pc_builder_store.catalog.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.pc_builder_store.catalog.CatalogInternalLedger;
import com.pc_builder_store.catalog.dto.CatalogImage;
import com.pc_builder_store.catalog.dto.CatalogProduct;
import com.pc_builder_store.catalog.dto.CatalogQuery;
import com.pc_builder_store.catalog.exception.InvalidCatalogQueryException;
import com.pc_builder_store.catalog.repository.CatalogRepository;
import com.pc_builder_store.inventory.ComponentInventoryService;
import com.pc_builder_store.promotions.PromotionPricingService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import tools.jackson.databind.json.JsonMapper;

class CatalogServiceTest {

    private final CatalogService service = new CatalogService(
            mock(CatalogRepository.class),
            new CatalogInternalLedger(new ClassPathResource(
                    "catalog-internal/catalog-attribute-internal-ledger.csv")),
            JsonMapper.builder().build(),
            mock(ComponentInventoryService.class),
            mock(PromotionPricingService.class));

    @Test
    void appliesPaginationDefaults() {
        CatalogQuery query = service.parseQuery(Map.of());

        assertEquals(1, query.page());
        assertEquals(20, query.limit());
        assertEquals(CatalogQuery.Sort.NAME, query.sort());
        assertEquals(CatalogQuery.Direction.ASC, query.order());
    }

    @Test
    void validatesPricePrecisionRangeAndOrdering() {
        CatalogQuery query = service.parseQuery(Map.of(
                "minPrice", new String[]{"0.10"},
                "maxPrice", new String[]{"9999999999999.99"}));

        assertEquals(new BigDecimal("0.10"), query.minPrice());
        assertEquals(new BigDecimal("9999999999999.99"), query.maxPrice());
        assertInvalid(Map.of("minPrice", new String[]{"1.001"}));
        assertInvalid(Map.of("minPrice", new String[]{"10000000000000"}));
        assertInvalid(Map.of(
                "minPrice", new String[]{"20"},
                "maxPrice", new String[]{"10"}));
    }

    @Test
    void rejectsOutOfRangePaginationAndUnsupportedParameters() {
        assertInvalid(Map.of("page", new String[]{"0"}));
        assertInvalid(Map.of("page", new String[]{"100001"}));
        assertInvalid(Map.of("limit", new String[]{"101"}));
        assertInvalid(Map.of("unexpected", new String[]{"value"}));
    }

    @Test
    void rejectsLongSearchAndInvalidSortOrOrder() {
        assertInvalid(Map.of("q", new String[]{"x".repeat(201)}));
        assertInvalid(Map.of("sort", new String[]{"created"}));
        assertInvalid(Map.of("order", new String[]{"sideways"}));
    }

    @Test
    void parsesRepeatedAttributesAndRejectsBadOrDuplicateCodes() {
        CatalogQuery query = service.parseQuery(Map.of(
                "attribute", new String[]{"memory_type=DDR5", "capacity_gb=16"}));
        assertEquals(2, query.attributes().size());

        assertInvalid(Map.of("attribute", new String[]{"MemoryType=DDR5"}));
        assertInvalid(Map.of("attribute", new String[]{"memory_type=DDR4", "memory_type=DDR5"}));
        assertInvalid(Map.of("attribute", new String[]{"=value"}));
    }

        @Test
        void excludesKnownBrokenImagesFromPublicProducts() throws Exception {
            CatalogRepository repository = mock(CatalogRepository.class);
            CatalogService imageService = new CatalogService(
                repository,
                new CatalogInternalLedger(new ClassPathResource(
                    "catalog-internal/catalog-attribute-internal-ledger.csv")),
                JsonMapper.builder().build(),
                mock(ComponentInventoryService.class),
                mock(PromotionPricingService.class));
        String modelCode = "SKC3000S/1024G";
        CatalogProduct product = new CatalogProduct(
            "1", modelCode, "SSD", null, null, "ACTIVE", "STORAGE", "Storage",
            "STORAGE", "Storage", null, List.of(), JsonMapper.builder().build().readTree("{}"),
            List.of(
                new CatalogImage(
                    "https://backend.gigatron.rs/media/catalog/product/cache/d62e1a0582bf7257bddc609f302ce89c/i/m/image618e3a6c2b2be.jpg",
                    null, true),
                new CatalogImage(
                    "https://www.pcgameshardware.de/screenshots/original/2023/01/Aufmacher-1-pcgh1.jpg",
                    null, false),
                new CatalogImage(
                    "https://www.cityclub.com.mx/dw/image/v2/BGBD_PRD/on/demandware.static/-/Sites-soriana-grocery-master-catalog/default/dwa3ffd6a8/images/product/8886419346432.jpg?sh=1000&sm=fit&sw=1000",
                    null, false),
                new CatalogImage("https://www.bluecom.co.th/images/product/35/1954_1.jpg", null, false),
                new CatalogImage(
                    "https://cdn.x-kom.pl/i/setup/images/prod/big/product-new-big%2C%2C2023/11/pr_2023_11_17_15_18_58_39_00.jpg",
                    null, false),
                new CatalogImage(
                    "https://www.tncstore.vn/media/product/250-9061-chuot-logitech-g-pro-x-superlight-2-wireless-12.jpg",
                    null, false),
                new CatalogImage(
                    "https://img.danawa.com/prod_img/500000/066/723/img/20723066_2.jpg?_v=20230629233748&shrink=360%3A360",
                    null, false),
                new CatalogImage(
                    "https://img-itopya.mncdn.com/cdn/1000/rtx-4070-sup-12g-ven2x-oc_clipped_rev_1-ea96a4.png",
                    null, false),
                new CatalogImage("https://www.dateks.lv/images/pic/2400/2400/713/1579.jpg", null, false),
                new CatalogImage(
                    "https://techpointperu.com/image/cache/catalog/2025/RR-S4KK-20PA-R1-400x400.jpg",
                    null, false),
                new CatalogImage(
                    "https://soscomputacion.com.ar/31187-thickbox_default/mouse-gamer-logitech-g502-hero-sensor-hero-100-a-25600-dpi.jpg",
                    null, false),
                new CatalogImage(
                    "https://www.soscomputacion.com.ar/31187-thickbox_default/mouse-gamer-logitech-g502-hero-sensor-hero-100-a-25600-dpi.jpg",
                    null, false),
                new CatalogImage("https://media.digitalife.com.mx/products/49286/649cbe35a0e86.jpg", null, false),
                new CatalogImage("https://www.coolermaster.com/catalog/cases/mid-tower/masterbox-nr600-without-odd/images/1.jpg", null, false),
                new CatalogImage("https://www.noctua.at/_next/image?q=85&url=https%3A%2F%2Fcdn.noctua.at%2Fmedia%2Fnh_u12s_redux_4.jpg&w=3840", null, false),
                new CatalogImage("https://www.fractal-design.com/app/uploads/2023/02/North_Charcoal_TGD_8-Front.jpg", null, false),
                new CatalogImage("https://www.coolermaster.com/catalog/coolers/cpu-liquid-coolers/masterliquid-240l-core/images/1.jpg", null, false),
                new CatalogImage("https://example.com/working-image.jpg", null, false)),
            false);
        when(repository.findActiveProduct(modelCode)).thenReturn(Optional.of(product));

        CatalogProduct publicProduct = imageService.getProduct(modelCode);

        assertEquals(1, publicProduct.images().size());
        assertEquals("https://example.com/working-image.jpg", publicProduct.images().getFirst().url());
        }

    private void assertInvalid(Map<String, String[]> parameters) {
        assertThrows(InvalidCatalogQueryException.class, () -> service.parseQuery(parameters));
    }
}
