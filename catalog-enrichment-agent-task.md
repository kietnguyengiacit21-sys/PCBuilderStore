# PC Builder Store — Catalog Data + Images Completion Task

## Goal (highest priority)
Complete the product catalog for the school capstone so the local website looks and behaves like a real PC parts store: every current SKU must have a product-specific reference price, a rich set of technical specs, a useful primary product image for listing cards, and multiple matching images in the product detail gallery. Technical data must power the existing part-comparison table. Prebuilt PCs must have structured, identifiable component lists so the existing PC comparison can compare their builds.

This is a demo/academic project. Reference prices are illustrative snapshots, not live quotes. Do **not** spend time on price/spec verification workflows, approval queues, or verification metadata. Do not add schema tables or columns. Preserve the existing 35-table PostgreSQL schema and all unrelated local edits.

## Existing repository facts already audited
- Branch/worktree: `migration/java-spring-boot`; keep all existing local changes and untracked files. Do not reset, clean, switch branches, commit, or push.
- Product source: `seed/catalog-150-products.csv` (150 unique products): CPU 15, GPU 15, MOTHERBOARD 15, RAM 20, STORAGE 20, PSU 15, CASE 15, COOLER 15, PC 10, ACCESSORY 10.
- The current seed has zero product image URLs. Prices are currently one repeated demo amount per product type. Technical spec JSON is sparse (typically 1–4 fields per part).
- Existing field dictionary: `backend-java/src/main/resources/catalog-attribute-definitions.csv`, 176 fields across all 10 product types. Extend only if a truly necessary field is missing; do not duplicate definitions.
- Existing backend catalog API reads typed EAV fields from `product_attribute_values` and images from `product_images`.
- Existing front end already has product cards, product detail gallery/lightbox (`ProductImageGallery`), and same-type comparison (max 4 parts) using `SpecificationComparison`.
- Existing PC compare component (`PCConfigurationComparison`) only displays a BOM when `specifications.configuration_items` is an array of objects containing `component_type` and `model_code` (optional `product_name`). Existing PC rows currently only have `configuration_summary` and `bom_status: PENDING`, so PC build comparison currently has no useful BOM data.
- Do not use the `catalog-attribute-evidence.csv` file as a data source for the 150 products: it has 2,685 rows but 2,628 rows are blank/NEEDS_REVIEW; only 57 populated values are for 3 ASUS GPU SKUs. The separate verification workflow is deferred.

## Required work

### A. Specs for all 150 existing SKUs
For each product in `seed/catalog-150-products.csv`:
1. Research the exact SKU/model and correct variant using the manufacturer specification page first; use Phong Vũ product/category pages for a Vietnam market reference price. If Phong Vũ has no matching price, find another Vietnam retailer for the same exact SKU. If no exact price is available, use a clearly-labelled approximate reference price based on a close comparable product; never present it as a live offer.
2. Fill the existing `specifications_json` / typed EAV fields with every relevant field available from the existing 176 definitions. Use numbers for numeric attributes, booleans for boolean attributes, arrays/objects for JSON attributes, and consistent units. Do not write all specs as arbitrary strings.
3. Ensure the key comparison fields are present for every item where applicable:
   - CPU: socket, core_count, thread_count, base_clock_ghz, max_boost_clock_ghz, cache_l2_mb/cache_l3_mb, tdp_watt/max_turbo_power_watt, integrated_graphics, memory_types_supported, max_memory_data_rate_mt_s, pcie_generation.
   - GPU: gpu_chip, vram_gb, memory_type, memory_bus_width_bit, memory_data_rate_gbps, base_clock_mhz/boost_clock_mhz, processor_unit_count, pcie_generation/link_width, board_power_watt, recommended_psu_watt, power_connectors, board_length_mm, slot_thickness, display_outputs.
   - Motherboard: socket, chipset, form_factor, memory_type, memory_slot_count, max_memory_gb, pcie_slots, m2_slot_count, sata_port_count, usb_ports, ethernet_speed_gbps, wireless_standards, bluetooth_version, audio_codec.
   - RAM: capacity_gb, module_capacity_gb, modules_per_kit, memory_type, data_rate_mt_s (do not confuse it with MHz), cas_latency_cycles, memory_timings_cycles, voltage_v, memory_profiles, ecc, registered, form_factor, module_height_mm, lighting.
   - Storage: drive_type, capacity_gb, form_factor, interface, protocol, pcie_generation, nand_type, controller, dram_cache, cache_mb, sequential_read_mb_s, sequential_write_mb_s, random_read_iops, random_write_iops, endurance_tbw, mtbf_hours.
   - PSU: wattage, efficiency_rating, atx_version, modularity, rail_12v_output_watt/current, connectors, input_voltage_range_v, fan_size_mm, protections, dimensions_mm, weight_kg.
   - Case: case_form_factor, motherboard_form_factors, max_gpu_length_mm, max_cooler_height_mm, max_psu_length_mm, expansion_slot_count, drive_bays, included_fans, fan_mounts, radiator_support, front_io_ports, dimensions_mm, weight_kg.
   - Cooler: cooler_type, supported_sockets, cooler_height_mm or radiator_dimensions_mm, fan_size/count/speed, airflow_cfm, static_pressure_mmh2o, noise_db_a, pump_speed_rpm, connector_types, dimensions_mm, weight_kg.
   - Accessories: fill subtype-specific fields (mouse DPI/polling/buttons/connectivity; keyboard layout/switch/connectivity/keys/backlight; monitor size/resolution/refresh/response/panel/brightness/inputs; headset driver/impedance/mic/connectivity).
