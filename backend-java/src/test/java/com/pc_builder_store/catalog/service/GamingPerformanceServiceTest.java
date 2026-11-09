package com.pc_builder_store.catalog.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.pc_builder_store.catalog.dto.CatalogBomComponent;
import com.pc_builder_store.catalog.dto.CatalogProduct;
import com.pc_builder_store.catalog.dto.GamingPerformanceDtos.EstimateRequest;
import com.pc_builder_store.catalog.dto.GamingPerformanceDtos.EstimateResponse;
import com.pc_builder_store.catalog.dto.GamingPerformanceDtos.SelectedUpgrade;
import com.pc_builder_store.catalog.dto.ProductUpgradeDtos.PublicConfiguration;
import com.pc_builder_store.catalog.dto.ProductUpgradeDtos.PublicUpgradeGroup;
import com.pc_builder_store.catalog.dto.ProductUpgradeDtos.PublicUpgradeOption;
import com.pc_builder_store.catalog.repository.CatalogRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class GamingPerformanceServiceTest {

    private CatalogRepository catalogRepository;
    private ProductUpgradeService upgradeService;
    private GamingPerformanceService service;

    @BeforeEach
    void setUp() {
        catalogRepository = mock(CatalogRepository.class);
        upgradeService = mock(ProductUpgradeService.class);
        service = new GamingPerformanceService(catalogRepository, upgradeService);
        when(catalogRepository.findActiveProduct("PBC-PC-GAME-014"))
                .thenReturn(Optional.of(pcProduct()));
    }

    @Test
    void estimatesAreDeterministicAndReturnBothCategorySummaries() {
        when(upgradeService.getPublicConfiguration("PBC-PC-GAME-014", "offer-1"))
                .thenReturn(new PublicConfiguration(List.of(), List.of(), List.of()));
        EstimateRequest request = new EstimateRequest("offer-1", "1080p", "HIGH", List.of());

        EstimateResponse first = service.estimate("PBC-PC-GAME-014", request);
        EstimateResponse second = service.estimate("PBC-PC-GAME-014", request);

        assertEquals(25, first.games().size());
        assertEquals(first.games(), second.games());
        assertEquals(15, first.aaa().totalGames());
        assertEquals(10, first.esports().totalGames());
    }

    @Test
    void higherResolutionAndQualityReduceEstimatedFrameRate() {
        when(upgradeService.getPublicConfiguration("PBC-PC-GAME-014", "offer-1"))
                .thenReturn(new PublicConfiguration(List.of(), List.of(), List.of()));

        int base = service.estimate("PBC-PC-GAME-014",
                new EstimateRequest("offer-1", "1080p", "HIGH", List.of())).games().getFirst().estimatedFps();
        int highResolution = service.estimate("PBC-PC-GAME-014",
                new EstimateRequest("offer-1", "2160p", "HIGH", List.of())).games().getFirst().estimatedFps();
        int ultra = service.estimate("PBC-PC-GAME-014",
                new EstimateRequest("offer-1", "1080p", "ULTRA", List.of())).games().getFirst().estimatedFps();

        assertTrue(highResolution < base);
        assertTrue(ultra < base);
    }

    @Test
    void selectedBackendGpuUpgradeChangesEstimate() {
        PublicUpgradeOption defaultGpu = gpuOption("gpu-default", "RX9070XT-PULSE-16G", "Pulse Radeon RX 9070 XT 16GB");
        PublicUpgradeOption strongerGpu = gpuOption("gpu-stronger", "RTX-5090", "GeForce RTX 5090");
        PublicUpgradeGroup group = new PublicUpgradeGroup(
                "gpu-group", "GPU", "Card đồ họa", null, false, 0,
                List.of(defaultGpu, strongerGpu));
        when(upgradeService.getPublicConfiguration("PBC-PC-GAME-014", "offer-1"))
                .thenReturn(new PublicConfiguration(List.of(group), List.of(), List.of()));

        int defaultFps = service.estimate("PBC-PC-GAME-014",
                new EstimateRequest("offer-1", "1080p", "HIGH",
                        List.of(new SelectedUpgrade("gpu-group", "gpu-default", 1))))
                .games().getFirst().estimatedFps();
        int upgradedFps = service.estimate("PBC-PC-GAME-014",
                new EstimateRequest("offer-1", "1080p", "HIGH",
                        List.of(new SelectedUpgrade("gpu-group", "gpu-stronger", 1))))
                .games().getFirst().estimatedFps();

        assertTrue(upgradedFps > defaultFps);
    }

    @Test
    void selectedBackendCpuAndRamChoicesAffectTheEstimate() {
        PublicUpgradeGroup cpuGroup = new PublicUpgradeGroup(
                "cpu-group", "CPU", "CPU", null, false, 0,
                List.of(componentOption("cpu-option", "AMD Ryzen 9 9950X", "CPU", 1)));
        PublicUpgradeGroup ramGroup = new PublicUpgradeGroup(
                "ram-group", "RAM", "RAM", null, false, 1,
                List.of(componentOption("ram-option", "DDR5 8GB", "RAM", 1)));
        when(upgradeService.getPublicConfiguration("PBC-PC-GAME-014", "offer-1"))
                .thenReturn(new PublicConfiguration(List.of(cpuGroup, ramGroup), List.of(), List.of()));

        int baseFps = service.estimate("PBC-PC-GAME-014",
                new EstimateRequest("offer-1", "1080p", "HIGH", List.of()))
                .games().getFirst().estimatedFps();
        int upgradedCpuFps = service.estimate("PBC-PC-GAME-014",
                new EstimateRequest("offer-1", "1080p", "HIGH",
                        List.of(new SelectedUpgrade("cpu-group", "cpu-option", 1))))
                .games().getFirst().estimatedFps();
        int lowerCapacityRamFps = service.estimate("PBC-PC-GAME-014",
                new EstimateRequest("offer-1", "1080p", "HIGH",
                        List.of(new SelectedUpgrade("ram-group", "ram-option", 1))))
                .games().getFirst().estimatedFps();

        assertTrue(upgradedCpuFps > baseFps);
        assertTrue(lowerCapacityRamFps < baseFps);
    }

    private CatalogProduct pcProduct() {
        return new CatalogProduct(
                "100", "PBC-PC-GAME-014", "Gaming PC", null, null, "ACTIVE", "PC",
                "Máy tính bộ", "PC-GAMING", "PC Gaming", null, List.of(), null,
                Map.of(), Map.of(), List.of(), false,
                List.of(
                        component("100-100001084WOF", "AMD Ryzen 7 9700X", "CPU", "CPU"),
                        component("RX9070XT-PULSE-16G", "Pulse Radeon RX 9070 XT 16GB", "GPU", "GPU"),
                        component("KF560C36BBEK2-32", "FURY Beast DDR5 32GB 6000 Kit", "RAM", "RAM")),
                null, false, 0);
    }

    private CatalogBomComponent component(String modelCode, String name, String type, String category) {
        return new CatalogBomComponent("1", modelCode, name, type, 1, null,
                category, 0, null, null);
    }

    private PublicUpgradeOption gpuOption(String id, String modelCode, String name) {
        return new PublicUpgradeOption(id, id, "1", modelCode, name, "GPU",
                BigDecimal.ZERO, "VND", 10, BigDecimal.ZERO, name, null,
                "gpu-default".equals(id), 1, 1, 0);
    }

    private PublicUpgradeOption componentOption(String id, String name, String type, int quantity) {
        return new PublicUpgradeOption(id, id, "1", name, name, type,
                BigDecimal.ZERO, "VND", 10, BigDecimal.ZERO, name, null,
                false, quantity, quantity, 0);
    }
}
