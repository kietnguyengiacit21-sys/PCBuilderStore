package com.pc_builder_store.catalog.importer;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

/**
 * Catalog CSV upload from the admin screen. Uses the same parser, validation and upsert as the
 * startup importer: preview never writes, apply runs in one transaction (all rows or none).
 */
@Service
public class CatalogUploadImportService {

    private static final long MAX_BYTES = 10L * 1024 * 1024;
    private static final int PREVIEW_ROWS = 300;

    public record PreviewRow(
            int csvRow,
            String modelCode,
            String productName,
            String productType,
            String brandName,
            BigDecimal price,
            String currencyCode,
            int specificationCount,
            int imageCount,
            String action) {}

    public record ImportResult(
            boolean applied,
            String fileName,
            int rowCount,
            int insertCount,
            int updateCount,
            List<PreviewRow> rows,
            CatalogCsvImporter.ImportSummary summary) {}

    private final JdbcTemplate jdbc;
    private final CatalogCsvImporter importer;
    private final long defaultStock;

    public CatalogUploadImportService(
            JdbcTemplate jdbc,
            PlatformTransactionManager transactionManager,
            ObjectMapper objectMapper,
            @Value("${catalog.import.default-stock:5}") long defaultStock) {
        this.jdbc = jdbc;
        this.importer = new CatalogCsvImporter(jdbc, transactionManager, objectMapper);
        this.defaultStock = defaultStock;
    }

    public ImportResult run(MultipartFile file, boolean apply) {
        String fileName = file == null ? "" : String.valueOf(file.getOriginalFilename());
        if (file == null || file.isEmpty()) throw badRequest("Vui lòng chọn tệp CSV.");
        if (!fileName.toLowerCase(Locale.ROOT).endsWith(".csv")) throw badRequest("Chỉ nhận tệp .csv.");
        if (file.getSize() > MAX_BYTES) throw badRequest("Tệp CSV tối đa 10 MB.");

        String csv;
        try {
            csv = new String(file.getBytes(), StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw badRequest("Không đọc được tệp CSV.");
        }
        if (csv.startsWith("﻿")) csv = csv.substring(1);

        List<CatalogCsvRow> rows;
        try {
            rows = importer.parseAndValidate(csv);
        } catch (IllegalArgumentException | IllegalStateException exception) {
            throw badRequest(readable(exception));
        }
        if (rows.isEmpty()) throw badRequest("Tệp CSV không có dòng sản phẩm nào.");

        Set<String> existing = existingModelCodes(rows);
        List<PreviewRow> preview = rows.stream().limit(PREVIEW_ROWS).map(row -> new PreviewRow(
                row.csvRowNumber(), row.modelCode(), row.productName(), row.productTypeCode(), row.brandName(),
                row.price(), row.currencyCode(), row.specifications().size(), row.images().size(),
                existing.contains(row.modelCode()) ? "UPDATE" : "INSERT")).toList();

        CatalogCsvImporter.ImportSummary summary;
        try {
            if (apply) {
                importer.validateExistingAttributeDefinitionTypes();
                summary = importer.apply(rows, defaultStock);
            } else {
                summary = importer.preview(rows, defaultStock);
            }
        } catch (IllegalArgumentException | IllegalStateException exception) {
            throw badRequest(readable(exception));
        }
        return new ImportResult(apply, fileName, rows.size(), rows.size() - existing.size(), existing.size(), preview, summary);
    }

    private Set<String> existingModelCodes(List<CatalogCsvRow> rows) {
        Set<String> found = new HashSet<>();
        List<String> codes = rows.stream().map(CatalogCsvRow::modelCode).toList();
        for (int start = 0; start < codes.size(); start += 500) {
            List<String> chunk = codes.subList(start, Math.min(codes.size(), start + 500));
            String placeholders = String.join(",", java.util.Collections.nCopies(chunk.size(), "?"));
            found.addAll(jdbc.queryForList(
                    "SELECT \"model_code\" FROM \"products\" WHERE \"model_code\" IN (" + placeholders + ")",
                    String.class, chunk.toArray()));
        }
        return found;
    }

    /** Importer messages are English ("CSV row 12: ..."); keep them but lead with a Vietnamese hint. */
    private static String readable(RuntimeException exception) {
        String message = exception.getMessage() == null ? "Dữ liệu không hợp lệ." : exception.getMessage();
        return "Tệp CSV chưa hợp lệ, chưa có gì được ghi vào database. Chi tiết: " + message;
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
