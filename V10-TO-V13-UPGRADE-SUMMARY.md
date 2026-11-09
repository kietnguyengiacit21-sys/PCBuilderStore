# Complete V10 → V13 upgrade package

## Baseline and target
- V10 database baseline: 150 products, 176 attribute definitions, 2,482 populated technical values.
- V13 target snapshot: 150 products, 348 attribute definitions, 3,904 populated technical values.
- New definitions to register: 172 (72 from V11 + 20 from V12 + 80 from V13).
- Additive value upserts: 1422 unique new attribute/model values.
- Existing V10 fields to correct using verified V11 evidence: 8.
- Total upsert rows in `catalog-upgrade-delta-from-v10-v13.csv`: 1430.
- Existing 35-table PostgreSQL schema remains sufficient through the EAV attribute tables and JSONB.

## Stage composition
- V11 new values: 114
- V12 rows: 190
- V13 rows: 1118
- V11 corrections: 8

## Data quality distribution across the upsert rows
- DERIVED_FROM_CATALOG: 140
- ESTIMATED_REFERENCE: 299
- MANUFACTURER_DERIVED: 160
- MANUFACTURER_SOURCE: 772
- SECONDARY_SOURCE_REFERENCE: 59

## Integration instruction
Use `catalog-attribute-definitions-additions-from-v10-v13.csv` and `catalog-upgrade-delta-from-v10-v13.csv` as the canonical migration input for a database that has only V10.
If the database already has some V11/V12/V13 records, apply idempotently and do not downgrade stronger existing verification/quality metadata.
Never run the full wide CSV through the old importer.
