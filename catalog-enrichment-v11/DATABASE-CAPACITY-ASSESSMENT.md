# Database capacity — PC Builder Store catalog V11

## Conclusion

**The existing 35-table PostgreSQL schema can store the additional V11 technical fields without adding SQL columns or tables.** The current catalog uses an entity-attribute-value (EAV) model for specifications, so adding an attribute means adding a definition row and one typed value row per applicable product.

This is based on review of the repository's current Prisma schema and catalog repository/importer code on `migration/java-spring-boot`. I did not connect to the user's live PostgreSQL instance in this step.

## Existing schema support

The repository models the following tables:

### `product_attribute_definitions`

- `product_type_id`
- `attribute_code` (`VARCHAR(100)`)
- `attribute_name` (`VARCHAR(160)`)
- `data_type` (`VARCHAR(20)`)
- `unit` (`VARCHAR(40)`)
- `is_filterable`
- `is_build_critical`
- `validation_json` (`JSONB`)
- unique key: `(product_type_id, attribute_code)`

The `validation_json` field already holds extra dynamic metadata such as subtype, input mode/options, scope, and per-model verification metadata.

### `product_attribute_values`

- `product_id`
- `attribute_definition_id`
- `value_text` (`TEXT`)
- `value_decimal` (`NUMERIC(20,6)`)
- `value_integer` (`NUMERIC(20,0)`)
- `value_boolean` (`BOOLEAN`)
- `value_json` (`JSONB`)
- primary key: `(product_id, attribute_definition_id)`

This already supports the value types used by the importer:
`TEXT`, `INTEGER`, `DECIMAL`, `BOOLEAN`, and `JSON`.

Examples:
- simple numeric values: refresh rate, weight, DPI, brightness;
- text values: socket, panel type, HDR mode, notes such as `>40 G`;
- JSON arrays: ports, connectivity options, compatible platforms;
- JSON objects: dimensions, per-interface refresh rates, polling rates by connection mode.

PostgreSQL JSONB supports storing structured JSON documents and querying them; see the official PostgreSQL documentation: https://www.postgresql.org/docs/15/datatype-json.html.

## V11 size

- Existing registry: 176 definitions.
- V11 additions: 72 definitions.
- Resulting registry: 248 definitions.
- Full wide CSV: 150 product rows × 272 columns (24 base columns + 248 technical attribute columns).
- V11 evidence delta: 153 per-SKU rows.
- Full merged evidence/visibility/internal ledger: 2,800 rows each.

These additions do not alter the table count and do not require a `ALTER TABLE` operation.

## Important limitations / design notes

1. A product has at most one value row for a given attribute because `(product_id, attribute_definition_id)` is the primary key. Use `JSONB` for lists, port groups, dimensions or variant-specific options within one attribute.
2. `NUMERIC(20,6)` supports up to six decimal places. The v11 decimal fields fit within this limit. Threshold strings such as `>88 G` are intentionally stored as `TEXT`, not approximated to exact numbers.
3. JSONB is suitable for the current reference-PC configuration list and display. It does not by itself provide relational foreign-key enforcement, per-component stock reservation, or component-level inventory deduction. Those transactional BOM/inventory requirements should be designed separately if/when the Build-PC/inventory workflow is implemented.
4. The current API already aggregates dynamic attributes into a JSON `specifications` object. The service filters that object using the internal visibility ledger. The current public definition DTO omits subtype, so the API should expose subtype metadata for the frontend to group fields correctly.

## Required code changes (not schema migration)

- Merge the 72 new rows into `backend-java/src/main/resources/catalog-attribute-definitions.csv`.
- Apply only the 153 value rows to `product_attribute_definitions` and `product_attribute_values`.
- Update verification JSON metadata using the existing importer logic.
- Replace the classpath internal ledger with the V11 ledger.
- Add subtype to the public attribute-definition response.
- Render the dynamic public specifications on product detail pages.

**Do not reset or recreate the database. No schema migration is required for the V11 attribute additions.**
