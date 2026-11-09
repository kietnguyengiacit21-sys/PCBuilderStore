-- Demo catalog enrichment for PC Builder Store.
-- Run only AFTER catalog-import-150-products.csv has been imported.
-- This is demo merchandising data; it deliberately does not claim to verify
-- real-world accuracy of prices or technical specifications.

BEGIN;

-- 1) Convert the imported PC configuration JSON into normalized BOM rows.
-- Repeated component model codes become quantity > 1 (for example, RAM kits).
WITH raw_items AS (
    SELECT
        pc."product_id" AS parent_product_id,
        component."product_id" AS component_product_id,
        upper(item."item" ->> 'component_type') AS component_type,
        item."ordinality"::integer AS position
    FROM "products" pc
    JOIN "product_types" pc_type
      ON pc_type."product_type_id" = pc."product_type_id"
    JOIN "product_attribute_definitions" definition
      ON definition."product_type_id" = pc."product_type_id"
     AND definition."attribute_code" = 'configuration_items'
    JOIN "product_attribute_values" attribute_value
      ON attribute_value."product_id" = pc."product_id"
     AND attribute_value."attribute_definition_id" = definition."attribute_definition_id"
    CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(attribute_value."value_json") = 'array'
             THEN attribute_value."value_json" ELSE '[]'::jsonb END
    ) WITH ORDINALITY AS item("item", "ordinality")
    JOIN "products" component
      ON component."model_code" = item."item" ->> 'model_code'
    WHERE pc_type."type_code" = 'PC'
), grouped_items AS (
    SELECT
        parent_product_id,
        component_product_id,
        MAX(component_type) AS component_type,
        COUNT(*)::integer AS quantity,
        (MIN(position) - 1)::integer AS display_order
    FROM raw_items
    GROUP BY parent_product_id, component_product_id
)
INSERT INTO "product_bom_components" (
    "parent_product_id", "component_product_id", "quantity",
    "component_warranty_months", "display_category", "display_order", "customer_visible"
)
SELECT
    grouped.parent_product_id,
    grouped.component_product_id,
    grouped.quantity,
    offer."warranty_months"::smallint,
    grouped.component_type,
    grouped.display_order,
    TRUE
FROM grouped_items grouped
LEFT JOIN LATERAL (
    SELECT "warranty_months"
    FROM "product_offers"
    WHERE "product_id" = grouped.component_product_id
      AND "offer_status" = 'ACTIVE'
      AND "condition_code" = 'NEW'
    ORDER BY "offer_id"
    LIMIT 1
) offer ON TRUE
ON CONFLICT ("parent_product_id", "component_product_id") DO UPDATE SET
    "quantity" = EXCLUDED."quantity",
    "component_warranty_months" = EXCLUDED."component_warranty_months",
    "display_category" = EXCLUDED."display_category",
    "display_order" = EXCLUDED."display_order",
    "customer_visible" = TRUE,
    "updated_at" = CURRENT_TIMESTAMP;

