BEGIN;

CREATE TEMP TABLE creator_008_upgrade_groups (
    group_code text PRIMARY KEY,
    display_name text NOT NULL,
    component_type text NOT NULL,
    display_order integer NOT NULL,
    required boolean NOT NULL
) ON COMMIT DROP;

CREATE TEMP TABLE creator_008_upgrade_options (
    group_code text NOT NULL,
    model_code text NOT NULL,
    minimum_quantity integer NOT NULL CHECK (minimum_quantity > 0),
    maximum_quantity integer NOT NULL CHECK (maximum_quantity >= minimum_quantity),
    display_order integer NOT NULL,
    is_default boolean NOT NULL,
    PRIMARY KEY (group_code, model_code)
) ON COMMIT DROP;

INSERT INTO creator_008_upgrade_groups
    (group_code, display_name, component_type, display_order, required)
VALUES
    ('GPU', 'Card đồ họa', 'GPU', 1, TRUE),
    ('RAM', 'Bộ nhớ RAM', 'RAM', 2, TRUE),
    ('PSU', 'Bộ nguồn', 'PSU', 3, TRUE),
    ('CASE', 'Vỏ case', 'CASE', 4, TRUE),
    ('STORAGE', 'Ổ cứng SSD', 'STORAGE', 5, TRUE),
    ('CPU', 'Bộ xử lý', 'CPU', 6, TRUE),
    ('MOTHERBOARD', 'Bo mạch chủ', 'MOTHERBOARD', 7, TRUE),
    ('COOLER', 'Tản nhiệt CPU', 'COOLER', 8, TRUE);

INSERT INTO creator_008_upgrade_options
    (group_code, model_code, minimum_quantity, maximum_quantity, display_order, is_default)
VALUES
    ('GPU', 'DUAL-RTX4060TI-O8G', 1, 1, 0, TRUE),
    ('GPU', 'RTX4060TIVENTUS2XBLACK8GOC', 1, 1, 1, FALSE),
    ('GPU', '11335-04-20G', 1, 1, 2, FALSE),
    ('GPU', 'RTX5060TI-16G-DUAL', 1, 1, 3, FALSE),
    ('GPU', 'RX9060XT-16G-DUAL', 1, 1, 4, FALSE),
    ('GPU', 'RTX5070-12G-WIND', 1, 1, 5, FALSE),
    ('GPU', 'RX7800XT-SL-16GO', 1, 1, 6, FALSE),
    ('GPU', 'DUAL-RTX4070S-O12G', 1, 1, 7, FALSE),
    ('GPU', 'RTX5070-12G-TRIO', 1, 1, 8, FALSE),
    ('GPU', 'RTX4070SUPERVENTUS2X12GOC', 1, 1, 9, FALSE),
    ('GPU', 'GV-N407SWF3OC-12GD', 1, 1, 10, FALSE),
    ('GPU', 'RX9070XT-PULSE-16G', 1, 1, 11, FALSE),
    ('GPU', 'RTX5070TI-16G-PRIME', 1, 1, 12, FALSE),
    ('GPU', 'RX7900XTX-24G-TAICHI', 1, 1, 13, FALSE),
    ('GPU', 'RTX5080-16G-TRIO', 1, 1, 14, FALSE),

    ('RAM', 'KF560C36BBEK2-32', 2, 2, 0, TRUE),
    ('RAM', 'KF560C30BBEAK2-64', 1, 1, 1, FALSE),
    ('RAM', 'CMH64GX5M2B6000C30', 1, 1, 2, FALSE),
    ('RAM', 'CMK96GX5M2B6000C30', 1, 1, 3, FALSE),
    ('RAM', 'KF560C36BBEK4-128', 1, 1, 4, FALSE),
    ('RAM', 'CMK192GX5M4B5600C40', 1, 1, 5, FALSE),

    ('PSU', 'MAG-A850GL-PCIE5', 1, 1, 0, TRUE),
    ('PSU', 'NE850G-M', 1, 1, 1, FALSE),
    ('PSU', 'R-PX850G-FC0B', 1, 1, 2, FALSE),
    ('PSU', 'CP-9020263', 1, 1, 3, FALSE),
    ('PSU', 'FOCUS-GX-850', 1, 1, 4, FALSE),
    ('PSU', 'R-PX1000G-FC0B', 1, 1, 5, FALSE),
    ('PSU', 'RM1000X', 1, 1, 6, FALSE),
    ('PSU', 'MPG-A1200GS-PCIE5', 1, 1, 7, FALSE),

    ('CASE', 'CC-H61FB-01', 1, 1, 0, TRUE),
    ('CASE', 'CC-9011200-WW', 1, 1, 1, FALSE),
    ('CASE', 'AIR-903-MAX', 1, 1, 2, FALSE),
    ('CASE', 'R-CH560-BKAPE4-G-1', 1, 1, 3, FALSE),

    ('STORAGE', 'ZP2000GM3A013', 1, 1, 0, TRUE),
    ('STORAGE', 'MZ-V9P2T0B/AM', 1, 1, 1, FALSE),
    ('STORAGE', 'P3-4TB', 1, 1, 2, FALSE),
    ('STORAGE', 'MZ-V9P4T0B/AM', 1, 1, 3, FALSE),
    ('STORAGE', 'CT8000P3PSSD8', 1, 1, 4, FALSE),

    ('CPU', '100-100000592BOX', 1, 1, 0, TRUE),
    ('CPU', '100-100001084WOF', 1, 1, 1, FALSE),
    ('CPU', '100-100001277WOF', 1, 1, 2, FALSE),
    ('CPU', '100-100001404WOF', 1, 1, 3, FALSE),
    ('CPU', '100-100001362WOF', 1, 1, 4, FALSE),
    ('CPU', '100-100001995X3D', 1, 1, 5, FALSE),

    ('MOTHERBOARD', 'B650-AORUS-ELITE-AX', 1, 1, 0, TRUE),
    ('MOTHERBOARD', 'MAG-B650-TOMAHAWK-WIFI', 1, 1, 1, FALSE),
    ('MOTHERBOARD', 'B850-GAMING-PLUS-WIFI', 1, 1, 2, FALSE),
    ('MOTHERBOARD', 'TUF-X670E-PLUS-WIFI', 1, 1, 3, FALSE),
    ('MOTHERBOARD', 'X870-AORUS-ELITE-WIFI7', 1, 1, 4, FALSE),
    ('MOTHERBOARD', 'ROG-CROSSHAIR-X870E-HERO', 1, 1, 5, FALSE),

    ('COOLER', 'ACFRE00134A', 1, 1, 0, TRUE),
    ('COOLER', 'ACFRE00136A', 1, 1, 1, FALSE),
    ('COOLER', 'NH-D15-CH-BK', 1, 1, 2, FALSE);

