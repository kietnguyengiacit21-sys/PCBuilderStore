\set ON_ERROR_STOP on
BEGIN;

DO $$
BEGIN
  IF (SELECT count(*) FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE') <> 35 THEN
    RAISE EXCEPTION 'Expected the existing 35-table schema; refusing catalog upgrade.';
  END IF;
END
$$;

CREATE TEMP TABLE v13_definitions (
  product_type text, code text, label_vi text, label_en text, data_type text, unit text,
  filterable text, build_critical text, subtype text, input_mode text, options text,
  specification_scope text
) ON COMMIT DROP;
CREATE TEMP TABLE v13_values (
  model_code text, product_type text, attribute_code text, data_type text, unit text,
  value_json text, value_quality text, source_url text, source_locator text,
  verification_status text, public_visibility text, review_note text, review_date text,
  specification_scope text, update_kind text, stage text
) ON COMMIT DROP;
CREATE TEMP TABLE v13_quality (
  model_code text, product_type text, attribute_code text, value_quality text,
  display_label text, public_visibility text, source_url text, source_locator text,
  update_kind text, stage text
) ON COMMIT DROP;
CREATE TEMP TABLE v13_evidence (
  model_code text, product_type text, attribute_code text, data_type text, unit text,
  value_json text, source_url text, source_locator text, verification_status text,
  review_note text, review_date text, specification_scope text
) ON COMMIT DROP;
CREATE TEMP TABLE v13_ledger (
  model_code text, product_type text, attribute_code text, data_type text, unit text,
  catalog_value text, value_presence text, verification_status text, public_visibility text,
  source_url text, source_locator text, specification_scope text, review_note text,
  review_date text
) ON COMMIT DROP;
CREATE TEMP TABLE v13_visibility (
  model_code text, product_type text, attribute_code text, verification_status text,
  public_visibility text
) ON COMMIT DROP;

\copy v13_definitions FROM 'catalog-attribute-definitions-additions-from-v10-v13.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
\copy v13_values FROM 'catalog-upgrade-delta-from-v10-v13.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
\copy v13_quality FROM 'catalog-upgrade-quality-from-v10-v13.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
\copy v13_evidence FROM 'catalog-attribute-evidence-v13-from-v10.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
\copy v13_ledger FROM 'catalog-attribute-internal-ledger-v13-from-v10.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
\copy v13_visibility FROM 'catalog-public-attribute-visibility-v13-from-v10.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

DO $$
BEGIN
  IF (SELECT count(*) FROM v13_definitions) <> 172
     OR (SELECT count(*) FROM v13_values) <> 1430
     OR (SELECT count(*) FROM v13_quality) <> 1430
     OR (SELECT count(*) FROM v13_evidence) <> 3722
     OR (SELECT count(*) FROM v13_ledger) <> 4107
     OR (SELECT count(*) FROM v13_visibility) <> 4107 THEN
    RAISE EXCEPTION 'V13 input row counts do not match the canonical package.';
  END IF;
  IF (SELECT count(*) FROM v13_values WHERE update_kind = 'VERIFIED_EXISTING_FIELD_CORRECTION') <> 8 THEN
    RAISE EXCEPTION 'Expected exactly 8 verified V10 field corrections.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM v13_values v
    FULL JOIN v13_quality q USING (model_code, product_type, attribute_code)
    WHERE v.model_code IS NULL OR q.model_code IS NULL
  ) THEN
    RAISE EXCEPTION 'V13 values and quality metadata do not have matching keys.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM v13_values v
    LEFT JOIN products p ON p.model_code = v.model_code
    LEFT JOIN product_types pt ON pt.product_type_id = p.product_type_id
    WHERE p.product_id IS NULL OR pt.type_code IS DISTINCT FROM v.product_type
  ) THEN
    RAISE EXCEPTION 'A V13 value references a missing or mismatched product.';
  END IF;
END
$$;