4. Do not guess a precise technical value when sources do not provide it. Prefer a missing value over a fabricated spec. Add product-specific source URL to the sidecar CSV so values can be updated later.

### B. Reference prices for every SKU
- Replace the repeated category-level demo values with product-specific reference prices for all existing 150 SKUs.
- Primary reference: Phong Vũ exact listing. Secondary Vietnam retailers only if Phong Vũ has no exact listing.
- Use one snapshot date: 2026-11-06; include `price_reference_url`, `price_reference_store`, `price_checked_at`, and `price_is_estimate` in a sidecar CSV (do not add DB schema columns).
- Keep the existing demo offer identifiers/status semantics so checkout still behaves as a demo. Make the UI clearly say “Giá tham khảo” or “Giá minh họa”, not a live retail price.
- Do not copy the same category price to every SKU.

### C. Images for every product (cards + details)
- For each SKU, find exact matching product images. Prefer manufacturer official product gallery/CDN, then the exact Phong Vũ product listing, then another Vietnam retailer with the exact matching model.
- Target: 1 clear primary image for every SKU and 3–5 images for product details when the original gallery provides them. Do not use unrelated category images or generic placeholders as product photos. Never assign a different variant's image to a product.
- Prefer downloading images into `frontend/public/catalog/<model-code>/` and converting/resizing to optimized WebP (keep useful resolution, square/near-square for cards). Add a source manifest `seed/catalog-image-sources.csv` with model_code, local_path, source_url, source_name, is_primary, sort_order, alt_text.
- Store the local paths in the existing `product_images` table using `/catalog/<model-code>/<filename>.webp`.
- If local paths are used, update the backend image URL mapper safely to allow only normalized `/catalog/...` paths in addition to HTTPS; reject `..`, protocol-relative paths, other schemes, and traversal. Existing `ProductArtwork` and `ProductImageGallery` should then render the same images without redesign.
- If a source has fewer than 3 valid images, use all that exist and report it; do not manufacture duplicate angles.

### D. Prebuilt PCs: 10 complete, comparable builds
- Fill all ten `PC` products with a real, structured configuration. `configuration_items` must be JSON array entries shaped exactly like:
  `{ "component_type": "CPU", "model_code": "<existing SKU>", "product_name": "<name>" }`
  Use valid product_type codes from the catalog, and actual `model_code` values that exist in the catalog. Include CPU, GPU, MOTHERBOARD, RAM, STORAGE, PSU, COOLER, CASE where appropriate.
- Populate any PC-specific fields available from the existing PC definitions, including `configuration_summary` and `system_dimensions_mm` if sourced.
- First check whether all BOM components are already in the 150-product catalog. If a PC design references a missing component model (e.g. an older GPU, motherboard, APU, or PSU), either (a) add that component as an additional properly researched catalog product with full specs and images, or (b) recompose that demo PC using compatible exact models already in the catalog. Do not reference non-existent model codes. Report any additions beyond the existing 150 SKUs.
- Keep the existing PC product SKUs unless there is a compelling data reason; each build should be distinct by purpose/tier (office, entry gaming, budget gaming, mainstream gaming, mid/high gaming, creator/workstation).
- The frontend's `PCConfigurationComparison` must work immediately for two or more PCs selected for comparison. Check the BOM rows appear in the UI.