WITH raw_items AS (
    SELECT pc."product_id" AS parent_product_id,
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
      AND pc."model_code" = 'PBC-PC-CREATOR-008'
), grouped_items AS (
    SELECT parent_product_id,
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
SELECT grouped.parent_product_id,
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

DO $$
DECLARE
    target_product_id numeric;
    target_currency text;
BEGIN
    SELECT product."product_id", base_offer."currency_code"
    INTO target_product_id, target_currency
    FROM "products" product
    JOIN "product_types" product_type
      ON product_type."product_type_id" = product."product_type_id"
    JOIN "product_offers" base_offer
      ON base_offer."product_id" = product."product_id"
     AND base_offer."offer_status" = 'ACTIVE'
     AND base_offer."condition_code" = 'NEW'
    WHERE product."model_code" = 'PBC-PC-CREATOR-008'
      AND product_type."type_code" = 'PC'
      AND product."product_status" = 'ACTIVE'
    ORDER BY base_offer."offer_id"
    LIMIT 1;

    IF target_product_id IS NULL THEN
        RAISE EXCEPTION 'Active Creator-008 PC and NEW base offer were not found.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM creator_008_upgrade_groups group_seed
        LEFT JOIN creator_008_upgrade_options option_seed
          ON option_seed."group_code" = group_seed."group_code"
        GROUP BY group_seed."group_code"
        HAVING COUNT(option_seed."model_code") < 2
            OR COUNT(*) FILTER (WHERE option_seed."is_default") <> 1
    ) THEN
        RAISE EXCEPTION 'Each Creator-008 upgrade group must have alternatives and one default.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM creator_008_upgrade_options option_seed
        LEFT JOIN "products" product
          ON product."model_code" = option_seed."model_code"
        WHERE product."product_id" IS NULL
           OR product."product_status" <> 'ACTIVE'
    ) THEN
        RAISE EXCEPTION 'An upgrade option product is missing or inactive.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM creator_008_upgrade_options option_seed
        JOIN creator_008_upgrade_groups group_seed
          ON group_seed."group_code" = option_seed."group_code"
        JOIN "products" product
          ON product."model_code" = option_seed."model_code"
        JOIN "product_types" product_type
          ON product_type."product_type_id" = product."product_type_id"
        WHERE product_type."type_code" <> group_seed."component_type"
    ) THEN
        RAISE EXCEPTION 'An upgrade option does not match its component type.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM creator_008_upgrade_options option_seed
        JOIN "products" product
          ON product."model_code" = option_seed."model_code"
        WHERE NOT EXISTS (
            SELECT 1
            FROM "product_offers" offer
            WHERE offer."product_id" = product."product_id"
              AND offer."offer_status" = 'ACTIVE'
              AND offer."condition_code" = 'NEW'
              AND offer."currency_code" = target_currency
              AND offer."stock_quantity" - offer."reserved_quantity"
                  >= option_seed."minimum_quantity"
        )
    ) THEN
        RAISE EXCEPTION 'An upgrade option has no available NEW offer in the base currency.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM creator_008_upgrade_options option_seed
        JOIN "products" component
          ON component."model_code" = option_seed."model_code"
        LEFT JOIN "product_bom_components" bom
          ON bom."parent_product_id" = target_product_id
         AND bom."component_product_id" = component."product_id"
        WHERE option_seed."is_default"
          AND (bom."quantity" IS NULL
               OR bom."quantity" <> option_seed."minimum_quantity"
               OR option_seed."minimum_quantity" <> option_seed."maximum_quantity")
    ) THEN
        RAISE EXCEPTION 'Each default option quantity must exactly match Creator-008 BOM.';
    END IF;
