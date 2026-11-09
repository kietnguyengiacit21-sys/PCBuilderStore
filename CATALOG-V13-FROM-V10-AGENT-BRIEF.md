# Copilot Agent task — complete V10 → V13 catalog + API/storefront integration

The local database is known to have completed V10. V11, V12 and V13 may not yet be integrated. Treat this folder as a self-contained cumulative upgrade from that V10 baseline.

## Canonical files
1. `catalog-attribute-definitions-additions-from-v10-v13.csv` — 172 new dynamic definitions (72 V11 + 20 V12 + 80 V13).
2. `catalog-upgrade-delta-from-v10-v13.csv` — 1,430 idempotent upsert rows: 1,422 new SKU/attribute values plus 8 verified corrections to existing V10 fields.
3. `catalog-upgrade-quality-from-v10-v13.csv` — safe customer-facing quality labels and visibility for each upsert.
4. `catalog-attribute-evidence-v13-from-v10.csv` — cumulative evidence registry.
5. `catalog-attribute-internal-ledger-v13-from-v10.csv` — cumulative internal registry.
6. `catalog-public-attribute-visibility-v13-from-v10.csv` — cumulative public visibility allowlist.
7. `catalog-import-150-products-v13-wide-reference-only.csv` — full reference snapshot; NEVER use as an instruction to run the V10 full importer.

## Required execution
- Inspect current worktree and preserve all existing changes.
- Back up local `pc_builder_store_dev` first.
- Confirm it still has the expected 35 tables.
- Merge the 172 definitions into the attribute registry and EAV definition table.
- Upsert the 1,430 values into `product_attribute_values` using the proper typed value column. Treat `value_json` as JSON input, not as a string for JSONB fields.
- For `update_kind=VERIFIED_EXISTING_FIELD_CORRECTION`, apply only these 8 evidence-backed corrections; preserve all other existing values.
- Merge quality metadata under a separate JSONB node such as `catalogValueQualityByModel`; do not replace `verificationByModel`.
- Merge cumulative ledger/evidence/visibility without deleting other local rows.
- Do not touch product identity, offers, prices, stock, or existing image rows.
- Make the process safe to rerun.

## API + frontend acceptance
- Public API returns every `PUBLIC_ALLOWLIST` field with Vietnamese label, unit, subtype/group, `valueQuality` and `displayLabel`.
- Estimated/secondary values must show `Ước tính / Tham khảo` or `Nguồn tham khảo thứ cấp`; unresolved legacy values show `Chưa xác minh / cần đối chiếu`.
- Do not expose internal source review notes, verification workflow or private metadata.
- Render arrays/JSON objects as readable tables or lists.
- Render PC `component_details` / configuration data as a customer-facing reference BOM labelled `Cấu hình tham khảo (DEMO)`, not live stock.
- Ensure product details are dynamically rendered; no hardcoded short field lists.

## Runtime verification
- The frontend and backend may already be running. Detect current processes and reuse them; do not start duplicate servers.
- Test actual pages for CPU, GPU, motherboard, RAM, storage, PSU, case, cooler, monitor, mouse, keyboard, headset and prebuilt PC.
- For each, compare DB → API JSON → visible fields.
- Test all 150 SKUs for counts and API reachability.
- Fix application-originated network/console errors at their source; do not mute/suppress them.
- Do not finish at compile-only or HTTP 200.
- Leave the existing dev servers running for user inspection.

## Safety
- No drop/reset/recreate of database or schema.
- No full CSV import.
- No overwriting prices/offers/stock/images.
- No commit or push.
- Request password only through secure terminal input, never in chat.
