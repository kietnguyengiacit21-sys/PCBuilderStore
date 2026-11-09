# V13 source register and data quality

This V13 package adds category-level product detail fields on top of the V12 baseline. It does not replace the V12 catalog.

## Primary manufacturer sources consulted

- Intel ARK specifications: https://www.intel.com/content/www/us/en/products/sku/132223/intel-core-i312100f-processor-12m-cache-up-to-4-30-ghz/specifications.html ; https://www.intel.vn/content/www/vn/vi/products/sku/134587/intel-core-i512400f-processor-18m-cache-up-to-4-40-ghz/specifications.html ; https://www.intel.com/content/www/us/en/products/sku/230495/intel-core-i513400-processor-20m-cache-up-to-4-60-ghz/specifications.html ; https://www.intel.com/content/www/us/en/products/sku/236777/intel-core-i5-processor-14400f-20m-cache-up-to-4-70-ghz/specifications.html ; https://www.intel.vn/content/www/vn/vi/products/sku/236784/intel-core-i5-processor-14500-24m-cache-up-to-5-00-ghz/specifications.html ; https://www.intel.com/content/www/us/en/products/sku/236799/intel-core-i5-processor-14600k-24m-cache-up-to-5-30-ghz/specifications.html ; https://www.intel.com/content/www/us/en/products/sku/236778/intel-core-i5-processor-14600kf-24m-cache-up-to-5-30-ghz/specifications.html ; https://www.intel.vn/content/www/vn/vi/products/sku/230500/intel-core-i713700k-processor-30m-cache-up-to-5-40-ghz/specifications.html ; https://www.intel.com/content/www/us/en/products/sku/236783/intel-core-i7-processor-14700k-33m-cache-up-to-5-60-ghz/specifications.html ; https://www.intel.com/content/www/us/en/products/sku/236773/intel-core-i9-processor-14900k-36m-cache-up-to-6-00-ghz/specifications.html
- AMD Ryzen specifications: https://www.amd.com/en/support/downloads/drivers.html/processors/ryzen/ryzen-5000-series/amd-ryzen-5-5600.html ; https://www.amd.com/en/products/processors/desktops/ryzen/5000-series/amd-ryzen-5-5600x.html ; https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-7-7800x3d.html ; https://www.amd.com/en/support/downloads/drivers.html/processors/ryzen/ryzen-7000-series/amd-ryzen-7-7700.html
- ASUS motherboard specifications: https://www.asus.com/uk/motherboards-components/motherboards/prime/prime-b760m-a-d4/techspec/ ; https://www.asus.com/motherboards-components/motherboards/tuf-gaming/tuf-gaming-b760-plus-wifi-d4/techspec/ ; https://www.asus.com/us/motherboards-components/motherboards/tuf-gaming/tuf-gaming-z790-plus-wifi/techspec/ ; https://www.asus.com/vn/motherboards-components/motherboards/prime/prime-b650m-a-wifi-ii/techspec/ ; https://www.asus.com/vn/motherboards-components/motherboards/tuf-gaming/tuf-gaming-x670e-plus-wifi/techspec/
- MSI motherboard/PSU specifications: https://www.msi.com/Motherboard/PRO-B760M-A-WIFI-DDR4/Specification ; https://www.msi.com/Motherboard/MAG-B760-TOMAHAWK-WIFI/Specification ; https://www.msi.com/Motherboard/PRO-B650M-A-WIFI/Specification ; https://www.msi.com/Power-Supply/MAG-A750GL-PCIE5/Specification ; https://vn.msi.com/Power-Supply/MAG-A850GL-PCIE5/Specification
- Gigabyte motherboard specifications: https://www.gigabyte.com/vn/Motherboard/B760M-DS3H-DDR4-rev-10/sp ; https://www.gigabyte.com/vn/Motherboard/B760-AORUS-ELITE-AX-rev-1x/sp ; https://www.gigabyte.com/vn/Motherboard/B650-AORUS-ELITE-AX-rev-12/sp
- ASRock motherboard specifications: https://www.asrock.com/mb/Intel/B760M%20Pro%20RSD4/ ; https://www.asrock.com/mb/Intel/Z790%20Steel%20Legend%20WiFi/ ; https://www.asrock.com/MB/AMD/B650M%20Pro%20RS/
- PSU sources: https://www.coolermaster.com/vi-vn/products/mwe-650-bronze-v2-full-range.html ; https://seasonic.com/product/focus-gx/ ; https://www.fsplifestyle.com/en/product/HydroGPRO750W.html ; https://www.thermaltake.com/toughpower-gf-a3-850w-gold.html
- Case sources: https://www.deepcool.com/products/Cases/CH560-New-Generation-of-Airflow-Case/2023/17101.shtml ; https://support.nzxt.com/hc/en-us/articles/40225168535451-H5-Flow-2024-Specs ; https://support.nzxt.com/hc/en-us/articles/40183529624347-H6-Flow-2023-Specs ; https://www.coolermaster.com/vi-vn/products/masterbox-td500-mesh-v2.html
- Cooler sources: https://www.thermalright.com/product/peerless-assassin-120-se/ ; https://www.thermalright.com/product/phantom-spirit-120-se/ ; https://www.noctua.at/en/products/nh-d15-chromax-black/specifications ; https://www.noctua.at/en/products/nh-u12s-redux/specifications ; https://www.arctic.de/en/Liquid-Freezer-III-240/ACFRE00134A ; https://www.corsair.com/ww/en/p/cpu-coolers/cw-9060058-ww/icue-h100i-rgb-elite-liquid-cpu-cooler-cw-9060058-ww
- HyperX Cloud III manufacturer specifications: https://www.hyperx.com/blogs/press/hyperx-announces-cloud-iii-gaming-headset

## Data-quality labels

- `MANUFACTURER_SOURCE`: directly stated by manufacturer for exact model/family.
- `MANUFACTURER_DERIVED`: directly calculated from manufacturer specifications (e.g. total PCIe lanes).
- `DERIVED_FROM_CATALOG`: calculated from the existing PC reference BOM or already stored product fields.
- `ESTIMATED_REFERENCE`: approximate retail reference value; it must show `Ước tính / Tham khảo` on the customer page.
- `SECONDARY_SOURCE_REFERENCE`: used only when an official source was unavailable.

The data is meant to enrich the storefront, not to imply every field is a legally guaranteed specification. Revision-sensitive motherboard controllers, regional PSU warranties, fan bearings and exact accessory variations remain reviewable.

## Important display rule

Public specifications may be returned by the API, but each field must also include a safe `valueQuality` / `displayLabel`. Do not expose source review notes, internal confidence details or internal-only metadata. Estimated values must be visibly labeled.
