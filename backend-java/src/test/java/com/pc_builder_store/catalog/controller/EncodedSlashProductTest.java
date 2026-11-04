package com.pc_builder_store.catalog.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pc_builder_store.catalog.dto.CatalogProduct;
import com.pc_builder_store.catalog.repository.CatalogRepository;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class EncodedSlashProductTest {

    @LocalServerPort
    private int port;

    @MockitoBean
    private CatalogRepository catalogRepository;

    @Test
    void resolvesEncodedSlashModelCodeThroughEmbeddedTomcat() throws Exception {
        when(catalogRepository.findActiveProduct("KF432C16BB/8"))
                .thenReturn(Optional.of(new CatalogProduct(
                        "1", "KF432C16BB/8", "Memory kit", null, null, "ACTIVE",
                        "MEMORY", "Memory", "RAM", "Memory", null,
                        java.util.List.of(), tools.jackson.databind.json.JsonMapper.builder()
                                .build().readTree("{}"),
                        java.util.List.of(), true)));
        URI uri = URI.create(
                "http://localhost:" + port + "/api/catalog/products/KF432C16BB%2F8");
        HttpRequest request = HttpRequest.newBuilder(uri).GET().build();

        HttpResponse<String> response = HttpClient.newHttpClient().send(
                request, HttpResponse.BodyHandlers.ofString());

        assertEquals(200, response.statusCode(), response.body());
        org.junit.jupiter.api.Assertions.assertTrue(response.body().contains("\"modelCode\":\"KF432C16BB/8\""));
        verify(catalogRepository).findActiveProduct("KF432C16BB/8");
    }
}
