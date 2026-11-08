package com.pc_builder_store.catalog.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Component
public class ProductMediaStorage {

    private static final long MAX_BYTES = 25L * 1024 * 1024;
    private final Path root;

    public ProductMediaStorage(
            @Value("${product.media.directory:./data/product-media}") String directory) {
        root = Path.of(directory).toAbsolutePath().normalize();
    }

    public StoredMedia store(MultipartFile upload) throws IOException {
        if (upload == null || upload.isEmpty() || upload.getSize() > MAX_BYTES) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Tệp phải có dữ liệu và không vượt quá 25 MB.");
        }
        String mimeType = normalizedMimeType(upload.getContentType());
        byte[] content = upload.getBytes();
        if (!matchesSignature(content, mimeType)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Định dạng nội dung tệp không hợp lệ.");
        }
        String extension = switch (mimeType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "video/mp4" -> ".mp4";
            case "video/webm" -> ".webm";
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Chỉ hỗ trợ ảnh JPEG, PNG, WebP và video MP4, WebM.");
        };
        String fileName = UUID.randomUUID() + extension;
        Files.createDirectories(root);
        Path destination = resolve(fileName);
        Files.write(destination, content, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
        String mediaType = mimeType.startsWith("image/") ? "IMAGE" : "VIDEO";
        return new StoredMedia(fileName, "/api/catalog/media/" + fileName, mimeType, mediaType);
    }

    public StoredFile find(String fileName) {
        if (fileName == null
                || !fileName.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp|mp4|webm)")) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        Path path = resolve(fileName);
        if (!Files.isRegularFile(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        String mimeType = switch (path.getFileName().toString().substring(36)) {
            case ".jpg" -> "image/jpeg";
            case ".png" -> "image/png";
            case ".webp" -> "image/webp";
            case ".mp4" -> "video/mp4";
            case ".webm" -> "video/webm";
            default -> throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        };
        return new StoredFile(new FileSystemResource(path), mimeType);
    }

    private Path resolve(String fileName) {
        Path resolved = root.resolve(fileName).normalize();
        if (!resolved.getParent().equals(root)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        return resolved;
    }

    private String normalizedMimeType(String contentType) {
        return contentType == null
                ? ""
                : contentType.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
    }

    private boolean matchesSignature(byte[] bytes, String mimeType) {
        return switch (mimeType) {
            case "image/jpeg" -> bytes.length >= 3
                    && (bytes[0] & 0xff) == 0xff
                    && (bytes[1] & 0xff) == 0xd8
                    && (bytes[2] & 0xff) == 0xff;
            case "image/png" -> bytes.length >= 8
                    && (bytes[0] & 0xff) == 0x89
                    && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G'
                    && bytes[4] == 0x0d && bytes[5] == 0x0a
                    && bytes[6] == 0x1a && bytes[7] == 0x0a;
            case "image/webp" -> bytes.length >= 12
                    && bytes[0] == 'R' && bytes[1] == 'I'
                    && bytes[2] == 'F' && bytes[3] == 'F'
                    && bytes[8] == 'W' && bytes[9] == 'E'
                    && bytes[10] == 'B' && bytes[11] == 'P';
            case "video/mp4" -> bytes.length >= 12
                    && bytes[4] == 'f' && bytes[5] == 't'
                    && bytes[6] == 'y' && bytes[7] == 'p';
            case "video/webm" -> bytes.length >= 4
                    && (bytes[0] & 0xff) == 0x1a
                    && (bytes[1] & 0xff) == 0x45
                    && (bytes[2] & 0xff) == 0xdf
                    && (bytes[3] & 0xff) == 0xa3;
            default -> false;
        };
    }

    public record StoredMedia(String fileName, String url, String mimeType, String mediaType) {
    }

    public record StoredFile(Resource resource, String mimeType) {
    }
}
