package com.pc_builder_store.catalog;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;

class CatalogInternalLedgerTest {

    @Test
    void allowsOnlyTheExactModelAttributePairsInTheLedger() {
        CatalogInternalLedger ledger = new CatalogInternalLedger(new ClassPathResource(
                "catalog-internal/catalog-attribute-internal-ledger.csv"));

        assertTrue(ledger.isPubliclyVisible("GPU", "DUAL-RTX4060-O8G", "gpu_chip"));
        assertFalse(ledger.isPubliclyVisible("GPU", "DUAL-RTX4060-O8G", "architecture"));
        assertFalse(ledger.isPubliclyVisible("GPU", "DUAL-RTX4060-O8G", "unlisted_attribute"));
        assertFalse(ledger.isPubliclyVisible("CPU", "DUAL-RTX4060-O8G", "gpu_chip"));
        assertTrue(ledger.publicModelCodes("gpu_chip", "GPU")
                .contains("DUAL-RTX4060-O8G"));
    }

    @Test
    void publiclyAllowsConfiguredPcComponentListsWithoutAllowingInternalWorkflowFields() {
        CatalogInternalLedger ledger = new CatalogInternalLedger(new ClassPathResource(
                "catalog-internal/catalog-attribute-internal-ledger.csv"));

        assertTrue(ledger.isPubliclyVisible("PC", "PBC-PC-CREATOR-008", "configuration_items"));
        assertTrue(ledger.isPubliclyVisible("PC", "PBC-PC-GAME-006", "configuration_items"));
        assertEquals(10, ledger.publicModelCodes("configuration_items", "PC").size());
        assertTrue(ledger.isPubliclyVisible("PC", "PBC-PC-CREATOR-008", "configuration_summary"));
        assertFalse(ledger.isPubliclyVisible("PC", "PBC-PC-CREATOR-008", "bom_status"));
        assertFalse(ledger.isPubliclyVisible("PC", "PBC-PC-CREATOR-008", "system_dimensions_mm"));
    }

    @Test
    void deniesUnknownVisibilityPoliciesByDefault() {
        String csv = """
                model_code,product_type,attribute_code,public_visibility
                MODEL-1,GPU,gpu_chip,PUBLIC_ALLOWLIST
                MODEL-1,GPU,vram_gb,UNRECOGNIZED_POLICY
                """;
        CatalogInternalLedger ledger = new CatalogInternalLedger(new ByteArrayResource(
                csv.getBytes(StandardCharsets.UTF_8)));

        assertTrue(ledger.isPubliclyVisible("GPU", "MODEL-1", "gpu_chip"));
        assertFalse(ledger.isPubliclyVisible("GPU", "MODEL-1", "vram_gb"));
        assertFalse(ledger.isPubliclyVisible("GPU", "MODEL-1", "missing"));
    }

    @Test
    void rejectsDuplicateLedgerKeys() {
        String csv = """
                model_code,product_type,attribute_code,public_visibility
                MODEL-1,GPU,gpu_chip,PUBLIC_ALLOWLIST
                MODEL-1,GPU,gpu_chip,INTERNAL_ONLY
                """;

        assertThrows(IllegalStateException.class, () -> new CatalogInternalLedger(
                new ByteArrayResource(csv.getBytes(StandardCharsets.UTF_8))));
    }
}
