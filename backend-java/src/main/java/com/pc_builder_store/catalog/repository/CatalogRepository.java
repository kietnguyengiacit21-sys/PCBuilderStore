package com.pc_builder_store.catalog.repository;

import com.pc_builder_store.catalog.dto.CatalogAttributeFacet;
import com.pc_builder_store.catalog.dto.CatalogFacets;
import com.pc_builder_store.catalog.dto.CatalogImage;
import com.pc_builder_store.catalog.dto.CatalogOffer;
import com.pc_builder_store.catalog.dto.CatalogOption;
import com.pc_builder_store.catalog.dto.CatalogProduct;
import com.pc_builder_store.catalog.dto.CatalogQuery;
import com.pc_builder_store.catalog.dto.CatalogQuery.AttributeFilter;
import com.pc_builder_store.catalog.dto.CatalogQuery.Direction;
import com.pc_builder_store.catalog.dto.CatalogQuery.Sort;
import com.pc_builder_store.catalog.exception.InvalidCatalogQueryException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
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

@Repository
public class CatalogRepository {

    private static final String PRODUCT_SELECT = """
            SELECT
              p."product_id"::text AS "productId",
              p."model_code" AS "modelCode",
              p."product_name" AS "productName",
              p."short_description" AS "shortDescription",
              p."description" AS "description",
              p."product_status" AS "status",
              pt."type_code" AS "productType",
              pt."type_name" AS "productTypeName",
              c."category_code" AS "categoryCode",
              c."category_name" AS "categoryName",
              b."brand_name" AS "brandName",
              COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                  'offerCode', po."offer_code",
                  'condition', po."condition_code",
                  'price', po."price",
                  'currency', po."currency_code",
                  'stockQuantity', po."stock_quantity",
                  'reservedQuantity', po."reserved_quantity",
                  'availableQuantity', po."stock_quantity" - po."reserved_quantity",
                  'warrantyMonths', po."warranty_months",
                  'status', po."offer_status",
                  'isDemo', po."offer_code" LIKE 'DEMO-%'
                ) ORDER BY po."price", po."offer_code")
                FROM "product_offers" po
                WHERE po."product_id" = p."product_id" AND po."offer_status" = 'ACTIVE'
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
                SELECT jsonb_agg(jsonb_build_object(
                  'url', pi."image_url",
                  'altText', pi."alt_text",
                  'isPrimary', pi."is_primary"
                ) ORDER BY pi."sort_order", pi."image_id")
                FROM "product_images" pi
                WHERE pi."product_id" = p."product_id"
                  AND (pi."image_url" COLLATE "C") ~ '^https?://[^[:space:]]+$'
              ), '[]'::jsonb)::text AS "imagesJson",
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

    public CatalogRepository(
            NamedParameterJdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
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

    public ProductPage findProducts(CatalogQuery query) {
        validateAttributeCodes(query.attributes());
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
                   WHERE po."product_id" = p."product_id" AND po."offer_status" = 'ACTIVE')
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
                        AND COALESCE(
                          to_jsonb(av."value_text"),
                          to_jsonb(av."value_decimal"),
                          to_jsonb(av."value_integer"),
                          to_jsonb(av."value_boolean"),
                          av."value_json"
                        ) = CAST(:%s AS jsonb)
                    )
                    """.formatted(codeParameter, valueParameter));
            parameters.addValue(codeParameter, attribute.code());
            parameters.addValue(valueParameter, jsonFilterValue(attribute.value()));
        }
        return new SqlQuery(" WHERE " + String.join(" AND ", conditions), parameters);
    }

    private void validateAttributeCodes(List<AttributeFilter> attributes) {
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
            if (!supportedCodes.contains(code)) {
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
                        resultSet.getString("code"),
                        resultSet.getString("label"),
                        readJson(resultSet.getString("valueJson"))));

        Map<String, FacetBuilder> grouped = new LinkedHashMap<>();
        for (AttributeValueRow row : rows) {
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
                mapImages(readJson(resultSet.getString("imagesJson"))),
                resultSet.getBoolean("demoData"));
    }

    private List<CatalogOffer> mapOffers(JsonNode offers) {
        List<CatalogOffer> mapped = new ArrayList<>();
        for (JsonNode offer : offers) {
            mapped.add(new CatalogOffer(
                    text(offer, "offerCode"),
                    text(offer, "condition"),
                    offer.path("price").decimalValue(),
                    text(offer, "currency"),
                    offer.path("stockQuantity").longValue(),
                    offer.path("reservedQuantity").longValue(),
                    offer.path("availableQuantity").longValue(),
                    nullableLong(offer.path("warrantyMonths")),
                    text(offer, "status"),
                    offer.path("isDemo").booleanValue()));
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
                        image.path("isPrimary").booleanValue()));
            }
        }
        return List.copyOf(mapped);
    }

    private boolean isValidImageUrl(String value) {
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
        try {
            return objectMapper.readTree(json);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Catalog JSON data could not be read.", exception);
        }
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
            String productType, String code, String label, JsonNode value) {
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
