package com.pc_builder_store.storefront;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/storefront")
public class StorefrontController {

    private final StorefrontHomepageService homepage;

    public StorefrontController(StorefrontHomepageService homepage) {
        this.homepage = homepage;
    }

    @GetMapping("/homepage")
    public StorefrontHomepageResponse homepage() {
        return homepage.getHomepage();
    }
}
