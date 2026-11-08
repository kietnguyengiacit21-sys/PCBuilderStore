package com.pc_builder_store.promotions;

import static com.pc_builder_store.promotions.PromotionDtos.*;

import com.pc_builder_store.auth.AuthUserPrincipal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/catalog/admin/management")
public class PromotionManagementController {

    private final PromotionManagementService service;

    public PromotionManagementController(PromotionManagementService service) {
        this.service = service;
    }

    @GetMapping("/promotion-campaigns")
    public List<Campaign> listCampaigns(
            @RequestParam(defaultValue = "false") boolean includeArchived) {
        return service.listCampaigns(includeArchived);
    }

    @PostMapping("/promotion-campaigns")
    @ResponseStatus(HttpStatus.CREATED)
    public Campaign createCampaign(
            @RequestBody CampaignRequest request,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        return service.saveCampaign(null, request, actor);
    }

    @PutMapping("/promotion-campaigns/{campaignId}")
    public Campaign updateCampaign(
            @PathVariable String campaignId,
            @RequestBody CampaignRequest request,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        return service.saveCampaign(campaignId, request, actor);
    }

    @PostMapping("/promotion-campaigns/{campaignId}/archive")
    public Campaign archiveCampaign(
            @PathVariable String campaignId,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        return service.archiveCampaign(campaignId, actor);
    }

    @GetMapping("/promotions")
    public List<Promotion> listPromotions(@RequestParam String campaignId) {
        return service.listPromotions(campaignId);
    }

    @PostMapping("/promotions")
    @ResponseStatus(HttpStatus.CREATED)
    public Promotion createPromotion(
            @RequestBody PromotionRequest request,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        return service.savePromotion(null, request, actor);
    }

    @PutMapping("/promotions/{promotionId}")
    public Promotion updatePromotion(
            @PathVariable String promotionId,
            @RequestBody PromotionRequest request,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        return service.savePromotion(promotionId, request, actor);
    }

    @PatchMapping("/promotions/{promotionId}/enabled")
    public Promotion setPromotionEnabled(
            @PathVariable String promotionId,
            @RequestParam boolean enabled,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        return service.setPromotionEnabled(promotionId, enabled, actor);
    }
}