-- 2) Build concise catalog specs and a human-readable component summary.
WITH specs AS (
    SELECT
        product."product_id",
        jsonb_object_agg(
            definition."attribute_code",
            COALESCE(
                to_jsonb(value."value_text"),
                to_jsonb(value."value_decimal"),
                to_jsonb(value."value_integer"),
                to_jsonb(value."value_boolean"),
                value."value_json"
            )
        ) AS attributes
    FROM "products" product
    JOIN "product_attribute_definitions" definition
      ON definition."product_type_id" = product."product_type_id"
    JOIN "product_attribute_values" value
      ON value."product_id" = product."product_id"
     AND value."attribute_definition_id" = definition."attribute_definition_id"
    GROUP BY product."product_id"
), bom_text AS (
    SELECT
        bom."parent_product_id",
        string_agg(
            concat(component_type."type_name", ': ', component."product_name",
                   CASE WHEN bom."quantity" > 1 THEN ' × ' || bom."quantity"::text ELSE '' END),
            E'\n' ORDER BY bom."display_order", bom."component_product_id"
        ) AS summary
    FROM "product_bom_components" bom
    JOIN "products" component ON component."product_id" = bom."component_product_id"
    JOIN "product_types" component_type ON component_type."product_type_id" = component."product_type_id"
    WHERE bom."customer_visible" = TRUE
    GROUP BY bom."parent_product_id"
), base AS (
    SELECT
        product."product_id",
        product."product_name",
        product."model_code",
        product."brand_id",
        brand."brand_name",
        product."category_id",
        category."category_code",
        product_type."type_code",
        product_type."type_name",
        COALESCE(specs.attributes, '{}'::jsonb) AS attributes,
        bom_text.summary AS bom_summary,
        COALESCE(MAX(offer."warranty_months"), 0)::integer AS warranty_months
    FROM "products" product
    JOIN "product_types" product_type ON product_type."product_type_id" = product."product_type_id"
    JOIN "categories" category ON category."category_id" = product."category_id"
    LEFT JOIN "brands" brand ON brand."brand_id" = product."brand_id"
    LEFT JOIN specs ON specs."product_id" = product."product_id"
    LEFT JOIN bom_text ON bom_text."parent_product_id" = product."product_id"
    LEFT JOIN "product_offers" offer
      ON offer."product_id" = product."product_id" AND offer."offer_status" = 'ACTIVE'
    GROUP BY product."product_id", product."product_name", product."model_code",
             product."brand_id", brand."brand_name", product."category_id",
             category."category_code", product_type."type_code", product_type."type_name",
             specs.attributes, bom_text.summary
), catalog_copy AS (
    SELECT
        base.*,
        CASE base.type_code
            WHEN 'PC' THEN 'Bộ PC lắp sẵn ' || base.product_name ||
                ' được phối hợp từ các linh kiện riêng biệt, có cấu hình hiển thị rõ ràng và hỗ trợ tùy chọn nâng cấp theo từng nhóm linh kiện.'
            WHEN 'CPU' THEN base.product_name || ' từ ' || COALESCE(base.brand_name, 'nhà sản xuất') ||
                '. Thông tin nền tảng, số nhân, luồng xử lý và xung nhịp được trình bày để người mua dễ so sánh trước khi chọn cấu hình.'
            WHEN 'GPU' THEN base.product_name || ' từ ' || COALESCE(base.brand_name, 'nhà sản xuất') ||
                '. Trang bị thông tin chip đồ họa, bộ nhớ VRAM và các đặc điểm hiển thị để tham khảo cho cấu hình gaming hoặc đồ họa.'
            WHEN 'MOTHERBOARD' THEN base.product_name || ' – bo mạch chủ dành cho việc xây dựng và mở rộng hệ thống PC. Các thông tin socket, chipset, chuẩn RAM và kết nối được gom tại trang chi tiết.'
            WHEN 'RAM' THEN base.product_name || ' – bộ nhớ trong dành cho nâng cấp dung lượng và khả năng đa nhiệm. Có thể so sánh chuẩn RAM, dung lượng và tốc độ ngay trên trang sản phẩm.'
            WHEN 'STORAGE' THEN base.product_name || ' – giải pháp lưu trữ cho hệ điều hành, ứng dụng, trò chơi và dữ liệu cá nhân. Trang sản phẩm hiển thị dung lượng, giao tiếp và tốc độ đọc ghi khi có dữ liệu.'
            WHEN 'PSU' THEN base.product_name || ' – bộ nguồn dành cho hệ thống PC. Thông tin công suất, chuẩn hiệu suất và kiểu dây kết nối giúp người mua chọn phương án phù hợp.'
            WHEN 'CASE' THEN base.product_name || ' – vỏ máy tính hỗ trợ bố trí linh kiện và hoàn thiện phong cách cho bộ PC. Trang chi tiết tổng hợp kích thước, chuẩn mainboard và khả năng lắp đặt.'
            WHEN 'COOLER' THEN base.product_name || ' – giải pháp tản nhiệt cho CPU, hướng đến khả năng duy trì hoạt động ổn định trong các phiên sử dụng kéo dài.'
            ELSE base.product_name || ' từ ' || COALESCE(base.brand_name, 'nhà sản xuất') ||
                '. Sản phẩm có thông tin phân loại và các thuộc tính chính để người mua tham khảo, so sánh và lựa chọn.'
        END AS generated_short,
        CASE base.type_code
            WHEN 'PC' THEN 'Cấu hình được trình bày theo từng linh kiện, hỗ trợ xem thành phần, số lượng, bảo hành và lựa chọn nâng cấp. Người mua có thể tùy chỉnh các nhóm linh kiện đang được cửa hàng mở bán; giá và tồn kho được hệ thống tính lại khi thêm vào giỏ và thanh toán.'
            WHEN 'GPU' THEN 'Phù hợp để xây dựng hoặc nâng cấp dàn máy chơi game, xử lý đồ họa và các tác vụ cần tăng tốc phần cứng. Người mua có thể đối chiếu chip đồ họa, VRAM, chuẩn bộ nhớ, cổng xuất hình và yêu cầu nguồn trong phần thông số kỹ thuật.'
            WHEN 'CPU' THEN 'Thành phần xử lý trung tâm của hệ thống. Khi lựa chọn, người mua có thể tham khảo nền tảng socket, số nhân, số luồng, xung nhịp, bộ nhớ hỗ trợ và mức tiêu thụ điện được hiển thị trong bảng thông số.'
            WHEN 'MOTHERBOARD' THEN 'Là nền tảng kết nối bộ xử lý, bộ nhớ, card đồ họa và thiết bị lưu trữ. Trang chi tiết tập hợp các thông tin về socket, chipset, kích thước bo mạch, khe RAM, khe M.2 và kết nối mở rộng.'
            WHEN 'RAM' THEN 'Bộ nhớ RAM hỗ trợ hệ thống xử lý nhiều tác vụ và ứng dụng đồng thời. Người mua có thể so sánh dung lượng, số thanh, chuẩn DDR, tốc độ dữ liệu, độ trễ và điện áp theo thông tin được hiển thị.'
            WHEN 'STORAGE' THEN 'Thiết bị lưu trữ phù hợp cho hệ điều hành, ứng dụng, trò chơi và dữ liệu. Các thông số dung lượng, chuẩn giao tiếp, kích thước, tốc độ tuần tự và độ bền được bố trí trong bảng kỹ thuật.'
            WHEN 'PSU' THEN 'Bộ nguồn cung cấp điện cho các linh kiện trong máy tính. Khi chọn nguồn, nên tham khảo công suất, chuẩn hiệu suất, chuẩn ATX, đầu cấp điện và các tính năng bảo vệ được liệt kê trên trang.'
            WHEN 'CASE' THEN 'Vỏ máy tính giúp bảo vệ và sắp xếp các linh kiện thành một hệ thống hoàn chỉnh. Trang chi tiết cung cấp thông tin về kích thước, chuẩn bo mạch chủ, chiều dài card đồ họa, vị trí quạt và khả năng hỗ trợ radiator.'
            WHEN 'COOLER' THEN 'Bộ tản nhiệt giúp kiểm soát nhiệt độ CPU trong quá trình hoạt động. Người mua có thể xem loại tản, socket hỗ trợ, kích thước, quạt, tốc độ quay và độ ồn trong bảng thông số.'
            ELSE 'Sản phẩm được trình bày cùng hình ảnh, phân loại, thuộc tính kỹ thuật và thông tin bảo hành để người mua thuận tiện tham khảo. Có thể xem thêm các sản phẩm cùng danh mục để lựa chọn phụ kiện phù hợp.'
        END AS generated_description,
        concat_ws(' · ',
            CASE WHEN base.type_code = 'CPU' THEN NULLIF(base.attributes ->> 'socket', '') END,
            CASE WHEN base.type_code = 'CPU' THEN NULLIF(base.attributes ->> 'core_count', '') || ' nhân' END,
            CASE WHEN base.type_code = 'GPU' THEN NULLIF(base.attributes ->> 'gpu_chip', '') END,
            CASE WHEN base.type_code = 'GPU' THEN NULLIF(base.attributes ->> 'vram_gb', '') || 'GB VRAM' END,
            CASE WHEN base.type_code = 'RAM' THEN NULLIF(base.attributes ->> 'capacity_gb', '') || 'GB' END,
            CASE WHEN base.type_code = 'RAM' THEN NULLIF(base.attributes ->> 'memory_type', '') END,
            CASE WHEN base.type_code = 'STORAGE' THEN NULLIF(base.attributes ->> 'capacity_gb', '') || 'GB' END,
            CASE WHEN base.type_code = 'STORAGE' THEN NULLIF(base.attributes ->> 'drive_type', '') END,
            CASE WHEN base.type_code = 'MOTHERBOARD' THEN NULLIF(base.attributes ->> 'socket', '') END,
            CASE WHEN base.type_code = 'MOTHERBOARD' THEN NULLIF(base.attributes ->> 'chipset', '') END,
            CASE WHEN base.type_code = 'PSU' THEN NULLIF(base.attributes ->> 'wattage', '') || 'W' END,
            CASE WHEN base.type_code = 'COOLER' THEN NULLIF(base.attributes ->> 'cooler_type', '') END,
            CASE WHEN base.type_code = 'CASE' THEN NULLIF(base.attributes ->> 'case_form_factor', '') END
        ) AS technical_highlights
    FROM base
), featured AS (
    SELECT product_id,
           row_number() OVER (PARTITION BY type_code ORDER BY
               (SELECT MIN(price) FROM product_offers WHERE product_id = catalog_copy.product_id AND offer_status = 'ACTIVE') DESC,
               product_id) AS type_rank
    FROM catalog_copy
)
UPDATE "products" product
SET
    "short_description" = COALESCE(NULLIF(product."short_description", ''), left(catalog_copy.generated_short, 500)),
    "description" = COALESCE(NULLIF(product."description", ''),
        catalog_copy.generated_description ||
        CASE WHEN catalog_copy.technical_highlights <> '' THEN E'\n\nThông tin nổi bật: ' || catalog_copy.technical_highlights ELSE '' END ||
        CASE WHEN catalog_copy.type_code = 'PC' AND catalog_copy.bom_summary IS NOT NULL
             THEN E'\n\nCấu hình linh kiện:\n' || catalog_copy.bom_summary ELSE '' END ||
        E'\n\nThông tin bảo hành: ' || catalog_copy.warranty_months::text || ' tháng (dữ liệu demo).'),
    "bom_summary" = CASE WHEN catalog_copy.type_code = 'PC'
        THEN COALESCE(NULLIF(product."bom_summary", ''), catalog_copy.bom_summary)
        ELSE product."bom_summary" END,
    "content_sections" = CASE
        WHEN COALESCE(jsonb_array_length(product."content_sections"), 0) = 0 THEN
            jsonb_build_array(
                jsonb_build_object('title', 'Tổng quan sản phẩm', 'body', catalog_copy.generated_short),
                jsonb_build_object('title', 'Thông tin nổi bật', 'body',
                    COALESCE(NULLIF(catalog_copy.technical_highlights, ''), catalog_copy.generated_description)),
                jsonb_build_object('title', 'Cấu hình linh kiện', 'body',
                    CASE WHEN catalog_copy.type_code = 'PC' THEN COALESCE(catalog_copy.bom_summary, 'Thông tin cấu hình đang được cập nhật.')
                         ELSE catalog_copy.generated_description END),
                jsonb_build_object('title', 'Bảo hành và hỗ trợ', 'body',
                    'Sản phẩm có thông tin bảo hành hiển thị theo ưu đãi đang bán. Liên hệ bộ phận bán hàng để được tư vấn thêm.')
            )
        ELSE product."content_sections" END,
    "tags" = (
        SELECT COALESCE(jsonb_agg(to_jsonb(tag) ORDER BY tag), '[]'::jsonb)
        FROM (SELECT DISTINCT lower(tag) AS tag
              FROM unnest(ARRAY[
                  catalog_copy.type_code,
                  catalog_copy.category_code,
                  COALESCE(catalog_copy.brand_name, ''),
                  CASE catalog_copy.type_code WHEN 'PC' THEN 'pc-lap-san'
                      WHEN 'GPU' THEN 'card-do-hoa'
                      WHEN 'STORAGE' THEN 'ssd-luu-tru'
                      WHEN 'RAM' THEN 'bo-nho-ram'
                      ELSE 'linh-kien-pc' END,
                  CASE WHEN catalog_copy.type_code = 'PC' AND lower(catalog_copy.product_name) LIKE '%gaming%' THEN 'gaming' END,
                  CASE WHEN catalog_copy.type_code = 'PC' AND lower(catalog_copy.product_name) LIKE '%office%' THEN 'van-phong' END,
                  CASE WHEN catalog_copy.type_code = 'PC' AND lower(catalog_copy.product_name) LIKE '%creator%' THEN 'creator' END,
                  CASE WHEN catalog_copy.type_code = 'PC' AND lower(catalog_copy.product_name) LIKE '%workstation%' THEN 'workstation' END
              ]) AS tag
              WHERE tag IS NOT NULL AND tag <> '') tags
    ),
    "seo_title" = COALESCE(NULLIF(product."seo_title", ''), left(catalog_copy.product_name || ' | PC Builder Store', 255)),
    "seo_description" = COALESCE(NULLIF(product."seo_description", ''), left(catalog_copy.generated_short, 500)),
    "slug" = COALESCE(NULLIF(product."slug", ''),
        lower(regexp_replace(catalog_copy.model_code, '[^a-zA-Z0-9]+', '-', 'g'))),
    "is_featured" = product."is_featured" OR catalog_copy.type_code = 'PC' OR
        EXISTS (SELECT 1 FROM featured WHERE featured.product_id = product."product_id" AND featured.type_rank <= 2),
    "updated_at" = CURRENT_TIMESTAMP
