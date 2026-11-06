\set ON_ERROR_STOP on
\cd :repo_root

BEGIN;

DO $guard$
DECLARE
    table_count integer;
BEGIN
    IF current_database() <> 'pc_builder_store_dev' THEN
        RAISE EXCEPTION 'Refusing catalog enrichment outside pc_builder_store_dev.';
    END IF;
    IF inet_server_addr() IS DISTINCT FROM '::1'::inet THEN
        RAISE EXCEPTION 'Refusing catalog enrichment unless PostgreSQL is on loopback ::1.';
    END IF;
    SELECT COUNT(*) INTO table_count
      FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    IF table_count <> 35 THEN
        RAISE EXCEPTION 'Expected exactly 35 public base tables; found %.', table_count;
    END IF;
END
$guard$;

CREATE TEMP TABLE catalog_attribute_definition_stage (
    product_type text NOT NULL,
    code text NOT NULL,
    label_vi text NOT NULL,
    label_en text NOT NULL,
    data_type text NOT NULL,
    unit text,
    filterable boolean NOT NULL,
    build_critical boolean NOT NULL,
    subtype text,
    PRIMARY KEY (product_type, code)
) ON COMMIT DROP;

\copy catalog_attribute_definition_stage (product_type, code, label_vi, label_en, data_type, unit, filterable, build_critical, subtype) FROM 'backend-java/src/main/resources/catalog-attribute-definitions.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

