# Catalog enrichment v9 — RAM + Storage tranche

Date: 2026-11-07

## Scope

- Started from the user-confirmed v8 canonical dataset (150 products × 200 columns) and v8 backend-only ledger (2,685 data rows × 14 columns).
- Reviewed 20 RAM and 20 storage SKUs using exact product/SKU manufacturer pages or datasheets.
- Corrected confirmed catalog errors, and promoted only fields directly supported by a manufacturer source for the exact product variant.
- Unverified fields remain in the private backend ledger as `NEEDS_REVIEW` / `INTERNAL_ONLY`; no provenance/review metadata is designed for the customer API.
- No database import, source-code changes, schema changes, price, price-source, warranty or product-image changes were performed.

## Corrections

- Kingston FURY Beast DDR4 16GB and 32GB kit timings corrected to 16-20-20; prior 16-18-18 tuple did not match those exact SKUs.
- T-FORCE Vulcan Z TLZGD416G3200HC16F01 timings corrected to CL16-20-20-40.
- Kingston FURY Beast DDR5 KF556C40BB-16 profile corrected to Intel XMP 3.0 only; KF560C36BBEK2-32 corrected to AMD EXPO only.
- G.SKILL Flare X5 and Trident Z5 Neo timings expanded to full source values 36-36-36-96 and 30-38-38-96.
- T-FORCE Delta RGB DDR5 timings expanded to 38-38-38-78.
- ADATA XPG Lancer AX5U6000C4016G-DCLABK corrected from an assumed 32GB (2×16GB) kit to one 16GB DIMM, matching its exact part number; product name corrected.
- Samsung 990 EVO Plus 2TB read speed corrected to 7,250 MB/s; random reads/writes corrected per capacity; numeric cache size removed because manufacturer specifies HMB, not dedicated DRAM cache.
- Samsung 990 PRO random read IOPS corrected by capacity (1TB 1.2M; 2TB 1.4M); controller name and 2TB model properties aligned to the datasheet.
- WD_BLACK SN850X 2TB corrected to 2TB capacity, 6,600 MB/s write, 1.2M/1.1M random IOPS, and 1,200 TBW.
- Kingston KC3000 values corrected by exact capacity: 1TB/2TB read-write, random IOPS, 800/1,600 TBW, 2M-hour MTBF and physical dimensions/weights.
- Kingston NV3 corrected to 2TB write speed 5,000 MB/s and 640 TBW; 1TB/2TB weight and 2M-hour MTBF aligned to manufacturer specification.
- Crucial P3 Plus 2TB corrected to 2,000GB nominal, 4,200 MB/s sequential write and 440 TBW.
- Crucial T500 2TB corrected to 2,000GB nominal, 7,400/7,000 MB/s, 1.18M/1.44M random IOPS and 1,200 TBW.
- ADATA LEGEND 960 MAX 1TB/2TB sequential write corrected from 6,000 to 6,800 MB/s.
- Lexar NM790 random write corrected to 900,000 IOPS; 2TB nominal capacity, dimensions, 6g weight, TBW and MTBF aligned to manufacturer sheet.
- Seagate FireCuda 530 2TB sequential write corrected from 6,000 to 6,900 MB/s; 1TB/2TB physical thickness and weight corrected from the exact-capacity table.

## Public verification totals

- Total public-allowlisted technical attribute rows: **1252** (was 795 in v8; new RAM + STORAGE public entries: 457).
- Total products with at least one public technical attribute: **90**.

| Product type | Products in catalog | Products with public attributes | Public attributes |
|---|---:|---:|---:|
| ACCESSORY | 10 | 0 | 0 |
| CASE | 15 | 0 | 0 |
| COOLER | 15 | 0 | 0 |
| CPU | 15 | 15 | 232 |
| GPU | 15 | 15 | 304 |
| MOTHERBOARD | 15 | 12 | 160 |
| PC | 10 | 0 | 0 |
| PSU | 15 | 11 | 99 |
| RAM | 20 | 17 | 201 |
| STORAGE | 20 | 20 | 256 |

## New tranche by SKU

