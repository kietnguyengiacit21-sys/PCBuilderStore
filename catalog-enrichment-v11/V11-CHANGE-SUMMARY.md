# V11 change summary

## Deliverable contents

- Existing technical attribute definitions: 176
- New subtype-specific Accessory definitions: 72
- Resulting registry: 248
- Expanded full CSV: 150 products × 272 columns (24 base + 248 technical fields)
- Verified attribute value/correction delta: 153 SKU/attribute rows
- Full merged evidence, visibility policy and internal ledger: 2800 / 2800 / 2800 rows
- SKU audit: 150 products

## Accessory coverage after V11 data patch

| SKU | Product | Applicable fields | Populated | Public-allowlisted |
|---|---|---:|---:|---:|
| `910-005802` | G102 LIGHTSYNC Gaming Mouse | 15 | 9 | 8 |
| `910-005472` | G502 HERO Gaming Mouse | 15 | 11 | 8 |
| `910-006630` | G PRO X Superlight 2 | 15 | 12 | 9 |
| `RZ01-03850100` | DeathAdder Essential | 15 | 11 | 8 |
| `RZ03-03541900` | BlackWidow V3 | 19 | 12 | 6 |
| `AULA-F75` | F75 Mechanical Keyboard | 19 | 13 | 12 |
| `K8P` | K8 Pro Mechanical Keyboard | 19 | 15 | 14 |
| `24G2SP` | 24G2SP Gaming Monitor | 40 | 37 | 36 |
| `VG27AQ1A` | TUF Gaming VG27AQ1A | 40 | 32 | 31 |
| `727A8AA` | Cloud III Gaming Headset | 22 | 22 | 21 |

## Important corrections

- AOC 24G2SP typical brightness is corrected from 250 to 300 nits using AOC's official specifications.
- Logitech G PRO X Superlight 2 is corrected from 32,000 to 44,000 DPI and from 2,000 to 8,000 Hz polling rate using Logitech support specifications.
- AOC 24G2SP and ASUS VG27AQ1A now include many more manufacturer-sourced display fields.
- Mouse, keyboard, and headset records receive additional source-backed fields, with variant-dependent data stored in JSON/text rather than presented as one universal value.
- Ten prebuilt PC records have their existing `configuration_items` and `configuration_summary` allowlisted for customer-facing **reference/demo** display; internal BOM workflow fields remain private.

## Important limitation

This package does not magically populate every blank field. The audit lists the remaining missing fields per SKU. Existing V10 data for CPU, GPU, motherboard, RAM, storage, PSU, case and cooler remains in place. The Agent must verify that current public values are returned by API and rendered by the frontend. Do not claim total catalog completeness until the API/UI audit passes.
