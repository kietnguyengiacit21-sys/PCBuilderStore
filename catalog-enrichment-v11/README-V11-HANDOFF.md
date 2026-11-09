# PC Builder Store Catalog V11 handoff

This package contains a non-destructive catalog enrichment and API/UI handoff.

## Important

- Do not reset the PostgreSQL database.
- Do not run a full catalog import with the V11 wide CSV.
- The runtime value patch is only `catalog-v11-verified-attribute-values.csv` (153 rows).
- The 72 new definitions are additions to the existing 176 registry definitions.
- The V11 runtime ledger is `catalog-attribute-internal-ledger-v11.csv`.
- The PC component lists are shop-curated reference builds. They should be shown as "Cấu hình tham khảo (DEMO)", not as manufacturer-certified BOMs.

## Give this to VS Code Agent

1. Extract this ZIP into a folder inside the PCBuilderStore workspace (for example `catalog-v11-handoff`).
2. Open `CATALOG-V11-AGENT-BRIEF.md`.
3. Tell Copilot Agent: **"Read and execute CATALOG-V11-AGENT-BRIEF.md. Work directly in this repository and local PostgreSQL. Make the required API/frontend changes and apply only the v11 attribute delta. Do not reset the database, do not bulk re-import the catalog, and do not commit/push."**
4. The Agent may request the PostgreSQL password in its secure terminal prompt. Do not paste the password into chat.

## What is included

- 72 Accessory attribute definitions.
- 153 verified attribute value/correction rows from manufacturer documentation and official product support sources.
- Full merged V11 evidence, public-visibility policy, and runtime internal ledger.
- Full expanded CSV (150 × 272) for reference/future importer use only.
- A per-SKU coverage audit and a database-capacity assessment.

The package does not change the user's live database or repository by itself. The Agent must apply it.
