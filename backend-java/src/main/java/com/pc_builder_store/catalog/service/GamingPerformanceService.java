package com.pc_builder_store.catalog.service;

import static com.pc_builder_store.catalog.dto.GamingPerformanceDtos.*;
import static com.pc_builder_store.catalog.dto.ProductUpgradeDtos.*;

import com.pc_builder_store.catalog.dto.CatalogBomComponent;
import com.pc_builder_store.catalog.dto.CatalogProduct;
import com.pc_builder_store.catalog.repository.CatalogRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class GamingPerformanceService {

    private static final Pattern RAM_CAPACITY = Pattern.compile("(?i)(\\d{1,3})\\s*GB");
    private static final List<GameProfile> GAMES = List.of(
            game("cyberpunk-2077", "Cyberpunk 2077", "AAA", 42),
            game("black-myth-wukong", "Black Myth: Wukong", "AAA", 35),
            game("alan-wake-2", "Alan Wake 2", "AAA", 34),
            game("starfield", "Starfield", "AAA", 44),
            game("hogwarts-legacy", "Hogwarts Legacy", "AAA", 48),
            game("baldurs-gate-3", "Baldur's Gate 3", "AAA", 72),
            game("forza-horizon-5", "Forza Horizon 5", "AAA", 74),
            game("red-dead-redemption-2", "Red Dead Redemption 2", "AAA", 52),
            game("elden-ring", "Elden Ring", "AAA", 60),
            game("the-last-of-us-part-i", "The Last of Us Part I", "AAA", 42),
            game("assassins-creed-shadows", "Assassin's Creed Shadows", "AAA", 40),
            game("monster-hunter-wilds", "Monster Hunter Wilds", "AAA", 38),
            game("call-of-duty-black-ops-6", "Call of Duty: Black Ops 6", "AAA", 68),
            game("resident-evil-4", "Resident Evil 4", "AAA", 78),
            game("final-fantasy-xvi", "Final Fantasy XVI", "AAA", 48),
            game("valorant", "Valorant", "ESPORTS", 260),
            game("counter-strike-2", "Counter-Strike 2", "ESPORTS", 190),
            game("league-of-legends", "League of Legends", "ESPORTS", 280),
            game("dota-2", "Dota 2", "ESPORTS", 190),
            game("overwatch-2", "Overwatch 2", "ESPORTS", 170),
            game("rainbow-six-siege", "Rainbow Six Siege", "ESPORTS", 190),
            game("rocket-league", "Rocket League", "ESPORTS", 220),
            game("apex-legends", "Apex Legends", "ESPORTS", 145),
            game("fortnite", "Fortnite", "ESPORTS", 135),
            game("pubg-battlegrounds", "PUBG: Battlegrounds", "ESPORTS", 125));

    private final CatalogRepository catalogRepository;
    private final ProductUpgradeService upgradeService;

    public GamingPerformanceService(
            CatalogRepository catalogRepository,
            ProductUpgradeService upgradeService) {
        this.catalogRepository = catalogRepository;
        this.upgradeService = upgradeService;
    }

    public EstimateResponse estimate(String modelCode, EstimateRequest request) {
        if (request == null || blank(request.offerId())) {
            throw badRequest("Cần chọn ưu đãi PC để ước tính hiệu năng.");
        }
        String resolution = normalize(request.resolution(), Map.of(
                "1080P", "1080p", "1440P", "1440p", "2K", "1440p", "2160P", "2160p", "4K", "2160p"));
        String quality = normalize(request.quality(), Map.of(
                "LOW", "LOW", "MEDIUM", "MEDIUM", "HIGH", "HIGH", "ULTRA", "ULTRA"));
        CatalogProduct product = catalogRepository.findActiveProduct(modelCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm."));
        if (!"PC".equals(product.productType())) {
            throw badRequest("Ước tính hiệu năng chỉ hỗ trợ PC lắp sẵn.");
        }
        PublicConfiguration configuration =
                upgradeService.getPublicConfiguration(modelCode, request.offerId());
        Map<String, PublicUpgradeGroup> groups = configuration.groups().stream()
                .collect(java.util.stream.Collectors.toMap(PublicUpgradeGroup::groupId, group -> group));

        List<CatalogBomComponent> components = new ArrayList<>(product.bomComponents());
        if (request.upgrades() != null) {
            for (SelectedUpgrade selection : request.upgrades()) {
                PublicUpgradeGroup group = groups.get(selection.groupId());
                if (group == null) throw badRequest("Nhóm nâng cấp không thuộc cấu hình PC này.");
                PublicUpgradeOption option = group.options().stream()
                        .filter(item -> item.optionId().equals(selection.optionId()))
                        .findFirst()
                        .orElseThrow(() -> badRequest("Lựa chọn nâng cấp không còn khả dụng."));
                int quantity = selection.quantity() == null ? option.minimumQuantity() : selection.quantity();
                if (quantity < option.minimumQuantity() || quantity > option.maximumQuantity()
                        || quantity > option.availableQuantity()) {
                    throw badRequest("Số lượng linh kiện nâng cấp không còn khả dụng.");
                }
                int componentIndex = componentIndex(components, option.productType());
                if (componentIndex < 0) {
                    throw badRequest("Không thể ánh xạ lựa chọn nâng cấp vào BOM hiện tại.");
                }
                CatalogBomComponent current = components.get(componentIndex);
                components.set(componentIndex, new CatalogBomComponent(
                        option.productId(), option.modelCode(), option.productName(), option.productType(),
                        quantity, current.warrantyMonths(), current.displayCategory(),
                        current.displayOrder(), null, null, current.keySpecifications()));
            }
        }

        String cpu = componentName(components, "CPU");
        String gpu = componentName(components, "GPU");
        int gpuTier = gpuTier(gpu);
        if (cpu == null || gpu == null || gpuTier == 0) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Thiếu dữ liệu nhận diện CPU hoặc GPU; chưa thể tạo ước tính đáng tin cậy.");
        }
        int cpuTier = cpuTier(cpu);
        int ramGb = ramCapacity(components);
        double resolutionFactor = switch (resolution) {
            case "1440p" -> 0.72;
            case "2160p" -> 0.48;
            default -> 1.0;
        };
        double qualityFactor = switch (quality) {
            case "LOW" -> 1.48;
            case "MEDIUM" -> 1.22;
            case "ULTRA" -> 0.79;
            default -> 1.0;
        };
        double cpuFactor = 0.84 + Math.min(cpuTier, 10) * 0.025;
        double ramFactor = ramGb < 16 ? 0.72 : ramGb < 32 ? 1.0 : 1.04;
        List<GameEstimate> results = GAMES.stream().map(game -> {
            double gameFactor = "ESPORTS".equals(game.category()) ? 1.45 : 1.0;
            int fps = Math.max(1, (int) Math.round(
                    game.baseFps() * gpuTier / 5.0 * resolutionFactor
                            * qualityFactor * cpuFactor * ramFactor * gameFactor));
            int target = "ESPORTS".equals(game.category()) ? 100 : 60;
            String classification = classification(fps);
            String explanation = ramGb < 16
                    ? "Dung lượng RAM thấp hơn 16 GB có thể làm giảm độ ổn định."
                    : fps < target ? "Có thể cần giảm thiết lập đồ họa để đạt mục tiêu FPS."
                    : "Ước tính dựa trên cấu hình linh kiện đã chọn.";
            return new GameEstimate(game.id(), game.name(), game.category(), resolution, quality,
                    fps, classification, explanation, fps >= target);
        }).toList();
        return new EstimateResponse(
                resolution,
                quality,
                results,
                summary(results, "AAA"),
                summary(results, "ESPORTS"));
    }

    private int componentIndex(List<CatalogBomComponent> components, String productType) {
        for (int index = 0; index < components.size(); index++) {
            if (productType.equalsIgnoreCase(components.get(index).productType())) return index;
        }
        return -1;
    }

    private String componentName(List<CatalogBomComponent> components, String type) {
        return components.stream().filter(item -> type.equalsIgnoreCase(item.productType()))
                .map(item -> item.productName() + " " + item.modelCode())
                .findFirst().orElse(null);
    }

    private int ramCapacity(List<CatalogBomComponent> components) {
        for (CatalogBomComponent component : components) {
            if (!"RAM".equalsIgnoreCase(component.productType())) continue;
            String details = component.productName() + " " + component.modelCode()
                    + " " + component.keySpecifications();
            Matcher matcher = RAM_CAPACITY.matcher(details);
            if (matcher.find()) {
                int capacity = Integer.parseInt(matcher.group(1));
                return component.quantity() > 1 ? capacity * component.quantity() : capacity;
            }
        }
        return 16;
    }

    private int gpuTier(String name) {
        String value = name.toUpperCase(Locale.ROOT);
        if (value.contains("5090")) return 13;
        if (value.contains("RX 7900 XTX") || value.contains("RX 9070 XT") || value.contains("4090")) return 12;
        if (value.contains("5080") || value.contains("RX 7900 XT")
                || value.contains("RX 9070")) return 10;
        if (value.contains("5070") || value.contains("4080") || value.contains("RX 7800")
                || value.contains("RX 7900 GRE")) return 8;
        if (value.contains("4070") || value.contains("5060") || value.contains("RX 7700")
                || value.contains("RX 9060")) return 7;
        if (value.contains("4060") || value.contains("3070") || value.contains("RX 7600")) return 6;
        if (value.contains("5050") || value.contains("3060") || value.contains("RX 6600")) return 5;
        if (value.contains("3050") || value.contains("RX 6500")) return 3;
        return 0;
    }

    private int cpuTier(String name) {
        String value = name.toUpperCase(Locale.ROOT);
        if (value.contains("RYZEN 9") || value.matches(".*\\bI9[- ]?.*")) return 9;
        if (value.contains("RYZEN 7") || value.matches(".*\\bI7[- ]?.*")) return 8;
        if (value.contains("RYZEN 5") || value.matches(".*\\bI5[- ]?.*")) return 6;
        if (value.contains("RYZEN 3") || value.matches(".*\\bI3[- ]?.*")) return 4;
        return 5;
    }

    private String normalize(String value, Map<String, String> allowed) {
        String normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        String result = allowed.get(normalized);
        if (result == null) throw badRequest("Độ phân giải hoặc chất lượng đồ họa không hợp lệ.");
        return result;
    }

    private CategorySummary summary(List<GameEstimate> games, String category) {
        List<GameEstimate> matches = games.stream()
                .filter(game -> category.equals(game.category())).toList();
        int met = (int) matches.stream().filter(GameEstimate::targetMet).count();
        String status = met == matches.size() ? "Chơi mượt mà"
                : met >= Math.ceil(matches.size() * 0.6) ? "Chơi ổn định"
                : met > 0 ? "Cần giảm thiết lập" : "Không phù hợp";
        return new CategorySummary(met, matches.size(), status);
    }

    private String classification(int fps) {
        if (fps >= 120) return "Chơi mượt mà";
        if (fps >= 60) return "Chơi ổn định";
        if (fps >= 35) return "Cần giảm thiết lập";
        return "Không phù hợp";
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static GameProfile game(String id, String name, String category, int baseFps) {
        return new GameProfile(id, name, category, baseFps);
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private record GameProfile(String id, String name, String category, int baseFps) {}
}