END $$;

INSERT INTO "product_upgrade_groups" (
    "product_id", "group_code", "display_name", "description",
    "is_required", "display_order", "is_enabled"
)
SELECT product."product_id", group_seed."group_code", group_seed."display_name", NULL,
       group_seed."required", group_seed."display_order", TRUE
FROM creator_008_upgrade_groups group_seed
JOIN "products" product ON product."model_code" = 'PBC-PC-CREATOR-008'
ON CONFLICT ("product_id", "group_code")
DO UPDATE SET "display_name" = EXCLUDED."display_name",
              "description" = EXCLUDED."description",
              "is_required" = EXCLUDED."is_required",
              "display_order" = EXCLUDED."display_order",
              "is_enabled" = EXCLUDED."is_enabled",
              "updated_at" = CURRENT_TIMESTAMP;

UPDATE "product_upgrade_options" option
SET "is_enabled" = FALSE
FROM "product_upgrade_groups" group_row
JOIN "products" product ON product."product_id" = group_row."product_id"
WHERE option."upgrade_group_id" = group_row."upgrade_group_id"
  AND product."model_code" = 'PBC-PC-CREATOR-008'
  AND group_row."group_code" IN (
      SELECT "group_code" FROM creator_008_upgrade_groups
  );

INSERT INTO "product_upgrade_options" (
    "upgrade_group_id", "offer_id", "price_delta", "display_name", "description",
    "is_default", "minimum_quantity", "maximum_quantity", "display_order", "is_enabled"
)
SELECT group_row."upgrade_group_id",
       selected_offer."offer_id",
       selected_offer."price" - default_offer."price",
       selected_product."product_name",
       NULL,
       option_seed."is_default",
       option_seed."minimum_quantity",
       option_seed."maximum_quantity",
       option_seed."display_order",
       TRUE
FROM creator_008_upgrade_options option_seed
JOIN "product_upgrade_groups" group_row
  ON group_row."group_code" = option_seed."group_code"
JOIN "products" target
  ON target."product_id" = group_row."product_id"
 AND target."model_code" = 'PBC-PC-CREATOR-008'
JOIN "products" selected_product
  ON selected_product."model_code" = option_seed."model_code"
JOIN LATERAL (
    SELECT offer."offer_id", offer."price", offer."currency_code"
    FROM "product_offers" offer
    WHERE offer."product_id" = selected_product."product_id"
      AND offer."offer_status" = 'ACTIVE'
      AND offer."condition_code" = 'NEW'
      AND offer."currency_code" = (
          SELECT base_offer."currency_code"
          FROM "product_offers" base_offer
          WHERE base_offer."product_id" = target."product_id"
            AND base_offer."offer_status" = 'ACTIVE'
            AND base_offer."condition_code" = 'NEW'
          ORDER BY base_offer."offer_id"
          LIMIT 1
      )
    ORDER BY offer."offer_id"
    LIMIT 1
) selected_offer ON TRUE
JOIN creator_008_upgrade_options default_seed
  ON default_seed."group_code" = option_seed."group_code"
 AND default_seed."is_default"
JOIN "products" default_product
  ON default_product."model_code" = default_seed."model_code"
JOIN LATERAL (
    SELECT offer."price"
    FROM "product_offers" offer
    WHERE offer."product_id" = default_product."product_id"
      AND offer."offer_status" = 'ACTIVE'
      AND offer."condition_code" = 'NEW'
      AND offer."currency_code" = selected_offer."currency_code"
    ORDER BY offer."offer_id"
    LIMIT 1
) default_offer ON TRUE
ON CONFLICT ("upgrade_group_id", "offer_id")
DO UPDATE SET "price_delta" = EXCLUDED."price_delta",
              "display_name" = EXCLUDED."display_name",
              "description" = EXCLUDED."description",
              "is_default" = EXCLUDED."is_default",
              "minimum_quantity" = EXCLUDED."minimum_quantity",
              "maximum_quantity" = EXCLUDED."maximum_quantity",
              "display_order" = EXCLUDED."display_order",
              "is_enabled" = EXCLUDED."is_enabled";

COMMIT;
