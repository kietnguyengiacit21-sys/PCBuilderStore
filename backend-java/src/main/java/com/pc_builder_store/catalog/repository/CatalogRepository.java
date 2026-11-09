package com.pc_builder_store.catalog.repository;

import com.pc_builder_store.catalog.AttributeDefinitionRegistry;
import com.pc_builder_store.catalog.CatalogInternalLedger;
import com.pc_builder_store.catalog.dto.CatalogAttributeFacet;
import com.pc_builder_store.catalog.dto.CatalogAttributeDefinition;
import com.pc_builder_store.catalog.dto.CatalogAttributeQuality;
import com.pc_builder_store.catalog.dto.CatalogBomComponent;
import com.pc_builder_store.catalog.dto.CatalogAttributeVerification;
import com.pc_builder_store.catalog.dto.CatalogFacets;
import com.pc_builder_store.catalog.dto.CatalogImage;
import com.pc_builder_store.catalog.dto.CatalogOffer;
import com.pc_builder_store.catalog.dto.CatalogOption;
import com.pc_builder_store.catalog.dto.CatalogProduct;
import com.pc_builder_store.catalog.dto.CatalogVerificationStatus;
import com.pc_builder_store.catalog.dto.CatalogQuery;
import com.pc_builder_store.catalog.exception.CatalogProductNotFoundException;
import com.pc_builder_store.catalog.dto.CatalogQuery.AttributeFilter;
import com.pc_builder_store.catalog.dto.CatalogQuery.Direction;
import com.pc_builder_store.catalog.dto.CatalogQuery.Sort;
import com.pc_builder_store.catalog.exception.InvalidCatalogQueryException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

@Repository
public class CatalogRepository {

