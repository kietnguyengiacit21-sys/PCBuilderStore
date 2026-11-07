# PC Builder Store — Catalog data handoff v6

## Files

- `catalog-import-150-products-enriched-v5.csv`: canonical product import input (150 products, 200 columns).
- `backend-java/src/main/resources/catalog-internal/catalog-attribute-internal-ledger.csv`: backend-only attribute ledger. This file combines the catalog value, verification status, public visibility decision, evidence URL/locator, scope, and review note for each model/attribute row.
- `backend-java/src/main/resources/catalog-internal/catalog-image-sources.csv`: image research/source ledger for added image URLs.
- `backend-java/src/main/resources/catalog-internal/catalog-verified-attribute-values.csv`: preserved snapshot of the 57 previously verified exact-variant values.

## Current content audit

- Products: 150
- Product import columns: 200
- Attribute ledger rows: 2685
- Populated attribute values in ledger: 2484
- Empty / not-applicable / not-yet-populated attribute rows: 201
- Verification status: 57 VERIFIED_EXACT_VARIANT; 2628 NEEDS_REVIEW
- Public visibility policy: 57 PUBLIC_ALLOWLIST; 2628 INTERNAL_ONLY
- Product image URLs in import CSV: 246

## Security / presentation rule

Everything under `backend-java/src/main/resources/catalog-internal/` is internal backend data, not customer content.
Do not copy these files into `frontend/public`, a static web directory, or a customer download endpoint.
Do not serialize these ledger fields into customer API responses.
Customer-facing APIs should return only explicitly approved product attributes according to `public_visibility=PUBLIC_ALLOWLIST`; fail closed for absent/unknown policy entries.
Never expose verification status, evidence URLs/locators, specification scope, review notes, internal model/attribute keys, or completeness metadata to customers.
Admin-only endpoints may read this information only after authorization is implemented.

## Important implementation note

The product import CSV contains catalog attribute values, including provisional values. The separate internal ledger is the authority for whether each model/attribute can be shown to customers. The importer/API must join this policy by `(model_code, attribute_code)` and must not infer public visibility from the fact that a value is populated.

The image ledger contains researched URLs; local browser/hotlink load has not been confirmed for every URL. Keep failed images out of the gallery rather than using unrelated substitutes.

No schema change, database import, or code modification is performed by this package.
