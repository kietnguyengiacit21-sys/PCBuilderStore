package com.pc_builder_store.catalog;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.net.CookieManager;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("postgres-it")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class PostgresCatalogIntegrationIT {

    private static final String TEST_PASSWORD = "LocalIntegrationPassword@2026";

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @LocalServerPort
    private int port;

    private HttpClient httpClient;
    private String fixtureBrand;
    private String secondBrand;
    private String inactiveBrand;
    private String fixtureType;
    private String inactiveType;
    private String fixtureCategory;
    private String secondCategory;
    private String inactiveCategory;
    private String fixturePrefix;
    private String productOne;
    private String productTwo;
    private String productThree;
    private String inactiveProduct;
    private String gpuProduct;
    private boolean gpuProductTypeFixtureInserted;
    private String adminEmail;
    private String salesEmail;
    private String customerEmail;
    private final List<String> insertedRoleFixtures = new ArrayList<>();
    private Map<String, GpuDefinitionSnapshot> originalGpuDefinitions = Map.of();
    private boolean gpuDefinitionSnapshotCaptured;

    @BeforeAll
    void verifyDisposableDatabaseAndMigratedSchema() {
        if (!"true".equalsIgnoreCase(System.getenv("TEST_DATABASE_DISPOSABLE"))) {
            throw new IllegalStateException(
                    "PostgreSQL integration tests require TEST_DATABASE_DISPOSABLE=true.");
        }

        String databaseName = jdbcTemplate.queryForObject("SELECT current_database()", String.class);
        String normalizedName = databaseName.toLowerCase(Locale.ROOT);
        if (!(normalizedName.endsWith("_it") || normalizedName.endsWith("_test"))) {
            throw new IllegalStateException(
                    "Refusing integration tests: the database name must end in _it or _test.");
        }

        Set<String> tableNames = Set.copyOf(jdbcTemplate.queryForList(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'
                """,
                String.class));
        Set<String> expectedTables = Set.of(
                "roles", "users", "brands", "categories", "product_types", "products",
                "product_images", "product_attribute_definitions", "product_attribute_values",
                "product_offers", "product_connectors", "product_relationships",
                "compatibility_rules", "carts", "cart_items", "orders", "order_items",
                "product_reviews", "use_cases", "questionnaire_templates",
                "questionnaire_questions", "questionnaire_options", "questionnaire_sessions",
                "questionnaire_answers", "pc_builds", "pc_build_revisions", "pc_build_items",
                "build_check_runs", "build_check_results", "benchmark_scenarios",
                "benchmark_results", "system_benchmark_results", "recommendation_runs",
                "recommendation_items", "replacement_suggestions");
        assertEquals(35, expectedTables.size());
        assertEquals(expectedTables, tableNames,
                "The disposable schema must contain exactly the 35 application tables.");
        verifyCatalogColumnTypes();
        verifyCatalogIndexesAndForeignKeys();
    }

    @BeforeEach
    void insertIsolatedFixtures() {
        httpClient = HttpClient.newHttpClient();
        fixturePrefix = "P3A-" + UUID.randomUUID().toString().replace("-", "") + "-";
        fixtureBrand = fixturePrefix + "Brand";
        secondBrand = fixturePrefix + "Brand-2";
        inactiveBrand = fixturePrefix + "Inactive-Brand";
        fixtureType = fixturePrefix + "TYPE";
        inactiveType = fixturePrefix + "INACTIVE_TYPE";
        fixtureCategory = fixturePrefix + "CAT";
        secondCategory = fixturePrefix + "CAT_2";
        inactiveCategory = fixturePrefix + "INACTIVE_CAT";
        productOne = fixturePrefix + "SLASH/MODEL";
        productTwo = fixturePrefix + "RANGE";
        productThree = fixturePrefix + "NO-OFFER";
        inactiveProduct = fixturePrefix + "INACTIVE";
        gpuProduct = fixturePrefix + "GPU";
        gpuProductTypeFixtureInserted = false;
        adminEmail = fixturePrefix.toLowerCase(Locale.ROOT) + "admin@example.test";
        salesEmail = fixturePrefix.toLowerCase(Locale.ROOT) + "sales@example.test";
        customerEmail = fixturePrefix.toLowerCase(Locale.ROOT) + "customer@example.test";
        insertedRoleFixtures.clear();
        originalGpuDefinitions = Map.of();
        gpuDefinitionSnapshotCaptured = false;

        jdbcTemplate.update(
                "INSERT INTO brands (brand_name, is_active) VALUES (?, TRUE), (?, TRUE), (?, TRUE)",
                fixtureBrand, secondBrand, inactiveBrand);
        jdbcTemplate.update(
                """
                INSERT INTO product_types (type_code, type_name, is_active)
                VALUES (?, 'Phase 3A fixture type', TRUE), (?, 'Inactive fixture type', TRUE)
                """,
                fixtureType, inactiveType);
        jdbcTemplate.update(
                """
                INSERT INTO categories (category_code, category_name, is_active)
                VALUES (?, 'Phase 3A fixture category', TRUE),
                       (?, 'Second fixture category', TRUE),
                       (?, 'Inactive fixture category', TRUE)
                """,
                fixtureCategory, secondCategory, inactiveCategory);

        jdbcTemplate.update(
                """
                INSERT INTO product_attribute_definitions
                  (product_type_id, attribute_code, attribute_name, data_type, is_filterable)
                SELECT pt.product_type_id, attribute.code, attribute.name, attribute.type, TRUE
                FROM product_types pt
                CROSS JOIN (VALUES
                  ('it_text', 'Fixture text', 'TEXT'),
                  ('it_decimal', 'Fixture decimal', 'DECIMAL'),
                  ('it_integer', 'Fixture integer', 'INTEGER'),
                  ('it_boolean', 'Fixture boolean', 'BOOLEAN'),
                  ('it_json', 'Fixture JSON', 'JSON')
                ) AS attribute(code, name, type)
                WHERE pt.type_code = ?
                """,
                fixtureType);

        insertProduct(productOne, "Phase 3A Alpha", fixtureType, fixtureCategory, fixtureBrand, "ACTIVE");
        insertProduct(productTwo, "Phase 3A Beta", fixtureType, secondCategory, secondBrand, "ACTIVE");
        insertProduct(productThree, "Phase 3A Gamma", fixtureType, fixtureCategory, fixtureBrand, "ACTIVE");
        insertProduct(
                inactiveProduct, "Phase 3A Hidden", inactiveType, inactiveCategory, inactiveBrand, "INACTIVE");

        insertAttribute(productOne, "it_text", "DDR5", null, null, null, null);
        insertAttribute(productOne, "it_decimal", null, new BigDecimal("3200.250000"), null, null, null);
        insertAttribute(productOne, "it_integer", null, null, new BigDecimal("16"), null, null);
        insertAttribute(productOne, "it_boolean", null, null, null, true, null);
        insertAttribute(productOne, "it_json", null, null, null, null, "{\"channel\":2}");
        insertAttribute(productTwo, "it_text", "DDR5", null, null, null, null);

        insertOffer(productOne, "DEMO-" + productOne, "123.45", 10, 3, "ACTIVE");
        insertOffer(productOne, "LIVE-" + productOne, "130.00", 5, 1, "ACTIVE");
        insertOffer(productOne, "OLD-" + productOne, "1.00", 9, 0, "INACTIVE");
        insertOffer(productTwo, "DEMO-" + productTwo + "-LOW", "20.00", 2, 0, "ACTIVE");
        insertOffer(productTwo, "DEMO-" + productTwo + "-HIGH", "200.00", 4, 1, "ACTIVE");
        insertOffer(inactiveProduct, "DEMO-" + inactiveProduct, "5.00", 1, 0, "ACTIVE");

        jdbcTemplate.update(
                """
                INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
                SELECT p.product_id, image.url, image.alt, image.primary_image, image.position
                FROM products p
                CROSS JOIN (VALUES
                  ('https://example.test/phase3a.png', 'valid image', TRUE, 1),
                  ('https://user:password@example.test/private.png', 'embedded credentials', FALSE, 2),
                  ('https://bad host/image.png', 'invalid URL', FALSE, 3),
                  ('ftp://example.test/file.png', 'unsupported protocol', FALSE, 4),
                  ('http://example.test/phase3a-http.png', 'valid HTTP image', FALSE, 5),
                  ('https://user:password@example.test/private.png', 'embedded credentials', FALSE, 6)
                ) AS image(url, alt, primary_image, position)
                WHERE p.model_code = ?
                """,
                productOne);
    }

    @AfterEach
    void removeOnlyFixtures() {
        jdbcTemplate.update(
                "DELETE FROM users WHERE email IN (?, ?, ?)",
                adminEmail, salesEmail, customerEmail);
        for (String roleCode : insertedRoleFixtures) {
            jdbcTemplate.update(
                    """
                    DELETE FROM "roles" r
                    WHERE r."role_code" = ?
                      AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u."role_id" = r."role_id")
                    """,
                    roleCode);
        }
        jdbcTemplate.update(
                """
                DELETE FROM product_images
                WHERE product_id IN (SELECT product_id FROM products WHERE model_code LIKE ?)
                """,
                fixturePrefix + "%");
        jdbcTemplate.update(
                """
                DELETE FROM product_attribute_values
                WHERE product_id IN (SELECT product_id FROM products WHERE model_code LIKE ?)
                """,
                fixturePrefix + "%");
        jdbcTemplate.update(
                """
                DELETE FROM product_offers
                WHERE product_id IN (SELECT product_id FROM products WHERE model_code LIKE ?)
                """,
                fixturePrefix + "%");
        jdbcTemplate.update("DELETE FROM products WHERE model_code LIKE ?", fixturePrefix + "%");
        jdbcTemplate.update(
                """
                DELETE FROM product_attribute_definitions
                WHERE product_type_id IN (SELECT product_type_id FROM product_types WHERE type_code = ?)
                """,
                fixtureType);
        if (gpuProductTypeFixtureInserted) {
            jdbcTemplate.update(
                    """
                    DELETE FROM product_attribute_definitions ad
                    USING product_types pt
                    WHERE pt.product_type_id = ad.product_type_id
                      AND pt.type_code = 'GPU'
                    """);
            jdbcTemplate.update(
                    """
                    DELETE FROM product_types pt
                    WHERE pt.type_code = 'GPU'
                      AND NOT EXISTS (
                        SELECT 1 FROM products p WHERE p.product_type_id = pt.product_type_id
                      )
                    """);
        }
        restoreGpuDefinitions();
        jdbcTemplate.update("DELETE FROM product_types WHERE type_code IN (?, ?)", fixtureType, inactiveType);
        jdbcTemplate.update(
                "DELETE FROM categories WHERE category_code IN (?, ?, ?)",
                fixtureCategory, secondCategory, inactiveCategory);
        jdbcTemplate.update(
                "DELETE FROM brands WHERE brand_name IN (?, ?, ?)",
                fixtureBrand, secondBrand, inactiveBrand);
    }

    @Test
    void facetsIncludeActiveProductOptionsAndDeduplicatedTypedValues() throws Exception {
        JsonNode response = getJson("/api/catalog/facets");
        JsonNode data = response.path("data");

        assertEquals(1, countOption(data.path("productTypes"), fixtureType));
        assertEquals(1, countOption(data.path("categories"), fixtureCategory));
        assertEquals(1, countOption(data.path("brands"), fixtureBrand));
        assertEquals(0, countOption(data.path("productTypes"), inactiveType));
        assertEquals(0, countOption(data.path("categories"), inactiveCategory));
        assertEquals(0, countOption(data.path("brands"), inactiveBrand));

        JsonNode textFacet = findFacet(data.path("attributes"), fixtureType, "it_text");
        assertEquals(1, textFacet.path("values").size());
        assertEquals("\"DDR5\"", textFacet.path("values").get(0).path("value").asString());
        assertEquals("DDR5", textFacet.path("values").get(0).path("label").asString());

        BigDecimal decimalFacetValue = new BigDecimal(
                findFacet(data.path("attributes"), fixtureType, "it_decimal")
                        .path("values").get(0).path("value").asString());
        assertEquals(0, decimalFacetValue.compareTo(new BigDecimal("3200.250000")));
        assertEquals("16",
                findFacet(data.path("attributes"), fixtureType, "it_integer")
                        .path("values").get(0).path("value").asString());
        assertEquals("true",
                findFacet(data.path("attributes"), fixtureType, "it_boolean")
                        .path("values").get(0).path("value").asString());
        assertEquals("{\"channel\":2}",
                findFacet(data.path("attributes"), fixtureType, "it_json")
                        .path("values").get(0).path("value").asString());
    }

    @Test
    void listingSupportsDefaultsSearchAndTypeCategoryBrandFilters() throws Exception {
        JsonNode defaults = getJson("/api/catalog/products");
        assertEquals(1, defaults.path("pagination").path("page").intValue());
        assertEquals(20, defaults.path("pagination").path("limit").intValue());
        assertEquals(3, defaults.path("pagination").path("total").intValue());
        assertEquals(1, defaults.path("pagination").path("totalPages").intValue());
        assertEquals(3, defaults.path("data").size());

        assertProductListed(getJson(query("/api/catalog/products", Map.of(
                "q", "Phase 3A Alpha"))), productOne);
        assertProductListed(getJson(query("/api/catalog/products", Map.of(
                "q", productOne))), productOne);
        assertEquals(3, getJson(query("/api/catalog/products", Map.of(
                "type", fixtureType))).path("pagination").path("total").intValue());
        assertEquals(2, getJson(query("/api/catalog/products", Map.of(
                "category", fixtureCategory))).path("pagination").path("total").intValue());
        assertEquals(2, getJson(query("/api/catalog/products", Map.of(
                "brand", fixtureBrand))).path("pagination").path("total").intValue());
    }

    @Test
    void priceBoundsMatchOneOfferAndSupportSingleBounds() throws Exception {
        JsonNode bothBounds = getJson(query("/api/catalog/products", Map.of(
                "minPrice", "100.00", "maxPrice", "150.00")));
        assertProductListed(bothBounds, productOne);
        assertProductNotListed(bothBounds, productTwo);

        JsonNode minimum = getJson(query("/api/catalog/products", Map.of("minPrice", "150.00")));
        assertProductListed(minimum, productTwo);
        JsonNode maximum = getJson(query("/api/catalog/products", Map.of("maxPrice", "25.00")));
        assertProductListed(maximum, productTwo);
    }

    @Test
    void filtersTypedAttributeValuesUsingJsonSemantics() throws Exception {
        assertProductListed(attributeQuery("it_text", "DDR5"), productOne);
        assertProductListed(attributeQuery("it_decimal", "3200.25"), productOne);
        assertProductListed(attributeQuery("it_integer", "16"), productOne);
        assertProductListed(attributeQuery("it_boolean", "true"), productOne);
        assertProductListed(attributeQuery("it_json", "{\"channel\":2}"), productOne);
    }

    @Test
    void sortsByNameAndPriceAndPlacesMissingPricesLast() throws Exception {
        assertEquals(productOne, firstModel(getJson(query(
                "/api/catalog/products", Map.of("sort", "name", "order", "asc")))));
        assertEquals(productThree, firstModel(getJson(query(
                "/api/catalog/products", Map.of("sort", "name", "order", "desc")))));
        assertEquals(productTwo, firstModel(getJson(query(
                "/api/catalog/products", Map.of("sort", "price", "order", "asc")))));
        assertEquals(productOne, firstModel(getJson(query(
                "/api/catalog/products", Map.of("sort", "price", "order", "desc")))));

        JsonNode priceAscending = getJson(query(
                "/api/catalog/products", Map.of("sort", "price", "order", "asc")));
        assertEquals(productThree, priceAscending.path("data").get(2).path("modelCode").asString());
        assertTrue(priceAscending.path("data").get(2).path("offers").isEmpty());
    }

    @Test
    void paginationTotalsAndPagesReflectFilteredProducts() throws Exception {
        JsonNode page = getJson(query("/api/catalog/products", Map.of(
                "page", "2", "limit", "2", "sort", "name")));

        assertEquals(2, page.path("pagination").path("page").intValue());
        assertEquals(2, page.path("pagination").path("limit").intValue());
        assertEquals(3, page.path("pagination").path("total").intValue());
        assertEquals(2, page.path("pagination").path("totalPages").intValue());
        assertEquals(1, page.path("data").size());
    }

    @Test
    void detailMapsNumericIdsWithoutExposingInternalOfferCodesOrDemoMetadata() throws Exception {
        JsonNode response = getJson("/api/catalog/products/" + encode(productOne));
        JsonNode product = response.path("data");

        assertEquals(productOne, product.path("modelCode").asString());
        assertTrue(new BigDecimal(product.path("productId").asString()).signum() > 0);
        assertTrue(product.path("productId").isTextual());
        assertEquals("ACTIVE", product.path("status").asString());
        assertEquals(fixtureBrand, product.path("brandName").asString());
        assertEquals(2, product.path("offers").size());
        assertEquals(new BigDecimal("123.45"),
                product.path("offers").get(0).path("price").decimalValue());
        assertEquals(10, product.path("offers").get(0).path("stockQuantity").intValue());
        assertEquals(3, product.path("offers").get(0).path("reservedQuantity").intValue());
        assertEquals(7, product.path("offers").get(0).path("availableQuantity").intValue());
        assertTrue(product.path("offers").get(0).path("offerId").isTextual());
        assertTrue(product.path("offers").get(0).path("offerCode").isMissingNode());
        assertTrue(product.path("offers").get(0).path("isDemo").isMissingNode());
        assertEquals("DDR5", product.path("specifications").path("it_text").asString());
        BigDecimal actualDecimal = product.path("specifications")
                .path("it_decimal").decimalValue();
        assertEquals(0, actualDecimal.compareTo(new BigDecimal("3200.250000")));
        assertEquals(16, product.path("specifications").path("it_integer").intValue());
        assertTrue(product.path("specifications").path("it_boolean").booleanValue());
        assertEquals(2, product.path("specifications").path("it_json").path("channel").intValue());
        assertEquals(2, product.path("images").size());
        assertEquals("https://example.test/phase3a.png", product.path("images").get(0).path("url").asString());
        assertEquals("http://example.test/phase3a-http.png", product.path("images").get(1).path("url").asString());
        assertTrue(product.path("demoData").isMissingNode());
        assertTrue(response.path("notice").isMissingNode());
    }

    @Test
    void detailExcludesInactiveProductsAndEncodedSlashModelCodeWorks() throws Exception {
        HttpResponse<String> missing = get("/api/catalog/products/" + encode(inactiveProduct));
        assertEquals(404, missing.statusCode());
        assertEquals("PRODUCT_NOT_FOUND", objectMapper.readTree(missing.body())
                .path("error").path("code").asString());

        HttpResponse<String> slash = get("/api/catalog/products/" + encode(productOne));
        assertEquals(200, slash.statusCode(), slash.body());
        assertEquals(productOne, objectMapper.readTree(slash.body())
                .path("data").path("modelCode").asString());
    }

    @Test
    void authenticatedAdminHttpUpdatePersistsGpuValuesAndEnforcesRoleAndValidation() throws Exception {
        ensureGpuProductTypeFixture();
        insertProduct(gpuProduct, "Phase 3A GPU", "GPU", fixtureCategory, fixtureBrand, "ACTIVE");
        ensureRoleFixture("ADMIN", "Administrator");
        ensureRoleFixture("SALES", "Sales");
        ensureRoleFixture("CUSTOMER", "Customer");
        insertTestUser("ADMIN", adminEmail);
        insertTestUser("SALES", salesEmail);
        insertTestUser("CUSTOMER", customerEmail);
        originalGpuDefinitions = snapshotGpuDefinitions("gpu_chip", "display_outputs");
        gpuDefinitionSnapshotCaptured = true;

        HttpClient anonymousClient = HttpClient.newHttpClient();
        HttpResponse<String> anonymousMe = get(anonymousClient, "/api/auth/me");
        assertEquals(200, anonymousMe.statusCode(), anonymousMe.body());

        HttpResponse<String> definitionsResponse = get(
                anonymousClient, "/api/catalog/attribute-definitions");
        assertEquals(200, definitionsResponse.statusCode(), definitionsResponse.body());
        JsonNode definitions = objectMapper.readTree(definitionsResponse.body()).path("data");
        JsonNode gpuChipDefinition = attributeDefinition(definitions, "gpu_chip");
        assertEquals("Chip đồ họa", gpuChipDefinition.path("label").asString());
        assertEquals("GPU chip", gpuChipDefinition.path("englishLabel").asString());
        assertEquals("GPU_SILICON", gpuChipDefinition.path("specificationScope").asString());
        JsonNode vramDefinition = attributeDefinition(definitions, "vram_gb");
        assertEquals("INTEGER", vramDefinition.path("dataType").asString());
        assertEquals("GB", vramDefinition.path("unit").asString());
        JsonNode outputsDefinition = attributeDefinition(definitions, "display_outputs");
        assertEquals("Cổng xuất hình", outputsDefinition.path("label").asString());
        assertEquals("Display outputs", outputsDefinition.path("englishLabel").asString());
        assertEquals("JSON_ARRAY", outputsDefinition.path("inputMode").asString());
        assertEquals("BOARD_VARIANT", outputsDefinition.path("specificationScope").asString());

        HttpResponse<String> publicProduct = get(
                anonymousClient, "/api/catalog/products/" + encode(gpuProduct));
        assertEquals(200, publicProduct.statusCode(), publicProduct.body());
        JsonNode initialProduct = objectMapper.readTree(publicProduct.body()).path("data");
        assertEquals("GPU", initialProduct.path("productType").asString());
        assertTrue(initialProduct.path("specifications").isEmpty());

        AuthenticatedClient admin = login(adminEmail);
        HttpResponse<String> saved = putJson(
                admin,
                "/api/catalog/admin/products/" + encode(gpuProduct) + "/specifications",
                """
                {"specifications":{
                  "gpu_chip":"Phase 3A integration fixture",
                  "display_outputs":[
                    {"type":"DisplayPort","count":3,"version":"2.1a"},
                    {"type":"HDMI","count":1,"version":"2.1b"}
                  ]
                }}
                """);
        assertEquals(200, saved.statusCode(), saved.body());
        JsonNode savedProduct = objectMapper.readTree(saved.body()).path("data");
        assertEquals("Phase 3A integration fixture",
                savedProduct.path("specifications").path("gpu_chip").asString());
        assertEquals(2, savedProduct.path("specifications").path("display_outputs").size());

        HttpResponse<String> readBack = get(
                admin.client(), "/api/catalog/products/" + encode(gpuProduct));
        assertEquals(200, readBack.statusCode(), readBack.body());
        JsonNode persistedSpecifications = objectMapper.readTree(readBack.body())
                .path("data").path("specifications");
        assertEquals("Phase 3A integration fixture",
                persistedSpecifications.path("gpu_chip").asString());
        assertEquals("DisplayPort",
                persistedSpecifications.path("display_outputs").get(0).path("type").asString());

        HttpResponse<String> invalid = putJson(
                admin,
                "/api/catalog/admin/products/" + encode(gpuProduct) + "/specifications",
                "{\"specifications\":{\"vram_gb\":\"sixteen\"}}");
        assertEquals(400, invalid.statusCode(), invalid.body());

        for (String email : List.of(salesEmail, customerEmail)) {
            AuthenticatedClient unauthorized = login(email);
            HttpResponse<String> denied = putJson(
                    unauthorized,
                    "/api/catalog/admin/products/" + encode(gpuProduct) + "/specifications",
                    "{\"specifications\":{\"gpu_chip\":\"Unauthorized change\"}}");
            assertEquals(403, denied.statusCode(), denied.body());
        }

        AuthenticatedClient anonymousWithCsrf = newCsrfClient();
        HttpResponse<String> unauthenticatedUpdate = putJson(
                anonymousWithCsrf,
                "/api/catalog/admin/products/" + encode(gpuProduct) + "/specifications",
                "{\"specifications\":{\"gpu_chip\":\"Unauthorized change\"}}");
        assertEquals(401, unauthenticatedUpdate.statusCode(), unauthenticatedUpdate.body());

        HttpResponse<String> unchanged = get(
                admin.client(), "/api/catalog/products/" + encode(gpuProduct));
        JsonNode unchangedSpecifications = objectMapper.readTree(unchanged.body())
                .path("data").path("specifications");
        assertEquals("Phase 3A integration fixture",
                unchangedSpecifications.path("gpu_chip").asString());
        assertEquals(2, unchangedSpecifications.path("display_outputs").size());
    }

    private void insertTestUser(String roleCode, String email) {
        int inserted = jdbcTemplate.update(
                """
                INSERT INTO "users"
                  ("role_id", "full_name", "email", "password_hash", "phone",
                   "customer_segment", "account_status")
                SELECT "role_id", ?, ?, ?, NULL, 'UNSPECIFIED', 'ACTIVE'
                FROM "roles"
                WHERE "role_code" = ?
                """,
                "Phase 3A " + roleCode,
                email,
                passwordEncoder.encode(TEST_PASSWORD),
                roleCode);
        assertEquals(1, inserted, "The integration database must contain role " + roleCode + ".");
    }

    private void ensureRoleFixture(String roleCode, String roleName) {
        int inserted = jdbcTemplate.update(
                """
                INSERT INTO "roles" ("role_code", "role_name", "description")
                VALUES (?, ?, 'Temporary PostgreSQL integration-test role')
                ON CONFLICT ("role_code") DO NOTHING
                """,
                roleCode,
                roleName);
        if (inserted == 1) {
            insertedRoleFixtures.add(roleCode);
        }
    }

    private void ensureGpuProductTypeFixture() {
        int inserted = jdbcTemplate.update(
                """
                INSERT INTO "product_types"
                  ("type_code", "type_name", "description", "is_build_component", "is_active")
                VALUES ('GPU', 'Graphics card', 'Temporary integration-test product type', TRUE, TRUE)
                ON CONFLICT ("type_code") DO NOTHING
                """);
        gpuProductTypeFixtureInserted = inserted == 1;
    }

    private JsonNode attributeDefinition(JsonNode definitions, String code) {
        for (JsonNode definition : definitions) {
            if ("GPU".equals(definition.path("productType").asString())
                    && code.equals(definition.path("code").asString())) {
                return definition;
            }
        }
        throw new AssertionError("GPU attribute definition not found: " + code);
    }

    private Map<String, GpuDefinitionSnapshot> snapshotGpuDefinitions(String... codes) {
        Map<String, GpuDefinitionSnapshot> snapshots = new LinkedHashMap<>();
        for (String code : codes) {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    """
                    SELECT ad."attribute_name", ad."data_type", ad."unit",
                           ad."is_filterable", ad."is_build_critical"
                    FROM "product_attribute_definitions" ad
                    JOIN "product_types" pt ON pt."product_type_id" = ad."product_type_id"
                    WHERE pt."type_code" = 'GPU' AND ad."attribute_code" = ?
                    """,
                    code);
            if (!rows.isEmpty()) {
                Map<String, Object> row = rows.getFirst();
                snapshots.put(code, new GpuDefinitionSnapshot(
                        (String) row.get("attribute_name"),
                        (String) row.get("data_type"),
                        (String) row.get("unit"),
                        Boolean.TRUE.equals(row.get("is_filterable")),
                        Boolean.TRUE.equals(row.get("is_build_critical"))));
            }
        }
        return snapshots;
    }

    private void restoreGpuDefinitions() {
        if (!gpuDefinitionSnapshotCaptured) {
            return;
        }
        for (String code : List.of("gpu_chip", "display_outputs")) {
            GpuDefinitionSnapshot original = originalGpuDefinitions.get(code);
            if (original == null) {
                jdbcTemplate.update(
                        """
                        DELETE FROM "product_attribute_definitions" ad
                        USING "product_types" pt
                        WHERE pt."product_type_id" = ad."product_type_id"
                          AND pt."type_code" = 'GPU'
                          AND ad."attribute_code" = ?
                          AND NOT EXISTS (
                            SELECT 1 FROM "product_attribute_values" av
                            WHERE av."attribute_definition_id" = ad."attribute_definition_id"
                          )
                        """,
                        code);
            } else {
                jdbcTemplate.update(
                        """
                        UPDATE "product_attribute_definitions" ad
                        SET "attribute_name" = ?, "data_type" = ?, "unit" = ?,
                            "is_filterable" = ?, "is_build_critical" = ?
                        FROM "product_types" pt
                        WHERE pt."product_type_id" = ad."product_type_id"
                          AND pt."type_code" = 'GPU'
                          AND ad."attribute_code" = ?
                        """,
                        original.name(),
                        original.dataType(),
                        original.unit(),
                        original.filterable(),
                        original.buildCritical(),
                        code);
            }
        }
    }

    private AuthenticatedClient login(String email) throws Exception {
        AuthenticatedClient client = newCsrfClient();
        HttpRequest request = HttpRequest.newBuilder(URI.create(
                        "http://localhost:" + port + "/api/auth/login"))
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .header("X-XSRF-TOKEN", client.csrfToken())
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(
                        Map.of("email", email, "password", TEST_PASSWORD))))
                .build();
        HttpResponse<String> response = client.client().send(
                request, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, response.statusCode(), response.body());
        return client;
    }

    private AuthenticatedClient newCsrfClient() throws Exception {
        HttpClient client = HttpClient.newBuilder()
                .cookieHandler(new CookieManager())
                .build();
        HttpResponse<String> response = get(client, "/api/auth/csrf");
        assertEquals(200, response.statusCode(), response.body());
        String csrfToken = objectMapper.readTree(response.body()).path("token").asString();
        assertFalse(csrfToken.isBlank(), "The CSRF endpoint must return a token.");
        return new AuthenticatedClient(client, csrfToken);
    }

    private HttpResponse<String> putJson(
            AuthenticatedClient client, String path, String json) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .header("X-XSRF-TOKEN", client.csrfToken())
                .PUT(HttpRequest.BodyPublishers.ofString(json))
                .build();
        return client.client().send(request, HttpResponse.BodyHandlers.ofString());
    }

    private void verifyCatalogColumnTypes() {
        assertColumnType("brands", "brand_id", "numeric", 20, 0);
        assertColumnType("categories", "category_id", "numeric", 20, 0);
        assertColumnType("product_types", "product_type_id", "numeric", 20, 0);
        assertColumnType("products", "product_id", "numeric", 20, 0);
        assertColumnType("product_offers", "offer_id", "numeric", 20, 0);
        assertColumnType("product_offers", "price", "numeric", 15, 2);
        assertColumnType(
                "product_attribute_definitions", "attribute_definition_id", "numeric", 20, 0);
        assertColumnType("product_attribute_values", "value_decimal", "numeric", 20, 6);
        assertColumnType("product_attribute_values", "value_integer", "numeric", 20, 0);
        assertColumnType("product_attribute_values", "value_json", "jsonb", null, null);
        assertColumnType("product_attribute_definitions", "validation_json", "jsonb", null, null);
        assertColumnType("product_images", "image_id", "numeric", 20, 0);
        assertColumnType("product_images", "image_url", "character varying", 1000, null);
        assertColumnType("product_offers", "stock_quantity", "numeric", 10, 0);
    }

    private void verifyCatalogIndexesAndForeignKeys() {
        assertTrue(indexExists("ix_products_type_status"));
        assertTrue(indexExists("ix_offers_product_status"));
        assertTrue(indexExists("ix_attribute_def_type"));
        assertTrue(foreignKeyExists("fk_products_type"));
        assertTrue(foreignKeyExists("fk_products_category"));
        assertTrue(foreignKeyExists("fk_offers_product"));
        assertTrue(foreignKeyExists("fk_attribute_values_product"));
    }

    private void assertColumnType(
            String table, String column, String type, Integer precision, Integer scale) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                """
                SELECT data_type, numeric_precision, numeric_scale, character_maximum_length
                FROM information_schema.columns
                WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?
                """,
                table, column);
        assertEquals(1, rows.size(), table + "." + column + " must exist.");
        Map<String, Object> row = rows.get(0);
        assertEquals(type, row.get("data_type"), table + "." + column + " type");
        if (precision != null && "numeric".equals(type)) {
            assertEquals(precision, ((Number) row.get("numeric_precision")).intValue());
        }
        if (scale != null && "numeric".equals(type)) {
            assertEquals(scale, ((Number) row.get("numeric_scale")).intValue());
        }
        if (precision != null && "character varying".equals(type)) {
            assertEquals(precision, ((Number) row.get("character_maximum_length")).intValue());
        }
    }

    private boolean indexExists(String name) {
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = ?)",
                Boolean.class,
                name));
    }

    private boolean foreignKeyExists(String name) {
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                """
                SELECT EXISTS (
                  SELECT 1 FROM pg_constraint
                  WHERE conname = ? AND contype = 'f'
                )
                """,
                Boolean.class,
                name));
    }

    private void insertProduct(
            String modelCode,
            String name,
            String typeCode,
            String categoryCode,
            String brandName,
            String status) {
        jdbcTemplate.update(
                """
                INSERT INTO products
                  (product_type_id, category_id, brand_id, model_code, product_name, product_status)
                SELECT pt.product_type_id, c.category_id, b.brand_id, ?, ?, ?
                FROM product_types pt
                JOIN categories c ON c.category_code = ?
                JOIN brands b ON b.brand_name = ?
                WHERE pt.type_code = ?
                """,
                modelCode, name, status, categoryCode, brandName, typeCode);
    }

    private void insertOffer(
            String modelCode, String offerCode, String price, int stock, int reserved, String status) {
        jdbcTemplate.update(
                """
                INSERT INTO product_offers
                  (product_id, offer_code, condition_code, price, currency_code,
                   stock_quantity, reserved_quantity, warranty_months, offer_status)
                SELECT product_id, ?, 'NEW', ?, 'VND', ?, ?, 36, ?
                FROM products WHERE model_code = ?
                """,
                offerCode, new BigDecimal(price), stock, reserved, status, modelCode);
    }

    private void insertAttribute(
            String modelCode,
            String code,
            String text,
            BigDecimal decimal,
            BigDecimal integer,
            Boolean bool,
            String json) {
        jdbcTemplate.update(
                """
                INSERT INTO product_attribute_values
                  (product_id, attribute_definition_id, value_text, value_decimal,
                   value_integer, value_boolean, value_json)
                SELECT p.product_id, ad.attribute_definition_id, ?, ?, ?, ?, CAST(? AS jsonb)
                FROM products p
                JOIN product_types pt ON pt.product_type_id = p.product_type_id
                JOIN product_attribute_definitions ad
                  ON ad.product_type_id = pt.product_type_id AND ad.attribute_code = ?
                WHERE p.model_code = ?
                """,
                text, decimal, integer, bool, json, code, modelCode);
    }

    private JsonNode attributeQuery(String code, String value) throws Exception {
        return getJson(query("/api/catalog/products", Map.of("attribute", code + "=" + value)));
    }

    private JsonNode getJson(String path) throws Exception {
        HttpResponse<String> response = get(path);
        assertEquals(200, response.statusCode(), response.body());
        return objectMapper.readTree(response.body());
    }

    private HttpResponse<String> get(String path) throws Exception {
        return get(httpClient, path);
    }

    private HttpResponse<String> get(HttpClient client, String path) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(
                        URI.create("http://localhost:" + port + path))
                .header("Accept", "application/json")
                .GET()
                .build();
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private String query(String path, Map<String, String> parameters) {
        List<String> encoded = new ArrayList<>();
        parameters.forEach((key, value) -> encoded.add(
                encode(key) + "=" + encode(value)));
        return path + "?" + String.join("&", encoded);
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private int countOption(JsonNode options, String value) {
        int count = 0;
        for (JsonNode option : options) {
            if (value.equals(option.path("value").asString())) {
                count++;
            }
        }
        return count;
    }

    private JsonNode findFacet(JsonNode facets, String type, String code) {
        for (JsonNode facet : facets) {
            if (type.equals(facet.path("productType").asString())
                    && code.equals(facet.path("code").asString())) {
                return facet;
            }
        }
        throw new AssertionError("Facet not found: " + type + "/" + code);
    }

    private void assertProductListed(JsonNode response, String modelCode) {
        for (JsonNode product : response.path("data")) {
            if (modelCode.equals(product.path("modelCode").asString())) {
                return;
            }
        }
        throw new AssertionError("Expected product in list: " + modelCode);
    }

    private void assertProductNotListed(JsonNode response, String modelCode) {
        for (JsonNode product : response.path("data")) {
            assertFalse(modelCode.equals(product.path("modelCode").asString()));
        }
    }

    private String firstModel(JsonNode response) {
        JsonNode products = response.path("data");
        assertTrue(products.size() > 0);
        String modelCode = products.get(0).path("modelCode").asString();
        assertNotNull(modelCode);
        return modelCode;
    }

    private record AuthenticatedClient(HttpClient client, String csrfToken) {
    }

    private record GpuDefinitionSnapshot(
            String name,
            String dataType,
            String unit,
            boolean filterable,
            boolean buildCritical) {
    }
}