FROM catalog_copy
WHERE product."product_id" = catalog_copy."product_id";

-- 3) Give demo offers a visible compare-at price. This is presentation data only;
-- the checkout still uses the actual product_offers.price and promotion rules.
UPDATE "product_offers"
SET "compare_at_price" = GREATEST(
        COALESCE("compare_at_price", "price"),
        round("price" * 1.08, -3)
    ),
    "updated_at" = CURRENT_TIMESTAMP
WHERE "offer_code" LIKE 'DEMO-%'
  AND "offer_status" = 'ACTIVE'
  AND "compare_at_price" IS NULL;

-- 4) Seed editable upgrade groups for each prebuilt PC. Options are selected
-- from the imported catalog and current NEW offers. The Admin can edit them later.
-- CPU/socket, motherboard/socket+RAM type, RAM type, storage type, and PSU wattage
-- are matched at a basic demo level; GPU and cooler choices are selected by product type.
WITH specs AS (
    SELECT
        product."product_id",
        jsonb_object_agg(
            definition."attribute_code",
            COALESCE(
                to_jsonb(value."value_text"),
                to_jsonb(value."value_decimal"),
                to_jsonb(value."value_integer"),
                to_jsonb(value."value_boolean"),
                value."value_json"
            )
        ) AS attributes
    FROM "products" product
    JOIN "product_attribute_definitions" definition
      ON definition."product_type_id" = product."product_type_id"
    JOIN "product_attribute_values" value
      ON value."product_id" = product."product_id"
     AND value."attribute_definition_id" = definition."attribute_definition_id"
    GROUP BY product."product_id"
), base_components AS (
    SELECT
        bom."parent_product_id",
        bom."component_product_id",
        bom."quantity",
        component."product_name" AS base_name,
        component."model_code" AS base_model,
        component_type."type_code" AS component_type,
        COALESCE(base_specs.attributes, '{}'::jsonb) AS base_attributes,
        base_offer."offer_id" AS base_offer_id,
        base_offer."price" AS base_price,
        base_offer."currency_code" AS currency_code
    FROM "product_bom_components" bom
    JOIN "products" component ON component."product_id" = bom."component_product_id"
    JOIN "product_types" component_type ON component_type."product_type_id" = component."product_type_id"
    LEFT JOIN specs base_specs ON base_specs."product_id" = component."product_id"
    JOIN LATERAL (
        SELECT offer."offer_id", offer."price", offer."currency_code"
        FROM "product_offers" offer
        WHERE offer."product_id" = component."product_id"
          AND offer."offer_status" = 'ACTIVE'
          AND offer."condition_code" = 'NEW'
        ORDER BY offer."price", offer."offer_id"
        LIMIT 1
    ) base_offer ON TRUE
    JOIN "product_types" pc_type
      ON pc_type."type_code" = 'PC'
    JOIN "products" pc ON pc."product_id" = bom."parent_product_id"
                       AND pc."product_type_id" = pc_type."product_type_id"
    WHERE component_type."type_code" IN ('CPU', 'GPU', 'MOTHERBOARD', 'RAM', 'STORAGE', 'PSU', 'COOLER', 'CASE')
), candidate_offers AS (
    SELECT
        base.*,
        candidate."product_id" AS candidate_product_id,
        candidate."product_name" AS candidate_name,
        candidate."model_code" AS candidate_model,
        candidate_offer."offer_id" AS candidate_offer_id,
        candidate_offer."price" AS candidate_price,
        candidate_specs.attributes AS candidate_attributes,
        row_number() OVER (
            PARTITION BY base."parent_product_id", base."component_product_id"
            ORDER BY candidate_offer."price", candidate."product_name"
        ) AS candidate_rank
    FROM base_components base
    JOIN "products" candidate
      ON candidate."product_id" <> base."component_product_id"
    JOIN "product_types" candidate_type
      ON candidate_type."product_type_id" = candidate."product_type_id"
     AND candidate_type."type_code" = base.component_type
    JOIN LATERAL (
        SELECT offer."offer_id", offer."price", offer."currency_code"
        FROM "product_offers" offer
        WHERE offer."product_id" = candidate."product_id"
          AND offer."offer_status" = 'ACTIVE'
          AND offer."condition_code" = 'NEW'
          AND offer."currency_code" = base.currency_code
          AND offer."price" > base.base_price
          AND GREATEST(offer."stock_quantity" - offer."reserved_quantity", 0) > 0
        ORDER BY offer."price", offer."offer_id"
        LIMIT 1
    ) candidate_offer ON TRUE
    LEFT JOIN specs candidate_specs ON candidate_specs."product_id" = candidate."product_id"
    WHERE candidate."product_status" = 'ACTIVE'
      AND CASE base.component_type
          WHEN 'CPU' THEN COALESCE(base.base_attributes ->> 'socket', '') =
                          COALESCE(candidate_specs.attributes ->> 'socket', '')
          WHEN 'MOTHERBOARD' THEN
              COALESCE(base.base_attributes ->> 'socket', '') = COALESCE(candidate_specs.attributes ->> 'socket', '')
              AND COALESCE(base.base_attributes ->> 'memory_type', '') = COALESCE(candidate_specs.attributes ->> 'memory_type', '')
          WHEN 'RAM' THEN COALESCE(base.base_attributes ->> 'memory_type', '') =
                         COALESCE(candidate_specs.attributes ->> 'memory_type', '')
          WHEN 'STORAGE' THEN COALESCE(base.base_attributes ->> 'drive_type', '') =
                             COALESCE(candidate_specs.attributes ->> 'drive_type', '')
          WHEN 'PSU' THEN COALESCE(NULLIF(candidate_specs.attributes ->> 'wattage', '')::numeric, 0) >=
                         COALESCE(NULLIF(base.base_attributes ->> 'wattage', '')::numeric, 0)
          ELSE TRUE
      END
), eligible_bases AS (
    SELECT DISTINCT parent_product_id, component_product_id, component_type,
        quantity, base_name, base_model, base_offer_id, base_price, currency_code
    FROM candidate_offers
    WHERE candidate_rank <= 2
), created_groups AS (
    INSERT INTO "product_upgrade_groups" (
        "product_id", "group_code", "display_name", "description",
        "is_required", "display_order", "is_enabled"
    )
    SELECT
        parent_product_id,
        'UPGRADE_' || component_type || '_' || component_product_id::text,
        CASE component_type
            WHEN 'CPU' THEN 'Nâng cấp bộ xử lý'
            WHEN 'GPU' THEN 'Nâng cấp card đồ họa'
            WHEN 'MOTHERBOARD' THEN 'Nâng cấp bo mạch chủ'
            WHEN 'RAM' THEN 'Nâng cấp RAM'
            WHEN 'STORAGE' THEN 'Nâng cấp SSD / lưu trữ'
            WHEN 'PSU' THEN 'Nâng cấp bộ nguồn'
            WHEN 'COOLER' THEN 'Nâng cấp tản nhiệt'
            WHEN 'CASE' THEN 'Nâng cấp vỏ case'
        END,
        'Chọn linh kiện thay thế; giá chênh lệch và tồn kho được cập nhật từ catalog.',
        FALSE,
        row_number() OVER (PARTITION BY parent_product_id ORDER BY component_type)::integer - 1,
        TRUE
    FROM eligible_bases
    ON CONFLICT ("product_id", "group_code") DO UPDATE
        SET "updated_at" = CURRENT_TIMESTAMP
    RETURNING "upgrade_group_id", "product_id", "group_code"
), option_rows AS (
    SELECT
        base.parent_product_id,
        'UPGRADE_' || base.component_type || '_' || base.component_product_id::text AS group_code,
        base.base_offer_id AS offer_id,
        base.base_price AS price,
        base.base_price AS base_price,
        base.base_name AS display_name,
        TRUE AS is_default,
        base.quantity AS component_quantity,
        0 AS display_order
    FROM eligible_bases base
    UNION ALL
    SELECT
        candidate.parent_product_id,
        'UPGRADE_' || candidate.component_type || '_' || candidate.component_product_id::text AS group_code,
        candidate.candidate_offer_id AS offer_id,
        candidate.candidate_price AS price,
        candidate.base_price AS base_price,
        candidate.candidate_name AS display_name,
        FALSE AS is_default,
        candidate.quantity AS component_quantity,
        candidate.candidate_rank::integer AS display_order
    FROM candidate_offers candidate
    WHERE candidate.candidate_rank <= 2
)
INSERT INTO "product_upgrade_options" (
    "upgrade_group_id", "offer_id", "price_delta", "display_name",
    "is_default", "minimum_quantity", "maximum_quantity", "display_order", "is_enabled"
)
SELECT
    upgrade_group."upgrade_group_id",
    option_rows.offer_id,
    GREATEST(option_rows.price - option_rows.base_price, 0),
    option_rows.display_name,
    option_rows.is_default,
    option_rows.component_quantity,
    option_rows.component_quantity,
    option_rows.display_order,
    TRUE
FROM option_rows
JOIN created_groups upgrade_group
  ON upgrade_group."product_id" = option_rows.parent_product_id
 AND upgrade_group."group_code" = option_rows.group_code
ON CONFLICT ("upgrade_group_id", "offer_id") DO NOTHING;

COMMIT;
