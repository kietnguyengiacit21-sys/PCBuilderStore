package com.pc_builder_store.catalog.service;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

class ProductMediaStorageTest {

    @TempDir
    Path temporaryDirectory;

    @Test
    void storesUploadedMediaUnderAnOpaqueNameAndRejectsTraversal() throws Exception {
        ProductMediaStorage storage = new ProductMediaStorage(temporaryDirectory.toString());
        byte[] png = {
            (byte) 0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a,
            1, 2, 3, 4
        };
        ProductMediaStorage.StoredMedia stored = storage.store(
                new MockMultipartFile("file", "..\\private.png", "image/png", png));

        assertDoesNotThrow(() -> java.util.UUID.fromString(stored.fileName().replace(".png", "")));
        assertArrayEquals(png, Files.readAllBytes(storage.find(stored.fileName()).resource().getFile().toPath()));
        assertThrows(ResponseStatusException.class, () -> storage.find("..\\private.png"));
    }

    @Test
    void rejectsUnsupportedOrMismatchedMediaContents() {
        ProductMediaStorage storage = new ProductMediaStorage(temporaryDirectory.toString());
        assertThrows(ResponseStatusException.class, () -> storage.store(
                new MockMultipartFile("file", "image.svg", "image/svg+xml", "<svg/>".getBytes())));
        assertThrows(ResponseStatusException.class, () -> storage.store(
                new MockMultipartFile("file", "image.png", "image/png", "not a PNG".getBytes())));
    }
}
