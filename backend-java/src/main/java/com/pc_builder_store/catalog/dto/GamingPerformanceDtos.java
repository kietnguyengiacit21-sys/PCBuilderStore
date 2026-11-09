package com.pc_builder_store.catalog.dto;

import java.util.List;

public final class GamingPerformanceDtos {

    private GamingPerformanceDtos() {}

    public record EstimateRequest(
            String offerId,
            String resolution,
            String quality,
            List<SelectedUpgrade> upgrades) {}

    public record SelectedUpgrade(String groupId, String optionId, Integer quantity) {}

    public record EstimateResponse(
            String resolution,
            String quality,
            List<GameEstimate> games,
            CategorySummary aaa,
            CategorySummary esports) {}

    public record GameEstimate(
            String gameId,
            String name,
            String category,
            String resolution,
            String quality,
            Integer estimatedFps,
            String classification,
            String explanation,
            boolean targetMet) {}

    public record CategorySummary(
            int gamesMeetingTarget,
            int totalGames,
            String status) {}
}