    private static final String PRODUCT_SELECT = """
            SELECT
              p."product_id"::text AS "productId",
              p."model_code" AS "modelCode",
              p."product_name" AS "productName",
              p."short_description" AS "shortDescription",
              p."description" AS "description",
              p."is_featured" AS "featured",
              p."display_order" AS "displayOrder",
              p."product_status" AS "status",
              pt."type_code" AS "productType",
              pt."type_name" AS "productTypeName",
              c."category_code" AS "categoryCode",
              c."category_name" AS "categoryName",
              b."brand_name" AS "brandName",
              COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                  'offerId', po."offer_id"::text,
                  'condition', po."condition_code",
                  'price', po."price",
                  'compareAtPrice', po."compare_at_price",
                  'currency', po."currency_code",
                  'stockQuantity', po."stock_quantity",
                  'reservedQuantity', po."reserved_quantity",
                  'availableQuantity', po."stock_quantity" - po."reserved_quantity",
                  'warrantyMonths', po."warranty_months",
                  'status', po."offer_status"
                ) ORDER BY po."price", po."offer_code")
                FROM "product_offers" po
                WHERE po."product_id" = p."product_id"
                  AND po."offer_status" = 'ACTIVE'
              ), '[]'::jsonb)::text AS "offersJson",
              COALESCE((
                SELECT jsonb_object_agg(ad."attribute_code", COALESCE(
                  to_jsonb(av."value_text"),
                  to_jsonb(av."value_decimal"),
                  to_jsonb(av."value_integer"),
                  to_jsonb(av."value_boolean"),
                  av."value_json"
                ))
                FROM "product_attribute_definitions" ad
                JOIN "product_attribute_values" av
                  ON av."attribute_definition_id" = ad."attribute_definition_id"
                 AND av."product_id" = p."product_id"
                WHERE ad."product_type_id" = p."product_type_id"
              ), '{}'::jsonb)::text AS "specificationsJson",
              COALESCE((
                SELECT jsonb_object_agg(ad."attribute_code", CASE
                  WHEN av."product_id" IS NULL
                    THEN jsonb_build_object('verificationStatus', 'UNKNOWN')
                  WHEN vm."metadata" ->> 'verificationStatus' IN (
                    'VERIFIED_EXACT_MODEL', 'VERIFIED_EXACT_VARIANT', 'NEEDS_REVIEW', 'UNKNOWN'
                  )
                    THEN jsonb_strip_nulls(jsonb_build_object(
                      'verificationStatus', vm."metadata" -> 'verificationStatus',
                      'sourceUrl', vm."metadata" -> 'sourceUrl',
                      'sourceLocator', vm."metadata" -> 'sourceLocator',
                      'verificationScope', vm."metadata" -> 'verificationScope'
                    ))
                  ELSE jsonb_build_object('verificationStatus', 'NEEDS_REVIEW')
                END)
                FROM "product_attribute_definitions" ad
                LEFT JOIN "product_attribute_values" av
                  ON av."attribute_definition_id" = ad."attribute_definition_id"
                 AND av."product_id" = p."product_id"
                LEFT JOIN LATERAL (
                  SELECT ad."validation_json" -> 'verificationByModel' -> p."model_code" AS "metadata"
                ) vm ON TRUE
                WHERE ad."product_type_id" = p."product_type_id"
              ), '{}'::jsonb)::text AS "verificationMetadataJson",
                            COALESCE((
                                SELECT jsonb_object_agg(
                                    ad."attribute_code",
                                    ad."validation_json" -> 'catalogValueQualityByModel' -> p."model_code"
                                )
                                FROM "product_attribute_definitions" ad
                                JOIN "product_attribute_values" av
                                    ON av."attribute_definition_id" = ad."attribute_definition_id"
                                 AND av."product_id" = p."product_id"
                                WHERE ad."product_type_id" = p."product_type_id"
                                    AND ad."validation_json" -> 'catalogValueQualityByModel' -> p."model_code" IS NOT NULL
                            ), '{}'::jsonb)::text AS "specificationQualityJson",
              COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                  'url', pi."image_url",
                  'altText', pi."alt_text",
                  'isPrimary', pi."is_primary",
                  'caption', pi."caption",
                  'mediaType', pi."media_type"
                ) ORDER BY pi."sort_order", pi."image_id")
                FROM "product_images" pi
                WHERE pi."product_id" = p."product_id"
                  AND ((pi."image_url" COLLATE "C") ~ '^https?://[^[:space:]]+$'
                    OR (pi."image_url" COLLATE "C") ~
                       '^/api/catalog/media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp|mp4|webm)$')
              ), '[]'::jsonb)::text AS "imagesJson",
              CASE WHEN p."product_type_id" = (
                  SELECT productType."product_type_id" FROM "product_types" productType
                  WHERE productType."type_code" = 'PC')
                THEN CASE WHEN EXISTS (
                    SELECT 1 FROM "product_bom_components" storedBom
                    WHERE storedBom."parent_product_id" = p."product_id")
                  THEN COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                      'componentProductId', component."product_id"::text,
                      'modelCode', component."model_code",
                      'productName', component."product_name",
                      'productType', componentType."type_code",
                      'quantity', bom."quantity",
                      'warrantyMonths', bom."component_warranty_months",
                      'displayCategory', bom."display_category",
                      'displayOrder', bom."display_order",
                      'imageUrl', (
                        SELECT componentImage."image_url"
                        FROM "product_images" componentImage
                        WHERE componentImage."product_id" = component."product_id"
                          AND componentImage."media_type" = 'IMAGE'
                          AND ((componentImage."image_url" COLLATE "C") ~ '^https?://[^[:space:]]+$'
                            OR (componentImage."image_url" COLLATE "C") ~
                               '^/api/catalog/media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp)$')
                        ORDER BY componentImage."is_primary" DESC,
                                 componentImage."sort_order", componentImage."image_id"
                        LIMIT 1
                      ),
                      'imageAltText', (
                        SELECT componentImage."alt_text"
                        FROM "product_images" componentImage
                        WHERE componentImage."product_id" = component."product_id"
                          AND componentImage."media_type" = 'IMAGE'
                          AND ((componentImage."image_url" COLLATE "C") ~ '^https?://[^[:space:]]+$'
                            OR (componentImage."image_url" COLLATE "C") ~
                               '^/api/catalog/media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp)$')
                        ORDER BY componentImage."is_primary" DESC,
                                 componentImage."sort_order", componentImage."image_id"
                        LIMIT 1
                      )
                    ) ORDER BY bom."display_order", component."product_name")
                    FROM "product_bom_components" bom
                    JOIN "products" component ON component."product_id" = bom."component_product_id"
                    JOIN "product_types" componentType
                      ON componentType."product_type_id" = component."product_type_id"
                    WHERE bom."parent_product_id" = p."product_id"
                      AND bom."customer_visible" = TRUE
                  ), '[]'::jsonb)
                  ELSE COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                      'componentProductId', component."product_id"::text,
                      'modelCode', component."model_code",
                      'productName', component."product_name",
                      'productType', componentType."type_code",
                      'quantity', CASE
                        WHEN bomDetail."item" ->> 'quantity' ~ '^[1-9][0-9]{0,2}$'
                          THEN (bomDetail."item" ->> 'quantity')::integer
                        ELSE 1
                      END,
                      'warrantyMonths', CASE
                        WHEN bomDetail."item" ->> 'component_warranty_months' ~ '^(0|[1-9][0-9]{0,2})$'
                          THEN (bomDetail."item" ->> 'component_warranty_months')::integer
                        ELSE (
                          SELECT MAX(componentOffer."warranty_months")
                          FROM "product_offers" componentOffer
                          WHERE componentOffer."product_id" = component."product_id"
                            AND componentOffer."offer_status" = 'ACTIVE'
                        )
                      END,
                      'keySpecifications', bomDetail."item" -> 'key_specifications',
                      'displayCategory', COALESCE(
                        componentType."type_name", bomDetail."item" ->> 'component_type'),
                      'displayOrder', bomDetail."ordinality" - 1,
                      'imageUrl', (
                        SELECT componentImage."image_url"
                        FROM "product_images" componentImage
                        WHERE componentImage."product_id" = component."product_id"
                          AND componentImage."media_type" = 'IMAGE'
                          AND ((componentImage."image_url" COLLATE "C") ~ '^https?://[^[:space:]]+$'
                            OR (componentImage."image_url" COLLATE "C") ~
                               '^/api/catalog/media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp)$')
                        ORDER BY componentImage."is_primary" DESC,
                                 componentImage."sort_order", componentImage."image_id"
                        LIMIT 1
                      ),
                      'imageAltText', (
                        SELECT componentImage."alt_text"
                        FROM "product_images" componentImage
                        WHERE componentImage."product_id" = component."product_id"
                          AND componentImage."media_type" = 'IMAGE'
                          AND ((componentImage."image_url" COLLATE "C") ~ '^https?://[^[:space:]]+$'
                            OR (componentImage."image_url" COLLATE "C") ~
                               '^/api/catalog/media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp)$')
                        ORDER BY componentImage."is_primary" DESC,
                                 componentImage."sort_order", componentImage."image_id"
                        LIMIT 1
                      )
                    ) ORDER BY bomDetail."ordinality")
                    FROM "product_attribute_values" attributeValue
                    JOIN "product_attribute_definitions" attributeDefinition
                      ON attributeDefinition."attribute_definition_id" =
                         attributeValue."attribute_definition_id"
                    CROSS JOIN LATERAL jsonb_array_elements(CASE
                      WHEN jsonb_typeof(attributeValue."value_json") = 'array'
                        THEN attributeValue."value_json"
                      ELSE '[]'::jsonb
                    END) WITH ORDINALITY AS bomDetail("item", "ordinality")
                    JOIN "products" component
                      ON component."model_code" = bomDetail."item" ->> 'model_code'
                    JOIN "product_types" componentType
                      ON componentType."product_type_id" = component."product_type_id"
                    WHERE attributeValue."product_id" = p."product_id"
                      AND attributeDefinition."product_type_id" = p."product_type_id"
                      AND attributeDefinition."attribute_code" = 'component_details'
                  ), '[]'::jsonb)
                END
                ELSE '[]'::jsonb
              END::text AS "bomComponentsJson",
              p."content_sections"::text AS "contentSectionsJson",
              EXISTS (
                SELECT 1
                FROM "product_offers" demo_offer
                WHERE demo_offer."product_id" = p."product_id"
                  AND demo_offer."offer_code" LIKE 'DEMO-%'
              ) AS "demoData"
            FROM "products" p
            JOIN "product_types" pt ON pt."product_type_id" = p."product_type_id"
            JOIN "categories" c ON c."category_id" = p."category_id"
            LEFT JOIN "brands" b ON b."brand_id" = p."brand_id"
            """;

    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final CatalogInternalLedger internalLedger;

