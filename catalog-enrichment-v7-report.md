# Catalog enrichment v7 — CPU & GPU

Date: 2026-11-07

## Scope

- Updated canonical source dataset for 150 products (200 columns); this tranche only enriched the 15 CPU and 15 GPU product rows.
- Updated the private backend evidence ledger and visibility map. The ledger file remains backend-only and must not be copied into frontend/public/static assets.
- No source code, database, import, schema, price, stock, or unrelated product category was changed.

## Public allowlist result

| Product type | Products with public specs | Total products | Public attribute values |
|---|---:|---:|---:|
| CPU | 15 | 15 | 232 |
| GPU | 15 | 15 | 304 |
| Other types (unchanged) | — | 120 | 0 |
| **Total** | **30** | **150** | **536** |

Only attributes directly stated on an official exact-variant CPU or board specification page (or clearly scoped to the exact GPU silicon) were promoted to `PUBLIC_ALLOWLIST`. No verification labels, source notes, confidence values, or provenance fields are sent to customers.

## Key corrections

- BX8071512100F: bỏ AVX-512 khỏi instruction set; chỉ để SSE4.1/SSE4.2/AVX2
- BX8071512400F: bỏ AVX-512 khỏi instruction set; chỉ để SSE4.1/SSE4.2/AVX2
- BX8071513400F: bỏ AVX-512 khỏi instruction set; chỉ để SSE4.1/SSE4.2/AVX2
- BX8071514400F: bỏ AVX-512 khỏi instruction set; chỉ để SSE4.1/SSE4.2/AVX2
- BX8071514500: bỏ AVX-512 khỏi instruction set; chỉ để SSE4.1/SSE4.2/AVX2
- BX8071514600K: bỏ AVX-512 khỏi instruction set; chỉ để SSE4.1/SSE4.2/AVX2
- BX8071514600KF: bỏ AVX-512 khỏi instruction set; chỉ để SSE4.1/SSE4.2/AVX2
- BX8071513700K: bỏ AVX-512 khỏi instruction set; chỉ để SSE4.1/SSE4.2/AVX2
- BX8071514700K: bỏ AVX-512 khỏi instruction set; chỉ để SSE4.1/SSE4.2/AVX2
- BX8071514900K: bỏ AVX-512 khỏi instruction set; chỉ để SSE4.1/SSE4.2/AVX2
- BX8071514400F/BX8071514500: DDR5 maximum data rate corrected 5600 -> 4800 MT/s (data rate remains internal because DDR4/DDR5 have different limits).
- 100-100000927BOX Ryzen 5 5600: Tjmax corrected 95 -> 90 °C; instruction extensions expanded from AMD official page.
- 100-100000910WOF Ryzen 7 7800X3D: Tjmax corrected 95 -> 89 °C; Zen 4 supported extensions expanded.
- GV-N4060WF2OC-8GD: output changed to 2 DisplayPort + 2 HDMI; board height 41 mm; included accessories normalized to the exact listed Quick guide.
- DUAL-RTX4060TI-O8G: recommended PSU corrected to 650 W.
- GV-N406TEAGLE-OC-8GD: boost 2550 MHz, height 41 mm, PSU 500 W, output 2 DisplayPort + 2 HDMI; included accessories normalized to exact listed Quick guide; PCIe link-width value x8 retained internally for source-scope review.
- RTX4070SUPERVENTUS2X12GOC: boost corrected to 2505 MHz, recommended PSU 650 W.
- GV-N407SWF3OC-12GD: recommended PSU corrected to 700 W.
- 11324-01-20G Sapphire Pulse RX 7600: PCIe 4.0 x8, 3 DisplayPort + 1 HDMI, TBP 185 W, dimensions 240 x 107.1 x 44.07 mm, 2-slot form factor.
- RX7600-8G-F PowerColor Fighter: corrected PCIe link width to x8 and outputs to 3 DisplayPort + 1 HDMI (official page result; detailed dimensions/power remain internal).
- 11335-04-20G Sapphire Pulse RX 7700 XT: boost 2544 MHz, TBP 230 W, dimensions 280 x 128.75 x 52.57 mm, 2.5-slot, 2 fans.
- RX7800XT-SL-16GO ASRock Steel Legend: boost 2520 MHz, outputs 3 DisplayPort 2.1 + 1 HDMI 2.1, PSU 800 W, 2.8-slot, triple fan.
- 11330-01-20G Sapphire Nitro+ RX 7800 XT: TBP 288 W, dimensions 320 x 134.85 x 61.57 mm, 3-slot, triple fan.

## Deliberately internal fields

- Intel hybrid CPU base clocks: one schema field cannot describe separate P-core and E-core frequencies.
- Intel CPU memory speed: current schema stores one integer while Intel ARK lists separate DDR4 and DDR5 rates.
- AMD max-turbo/PPT values: not published as a directly equivalent max-turbo-power spec on the exact pages; kept internal.
- Derived GPU memory bandwidth / memory clock / base-clock/reference values, any ambiguous board-power ranges, and fields not explicitly listed on the exact model page remain `INTERNAL_ONLY`.
- The PowerColor Fighter RX 7600 manufacturer page could not be fetched during this pass. Its limited attributes use the previously retrieved official manufacturer result; other fields remain internal for further review.

## Files

