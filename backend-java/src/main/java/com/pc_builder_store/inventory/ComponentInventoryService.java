package com.pc_builder_store.inventory;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class ComponentInventoryService {

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public ComponentInventoryService(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    public int sellableQuantity(BigDecimal pcProductId) {
        return sellableQuantity(pcProductId, List.of());
    }

    public int sellableQuantity(
            BigDecimal pcProductId,
            List<com.pc_builder_store.catalog.service.ProductUpgradeService.ComponentSubstitution>
                    substitutions) {
        List<ComponentRequirement> requirements = applySubstitutions(
                loadRequirements(pcProductId), substitutions);
        if (requirements.isEmpty()) return 0;
        long sellable = Integer.MAX_VALUE;
        for (ComponentRequirement requirement : requirements) {
            long componentAvailable = requirement.offerId() == null
                    ? availableByProduct(List.of(requirement.productId()))
                            .getOrDefault(key(requirement.productId()), 0L)
                    : availableForOffer(requirement.offerId());
            sellable = Math.min(sellable, componentAvailable / requirement.quantity());
        }
        return (int) Math.min(sellable, Integer.MAX_VALUE);
    }

    @Transactional
    public String reserveForPcOrderItem(
            BigDecimal pcProductId, BigDecimal orderItemId, int pcQuantity) {
        return reserveForPcOrderItem(pcProductId, orderItemId, pcQuantity, List.of());
    }

    @Transactional
    public String reserveForPcOrderItem(
            BigDecimal pcProductId,
            BigDecimal orderItemId,
            int pcQuantity,
            List<com.pc_builder_store.catalog.service.ProductUpgradeService.ComponentSubstitution>
                    substitutions) {
        if (pcQuantity < 1) throw unavailable("Invalid prebuilt PC quantity.");
        lockProduct(pcProductId);
        List<ComponentRequirement> requirements = applySubstitutions(
                loadRequirements(pcProductId), substitutions);
        if (requirements.isEmpty()) {
            throw unavailable("This prebuilt PC has no usable saved component list.");
        }
        List<ComponentRequirement> scaled = requirements.stream()
                .map(item -> new ComponentRequirement(
                        item.productId(),
                        item.modelCode(),
                        Math.multiplyExact(item.quantity(), pcQuantity),
                        item.offerId()))
                .toList();
        reserveRequirements(scaled, orderItemId);
        try {
            return objectMapper.writeValueAsString(scaled);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Could not save the component inventory snapshot.", exception);
        }
    }

    @Transactional
    public void reserveFromSnapshot(String snapshot, BigDecimal orderItemId) {
        List<ComponentRequirement> requirements = readSnapshot(snapshot);
        if (requirements.isEmpty()) {
            throw unavailable("The saved component inventory snapshot is unavailable.");
        }
        reserveRequirements(requirements, orderItemId);
    }

    @Transactional
    public void reserveOffer(BigDecimal orderItemId, BigDecimal offerId, int quantity) {
        if (quantity < 1) throw unavailable("Invalid reservation quantity.");
        int changed = jdbc.update("""
                UPDATE "product_offers" po
                SET "reserved_quantity" = po."reserved_quantity" + ?,
                    "updated_at" = CURRENT_TIMESTAMP
                FROM "products" p
                WHERE po."offer_id" = ?
                  AND p."product_id" = po."product_id"
                  AND po."offer_status" = 'ACTIVE'
                  AND p."product_status" = 'ACTIVE'
                  AND po."stock_quantity" - po."reserved_quantity" >= ?
                """, quantity, offerId, quantity);
        if (changed != 1) {
            throw unavailable("The selected offer no longer has enough available stock.");
        }
        persistReservation(orderItemId, offerId, quantity);
    }

    @Transactional
    public void reserveGiftOffer(BigDecimal orderItemId, BigDecimal offerId, int quantity) {
        if (quantity < 1) throw unavailable("Invalid gift reservation quantity.");
        int changed = jdbc.update("""
                UPDATE "product_offers" po
                SET "reserved_quantity" = po."reserved_quantity" + ?,
                    "updated_at" = CURRENT_TIMESTAMP
                FROM "products" p
                WHERE po."offer_id" = ?
                  AND p."product_id" = po."product_id"
                  AND po."condition_code" = 'NEW'
                  AND po."offer_status" = 'ACTIVE'
                  AND p."product_status" = 'ACTIVE'
                  AND po."stock_quantity" - po."reserved_quantity" >= ?
                """, quantity, offerId, quantity);
        if (changed != 1) {
            throw unavailable("The selected gift no longer has enough available stock.");
        }
        persistReservation(orderItemId, offerId, quantity);
    }

    public List<ComponentRequirement> readSnapshot(String snapshot) {
        if (snapshot == null || snapshot.isBlank()) return List.of();
        try {
            JsonNode root = objectMapper.readTree(snapshot);
            if (root == null || !root.isArray()) {
                throw unavailable("The saved component inventory snapshot is invalid.");
            }
            List<ComponentRequirement> result = new ArrayList<>();
            for (JsonNode item : root) {
                String productId = text(item, "productId");
                String modelCode = text(item, "modelCode");
                JsonNode quantityNode = item.get("quantity");
                if (productId == null || !productId.matches("[0-9]{1,20}")
                        || modelCode == null || modelCode.isBlank()
                        || quantityNode == null || !quantityNode.canConvertToInt()
                        || quantityNode.intValue() < 1) {
                    throw unavailable("The saved component inventory snapshot is invalid.");
                }
                result.add(new ComponentRequirement(
                        new BigDecimal(productId), modelCode, quantityNode.intValue(),
                        text(item, "offerId") == null ? null : new BigDecimal(text(item, "offerId"))));
            }
            return normalize(result);
        } catch (JacksonException exception) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "The saved component inventory snapshot is invalid.", exception);
        }
    }

    private void reserveRequirements(
            List<ComponentRequirement> requirements, BigDecimal orderItemId) {
        List<BigDecimal> productIds = requirements.stream()
                .map(ComponentRequirement::productId)
                .distinct()
                .sorted()
                .toList();
        List<Map<String, Object>> offers = lockNewActiveOffers(productIds);
        Map<String, List<Map<String, Object>>> offersByProduct = new LinkedHashMap<>();
        for (Map<String, Object> offer : offers) {
            offersByProduct.computeIfAbsent(key((BigDecimal) offer.get("product_id")),
                    ignored -> new ArrayList<>()).add(offer);
        }
        for (ComponentRequirement requirement : requirements) {
            int remaining = requirement.quantity();
            List<Map<String, Object>> componentOffers =
                    offersByProduct.getOrDefault(key(requirement.productId()), List.of());
            if (requirement.offerId() != null) {
                componentOffers = componentOffers.stream()
                        .filter(offer -> requirement.offerId().equals(offer.get("offer_id")))
                        .toList();
            }
            for (Map<String, Object> offer : componentOffers) {
                int stock = number(offer.get("stock_quantity"));
                int reserved = number(offer.get("reserved_quantity"));
                int available = Math.max(stock - reserved, 0);
                int allocate = Math.min(available, remaining);
                if (allocate == 0) continue;
                int updated = jdbc.update("""
                        UPDATE "product_offers"
                        SET "reserved_quantity" = "reserved_quantity" + ?,
                            "updated_at" = CURRENT_TIMESTAMP
                        WHERE "offer_id" = ?
                          AND "stock_quantity" - "reserved_quantity" >= ?
                        """, allocate, offer.get("offer_id"), allocate);
                if (updated != 1) {
                    throw unavailable("Component stock changed during checkout.");
                }
                persistReservation(orderItemId, (BigDecimal) offer.get("offer_id"), allocate);
                remaining -= allocate;
                if (remaining == 0) break;
            }
            if (remaining > 0) {
                throw unavailable("A required NEW component is out of stock.");
            }
        }
    }

    private List<Map<String, Object>> lockNewActiveOffers(List<BigDecimal> productIds) {
        if (productIds.isEmpty()) return List.of();
        String placeholders = String.join(",", java.util.Collections.nCopies(productIds.size(), "?"));
        return jdbc.queryForList("""
                SELECT po."offer_id", po."product_id", po."stock_quantity", po."reserved_quantity"
                FROM "product_offers" po
                JOIN "products" p ON p."product_id" = po."product_id"
                WHERE po."product_id" IN (""" + placeholders + """
                  )
                  AND po."condition_code" = 'NEW'
                  AND po."offer_status" = 'ACTIVE'
                  AND p."product_status" = 'ACTIVE'
                ORDER BY po."offer_id"
                FOR UPDATE OF po
                """, productIds.toArray());
    }

    private Map<String, Long> availableByProduct(List<BigDecimal> productIds) {
        if (productIds.isEmpty()) return Map.of();
        String placeholders = String.join(",", java.util.Collections.nCopies(productIds.size(), "?"));
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT po."product_id", SUM(GREATEST(
                    po."stock_quantity" - po."reserved_quantity", 0)) AS "available"
                FROM "product_offers" po
                JOIN "products" p ON p."product_id" = po."product_id"
                WHERE po."product_id" IN (""" + placeholders + """
                  )
                  AND po."condition_code" = 'NEW'
                  AND po."offer_status" = 'ACTIVE'
                  AND p."product_status" = 'ACTIVE'
                GROUP BY po."product_id"
                """, productIds.toArray());
        Map<String, Long> result = new HashMap<>();
        for (Map<String, Object> row : rows) {
            result.put(key((BigDecimal) row.get("product_id")), numberLong(row.get("available")));
        }
        return result;
    }

    private long availableForOffer(BigDecimal offerId) {
        List<Long> values = jdbc.query("""
                SELECT GREATEST(po."stock_quantity" - po."reserved_quantity", 0)::bigint
                FROM "product_offers" po
                JOIN "products" p ON p."product_id" = po."product_id"
                WHERE po."offer_id" = ?
                  AND po."condition_code" = 'NEW'
                  AND po."offer_status" = 'ACTIVE'
                  AND p."product_status" = 'ACTIVE'
                """, (rs, row) -> rs.getLong(1), offerId);
        return values.isEmpty() ? 0 : values.getFirst();
    }

    private List<ComponentRequirement> applySubstitutions(
            List<ComponentRequirement> source,
            List<com.pc_builder_store.catalog.service.ProductUpgradeService.ComponentSubstitution>
                    substitutions) {
        if (substitutions == null || substitutions.isEmpty()) return source;
        Map<String, com.pc_builder_store.catalog.service.ProductUpgradeService.ComponentSubstitution>
                byBaseProduct = new HashMap<>();
        for (var substitution : substitutions) {
            if (byBaseProduct.putIfAbsent(key(substitution.baseProductId()), substitution) != null) {
                throw unavailable("A BOM component cannot be replaced more than once.");
            }
        }
        List<ComponentRequirement> result = new ArrayList<>();
        for (ComponentRequirement requirement : source) {
            var substitution = byBaseProduct.remove(key(requirement.productId()));
            if (substitution == null) {
                result.add(requirement);
                continue;
            }
            if (substitution.baseQuantityPerPc() != requirement.quantity()
                    || substitution.quantityPerPc() < 1
                    || substitution.offerId() == null) {
                throw unavailable("The selected upgrade does not match the saved BOM quantity.");
            }
            BigDecimal selectedProductId = jdbc.query("""
                    SELECT po."product_id"
                    FROM "product_offers" po
                    JOIN "products" p ON p."product_id" = po."product_id"
                    WHERE po."offer_id" = ?
                      AND po."product_id" = ?
                      AND po."condition_code" = 'NEW'
                      AND po."offer_status" = 'ACTIVE'
                      AND p."product_status" = 'ACTIVE'
                    """, (rs, row) -> rs.getBigDecimal(1),
                    substitution.offerId(), substitution.selectedProductId())
                    .stream().findFirst().orElseThrow(() ->
                            unavailable("The selected component offer is no longer available."));
            if (!selectedProductId.equals(substitution.selectedProductId())) {
                throw unavailable("The selected component offer does not match its catalog product.");
            }
            result.add(new ComponentRequirement(
                    selectedProductId, substitution.modelCode(),
                    substitution.quantityPerPc(), substitution.offerId()));
        }
        if (!byBaseProduct.isEmpty()) {
            throw unavailable("A selected upgrade does not match a component in the saved BOM.");
        }
        return normalize(result);
    }

    private List<ComponentRequirement> loadRequirements(BigDecimal pcProductId) {
        List<ComponentRequirement> normalized = jdbc.query("""
                SELECT bom."component_product_id", component."model_code", bom."quantity"
                FROM "product_bom_components" bom
                JOIN "products" component ON component."product_id" = bom."component_product_id"
                WHERE bom."parent_product_id" = ?
                ORDER BY bom."component_product_id"
                """,
                (rs, row) -> new ComponentRequirement(
                        rs.getBigDecimal("component_product_id"),
                        rs.getString("model_code"),
                        rs.getInt("quantity")),
                pcProductId);
        if (!normalized.isEmpty()) return normalize(normalized);

        List<String> storedLists = jdbc.query("""
                SELECT attributeValue."value_json"::text
                FROM "product_attribute_values" attributeValue
                JOIN "product_attribute_definitions" attributeDefinition
                  ON attributeDefinition."attribute_definition_id" =
                     attributeValue."attribute_definition_id"
                WHERE attributeValue."product_id" = ?
                  AND attributeDefinition."attribute_code" = 'component_details'
                """, (rs, row) -> rs.getString(1), pcProductId);
        if (storedLists.isEmpty()) return List.of();
        JsonNode details;
        try {
            details = objectMapper.readTree(storedLists.getFirst());
        } catch (JacksonException exception) {
            throw unavailable("The saved component list is invalid.");
        }
        if (details == null || !details.isArray()) {
            throw unavailable("The saved component list is invalid.");
        }
        Map<String, Integer> quantitiesByModel = new TreeMap<>();
        for (JsonNode detail : details) {
            String modelCode = text(detail, "model_code");
            JsonNode quantityNode = detail.get("quantity");
            int quantity = quantityNode != null && quantityNode.canConvertToInt()
                    ? quantityNode.intValue() : 1;
            if (modelCode == null || modelCode.isBlank() || quantity < 1 || quantity > 999) {
                throw unavailable("A saved component row is incomplete.");
            }
            quantitiesByModel.merge(modelCode, quantity, Math::addExact);
        }
        List<ComponentRequirement> fallback = new ArrayList<>();
        for (Map.Entry<String, Integer> item : quantitiesByModel.entrySet()) {
            List<BigDecimal> ids = jdbc.query("""
                    SELECT "product_id" FROM "products" WHERE "model_code" = ?
                    """, (rs, row) -> rs.getBigDecimal(1), item.getKey());
            if (ids.size() != 1) {
                throw unavailable("A saved component no longer resolves to one catalog product.");
            }
            fallback.add(new ComponentRequirement(ids.getFirst(), item.getKey(), item.getValue()));
        }
        return normalize(fallback);
    }

    private void lockProduct(BigDecimal productId) {
        Integer locked = jdbc.query("""
                SELECT 1 FROM "products" WHERE "product_id" = ? FOR UPDATE
                """, (rs, row) -> rs.getInt(1), productId).stream().findFirst().orElse(null);
        if (locked == null) throw unavailable("The prebuilt PC is unavailable.");
    }

    private void persistReservation(
            BigDecimal orderItemId, BigDecimal offerId, int quantity) {
        jdbc.update("""
                INSERT INTO "order_inventory_reservations" (
                    "order_item_id", "offer_id", "quantity", "reservation_status"
                ) VALUES (?, ?, ?, 'ACTIVE')
                ON CONFLICT ("order_item_id", "offer_id")
                DO UPDATE SET "quantity" = EXCLUDED."quantity",
                              "reservation_status" = 'ACTIVE',
                              "updated_at" = CURRENT_TIMESTAMP
                """, orderItemId, offerId, quantity);
    }

    private List<ComponentRequirement> normalize(List<ComponentRequirement> requirements) {
        Map<String, ComponentRequirement> normalized = new TreeMap<>();
        for (ComponentRequirement item : requirements) {
            if (item.quantity() < 1) throw unavailable("A saved component quantity is invalid.");
            normalized.merge(key(item.productId()) + ":"
                            + (item.offerId() == null ? "" : key(item.offerId())), item,
                    (first, next) -> new ComponentRequirement(
                            first.productId(),
                            first.modelCode(),
                            Math.addExact(first.quantity(), next.quantity()),
                            first.offerId()));
        }
        return normalized.values().stream()
                .sorted(Comparator.comparing(ComponentRequirement::productId)
                        .thenComparing(item -> item.offerId() == null
                                ? BigDecimal.ZERO : item.offerId()))
                .toList();
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }

    private static String key(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }

    private static int number(Object value) {
        return ((Number) value).intValue();
    }

    private static long numberLong(Object value) {
        return ((Number) value).longValue();
    }

    private static ResponseStatusException unavailable(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    public record ComponentRequirement(
            BigDecimal productId, String modelCode, int quantity, BigDecimal offerId) {
        public ComponentRequirement(BigDecimal productId, String modelCode, int quantity) {
            this(productId, modelCode, quantity, null);
        }
    }
}