### E. Comparison readiness
- Do not rewrite the existing comparison UX unless required for the data shape. It already supports same-type comparison of up to four products and renders field differences from EAV values.
- Verify every product's comparison table renders its relevant fields; field definitions should remain grouped with meaningful labels/units.
- Verify the ten PC products render their component BOM comparison. If a field exists for both products and differs, it must visibly highlight the difference; identical fields may be hidden using the existing toggle.
- Do not introduce compatibility claims or a compatibility engine; this is product/spec comparison, not a certified compatibility checker.

### F. Database / import / tests
- Preserve the existing PostgreSQL schema (35 tables), no new table/column/migration.
- Generate one idempotent PostgreSQL import script that UPSERTs existing `product_attribute_definitions`, typed `product_attribute_values`, `product_images`, and the existing demo offers' prices. Use exact existing products via `model_code` joins; do not rely on surrogate IDs. Preserve offers/stock/warranty and order/customer data; update only price and relevant product specs/images.
- Scope SQL to `pc_builder_store_dev` (or the explicit dev DB name used by the project) and fail fast if the expected 35 catalog schema tables are not present.
- Add a before/after QA report with counts: 150+ products, 150 primary images, total gallery images, per-type spec coverage, products with 0 missing key comparison fields, all 10 PC BOMs valid, product-specific prices count, unresolved/missing data count.
- Test backend Maven tests, frontend `npm run build`, and API endpoints for product list/detail/images/specifications. Verify `product_images` paths resolve from the Vite app; do not claim browser-tested unless actually tested.
- Do not run the import automatically. First prepare the SQL and QA report, then clearly tell me the exact command to run the import. Do not commit or push.

## Known research starting points (Vietnam retail pages; use exact SKU matching)
- Phong Vũ CPU Intel category: https://phongvu.vn/c/cpu-intel
- Phong Vũ CPU AMD category: https://phongvu.vn/c/cpu-amd
- Phong Vũ GPU RTX 4060 series: https://phongvu.vn/c/vga-rtx-4060
- Phong Vũ GPU RTX 40 series: https://phongvu.vn/c/vga-card-man-hinh-4000-series
- Phong Vũ motherboard AMD AM5: https://phongvu.vn/c/mainboard-amd-am5
- Phong Vũ PSU 750W: https://phongvu.vn/c/nguon-may-tinh-750w
- Existing `market_reference_url` values in the seed point to Phong Vũ's linh kiện category, but those are not product-specific citations; replace them with exact product URLs where found.