INSERT INTO product_attribute_definitions
  (product_type_id, attribute_code, attribute_name, data_type, unit,
   is_filterable, is_build_critical, validation_json)
SELECT pt.product_type_id, d.code, d.label_vi, d.data_type, NULLIF(d.unit, ''),
       d.filterable::boolean, d.build_critical::boolean,
       jsonb_strip_nulls(jsonb_build_object(
         'englishLabel', NULLIF(d.label_en, ''),
         'subtype', NULLIF(d.subtype, ''),
         'inputMode', NULLIF(d.input_mode, ''),
         'options', CASE WHEN NULLIF(d.options, '') IS NULL THEN NULL
                         ELSE to_jsonb(string_to_array(d.options, '|')) END,
         'specificationScope', NULLIF(d.specification_scope, '')
       ))
FROM v13_definitions d
JOIN product_types pt ON pt.type_code = d.product_type
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
  attribute_name = EXCLUDED.attribute_name,
  data_type = EXCLUDED.data_type,
  unit = EXCLUDED.unit,
  is_filterable = EXCLUDED.is_filterable,
  is_build_critical = EXCLUDED.is_build_critical,
  validation_json = COALESCE(product_attribute_definitions.validation_json, '{}'::jsonb)
                    || EXCLUDED.validation_json;

INSERT INTO product_attribute_values
  (product_id, attribute_definition_id, value_text, value_decimal,
   value_integer, value_boolean, value_json)
