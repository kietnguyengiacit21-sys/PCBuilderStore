package com.pc_builder_store.catalog.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.pc_builder_store.catalog.dto.GamingPerformanceDtos.CategorySummary;
import com.pc_builder_store.catalog.dto.GamingPerformanceDtos.EstimateResponse;
import com.pc_builder_store.catalog.service.GamingPerformanceService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class GamingPerformanceControllerTest {

    @Test
    void exposesTheEstimateResponseForTheRequestedProduct() throws Exception {
        GamingPerformanceService service = mock(GamingPerformanceService.class);
        when(service.estimate(eq("PBC-PC-GAME-014"), any())).thenReturn(
                new EstimateResponse("1080p", "HIGH", List.of(),
                        new CategorySummary(10, 15, "Chơi ổn định"),
                        new CategorySummary(10, 10, "Chơi mượt mà")));
        MockMvc mvc = MockMvcBuilders.standaloneSetup(
                new GamingPerformanceController(service)).build();

        mvc.perform(post("/api/catalog/products/PBC-PC-GAME-014/gaming-performance")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"offerId":"802","resolution":"1080p","quality":"HIGH","upgrades":[]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resolution").value("1080p"))
                .andExpect(jsonPath("$.aaa.totalGames").value(15))
                .andExpect(jsonPath("$.esports.totalGames").value(10));

        verify(service).estimate(eq("PBC-PC-GAME-014"), any());
    }
}