## Research examples already found (starting evidence; re-check current exact listing before writing)
- Intel i3-12100F: Phong Vũ ~2,749,000 VND; exact manufacturer specs: 4 cores/8 threads, up to 4.30GHz, 12MB L3, 5MB L2, 58W base, 89W max turbo, LGA1700, DDR4-3200/DDR5-4800. Manufacturer URL: https://www.intel.vn/content/www/vn/vi/products/sku/132223/intel-core-i312100f-processor-12m-cache-up-to-4-30-ghz/specifications.html
- Intel i5-12400F: Phong Vũ ~4,390,000 VND; 6 cores/12 threads, 2.5–4.4GHz, 18MB, LGA1700.
- Intel i5-13400F: Phong Vũ listing ~5,090,000 VND; 10 cores/16 threads, 2.5–4.6GHz, 20MB, LGA1700.
- Intel i5-14400F: Phong Vũ ~6,290,000 VND; 10 cores/16 threads, up to 4.7GHz, 20MB, LGA1700.
- Intel i5-14500: Phong Vũ ~7,590,000 VND; 14 cores/20 threads, up to 5.0GHz, 24MB.
- Intel i5-14600K: Phong Vũ ~7,890,000 VND; 14 cores/20 threads, up to 5.3GHz, 24MB.
- Intel i5-14600KF: Phong Vũ ~7,590,000 VND (re-check exact current listing).
- Intel i7-13700K: Phong Vũ ~11,190,000 VND; 16 cores/24 threads, up to 5.4GHz, 30MB.
- Intel i7-14700K: Phong Vũ ~12,490,000 VND; 20 cores/28 threads, up to 5.6GHz.
- Intel i9-14900K: Phong Vũ ~16,490,000 VND; 24 cores/32 threads, up to 6.0GHz, 36MB.
- AMD Ryzen 5 5600: Phong Vũ ~3,729,000 VND; 6 cores/12 threads, 3.5–4.4GHz, 32MB, AM4.
- AMD Ryzen 5 5600X: Phong Vũ ~4,390,000 VND; 6 cores/12 threads, 3.7–4.6GHz, 32MB, AM4.
- AMD Ryzen 5 7600: Phong Vũ ~5,789,000 VND; 6 cores/12 threads, 3.8–5.1GHz, 32MB, AM5.
- AMD Ryzen 7 7700: Phong Vũ ~9,090,000 VND; 8 cores/16 threads, boost up to 5.3GHz, 32MB, AM5.
- AMD Ryzen 7 7800X3D: Phong Vũ ~12,490,000 VND; 8 cores/16 threads, 4.2–5.0GHz, 96MB, AM5.
- MSI RTX 4060 Ventus 2X Black 8G OC: Phong Vũ ~8,900,000 VND; 8GB GDDR6, 128-bit, boost 2490MHz, one 8-pin. Product URL: https://phongvu.vn/vga-msi-rtx-4060-ventus-2x-black-8g-oc--s230604030
- Gigabyte RTX 4060 Windforce OC 8G: 8GB GDDR6 17Gbps, 128-bit, 3072 CUDA, 2475MHz, 192x120x41mm, 450W PSU recommendation, one 8-pin. URL: https://phongvu.vn/card-man-hinh-vga-gigabyte-geforce-rtx-4060-windforce-oc-8g--s240100163
- Gigabyte RTX 4060 Ti Eagle OC 8G: 8GB GDDR6, 128-bit, boost 2550MHz, one 8-pin; ~12,490,000 VND. URL: https://phongvu.vn/vga-gigabyte-rtx-4060-ti-eagle-oc-8g--s230501529
- Gigabyte RTX 4070 SUPER Windforce OC 12G: 12GB GDDR6X, boost 2505MHz, one 16-pin; ~19,490,000 VND. URL: https://phongvu.vn/vga-gigabyte-rtx-4070-super-windforce-oc-12g--s240101717
- ASUS Dual RTX4070 SUPER official tech spec says 2.56-slot thickness (not 2.5).
- ASUS TUF Gaming B760-PLUS WIFI D4: LGA1700/B760, ATX, 4 DDR4 up to 128GB, 4 SATA, 3 M.2, HDMI+DP; ~5,890,000 VND. URL: https://phongvu.vn/mainboard-asus-tuf-gaming-b760-plus-wifi-d4--s230300025
- Gigabyte B760M DS3H DDR4: LGA1700/B760, mATX, 4 DDR4 up to 128GB, 4 SATA, 2 M.2; ~2,849,000 VND.
- Gigabyte B650 AORUS ELITE AX: AM5/B650, ATX, 4 DDR5 up to 128GB, 4 SATA, 3 M.2, HDMI+DP; ~7,490,000 VND.
- Samsung 990 EVO Plus 1TB: ~7,190,000 VND, PCIe Gen4/5 NVMe, sequential read/write 7150/6300MB/s. URL: https://phongvu.vn/o-cung-ssd-samsung-990-evo-plus-1tb-nvme-pcie-gen-4-mz-v9s1t0bw--s250115742
- Samsung 990 PRO 1TB: ~8,290,000 VND; PCIe Gen4x4 NVMe 2.0, M.2 2280, read/write 7450/6900MB/s, random 1.2M/1.55M IOPS, 600TBW.
- Kingston KC3000 1TB: ~9,690,000 VND; Phison E18, 800TBW, random 900K/1M IOPS. Kingston KC3000 2TB: ~14,990,000 VND; 1.6PBW.
- Thermaltake Toughpower GF A3 850W Gold Full Modular: ~3,190,000 VND; ATX 3.x; 120mm fan; 1x 16-pin plus PCIe/SATA/EPS connectors. URL: https://phongvu.vn/nguon-may-tinh-thermaltake-toughnguon-may-tinh-gf-a3-850w-atx-3-0--s240302572
- Corsair 3000D Airflow: ~1,990,000 VND; ATX, 2x3.5 + 2x2.5 bays, 466x462x230mm.
- ASUS TUF Gaming GT502: ~3,790,000 VND; supports ATX/mATX/miniITX, 4x3.5 +4x2.5 bays, Type-C + 2 USB, 285x450x446mm.
- DeepCool CH560 image source identified: https://content.box.co.uk/website-assests/R-CH560-BKAPE4-G-1-1.jpg
- DeepCool AK620 image source identified: https://doc.jrc.cz/pic/1SEJ100501-600-600.webp
- ID-Cooling FROZN A620 PRO-SE: ~749,000 VND; dual 120mm fans, LGA1851/1700/1200/1151/1150/1155/1156/AM5/AM4, 120x142x157mm, 58CFM, 300–2000RPM.
- Logitech G502 HERO: ~919,000 VND; wired, HERO sensor up to 25,600 DPI, 1000Hz, 11 programmable buttons. URL: https://phongvu.vn/chuot-logitech-g502-hero--s1810470
- Logitech G102 LIGHTSYNC: ~400,000 VND (Phòng Vũ product category).
- Razer DeathAdder Essential: ~370,000 VND; up to 6400 DPI. Match exact SKU/colour revision before using.
- AULA F75 wireless: ~1,249,000 VND; 80% layout; Bluetooth + USB-C + 2.4GHz; use only matching exact layout/switch/colour SKU.
- PC reference examples and BOMs:
  - PV Gaming IN50164: i5-12400F / MSI PRO B760M-P DDR4 / ADATA 2x8GB DDR4-3200 / MSI RTX3050 8GB / ADATA LEGEND710 512GB / MSI MAG A650BN / MSI MAG FORCE M100A / ID-Cooling Zoomflow240. URL: https://phongvu.vn/pc-gaming-pv-in50164-intel-core-i5-12400f-rtx-3050--s240706606
  - Apollo TM026: i5-12400F / ASUS Prime B760M-A D4-CSM / Team 1x8GB DDR4 / ASUS RTX3050 6GB / WD SN3000 1TB / MIK C650B / Jonsbo CB40 ARGB / Magic Cubi-M Elite. ~23,590,000 VND.
  - Apollo TM040: i5-12400F / ASUS Prime B760M-A D4-CSM / Team 2x8GB DDR4-3200 / ASUS RTX3050 6GB / WD SN3000 1TB / MIK C650B / AIGO Ice200 Pro / Magic Cubi-M Elite. ~23,390,000 VND.
  - PV Gaming AN50145: Ryzen 5 7600 / ASUS PRIME A620M-A / Team 2x16GB DDR5-6000 / ASUS RTX4060 8GB / WD Green SN350 500GB / ASUS TUF 650W Bronze / ASUS TUF LC240 ARGB / NZXT H5 Flow.
  - Apollo M002: i5-12400F / ASUS PRIME B760M-A D4-CSM / Team 2x8GB DDR4-3200 / ASUS RTX4060 / ADATA LEGEND710 512GB / Corsair CX650 / DeepCool LE520 ARGB / ASUS PRIME AP201 TG.
  - PC IN50152-W: i5-12400F / ASUS Prime B760M-A D4-CSM / Team 2x8GB DDR4-3600 / ASUS RTX4060 / ADATA 512GB / Corsair CX650 / ID-Cooling Zoomflow360 Snow / ASUS Prime AP201 White.
  - PC IN50116: i5-12400F / MSI PRO B760M-A WIFI DDR4 / ADATA 2x8GB DDR4-3200 / MSI RTX4060 / ADATA LEGEND710 512GB / MSI A650BN / ID-Cooling Zoomflow240 / MSI MAG FORGE320R.
  - PC IN5072: i5-12400F / Gigabyte B760M DS3H AX DDR4 / Team 2x8GB DDR4-3200 / Gigabyte RTX4060 / ADATA 512GB / Gigabyte GP-P650SS / Xigmatek FENIX240 / Gigabyte C102G.

## Completion report required
Return:
1. Counts by product type.
2. Spec field coverage by product type and key-field missing count.
3. Primary image count and total gallery image count; list any SKU with fewer than 3 images.
4. Price count, source coverage, estimated-price count, and all SKUs with no usable price.
5. PC BOM coverage (10/10 or exact shortfall) and confirmation all referenced component model codes exist.
6. Files changed, SQL import command, Maven test result, frontend build result.
7. State explicitly whether database import was run. Do not say the website is populated until the import actually succeeds.