    public CatalogRepository(
            NamedParameterJdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            CatalogInternalLedger internalLedger) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.internalLedger = internalLedger;
    }

    public CatalogFacets getFacets() {
        List<CatalogOption> productTypes = options("""
                SELECT DISTINCT pt."type_code" AS "value", pt."type_name" AS "label"
                FROM "product_types" pt
                JOIN "products" p ON p."product_type_id" = pt."product_type_id"
                WHERE pt."is_active" = TRUE AND p."product_status" = 'ACTIVE'
                ORDER BY pt."type_name"
                """);
        List<CatalogOption> categories = options("""
                SELECT DISTINCT c."category_code" AS "value", c."category_name" AS "label"
                FROM "categories" c
                JOIN "products" p ON p."category_id" = c."category_id"
                WHERE c."is_active" = TRUE AND p."product_status" = 'ACTIVE'
                ORDER BY c."category_name"
                """);
        List<CatalogOption> brands = options("""
                SELECT DISTINCT b."brand_name" AS "value", b."brand_name" AS "label"
                FROM "brands" b
                JOIN "products" p ON p."brand_id" = b."brand_id"
                WHERE b."is_active" = TRUE AND p."product_status" = 'ACTIVE'
                ORDER BY b."brand_name"
                """);
        List<CatalogAttributeFacet> attributes = attributeFacets();
        return new CatalogFacets(productTypes, categories, brands, attributes);
    }

    public List<CatalogAttributeDefinition> getAttributeDefinitions() {
        Map<String, CatalogAttributeDefinition> definitions = new LinkedHashMap<>();
        jdbcTemplate.query(
                """
                SELECT pt."type_code" AS "productType",
                       ad."attribute_code" AS "code",
                       ad."attribute_name" AS "label",
                       ad."data_type" AS "dataType",
                       ad."unit" AS "unit",
                       ad."is_filterable" AS "filterable"
                FROM "product_attribute_definitions" ad
                JOIN "product_types" pt
                  ON pt."product_type_id" = ad."product_type_id"
                ORDER BY pt."type_code", ad."attribute_name", ad."attribute_code"
                """,
                Map.of(),
                (resultSet, rowNumber) -> {
                    String productType = resultSet.getString("productType");
                    String code = resultSet.getString("code");
                    AttributeDefinitionRegistry.Definition metadata = AttributeDefinitionRegistry
                            .find(productType, code)
                            .orElse(null);
                    CatalogAttributeDefinition definition = new CatalogAttributeDefinition(
                            productType,
                            code,
                            metadata == null ? resultSet.getString("label") : metadata.labelVi(),
                            metadata == null ? resultSet.getString("dataType") : metadata.dataType(),
                            metadata == null ? resultSet.getString("unit") : metadata.unit(),
                            metadata == null ? resultSet.getBoolean("filterable") : metadata.filterable(),
                            metadata == null ? resultSet.getString("label") : metadata.labelEn(),
                            metadata == null ? null : metadata.subtype(),
                            metadata == null ? null : metadata.inputMode(),
                            metadata == null ? List.of() : metadata.options(),
                            metadata == null ? null : metadata.specificationScope());
                    definitions.put(productType + ":" + code, definition);
                    return definition;
                });
        for (AttributeDefinitionRegistry.Definition metadata : AttributeDefinitionRegistry.all()) {
            definitions.putIfAbsent(
                    metadata.productType() + ":" + metadata.code(),
                    new CatalogAttributeDefinition(
                            metadata.productType(),
                            metadata.code(),
                            metadata.labelVi(),
                            metadata.dataType(),
                            metadata.unit(),
                            metadata.filterable(),
                            metadata.labelEn(),
                            metadata.subtype(),
                            metadata.inputMode(),
                            metadata.options(),
                            metadata.specificationScope()));
        }
        return definitions.values().stream()
                .sorted(java.util.Comparator.comparing(CatalogAttributeDefinition::productType)
                        .thenComparing(CatalogAttributeDefinition::label)
                        .thenComparing(CatalogAttributeDefinition::code))
                .toList();
    }

    public void updateGpuSpecifications(String modelCode, Map<String, JsonNode> specifications) {
        List<Map<String, Object>> products = jdbcTemplate.queryForList(
                """
                SELECT p."product_id" AS "productId",
                       pt."product_type_id" AS "productTypeId",
                       pt."type_code" AS "productType"
                FROM "products" p
                JOIN "product_types" pt ON pt."product_type_id" = p."product_type_id"
                WHERE p."model_code" = :modelCode AND p."product_status" = 'ACTIVE'
                """,
                Map.of("modelCode", modelCode));
        if (products.isEmpty()) {
            throw new CatalogProductNotFoundException();
        }
        Map<String, Object> product = products.getFirst();
        if (!"GPU".equals(product.get("productType"))) {
            throw new InvalidCatalogQueryException("Only GPU product specifications can be updated here.");
        }
        long productId = ((Number) product.get("productId")).longValue();
        long productTypeId = ((Number) product.get("productTypeId")).longValue();

        for (Map.Entry<String, JsonNode> entry : specifications.entrySet()) {
            AttributeDefinitionRegistry.Definition definition = AttributeDefinitionRegistry
                    .find("GPU", entry.getKey())
                    .orElseThrow(() -> new InvalidCatalogQueryException(
                            "Unsupported GPU specification: " + entry.getKey() + "."));
            Long definitionId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO "product_attribute_definitions"
                      ("product_type_id", "attribute_code", "attribute_name", "data_type", "unit",
                       "is_filterable", "is_build_critical")
                    VALUES (:productTypeId, :code, :label, :dataType, :unit, :filterable, :buildCritical)
                    ON CONFLICT ("product_type_id", "attribute_code") DO UPDATE SET
                      "attribute_name" = EXCLUDED."attribute_name",
                      "data_type" = EXCLUDED."data_type",
                      "unit" = EXCLUDED."unit",
                      "is_filterable" = EXCLUDED."is_filterable",
                      "is_build_critical" = EXCLUDED."is_build_critical"
                    RETURNING "attribute_definition_id"
                    """,
                    new MapSqlParameterSource()
                            .addValue("productTypeId", productTypeId)
                            .addValue("code", definition.code())
                            .addValue("label", definition.labelVi())
                            .addValue("dataType", definition.dataType())
                            .addValue("unit", definition.unit())
                            .addValue("filterable", definition.filterable())
                            .addValue("buildCritical", definition.buildCritical()),
                    Long.class);
            JsonNode value = entry.getValue();
            if (value == null || value.isNull()) {
                jdbcTemplate.update(
                        """
                        DELETE FROM "product_attribute_values"
                        WHERE "product_id" = :productId AND "attribute_definition_id" = :definitionId
                        """,
                        new MapSqlParameterSource()
                                .addValue("productId", productId)
                                .addValue("definitionId", definitionId));
                continue;
            }
            String dataType = definition.dataType();
            jdbcTemplate.update(
                    """
                    INSERT INTO "product_attribute_values"
                      ("product_id", "attribute_definition_id", "value_text", "value_decimal",
                       "value_integer", "value_boolean", "value_json")
                    VALUES (:productId, :definitionId, :textValue, :decimalValue,
                            :integerValue, :booleanValue, CAST(:jsonValue AS jsonb))
                    ON CONFLICT ("product_id", "attribute_definition_id") DO UPDATE SET
                      "value_text" = EXCLUDED."value_text",
                      "value_decimal" = EXCLUDED."value_decimal",
                      "value_integer" = EXCLUDED."value_integer",
                      "value_boolean" = EXCLUDED."value_boolean",
                      "value_json" = EXCLUDED."value_json",
                      "updated_at" = CURRENT_TIMESTAMP
                    """,
                    new MapSqlParameterSource()
                            .addValue("productId", productId)
                            .addValue("definitionId", definitionId)
                            .addValue("textValue", "TEXT".equals(dataType) ? value.textValue() : null)
                            .addValue("decimalValue", "DECIMAL".equals(dataType) ? value.decimalValue() : null)
                            .addValue("integerValue", "INTEGER".equals(dataType) ? value.longValue() : null)
                            .addValue("booleanValue", "BOOLEAN".equals(dataType) ? value.booleanValue() : null)
                            .addValue("jsonValue", "JSON".equals(dataType) ? value.toString() : null));
        }
    }

    public ProductPage findProducts(CatalogQuery query) {
        validateAttributeCodes(query.attributes(), query.type());
        SqlQuery where = productWhere(query);
        String from = """
                FROM "products" p
                JOIN "product_types" pt ON pt."product_type_id" = p."product_type_id"
                JOIN "categories" c ON c."category_id" = p."category_id"
                LEFT JOIN "brands" b ON b."brand_id" = p."brand_id"
                """;
        Long total = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) " + from + where.sql(),
                where.parameters(),
                Long.class);

        String direction = query.order() == Direction.ASC ? "ASC" : "DESC";
        String orderBy = query.sort() == Sort.PRICE
                ? """
                  (SELECT MIN(po."price") FROM "product_offers" po
                   WHERE po."product_id" = p."product_id"
                     AND po."offer_status" = 'ACTIVE')
                  """ + direction + " NULLS LAST, p.\"product_name\" ASC"
                : "p.\"product_name\" " + direction;
        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValues(where.parameters().getValues())
                .addValue("limit", query.limit())
                .addValue("offset", (long) (query.page() - 1) * query.limit());
        List<CatalogProduct> products = jdbcTemplate.query(
                PRODUCT_SELECT + where.sql() + " ORDER BY " + orderBy
                        + " LIMIT :limit OFFSET :offset",
                parameters,
                this::mapProduct);
        return new ProductPage(products, total == null ? 0 : total);
    }

    public Optional<CatalogProduct> findActiveProduct(String modelCode) {
        List<CatalogProduct> products = jdbcTemplate.query(
                PRODUCT_SELECT
                        + " WHERE p.\"product_status\" = 'ACTIVE' AND p.\"model_code\" = :modelCode LIMIT 1",
                Map.of("modelCode", modelCode),
                (resultSet, rowNumber) -> mapProduct(resultSet, rowNumber, true));
        return products.stream().findFirst();
    }

    public Optional<CatalogProduct> findAdminActiveProduct(String modelCode) {
        List<CatalogProduct> products = jdbcTemplate.query(
                PRODUCT_SELECT
                        + " WHERE p.\"product_status\" = 'ACTIVE' AND p.\"model_code\" = :modelCode LIMIT 1",
                Map.of("modelCode", modelCode),
                this::mapProduct);
        return products.stream().findFirst();
    }

    SqlQuery productWhere(CatalogQuery query) {
        List<String> conditions = new ArrayList<>();
        MapSqlParameterSource parameters = new MapSqlParameterSource();
        conditions.add("p.\"product_status\" = 'ACTIVE'");
        if (query.query() != null) {
            conditions.add("""
                    (p."product_name" COLLATE "C" ILIKE :search COLLATE "C"
                     OR p."model_code" COLLATE "C" ILIKE :search COLLATE "C")
                    """);
            parameters.addValue("search", "%" + query.query() + "%");
        }
        addEquality(conditions, parameters, "pt.\"type_code\"", "type", query.type());
        addEquality(conditions, parameters, "c.\"category_code\"", "category", query.category());
        addEquality(conditions, parameters, "b.\"brand_name\"", "brand", query.brand());
        if (query.pcCollection() != null) {
            conditions.add(pcCollectionCondition(query.pcCollection()));
        }
        if (query.accessoryType() != null) {
            conditions.add(accessoryTypeCondition(query.accessoryType()));
        }
        if (query.saleOnly()) {
            conditions.add("""
                    EXISTS (
                      SELECT 1 FROM "product_offers" AS "saleOffer"
                      WHERE "saleOffer"."product_id" = p."product_id"
                        AND "saleOffer"."offer_status" = 'ACTIVE'
                        AND "saleOffer"."stock_quantity" > "saleOffer"."reserved_quantity"
                        AND "saleOffer"."compare_at_price" > "saleOffer"."price"
                    )
                    """);
        }

        if (query.minPrice() != null || query.maxPrice() != null) {
            StringBuilder priceConditions = new StringBuilder(
                    "EXISTS (SELECT 1 FROM \"product_offers\" pf "
                            + "WHERE pf.\"product_id\" = p.\"product_id\" "
                            + "AND pf.\"offer_status\" = 'ACTIVE'");
            if (query.minPrice() != null) {
                priceConditions.append(" AND pf.\"price\" >= :minPrice");
                parameters.addValue("minPrice", query.minPrice());
            }
            if (query.maxPrice() != null) {
                priceConditions.append(" AND pf.\"price\" <= :maxPrice");
                parameters.addValue("maxPrice", query.maxPrice());
            }
            conditions.add(priceConditions.append(")").toString());
        }

        for (int index = 0; index < query.attributes().size(); index++) {
            AttributeFilter attribute = query.attributes().get(index);
            String codeParameter = "attributeCode" + index;
            String valueParameter = "attributeValue" + index;
            String modelCodesParameter = "publicModelCodes" + index;
            conditions.add("""
                    EXISTS (
                      SELECT 1
                      FROM "product_attribute_definitions" ad
                      JOIN "product_attribute_values" av
                        ON av."attribute_definition_id" = ad."attribute_definition_id"
                       AND av."product_id" = p."product_id"
                      WHERE ad."product_type_id" = p."product_type_id"
                        AND ad."attribute_code" = :%s
                        AND ad."is_filterable" = TRUE
                        AND p."model_code" IN (:%s)
                        AND COALESCE(
                          to_jsonb(av."value_text"),
                          to_jsonb(av."value_decimal"),
                          to_jsonb(av."value_integer"),
                          to_jsonb(av."value_boolean"),
                          av."value_json"
                        ) = CAST(:%s AS jsonb)
                    )
                    """.formatted(codeParameter, modelCodesParameter, valueParameter));
            parameters.addValue(codeParameter, attribute.code());
            parameters.addValue(
                    modelCodesParameter,
                    internalLedger.publicModelCodes(attribute.code(), query.type()));
            parameters.addValue(valueParameter, jsonFilterValue(attribute.value()));
        }
        return new SqlQuery(" WHERE " + String.join(" AND ", conditions), parameters);
    }

    private String pcCollectionCondition(String collection) {
        String targetUse = """
                EXISTS (
                  SELECT 1
                  FROM "product_attribute_definitions" AS "targetDefinition"
                  JOIN "product_attribute_values" AS "targetValue"
                    ON "targetValue"."attribute_definition_id"
                       = "targetDefinition"."attribute_definition_id"
                   AND "targetValue"."product_id" = p."product_id"
                  WHERE "targetDefinition"."product_type_id" = p."product_type_id"
                    AND "targetDefinition"."attribute_code" = 'target_use'
                    AND (%s)
                )
                """;
        String match = switch (collection) {
            case "gaming" -> """
                    ("targetValue"."value_text" COLLATE "C" ILIKE '%gaming%'
                     OR "targetValue"."value_text" COLLATE "C" ILIKE '%stream%')
                    """;
            case "workstation-creator" -> """
                    ("targetValue"."value_text" COLLATE "C" ILIKE '%workstation%'
                     OR "targetValue"."value_text" COLLATE "C" ILIKE '%creator%'
                     OR "targetValue"."value_text" COLLATE "C" ILIKE '%render%'
                     OR "targetValue"."value_text" COLLATE "C" ILIKE '%dựng phim%'
                     OR "targetValue"."value_text" COLLATE "C" ILIKE '%edit video%')
                    """;
            case "office" -> """
                    ("targetValue"."value_text" COLLATE "C" ILIKE '%office%'
                     OR "targetValue"."value_text" COLLATE "C" ILIKE '%văn phòng%'
                     OR "targetValue"."value_text" COLLATE "C" ILIKE '%học tập%')
                    """;
            case "ai-development" -> """
                    ("targetValue"."value_text" COLLATE "C" ~* '(^|[^[:alnum:]])ai([^[:alnum:]]|$)'
                     OR "targetValue"."value_text" COLLATE "C" ILIKE '%development%'
                     OR "targetValue"."value_text" COLLATE "C" ILIKE '%developer%'
                     OR "targetValue"."value_text" COLLATE "C" ILIKE '%phát triển%')
                    """;
            case "amd-gaming" -> """
                    ("targetValue"."value_text" COLLATE "C" ILIKE '%gaming%')
                    """;
            default -> throw new IllegalArgumentException("Unsupported PC collection.");
        };
        String productNameMatch = switch (collection) {
            case "gaming" -> """
                    (p."product_name" COLLATE "C" ILIKE '%gaming%'
                     OR p."product_name" COLLATE "C" ILIKE '%stream%'
                     OR p."product_name" COLLATE "C" ILIKE '%esports%')
                    """;
            case "workstation-creator" -> """
                    (p."product_name" COLLATE "C" ILIKE '%workstation%'
                     OR p."product_name" COLLATE "C" ILIKE '%creator%'
                     OR p."product_name" COLLATE "C" ILIKE '%render%')
                    """;
            case "office" -> """
                    (p."product_name" COLLATE "C" ILIKE '%office%'
                     OR p."product_name" COLLATE "C" ILIKE '%văn phòng%'
                     OR p."product_name" COLLATE "C" ILIKE '%học tập%')
                    """;
            case "ai-development" -> """
                    (p."product_name" COLLATE "C" ~* '(^|[^[:alnum:]])ai([^[:alnum:]]|$)'
                     OR p."product_name" COLLATE "C" ILIKE '%development%'
                     OR p."product_name" COLLATE "C" ILIKE '%developer%')
                    """;
            case "amd-gaming" -> "p.\"product_name\" COLLATE \"C\" ILIKE '%gaming%'";
            default -> throw new IllegalArgumentException("Unsupported PC collection.");
        };
        String condition = "(" + targetUse.formatted(match) + " OR " + productNameMatch + ")";
        if (!"amd-gaming".equals(collection)) return condition;
        return condition + """
                AND EXISTS (
                  SELECT 1
                  FROM "product_bom_components" AS "cpuBom"
                  JOIN "products" AS "cpuProduct"
                    ON "cpuProduct"."product_id" = "cpuBom"."component_product_id"
                  JOIN "product_types" AS "cpuType"
                    ON "cpuType"."product_type_id" = "cpuProduct"."product_type_id"
                  WHERE "cpuBom"."parent_product_id" = p."product_id"
                    AND "cpuType"."type_code" = 'CPU'
                    AND ("cpuProduct"."product_name" COLLATE "C" ILIKE '%amd%'
                         OR "cpuProduct"."product_name" COLLATE "C" ILIKE '%ryzen%')
                )
                """;
    }

    private String accessoryTypeCondition(String accessoryType) {
        String monitor = """
                (EXISTS (
                  SELECT 1 FROM "product_attribute_definitions" AS "accessoryDefinition"
                  JOIN "product_attribute_values" AS "accessoryValue"
                    ON "accessoryValue"."attribute_definition_id"
                       = "accessoryDefinition"."attribute_definition_id"
                   AND "accessoryValue"."product_id" = p."product_id"
                  WHERE "accessoryDefinition"."product_type_id" = p."product_type_id"
                    AND LEFT("accessoryDefinition"."attribute_code", 8) = 'monitor_'
                ) OR p."product_name" COLLATE "C" ILIKE '%monitor%'
                   OR p."product_name" COLLATE "C" ILIKE '%inch%'
                   OR p."product_name" COLLATE "C" ILIKE '%xg27%'
                   OR p."product_name" COLLATE "C" ILIKE '%vg27%'
                   OR p."product_name" COLLATE "C" ILIKE '%vg249%')
                """;
        String keyboard = """
                (EXISTS (
                  SELECT 1 FROM "product_attribute_definitions" AS "accessoryDefinition"
                  JOIN "product_attribute_values" AS "accessoryValue"
                    ON "accessoryValue"."attribute_definition_id"
                       = "accessoryDefinition"."attribute_definition_id"
                   AND "accessoryValue"."product_id" = p."product_id"
                  WHERE "accessoryDefinition"."product_type_id" = p."product_type_id"
                    AND LEFT("accessoryDefinition"."attribute_code", 9) = 'keyboard_'
                ) OR p."product_name" COLLATE "C" ILIKE '%keyboard%'
                   OR p."product_name" COLLATE "C" ILIKE '%blackwidow%'
                   OR p."product_name" COLLATE "C" ILIKE '%k552%'
                   OR p."product_name" COLLATE "C" ILIKE '%k617%'
                   OR p."product_name" COLLATE "C" ILIKE '%k70%'
                   OR p."product_name" COLLATE "C" ILIKE '%k8 pro%'
                   OR p."product_name" COLLATE "C" ILIKE '%f75%'
                   OR p."product_name" COLLATE "C" ILIKE '%s98 pro%')
                """;
        String mouse = """
                (EXISTS (
                  SELECT 1 FROM "product_attribute_definitions" AS "accessoryDefinition"
                  JOIN "product_attribute_values" AS "accessoryValue"
                    ON "accessoryValue"."attribute_definition_id"
                       = "accessoryDefinition"."attribute_definition_id"
                   AND "accessoryValue"."product_id" = p."product_id"
                  WHERE "accessoryDefinition"."product_type_id" = p."product_type_id"
                    AND LEFT("accessoryDefinition"."attribute_code", 6) = 'mouse_'
                ) OR p."product_name" COLLATE "C" ILIKE '%mouse%'
                   OR p."product_name" COLLATE "C" ILIKE '%deathadder%'
                   OR p."product_name" COLLATE "C" ILIKE '%superlight%'
                   OR p."product_name" COLLATE "C" ILIKE '%g102%'
                   OR p."product_name" COLLATE "C" ILIKE '%g304%'
                   OR p."product_name" COLLATE "C" ILIKE '%g502%'
                   OR p."product_name" COLLATE "C" ILIKE '%viper%')
                """;
        String headset = """
                (EXISTS (
                  SELECT 1 FROM "product_attribute_definitions" AS "accessoryDefinition"
                  JOIN "product_attribute_values" AS "accessoryValue"
                    ON "accessoryValue"."attribute_definition_id"
                       = "accessoryDefinition"."attribute_definition_id"
                   AND "accessoryValue"."product_id" = p."product_id"
                  WHERE "accessoryDefinition"."product_type_id" = p."product_type_id"
                    AND LEFT("accessoryDefinition"."attribute_code", 8) = 'headset_'
                ) OR p."product_name" COLLATE "C" ILIKE '%headset%'
                   OR p."product_name" COLLATE "C" ILIKE '%blackshark%'
                   OR p."product_name" COLLATE "C" ILIKE '%cloud iii%'
                   OR p."product_name" COLLATE "C" ILIKE '%kraken%'
                   OR p."product_name" COLLATE "C" ILIKE '%g733%')
                """;
        return switch (accessoryType) {
            case "monitor" -> monitor;
            case "keyboard" -> keyboard;
            case "mouse" -> mouse;
            case "headset" -> headset;
            case "accessory" -> "NOT (" + monitor + " OR " + keyboard + " OR "
                    + mouse + " OR " + headset + ")";
            default -> throw new IllegalArgumentException("Unsupported accessory type.");
        };
    }

    private void validateAttributeCodes(List<AttributeFilter> attributes, String productType) {
        if (attributes.isEmpty()) {
            return;
        }
        Set<String> codes = new LinkedHashSet<>();
        for (AttributeFilter attribute : attributes) {
            codes.add(attribute.code());
        }
        List<String> supported = jdbcTemplate.queryForList(
                """
                SELECT DISTINCT "attribute_code"
                FROM "product_attribute_definitions"
                WHERE "is_filterable" = TRUE AND "attribute_code" IN (:codes)
                """,
                Map.of("codes", codes),
                String.class);
        Set<String> supportedCodes = Set.copyOf(supported);
        for (String code : codes) {
            if (!supportedCodes.contains(code)
                    || internalLedger.publicModelCodes(code, productType).isEmpty()) {
                throw new InvalidCatalogQueryException(
                        "Attribute \"" + code + "\" is not a supported filter.");
            }
        }
    }

    private List<CatalogOption> options(String sql) {
        return jdbcTemplate.query(
                sql,
                Map.of(),
                (resultSet, rowNumber) ->
                        new CatalogOption(resultSet.getString("value"), resultSet.getString("label")));
    }

    private List<CatalogAttributeFacet> attributeFacets() {
        List<AttributeValueRow> rows = jdbcTemplate.query(
                """
                SELECT DISTINCT
                  pt."type_code" AS "productType",
                  p."model_code" AS "modelCode",
                  ad."attribute_code" AS "code",
                  ad."attribute_name" AS "label",
                  COALESCE(
                    to_jsonb(av."value_text"),
                    to_jsonb(av."value_decimal"),
                    to_jsonb(av."value_integer"),
                    to_jsonb(av."value_boolean"),
                    av."value_json"
                  )::text AS "valueJson"
                FROM "product_attribute_definitions" ad
                JOIN "product_attribute_values" av
                  ON av."attribute_definition_id" = ad."attribute_definition_id"
                JOIN "products" p ON p."product_id" = av."product_id"
                JOIN "product_types" pt ON pt."product_type_id" = p."product_type_id"
                WHERE ad."is_filterable" = TRUE AND p."product_status" = 'ACTIVE'
                ORDER BY pt."type_code", ad."attribute_name"
                """,
                Map.of(),
                (resultSet, rowNumber) -> new AttributeValueRow(
                        resultSet.getString("productType"),
                        resultSet.getString("modelCode"),
                        resultSet.getString("code"),
                        resultSet.getString("label"),
                        readJson(resultSet.getString("valueJson"))));

        Map<String, FacetBuilder> grouped = new LinkedHashMap<>();
        for (AttributeValueRow row : rows) {
            if (!internalLedger.isPubliclyVisible(
                    row.productType(), row.modelCode(), row.code())) {
                continue;
            }
            String key = row.productType() + ":" + row.code();
            FacetBuilder facet = grouped.computeIfAbsent(
                    key,
                    ignored -> new FacetBuilder(row.productType(), row.code(), row.label()));
            String value = writeJson(row.value());
            if (facet.seenValues().add(value)) {
                facet.values().add(new CatalogAttributeFacet.Value(jsString(row.value()), value));
            }
        }
        return grouped.values().stream().map(FacetBuilder::build).toList();
    }

    CatalogProduct mapProduct(java.sql.ResultSet resultSet, int rowNumber)
            throws java.sql.SQLException {
        return mapProduct(resultSet, rowNumber, false);
    }

    private CatalogProduct mapProduct(
            java.sql.ResultSet resultSet, int rowNumber, boolean includeComponentSpecifications)
            throws java.sql.SQLException {
        List<CatalogBomComponent> bomComponents =
                mapBomComponents(readJson(resultSet.getString("bomComponentsJson")));
        if (includeComponentSpecifications) {
            bomComponents = addPublicComponentSpecifications(bomComponents);
        }
        return new CatalogProduct(
                resultSet.getString("productId"),
                resultSet.getString("modelCode"),
                resultSet.getString("productName"),
                resultSet.getString("shortDescription"),
                resultSet.getString("description"),
                resultSet.getString("status"),
                resultSet.getString("productType"),
                resultSet.getString("productTypeName"),
                resultSet.getString("categoryCode"),
                resultSet.getString("categoryName"),
                resultSet.getString("brandName"),
                mapOffers(readJson(resultSet.getString("offersJson"))),
                readJson(resultSet.getString("specificationsJson")),
                mapVerificationMetadata(readJson(resultSet.getString("verificationMetadataJson"))),
                mapSpecificationQuality(readJson(resultSet.getString("specificationQualityJson"))),
                mapImages(readJson(resultSet.getString("imagesJson"))),
                resultSet.getBoolean("demoData"),
                bomComponents,
                readJsonArray(resultSet.getString("contentSectionsJson")),
                resultSet.getBoolean("featured"),
                resultSet.getInt("displayOrder"));
    }

    private List<CatalogBomComponent> mapBomComponents(JsonNode components) {
        List<CatalogBomComponent> mapped = new ArrayList<>();
        if (components != null && components.isArray()) {
            for (JsonNode component : components) {
                mapped.add(new CatalogBomComponent(
                        text(component, "componentProductId"),
                        text(component, "modelCode"),
                        text(component, "productName"),
                        text(component, "productType"),
                        component.path("quantity").intValue(),
                        nullableInteger(component.path("warrantyMonths")),
                        text(component, "displayCategory"),
                        component.path("displayOrder").intValue(),
                        text(component, "imageUrl"),
                        text(component, "imageAltText"),
                        component.get("keySpecifications")));
            }
        }
        return List.copyOf(mapped);
    }

    private List<CatalogBomComponent> addPublicComponentSpecifications(
            List<CatalogBomComponent> components) {
        if (components.isEmpty()) return components;
        List<BigDecimal> productIds = components.stream()
                .map(CatalogBomComponent::componentProductId)
                .filter(id -> id != null && !id.isBlank())
                .map(BigDecimal::new)
                .distinct()
                .toList();
        if (productIds.isEmpty()) return components;
        Map<String, ObjectNode> specificationsByProduct = new LinkedHashMap<>();
        jdbcTemplate.query("""
                SELECT p."product_id"::text AS "productId",
                       p."model_code" AS "modelCode",
                       pt."type_code" AS "productType",
                       ad."attribute_code" AS "attributeCode",
                       COALESCE(
                         to_jsonb(av."value_text"),
                         to_jsonb(av."value_decimal"),
                         to_jsonb(av."value_integer"),
                         to_jsonb(av."value_boolean"),
                         av."value_json"
                       ) AS "valueJson"
                FROM "products" p
                JOIN "product_types" pt ON pt."product_type_id" = p."product_type_id"
                JOIN "product_attribute_values" av ON av."product_id" = p."product_id"
                JOIN "product_attribute_definitions" ad
                  ON ad."attribute_definition_id" = av."attribute_definition_id"
                 AND ad."product_type_id" = p."product_type_id"
                WHERE p."product_id" IN (:productIds)
                ORDER BY ad."attribute_code"
                """, new MapSqlParameterSource("productIds", productIds), rs -> {
            String productId = rs.getString("productId");
            String productType = rs.getString("productType");
            String modelCode = rs.getString("modelCode");
            String attributeCode = rs.getString("attributeCode");
            if (internalLedger.isPubliclyVisible(productType, modelCode, attributeCode)) {
                JsonNode value = readJson(rs.getString("valueJson"));
                if (value != null && !value.isNull()) {
                    specificationsByProduct
                            .computeIfAbsent(productId, ignored -> objectMapper.createObjectNode())
                            .set(attributeCode, value);
                }
            }
        });
        return components.stream().map(component -> {
            ObjectNode specifications = objectMapper.createObjectNode();
            if (component.keySpecifications() instanceof ObjectNode existing) {
                specifications.setAll(existing);
            }
            ObjectNode publicSpecifications =
                    specificationsByProduct.get(component.componentProductId());
            if (publicSpecifications != null) specifications.setAll(publicSpecifications);
            return new CatalogBomComponent(
                    component.componentProductId(), component.modelCode(), component.productName(),
                    component.productType(), component.quantity(), component.warrantyMonths(),
                    component.displayCategory(), component.displayOrder(), component.imageUrl(),
                    component.imageAltText(),
                    specifications.isEmpty() ? null : specifications);
        }).toList();
    }

    private Integer nullableInteger(JsonNode value) {
        return value == null || value.isNull() ? null : value.intValue();
    }

    private Map<String, CatalogAttributeQuality> mapSpecificationQuality(JsonNode metadata) {
        if (metadata == null || !metadata.isObject()) {
            return Map.of();
        }
        Map<String, CatalogAttributeQuality> mapped = new LinkedHashMap<>();
        metadata.properties().forEach(entry -> {
            JsonNode value = entry.getValue();
            String quality = nullableText(value.get("valueQuality"));
            String label = nullableText(value.get("displayLabel"));
            if (quality != null && label != null) {
                mapped.put(entry.getKey(), new CatalogAttributeQuality(quality, label));
            }
        });
        return Collections.unmodifiableMap(mapped);
    }

    private Map<String, CatalogAttributeVerification> mapVerificationMetadata(JsonNode metadata) {
        if (metadata == null || !metadata.isObject()) {
            return Map.of();
        }
        Map<String, CatalogAttributeVerification> mapped = new LinkedHashMap<>();
        metadata.properties().forEach(entry -> {
            JsonNode value = entry.getValue();
            mapped.put(entry.getKey(), new CatalogAttributeVerification(
                    CatalogVerificationStatus.valueOf(value.path("verificationStatus").asText()),
                    nullableText(value.get("sourceUrl")),
                    nullableText(value.get("sourceLocator")),
                    nullableText(value.get("verificationScope"))));
        });
        return Collections.unmodifiableMap(mapped);
    }

    private String nullableText(JsonNode value) {
        return value != null && value.isTextual() ? value.textValue() : null;
    }

    private List<CatalogOffer> mapOffers(JsonNode offers) {
        List<CatalogOffer> mapped = new ArrayList<>();
        for (JsonNode offer : offers) {
            mapped.add(new CatalogOffer(
                    text(offer, "offerId"),
                    text(offer, "condition"),
                    offer.path("price").decimalValue(),
                    offer.path("price").decimalValue(),
                    BigDecimal.ZERO,
                    text(offer, "currency"),
                    offer.path("stockQuantity").longValue(),
                    offer.path("reservedQuantity").longValue(),
                    offer.path("availableQuantity").longValue(),
                    nullableLong(offer.path("warrantyMonths")),
                    text(offer, "status"),
                    0,
                    null,
                    null,
                    null,
                    List.of(),
                    List.of(),
                    offer.path("compareAtPrice").isNumber()
                            ? offer.path("compareAtPrice").decimalValue()
                            : null));
        }
        return List.copyOf(mapped);
    }

    private List<CatalogImage> mapImages(JsonNode images) {
        List<CatalogImage> mapped = new ArrayList<>();
        for (JsonNode image : images) {
            String url = text(image, "url");
            if (isValidImageUrl(url)) {
                mapped.add(new CatalogImage(
                        url,
                        image.path("altText").isNull() ? null : text(image, "altText"),
                        image.path("isPrimary").booleanValue(),
                        image.path("caption").isNull() ? null : text(image, "caption"),
                        image.path("mediaType").isNull() ? "IMAGE" : text(image, "mediaType")));
            }
        }
        return List.copyOf(mapped);
    }

    private boolean isValidImageUrl(String value) {
        if (value != null && value.matches(
                "/api/catalog/media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp|mp4|webm)")) {
            return true;
        }
        try {
            URI uri = new URI(value);
            return ("http".equalsIgnoreCase(uri.getScheme())
                    || "https".equalsIgnoreCase(uri.getScheme()))
                    && uri.getHost() != null
                    && (uri.getPort() == -1 || uri.getPort() <= 65535)
                    && uri.getUserInfo() == null
                    && value.chars().noneMatch(Character::isWhitespace);
        } catch (URISyntaxException exception) {
            return false;
        }
    }

    private String text(JsonNode node, String name) {
        JsonNode value = node.get(name);
        return value == null || value.isNull() ? null : value.asString();
    }

    private Long nullableLong(JsonNode value) {
        return value == null || value.isNull() ? null : value.longValue();
    }

    private JsonNode readJson(String json) {
        if (json == null) {
            return objectMapper.createObjectNode();
        }
        try {
            return objectMapper.readTree(json);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Catalog JSON data could not be read.", exception);
        }
    }

    private JsonNode readJsonArray(String json) {
        return json == null ? objectMapper.createArrayNode() : readJson(json);
    }

    private String writeJson(JsonNode value) {
        return value.toString();
    }

    private String jsonFilterValue(String value) {
        try {
            JsonNode parsedValue = objectMapper.readTree(value);
            return parsedValue == null || parsedValue.isMissingNode()
                    ? objectMapper.writeValueAsString(value)
                    : parsedValue.toString();
        } catch (JacksonException exception) {
            return objectMapper.writeValueAsString(value);
        }
    }

    private String jsString(JsonNode value) {
        if (value.isTextual()) {
            return value.asString();
        }
        if (value.isArray()) {
            List<String> elements = new ArrayList<>();
            value.forEach(element -> elements.add(element.isNull() ? "" : jsString(element)));
            return String.join(",", elements);
        }
        if (value.isObject()) {
            return "[object Object]";
        }
        return value.toString();
    }

    private void addEquality(
            List<String> conditions,
            MapSqlParameterSource parameters,
            String column,
            String name,
            String value) {
        if (value != null) {
            conditions.add(column + " = :" + name);
            parameters.addValue(name, value);
        }
    }

    public record ProductPage(List<CatalogProduct> products, long total) {
    }

    record SqlQuery(String sql, MapSqlParameterSource parameters) {
    }

    private record AttributeValueRow(
            String productType, String modelCode, String code, String label, JsonNode value) {
    }

    private static final class FacetBuilder {
        private final String productType;
        private final String code;
        private final String label;
        private final List<CatalogAttributeFacet.Value> values = new ArrayList<>();
        private final Set<String> seenValues = new LinkedHashSet<>();

        private FacetBuilder(String productType, String code, String label) {
            this.productType = productType;
            this.code = code;
            this.label = label;
        }

        private List<CatalogAttributeFacet.Value> values() {
            return values;
        }

        private Set<String> seenValues() {
            return seenValues;
        }

        private CatalogAttributeFacet build() {
            return new CatalogAttributeFacet(productType, code, label, List.copyOf(values));
        }
    }
}
