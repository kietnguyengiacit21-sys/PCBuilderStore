package com.pc_builder_store.catalog;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.stream.Collectors;

public final class CatalogUnavailableImageRegistry {

    private static final Set<String> UNAVAILABLE_URLS = loadUnavailableUrls();

    private CatalogUnavailableImageRegistry() {
    }

    public static boolean contains(String imageUrl) {
        return UNAVAILABLE_URLS.contains(imageUrl);
    }

    private static Set<String> loadUnavailableUrls() {
        InputStream resource = CatalogUnavailableImageRegistry.class.getResourceAsStream(
                "/catalog-internal/catalog-unavailable-image-urls.txt");
        if (resource == null) {
            throw new IllegalStateException("Catalog unavailable image registry is missing.");
        }
        try (InputStream input = resource;
                BufferedReader reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8))) {
            return reader.lines()
                    .map(String::trim)
                    .filter(line -> !line.isEmpty() && !line.startsWith("#"))
                    .collect(Collectors.toUnmodifiableSet());
        } catch (IOException exception) {
            throw new IllegalStateException("Could not load catalog unavailable image registry.", exception);
        }
    }
}