- `catalog-import-150-products-enriched-v6.csv` — canonical product dataset.
- `backend-java/src/main/resources/catalog-internal/catalog-attribute-internal-ledger.csv` — backend-only internal ledger / public allowlist.
- `catalog-attribute-evidence-v7.csv` — complete evidence snapshot.
- `catalog-public-attribute-visibility-v7.csv` — visibility policy snapshot.
- `catalog-verified-attribute-values-v7.csv` — verified public values only.

## Official source URLs

- `BX8071512100F` — https://www.intel.com/content/www/us/en/products/sku/132223/intel-core-i312100f-processor-12m-cache-up-to-4-30-ghz/specifications.html
- `BX8071512400F` — https://www.intel.com/content/www/us/en/products/sku/134587/intel-core-i512400f-processor-18m-cache-up-to-4-40-ghz/specifications.html
- `BX8071513400F` — https://www.intel.com/content/www/us/en/products/sku/230501/intel-core-i513400f-processor-20m-cache-up-to-4-60-ghz/specifications.html
- `BX8071514400F` — https://www.intel.com/content/www/us/en/products/sku/236777/intel-core-i5-processor-14400f-20m-cache-up-to-4-70-ghz/specifications.html
- `BX8071514500` — https://www.intel.com/content/www/us/en/products/sku/236784/intel-core-i5-processor-14500-24m-cache-up-to-5-00-ghz/specifications.html
- `BX8071514600K` — https://www.intel.com/content/www/us/en/products/sku/236799/intel-core-i5-processor-14600k-24m-cache-up-to-5-30-ghz/specifications.html
- `BX8071514600KF` — https://www.intel.com/content/www/us/en/products/sku/236778/intel-core-i5-processor-14600kf-24m-cache-up-to-5-30-ghz/specifications.html
- `BX8071513700K` — https://www.intel.com/content/www/us/en/products/sku/230500/intel-core-i713700k-processor-30m-cache-up-to-5-40-ghz/specifications.html
- `BX8071514700K` — https://www.intel.com/content/www/us/en/products/sku/236783/intel-core-i7-processor-14700k-33m-cache-up-to-5-60-ghz/specifications.html
- `BX8071514900K` — https://www.intel.com/content/www/us/en/products/sku/236773/intel-core-i9-processor-14900k-36m-cache-up-to-6-00-ghz/specifications.html
- `100-100000927BOX` — https://www.amd.com/en/support/downloads/drivers.html/processors/ryzen/ryzen-5000-series/amd-ryzen-5-5600.html
- `100-100000065BOX` — https://www.amd.com/en/products/processors/desktops/ryzen/5000-series/amd-ryzen-5-5600x.html
- `100-100001015BOX` — https://www.amd.com/en/support/downloads/drivers.html/processors/ryzen/ryzen-7000-series/amd-ryzen-5-7600.html
- `100-100000592BOX` — https://www.amd.com/en/support/downloads/drivers.html/processors/ryzen/ryzen-7000-series/amd-ryzen-7-7700.html
- `100-100000910WOF` — https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-7-7800x3d.html
- `DUAL-RTX4060-O8G` — https://www.asus.com/vn/motherboards-components/graphics-cards/dual/dual-rtx4060-o8g/techspec/
- `RTX4060VENTUS2XBLACK8GOC` — https://vn.msi.com/Graphics-Card/GeForce-RTX-4060-VENTUS-2X-BLACK-8G-OC/Specification
- `GV-N4060WF2OC-8GD` — https://www.gigabyte.com/vn/Graphics-Card/GV-N4060WF2OC-8GD/sp
- `ZT-D40600E-10M` — https://www.zotac.com/vn/product/graphics_card/zotac-gaming-geforce-rtx-4060-8gb-twin-edge
- `DUAL-RTX4060TI-O8G` — https://www.asus.com/vn/motherboards-components/graphics-cards/dual/dual-rtx4060ti-o8g/techspec/
- `RTX4060TIVENTUS2XBLACK8GOC` — https://vn.msi.com/Graphics-Card/GeForce-RTX-4060-Ti-VENTUS-2X-BLACK-8G-OC/Specification
- `GV-N406TEAGLE-OC-8GD` — https://www.gigabyte.com/vn/Graphics-Card/GV-N406TEAGLE-OC-8GD/sp
- `DUAL-RTX4070S-O12G` — https://www.asus.com/vn/motherboards-components/graphics-cards/dual/dual-rtx4070s-o12g/techspec/
- `RTX4070SUPERVENTUS2X12GOC` — https://vn.msi.com/Graphics-Card/GeForce-RTX-4070-SUPER-12G-VENTUS-2X-OC/Specification
- `GV-N407SWF3OC-12GD` — https://www.gigabyte.com/Graphics-Card/GV-N407SWF3OC-12GD-rev-11/sp
- `11324-01-20G` — https://www.sapphiretech.com/en/consumer/pulse-radeon-rx-7600-8g-gddr6
- `RX7600-8G-F` — https://www.powercolor.com/product-detail110.htm
- `11335-04-20G` — https://www.sapphiretech.com/en/consumer/pulse-radeon-rx-7700-xt-12g-gddr6
- `RX7800XT-SL-16GO` — https://www.asrock.com/Graphics-Card/AMD/Radeon%20RX%207800%20XT%20Steel%20Legend%2016GB%20OC/index.asp
- `11330-01-20G` — https://www.sapphiretech.com/en/consumer/nitro-radeon-rx-7800-xt-16g-gddr6

## Safety

This package does not include any instruction to run an import. Do not import automatically. First review the diff and verify the live database target; then decide explicitly whether to run the project importer.
