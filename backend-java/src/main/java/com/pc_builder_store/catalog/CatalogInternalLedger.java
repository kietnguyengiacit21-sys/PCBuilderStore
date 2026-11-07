package com.pc_builder_store.catalog;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PushbackReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

@Component
public final class CatalogInternalLedger {

    private static final Set<String> REQUIRED_HEADERS = Set.of(
            "model_code", "product_type", "attribute_code", "public_visibility");
    private static final String PUBLIC_ALLOWLIST = "PUBLIC_ALLOWLIST";

    private final Map<AttributeKey, String> visibilityByAttribute;

    public CatalogInternalLedger(
            @Value("classpath:catalog-internal/catalog-attribute-internal-ledger.csv")
            Resource ledgerResource) {
        this.visibilityByAttribute = load(ledgerResource);
    }

    public boolean isPubliclyVisible(String productType, String modelCode, String attributeCode) {
        return PUBLIC_ALLOWLIST.equals(
                visibilityByAttribute.get(new AttributeKey(productType, modelCode, attributeCode)));
    }

    public List<String> publicModelCodes(String attributeCode, String productType) {
        List<String> modelCodes = new ArrayList<>();
        visibilityByAttribute.forEach((key, visibility) -> {
            if (PUBLIC_ALLOWLIST.equals(visibility)
                    && key.attributeCode().equals(attributeCode)
                    && (productType == null || key.productType().equals(productType))) {
                modelCodes.add(key.modelCode());
            }
        });
        return modelCodes.stream().sorted().toList();
    }

    private Map<AttributeKey, String> load(Resource resource) {
        Map<AttributeKey, String> visibility = new HashMap<>();
        try (PushbackReader reader = new PushbackReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8), 1);
                CSVParser parser = CSVFormat.DEFAULT.builder()
                        .setHeader()
                        .setSkipHeaderRecord(true)
                        .setTrim(true)
                        .get()
                        .parse(withoutBom(reader))) {
            if (!Set.copyOf(parser.getHeaderNames()).containsAll(REQUIRED_HEADERS)) {
                throw new IllegalStateException(
                        "Catalog internal ledger is missing required columns.");
            }
            for (CSVRecord record : parser) {
                AttributeKey key = new AttributeKey(
                        record.get("product_type"),
                        record.get("model_code"),
                        record.get("attribute_code"));
                if (key.productType().isBlank()
                        || key.modelCode().isBlank()
                        || key.attributeCode().isBlank()) {
                    throw new IllegalStateException(
                            "Catalog internal ledger contains an empty attribute key at row "
                                    + record.getRecordNumber() + ".");
                }
                String previous = visibility.putIfAbsent(
                        key, record.get("public_visibility").trim());
                if (previous != null) {
                    throw new IllegalStateException(
                            "Catalog internal ledger contains a duplicate model/type/attribute key at row "
                                    + record.getRecordNumber() + ".");
                }
            }
        } catch (IOException | IllegalArgumentException exception) {
            throw new IllegalStateException("Could not load the catalog internal ledger.", exception);
        }
        if (visibility.isEmpty()) {
            throw new IllegalStateException("Catalog internal ledger has no attribute policies.");
        }
        return Map.copyOf(visibility);
    }

    private PushbackReader withoutBom(PushbackReader reader) throws IOException {
        int firstCharacter = reader.read();
        if (firstCharacter != '\uFEFF' && firstCharacter != -1) {
            reader.unread(firstCharacter);
        }
        return reader;
    }

    private record AttributeKey(String productType, String modelCode, String attributeCode) {
    }
}
