package com.pc_builder_store.reviews;

import com.pc_builder_store.auth.AuthUserPrincipal;
import com.pc_builder_store.reviews.ReviewService.AdminReview;
import com.pc_builder_store.reviews.ReviewService.ModerationRequest;
import com.pc_builder_store.reviews.ReviewService.MyReview;
import com.pc_builder_store.reviews.ReviewService.ProductReviews;
import com.pc_builder_store.reviews.ReviewService.ResponseRequest;
import com.pc_builder_store.reviews.ReviewService.ReviewRequest;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public read under /api/catalog (GET is open), customer writes under /api/reviews (CUSTOMER),
 * moderation under /api/admin/reviews (ADMIN). See SecurityConfiguration.
 */
@RestController
public class ReviewController {

    private final ReviewService service;

    public ReviewController(ReviewService service) {
        this.service = service;
    }

    @GetMapping("/api/catalog/reviews")
    public ProductReviews productReviews(@RequestParam String modelCode, @AuthenticationPrincipal AuthUserPrincipal viewer) {
        return service.productReviews(modelCode, viewer);
    }

    // modelCode is a query parameter: some model codes contain "/".
    @PostMapping("/api/reviews")
    public MyReview submit(
            @RequestParam String modelCode,
            @RequestBody ReviewRequest request,
            @AuthenticationPrincipal AuthUserPrincipal user) {
        return service.submit(modelCode, user, request);
    }

    @DeleteMapping("/api/reviews")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@RequestParam String modelCode, @AuthenticationPrincipal AuthUserPrincipal user) {
        service.deleteOwn(modelCode, user);
    }

    @GetMapping("/api/admin/reviews")
    public List<AdminReview> adminReviews(@RequestParam(required = false) String status) {
        return service.adminReviews(status);
    }

    @PatchMapping("/api/admin/reviews/{reviewId}/status")
    public AdminReview moderate(
            @PathVariable String reviewId,
            @RequestBody ModerationRequest request,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        return service.moderate(reviewId, request, actor);
    }

    @PutMapping("/api/admin/reviews/{reviewId}/response")
    public AdminReview respond(
            @PathVariable String reviewId,
            @RequestBody ResponseRequest request,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        return service.respond(reviewId, request, actor);
    }
}