SELECT p.product_id, ad.attribute_definition_id,
       CASE WHEN v.data_type = 'TEXT' THEN v.value_json::jsonb #>> '{}' END,
       CASE WHEN v.data_type = 'DECIMAL' THEN (v.value_json::jsonb #>> '{}')::numeric END,
       CASE WHEN v.data_type = 'INTEGER' THEN (v.value_json::jsonb #>> '{}')::bigint END,
       CASE WHEN v.data_type = 'BOOLEAN' THEN (v.value_json::jsonb #>> '{}')::boolean END,
       CASE WHEN v.data_type = 'JSON' THEN v.value_json::jsonb END
FROM v13_values v
JOIN products p ON p.model_code = v.model_code
JOIN product_types pt ON pt.product_type_id = p.product_type_id AND pt.type_code = v.product_type
JOIN product_attribute_definitions ad
  ON ad.product_type_id = pt.product_type_id AND ad.attribute_code = v.attribute_code
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
  value_text = EXCLUDED.value_text,
  value_decimal = EXCLUDED.value_decimal,
  value_integer = EXCLUDED.value_integer,
  value_boolean = EXCLUDED.value_boolean,
  value_json = EXCLUDED.value_json,
  updated_at = CURRENT_TIMESTAMP
WHERE EXISTS (
  SELECT 1
  FROM v13_values correction
  JOIN products correction_product ON correction_product.model_code = correction.model_code
  JOIN product_types correction_type
    ON correction_type.product_type_id = correction_product.product_type_id
   AND correction_type.type_code = correction.product_type
  JOIN product_attribute_definitions correction_definition
    ON correction_definition.product_type_id = correction_type.product_type_id
   AND correction_definition.attribute_code = correction.attribute_code
  WHERE correction.update_kind = 'VERIFIED_EXISTING_FIELD_CORRECTION'
    AND correction_product.product_id = EXCLUDED.product_id
    AND correction_definition.attribute_definition_id = EXCLUDED.attribute_definition_id
);

UPDATE product_attribute_definitions ad
SET validation_json = jsonb_set(
  COALESCE(ad.validation_json, '{}'::jsonb),
  '{catalogValueQualityByModel}',
  COALESCE(ad.validation_json -> 'catalogValueQualityByModel', '{}'::jsonb) || q.metadata,
  true)
FROM (
  SELECT product_type, attribute_code,
         jsonb_object_agg(model_code, jsonb_strip_nulls(jsonb_build_object(
           'valueQuality', value_quality,
           'displayLabel', display_label,
           'publicVisibility', public_visibility
         ))) AS metadata
  FROM v13_quality
  GROUP BY product_type, attribute_code
) q
JOIN product_types pt ON pt.type_code = q.product_type
WHERE ad.product_type_id = pt.product_type_id AND ad.attribute_code = q.attribute_code;

UPDATE product_attribute_definitions ad
SET validation_json = jsonb_set(
  COALESCE(ad.validation_json, '{}'::jsonb),
  '{verificationByModel}',
  COALESCE(ad.validation_json -> 'verificationByModel', '{}'::jsonb) || e.metadata,
  true)
FROM (
  SELECT product_type, attribute_code,
         jsonb_object_agg(model_code, jsonb_strip_nulls(jsonb_build_object(
           'verificationStatus', verification_status,
           'sourceUrl', NULLIF(source_url, ''),
           'sourceLocator', NULLIF(source_locator, ''),
           'verificationScope', NULLIF(specification_scope, ''),
           'reviewNote', NULLIF(review_note, ''),
           'reviewDate', NULLIF(review_date, '')
         ))) AS metadata
  FROM v13_evidence
  GROUP BY product_type, attribute_code
) e
JOIN product_types pt ON pt.type_code = e.product_type
WHERE ad.product_type_id = pt.product_type_id AND ad.attribute_code = e.attribute_code;

UPDATE product_attribute_definitions ad
SET validation_json = jsonb_set(
  COALESCE(ad.validation_json, '{}'::jsonb),
  '{catalogInternalLedgerByModel}',
  COALESCE(ad.validation_json -> 'catalogInternalLedgerByModel', '{}'::jsonb) || l.metadata,
  true)
FROM (
  SELECT product_type, attribute_code,
         jsonb_object_agg(model_code, jsonb_strip_nulls(jsonb_build_object(
           'catalogValue', catalog_value,
           'valuePresence', value_presence,
           'verificationStatus', verification_status,
           'publicVisibility', public_visibility,
           'sourceUrl', NULLIF(source_url, ''),
           'sourceLocator', NULLIF(source_locator, ''),
           'specificationScope', NULLIF(specification_scope, ''),
           'reviewNote', NULLIF(review_note, ''),
           'reviewDate', NULLIF(review_date, '')
         ))) AS metadata
  FROM v13_ledger
  GROUP BY product_type, attribute_code
) l
JOIN product_types pt ON pt.type_code = l.product_type
WHERE ad.product_type_id = pt.product_type_id AND ad.attribute_code = l.attribute_code;

UPDATE product_attribute_definitions ad
SET validation_json = jsonb_set(
  COALESCE(ad.validation_json, '{}'::jsonb),
  '{catalogVisibilityByModel}',
  COALESCE(ad.validation_json -> 'catalogVisibilityByModel', '{}'::jsonb) || v.metadata,
  true)
FROM (
  SELECT product_type, attribute_code,
         jsonb_object_agg(model_code, jsonb_build_object(
           'verificationStatus', verification_status,
           'publicVisibility', public_visibility
         )) AS metadata
  FROM v13_visibility
  GROUP BY product_type, attribute_code
) v
JOIN product_types pt ON pt.type_code = v.product_type
WHERE ad.product_type_id = pt.product_type_id AND ad.attribute_code = v.attribute_code;

DO $$
BEGIN
  IF (SELECT count(*) FROM product_attribute_definitions) < 348 THEN
    RAISE EXCEPTION 'Definition integration verification failed.';
  END IF;
  IF (SELECT count(*) FROM product_attribute_values v
      JOIN products p ON p.product_id = v.product_id
      WHERE p.model_code IN (SELECT model_code FROM v13_values)) < 1430 THEN
    RAISE EXCEPTION 'Value integration verification failed.';
  END IF;
END
$$;

COMMIT;