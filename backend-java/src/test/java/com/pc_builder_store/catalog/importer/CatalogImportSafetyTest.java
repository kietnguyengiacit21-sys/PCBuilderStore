package com.pc_builder_store.catalog.importer;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class CatalogImportSafetyTest {

    @Test
    void acceptsOnlyExplicitOptInAndLocalDevelopmentDatabase() {
        assertDoesNotThrow(() ->
                CatalogImportSafety.validateOptIn(CatalogImportSafety.REQUIRED_OPT_IN));
        assertDoesNotThrow(() ->
                CatalogImportSafety.validateJdbcUrl(
                        "jdbc:postgresql://localhost:5432/pc_builder_store_dev"));
        assertDoesNotThrow(() ->
                CatalogImportSafety.validateConnectedDatabase("pc_builder_store_dev", "127.0.0.1"));
        assertDoesNotThrow(() ->
                CatalogImportSafety.validateConnectedDatabase("pc_builder_store_dev", "127.0.0.1/32"));
    }

    @Test
    void acceptsIpv6LoopbackWithOrWithoutFullWidthPrefix() {
        assertDoesNotThrow(() ->
                CatalogImportSafety.validateConnectedDatabase("pc_builder_store_dev", "::1"));
        assertDoesNotThrow(() ->
                CatalogImportSafety.validateConnectedDatabase("pc_builder_store_dev", "::1/128"));
    }

    @Test
    void rejectsMissingOptInAndIntegrationTestDatabase() {
        assertThrows(IllegalStateException.class, () -> CatalogImportSafety.validateOptIn(null));
        IllegalStateException error = assertThrows(
                IllegalStateException.class,
                () -> CatalogImportSafety.validateJdbcUrl(
                        "jdbc:postgresql://localhost:5432/pc_builder_store_it"));
        assertTrue(error.getMessage().contains("localhost"));
    }

    @Test
    void rejectsRemoteHostsNonLocalConnectionsAndDatabaseMismatch() {
        assertThrows(IllegalStateException.class, () ->
                CatalogImportSafety.validateJdbcUrl(
                        "jdbc:postgresql://db.example.test:5432/pc_builder_store_dev"));
        assertThrows(IllegalStateException.class, () ->
                CatalogImportSafety.validateJdbcUrl(
                        "jdbc:postgresql://localhost:5432/pc_builder_store_dev?sslmode=require"));
        assertThrows(IllegalStateException.class, () ->
                CatalogImportSafety.validateConnectedDatabase("pc_builder_store_it", "127.0.0.1"));
        assertThrows(IllegalStateException.class, () ->
                CatalogImportSafety.validateConnectedDatabase("pc_builder_store_dev", "192.168.1.10/32"));
    }

    @Test
    void rejectsNonHostOrMalformedServerAddressPrefixesAndHostnames() {
        assertThrows(IllegalStateException.class, () ->
                CatalogImportSafety.validateConnectedDatabase("pc_builder_store_dev", "127.0.0.1/24"));
        assertThrows(IllegalStateException.class, () ->
                CatalogImportSafety.validateConnectedDatabase("pc_builder_store_dev", "127.0.0.1/not-a-prefix"));
        assertThrows(IllegalStateException.class, () ->
                CatalogImportSafety.validateConnectedDatabase("pc_builder_store_dev", "127.0.0.1/33"));
        assertThrows(IllegalStateException.class, () ->
                CatalogImportSafety.validateConnectedDatabase("pc_builder_store_dev", "localhost"));
    }
}