- **RAM:** 17 models received public attributes, 201 public attribute rows.
  - AX5U6000C4016G-DCLABK, CMH32GX5M2B6000C36, CMK16GX4M1E3200C16, CMK32GX4M2E3200C16, CMK32GX5M2E6000C36, F4-3200C16S-16GVK, F5-6000J3038F16GX2-TZ5NR, F5-6000J3636F16GX2-FX5, FF3D532G6000HC38ADC01, KF432C16BB/16, KF432C16BB/8, KF432C16BBK2/32, KF556C40BB-16, KF560C36BBEK2-32, PVV532G600C36K, TF3D432G3200HC16CDC01, TLZGD416G3200HC16F01
- **STORAGE:** 20 models received public attributes, 256 public attribute rows.
  - ALEG-960M-1TCS, ALEG-960M-2TCS, CT1000P3PSSD8, CT1000T500SSD8, CT2000P3PSSD8, CT2000T500SSD8, LNM790X001T-RNNNG, LNM790X002T-RNNNG, MZ-V9P1T0B/AM, MZ-V9P2T0B/AM, MZ-V9S1T0B/AM, MZ-V9S2T0B/AM, SKC3000D/2048G, SKC3000S/1024G, SNV3S/1000G, SNV3S/2000G, WDS100T2X0E, WDS200T2X0E, ZP1000GM3A013, ZP2000GM3A013

## Data handling

- The ADATA XPG Lancer model code `AX5U6000C4016G-DCLABK` identifies a 16GB module; it was not treated as a dual-module retail kit.
- Patriot Viper Venom DDR5 exact-SKU sheet confirms 32GB (2×16GB), 6000MT/s, 36-36-36-76 at 1.35V. The sheet only lists on-die ECC; no system-ECC, registered/unbuffered, or DIMM-form-factor claim was promoted from that field.
- Samsung 990 EVO Plus source labels cache memory as HMB (Host Memory Buffer); no numeric `cache_mb` was retained for those two SKUs.
- Product source sheets do not disclose some controller, NAND subtype, DRAM size, IOPS, or overclock profile fields for certain SKUs. Those values remain internal-only rather than being inferred from neighbouring models.
- The `speed_mhz` RAM field remains internal-only; customer-facing frequency is represented by the manufacturer-rated `data_rate_mt_s` field.

## Files

- `catalog-import-150-products-enriched-v8.csv` — canonical product CSV update.
- `backend-java/src/main/resources/catalog-internal/catalog-attribute-internal-ledger.csv` — private backend ledger.
- `catalog-attribute-evidence-v9.csv` — row-level evidence including internal-only values and review notes.
- `catalog-public-attribute-visibility-v9.csv` — API visibility policy matrix.
- `catalog-verified-attribute-values-v9.csv` — exact-SKU verified public values.

## Verification

- Product CSV: 150 data rows, 200 columns.
- Internal ledger/evidence/visibility: 2,685 data rows × 14/12/5 columns.
- Verified public values: 1252 rows; every row has an HTTPS manufacturer source and `VERIFIED_EXACT_VARIANT` status. New RAM/STORAGE entries use `EXACT_MODEL_SKU` scope; existing CPU/GPU/board policies retain their original scope labels.
- Protected fields (prices, price provenance, warranty, image URLs/alts) are byte-for-byte unchanged from v8.
- No database writes/imports, source-code changes, migrations, commits or pushes.

## Rollout

Replace only the canonical product CSV at project root and the internal ledger at `backend-java/src/main/resources/catalog-internal/catalog-attribute-internal-ledger.csv`. Do not copy the ledger into frontend/public/static. Review the diff before any DB import.

## Known limits

- Crucial Pro DDR4/DDR5 RAM and the G.SKILL Ripjaws V 32GB kit do not receive public allowlist entries in this tranche because their exact SKU data could not be reconciled to a sufficiently precise primary-source spec page. Their catalog values remain internal pending verification.
- Some source documents are family sheets where individual timings are tied to a model number; only exact rows and fields were promoted. Fields absent from the vendor data are not inferred.