DO $validate_definitions$
BEGIN
    IF EXISTS (
        SELECT 1 FROM catalog_attribute_definition_stage
        WHERE product_type NOT IN ('CPU', 'GPU', 'MOTHERBOARD', 'RAM', 'STORAGE', 'PSU', 'CASE', 'COOLER', 'ACCESSORY', 'PC')
           OR data_type NOT IN ('TEXT', 'DECIMAL', 'INTEGER', 'BOOLEAN', 'JSON')
           OR code !~ '^[a-z][a-z0-9_]*$'
           OR (product_type = 'ACCESSORY' AND subtype NOT IN ('MOUSE', 'KEYBOARD', 'MONITOR', 'HEADSET') AND code <> 'accessory_type')
    ) THEN
        RAISE EXCEPTION 'Catalog attribute dictionary contains an invalid type, code, datatype, or accessory subtype.';
    END IF;
    IF EXISTS (
        SELECT 1
          FROM catalog_attribute_definition_stage staged
          LEFT JOIN product_types pt ON pt.type_code = staged.product_type
         WHERE pt.product_type_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Catalog attribute dictionary references a missing product type.';
    END IF;
END
$validate_definitions$;

INSERT INTO product_attribute_definitions
    (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, staged.code, staged.label_vi, staged.data_type, NULLIF(staged.unit, ''),
       staged.filterable, staged.build_critical
  FROM catalog_attribute_definition_stage staged
  JOIN product_types pt ON pt.type_code = staged.product_type
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
    attribute_name = EXCLUDED.attribute_name,
    data_type = EXCLUDED.data_type,
    unit = EXCLUDED.unit,
    is_filterable = EXCLUDED.is_filterable,
    is_build_critical = EXCLUDED.is_build_critical;

CREATE TEMP TABLE catalog_verified_attribute_value_stage (
    model_code text NOT NULL,
    attribute_code text NOT NULL,
    data_type text NOT NULL,
    value_json jsonb NOT NULL,
    unit text,
    source_url text NOT NULL,
    source_locator text NOT NULL,
    verification_status text NOT NULL,
    PRIMARY KEY (model_code, attribute_code)
) ON COMMIT DROP;

\copy catalog_verified_attribute_value_stage (model_code, attribute_code, data_type, value_json, unit, source_url, source_locator, verification_status) FROM 'seed/catalog-verified-attribute-values.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

DO $validate_values$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM catalog_verified_attribute_value_stage
         WHERE verification_status NOT IN ('VERIFIED_EXACT_MODEL', 'VERIFIED_EXACT_VARIANT')
            OR source_url !~ '^https?://'
            OR btrim(source_locator) = ''
            OR data_type NOT IN ('TEXT', 'DECIMAL', 'INTEGER', 'BOOLEAN', 'JSON')
            OR (data_type = 'TEXT' AND jsonb_typeof(value_json) <> 'string')
            OR (data_type IN ('DECIMAL', 'INTEGER') AND jsonb_typeof(value_json) <> 'number')
            OR (data_type = 'INTEGER' AND (value_json #>> '{}')::numeric <> trunc((value_json #>> '{}')::numeric))
            OR (data_type = 'BOOLEAN' AND jsonb_typeof(value_json) <> 'boolean')
    ) THEN
        RAISE EXCEPTION 'Only sourced, exact-model verified attribute values with matching JSON types are accepted.';
    END IF;
    IF EXISTS (
        SELECT 1
          FROM catalog_verified_attribute_value_stage staged
          LEFT JOIN products p ON p.model_code = staged.model_code
          LEFT JOIN product_types pt ON pt.product_type_id = p.product_type_id
          LEFT JOIN product_attribute_definitions ad
            ON ad.product_type_id = p.product_type_id
           AND ad.attribute_code = staged.attribute_code
         WHERE p.product_id IS NULL
            OR ad.attribute_definition_id IS NULL
            OR ad.data_type <> staged.data_type
            OR (ad.unit IS DISTINCT FROM NULLIF(staged.unit, ''))
    ) THEN
        RAISE EXCEPTION 'Verified values reference a missing product/definition or mismatched type/unit.';
    END IF;
END
$validate_values$;

DO $preserve_existing$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM catalog_verified_attribute_value_stage staged
          JOIN products p ON p.model_code = staged.model_code
          JOIN product_attribute_definitions ad
            ON ad.product_type_id = p.product_type_id
           AND ad.attribute_code = staged.attribute_code
          JOIN product_attribute_values av
            ON av.product_id = p.product_id
           AND av.attribute_definition_id = ad.attribute_definition_id
         WHERE COALESCE(to_jsonb(av.value_text), to_jsonb(av.value_decimal),
                        to_jsonb(av.value_integer), to_jsonb(av.value_boolean), av.value_json)
               IS DISTINCT FROM staged.value_json
    ) THEN
        RAISE EXCEPTION 'An existing catalog value conflicts with the approved evidence; no value was overwritten.';
    END IF;
END
$preserve_existing$;

INSERT INTO product_attribute_values
    (product_id, attribute_definition_id, value_text, value_decimal, value_integer, value_boolean, value_json)
SELECT p.product_id,
       ad.attribute_definition_id,
       CASE WHEN staged.data_type = 'TEXT' THEN staged.value_json #>> '{}' END,
       CASE WHEN staged.data_type = 'DECIMAL' THEN (staged.value_json #>> '{}')::numeric END,
       CASE WHEN staged.data_type = 'INTEGER' THEN (staged.value_json #>> '{}')::numeric END,
       CASE WHEN staged.data_type = 'BOOLEAN' THEN (staged.value_json #>> '{}')::boolean END,
       CASE WHEN staged.data_type = 'JSON' THEN staged.value_json END
  FROM catalog_verified_attribute_value_stage staged
  JOIN products p ON p.model_code = staged.model_code
  JOIN product_attribute_definitions ad
    ON ad.product_type_id = p.product_type_id
   AND ad.attribute_code = staged.attribute_code
ON CONFLICT (product_id, attribute_definition_id) DO NOTHING;

SELECT 'attribute_definitions' AS result, COUNT(*) AS count
  FROM product_attribute_definitions;
SELECT 'verified_values_added_or_preserved' AS result, COUNT(*) AS count
  FROM catalog_verified_attribute_value_stage;

COMMIT;
