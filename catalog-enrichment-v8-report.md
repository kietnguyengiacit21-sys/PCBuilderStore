# Catalog enrichment v8 — tranche 2

Date: 2026-11-07

## Scope

- Started from the user-confirmed v7 canonical dataset (150 products × 200 columns) and v7 internal ledger (2,685 data rows × 14 columns).
- Enriched 12 motherboard models and 11 PSU models using manufacturer product/specification pages.
- No source code, schema, database, prices, inventory, warranty, product images, or checkout fields were changed.
- Three Gigabyte motherboard SKUs whose source page was revision-specific while the catalog SKU omitted board revision were intentionally left unchanged and not promoted.
- OC maximum memory speed attributes remain internal because the current schema cannot distinguish base JEDEC from OC maximum / memory-population caveats.

## Public verification counts

- Public-allowlisted technical attribute rows: 795
- Products with at least one public technical attribute: 53
- Public attribute rows by product type: {'CPU': 232, 'GPU': 304, 'MOTHERBOARD': 160, 'PSU': 99}
- Publicly covered products by product type: {'CPU': 15, 'GPU': 15, 'MOTHERBOARD': 12, 'PSU': 11}
- CPU/GPU v7 allowlist entries were preserved; this tranche adds motherboard and PSU entries only.

## Motherboards reviewed

B650M-PRO-RS, B760M-PRO-RS-D4, MAG-B760-TOMAHAWK-WIFI, PRIME-B650M-A-WIFI-II, PRIME-B760M-A-D4, PRO-B650M-A-WIFI, PRO-B760M-A-WIFI-DDR4, PRO-Z790-A-MAX-WIFI, TUF-B760-PLUS-WIFI-D4, TUF-X670E-PLUS-WIFI, TUF-Z790-PLUS-WIFI, Z790-STEEL-LEGEND-WIFI

Main corrections include:
- TUF Gaming B760-PLUS WIFI D4: max memory 192GB (not 128GB), Wi-Fi 6 / Bluetooth 5.2 (not Wi-Fi 6E / 5.3).
- MAG B760 Tomahawk WIFI: 256GB DDR5 (not 192GB).
- PRO Z790-A MAX WIFI: 256GB DDR5, 4 M.2, 6 SATA, Wi-Fi 7 / Bluetooth 5.4, ALC4080.
- Z790 Steel Legend WiFi: 5 M.2 and 8 SATA (not 3 M.2 / 4 SATA).
- PRIME B650M-A WIFI II: Wi-Fi 6 / Bluetooth 5.2 (not Wi-Fi 6E / 5.3).
- PRO B650M-A WIFI and B650M Pro RS: max memory 256GB (not 192GB).
- TUF Gaming X670E-PLUS WIFI chipset field corrected to the manufacturer's documented chipset AMD X670; it has 4 M.2 (not 3) and Wi-Fi 6E / Bluetooth 5.2.

## PSU reviewed

CP-9020248, CP-9020263, FOCUS-GX-750, FOCUS-GX-850, MAG-A650BN, MAG-A750GL-PCIE5, MAG-A850GL-PCIE5, MPE-8501-AFAAG, PS-TPD-0850FNFAGU-L, R-PM750D-FA0B, R-PX850G-FC0B

Main corrections include:
- Corsair RM750e CP-9020248: 80 PLUS Gold; +12V full 750W / 62.5A; ATX12V 2.53.
- Corsair RM850e CP-9020263: corrected cloned 750W rail data to 850W / 70.8A; 80 PLUS Gold.
- MSI MAG A650BN: +12V rail 648W / 54.0A (not 644W / 53.6A).
- MSI MAG A750GL PCIE5: +12V rail 744W / 62.0A (not 742W / 61.9A).
- MWE Gold 850 V2, DeepCool PM750D and Thermaltake GF A3 850: efficiency corrected to 80 PLUS Gold.
- DeepCool PX850G: ATX 3.0, 135mm fan and 150×160×86mm chassis dimensions.
- Seasonic FOCUS GX-750 / GX-850: +12V values corrected to 744W / 62A and 840W / 70A.
- Thermaltake GF A3 850 exact P/N: ATX 3.1 and +12V rail 850W / 70.8A. Manufacturer hold-up is >17ms, retained INTERNAL_ONLY because the current DECIMAL schema cannot represent the comparator.

## Files

- `catalog-import-150-products-enriched-v7.csv` — updated product data.
- `backend-java/src/main/resources/catalog-internal/catalog-attribute-internal-ledger.csv` — backend-only internal ledger.
- `catalog-attribute-evidence-v8.csv` — evidence rows.
- `catalog-public-attribute-visibility-v8.csv` — visibility decisions.
- `catalog-verified-attribute-values-v8.csv` — public verified values.

## Safety / rollout

- Do not put the internal ledger in frontend, public static, or client bundles.
- Do not import into PostgreSQL until the diff and the current public API behavior have been reviewed.
- No database import or runtime changes were performed as part of this file generation.

## Schema and model limits

- Product specification pages may differ by hardware revision, region or refreshed part number. Revision-specific Gigabyte motherboard rows were kept out of this tranche where the catalog SKU does not encode the revision.
- Some PSU sources document connector tables or current revisions. The changed field values are sourced at the product/model level shown in the ledger; keep fields outside the public allowlist internal if the exact regional SKU or cable revision cannot be established.
