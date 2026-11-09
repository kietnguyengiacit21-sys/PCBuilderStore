package com.pc_builder_store.catalog.importer;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;

final class CatalogImportSchema {

    private static final Map<String, Set<String>> REQUIRED_COLUMNS = Map.ofEntries(
            Map.entry("product_types", Set.of(
                    "product_type_id", "type_code", "type_name", "description", "is_build_component", "is_active")),
            Map.entry("categories", Set.of(
                    "category_id", "category_code", "category_name", "description", "is_active")),
            Map.entry("brands", Set.of("brand_id", "brand_name", "is_active")),
            Map.entry("products", Set.of(
                    "product_id", "product_type_id", "category_id", "brand_id", "model_code",
                    "product_name", "short_description", "description", "product_status",
                    "sku", "slug", "tags", "seo_title", "seo_description", "is_featured",
                    "display_order", "bom_summary", "content_sections")),
            Map.entry("product_offers", Set.of(
                    "product_id", "offer_code", "condition_code", "price", "currency_code",
                    "compare_at_price", "stock_quantity", "reserved_quantity",
                    "warranty_months", "offer_status")),
            Map.entry("product_attribute_definitions", Set.of(
                    "attribute_definition_id", "product_type_id", "attribute_code", "attribute_name",
                    "data_type", "unit", "is_filterable", "is_build_critical", "validation_json")),
            Map.entry("product_attribute_values", Set.of(
                    "product_id", "attribute_definition_id", "value_text", "value_decimal",
                    "value_integer", "value_boolean", "value_json")),
            Map.entry("product_images", Set.of(
                    "image_id", "product_id", "image_url", "alt_text", "caption",
                    "is_primary", "sort_order")),
            Map.entry("product_bom_components", Set.of(
                    "parent_product_id", "component_product_id", "quantity",
                    "component_warranty_months", "display_category", "display_order",
                    "customer_visible")),
            Map.entry("product_upgrade_groups", Set.of(
                    "upgrade_group_id", "product_id", "group_code", "display_name",
                    "description", "is_required", "display_order", "is_enabled")),
            Map.entry("product_upgrade_options", Set.of(
                    "upgrade_option_id", "upgrade_group_id", "offer_id", "price_delta",
                    "display_name", "description", "is_default", "minimum_quantity",
                    "maximum_quantity", "display_order", "is_enabled")));
    private static final Set<String> REQUIRED_UNIQUE_CONSTRAINTS = Set.of(
            "uq_product_types_code",
            "uq_categories_code",
            "uq_brands_name",
            "uq_products_model_code",
            "uq_product_offers_code",
            "uq_attribute_def_type_code");

    private CatalogImportSchema() {
    }

    static void validate(JdbcTemplate jdbcTemplate) {
        Set<String> actualColumns = new HashSet<>(jdbcTemplate.query(
                "SELECT table_name, column_name FROM information_schema.columns "
                        + "WHERE table_schema = 'public'",
                (resultSet, rowNumber) -> resultSet.getString("table_name") + "."
                        + resultSet.getString("column_name")));
        List<String> missingColumns = missingRequiredColumns(actualColumns);
        if (!missingColumns.isEmpty()) {
            throw new IllegalStateException("Catalog schema is missing required columns: " + missingColumns + ".");
        }

        Set<String> actualConstraints = new HashSet<>(jdbcTemplate.query(
                "SELECT conname FROM pg_constraint "
                        + "WHERE connamespace = 'public'::regnamespace AND contype = 'u'",
                (resultSet, rowNumber) -> resultSet.getString("conname")));
        if (!actualConstraints.containsAll(REQUIRED_UNIQUE_CONSTRAINTS)) {
            Set<String> missingConstraints = new HashSet<>(REQUIRED_UNIQUE_CONSTRAINTS);
            missingConstraints.removeAll(actualConstraints);
            throw new IllegalStateException(
                    "Catalog schema is missing required unique constraints: " + missingConstraints + ".");
        }
        Boolean attributeValuesPrimaryKeyExists = jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM pg_constraint "
                        + "WHERE connamespace = 'public'::regnamespace "
                        + "AND conrelid = 'public.product_attribute_values'::regclass "
                        + "AND contype = 'p')",
                Boolean.class);
        if (!Boolean.TRUE.equals(attributeValuesPrimaryKeyExists)) {
            throw new IllegalStateException("Catalog schema is missing the product attribute values primary key.");
        }
    }

    static List<String> missingRequiredColumns(Set<String> actualColumns) {
        return REQUIRED_COLUMNS.entrySet().stream()
                .flatMap(entry -> entry.getValue().stream()
                        .filter(column -> !actualColumns.contains(entry.getKey() + "." + column))
                        .map(column -> entry.getKey() + "." + column))
                .sorted()
                .toList();
    }
}
