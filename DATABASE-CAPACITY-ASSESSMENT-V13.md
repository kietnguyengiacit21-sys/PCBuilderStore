# Database capacity assessment — V13

The existing schema can store V13 without physical table/column changes. `product_attribute_definitions` identifies each product-type field, and `product_attribute_values` stores one typed value per product/definition using `value_text`, `value_decimal`, `value_integer`, `value_boolean`, or `value_json` (JSONB). Verification/quality metadata is already represented in JSONB `validation_json`.

V13 adds 80 attribute definitions and 1118 attribute values. This does not require an ALTER TABLE when the EAV definitions are inserted. The current numeric value columns are `NUMERIC(20,6)` and `NUMERIC(20,0)`; V13 numeric values are within those bounds. Arrays and structured data use JSONB.

This assessment is based on the repository schema/code. Agent must still query local `pc_builder_store_dev`, confirm 35 tables, take a backup and execute idempotent upserts.
