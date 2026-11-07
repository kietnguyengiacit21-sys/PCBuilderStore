# GPU research — ASUS DUAL-RTX4060-O8G

**Status:** partial, source-backed research record; **not an importer file** and **not approved for database import**.

- Exact model code: `DUAL-RTX4060-O8G`
- Product: ASUS Dual GeForce RTX 4060 OC Edition 8GB GDDR6
- Manufacturer specification page: https://www.asus.com/vn/motherboards-components/graphics-cards/dual/dual-rtx4060-o8g/techspec/
- Manufacturer overview/gallery: https://www.asus.com/vn/motherboards-components/graphics-cards/dual/dual-rtx4060-o8g/
- Research date: 2026-11-06

## What is verified

The ASUS specification page explicitly identifies the model and reports the GPU engine, 8GB GDDR6, 128-bit memory interface, PCI Express 4.0, OpenGL 4.6, 3072 CUDA cores, 17 Gbps memory speed, two engine-clock profiles (OC 2535 MHz and default 2505 MHz Boost), maximum digital resolution 7680 x 4320, one HDMI 2.1a and three DisplayPort 1.4a outputs, HDCP 2.3, up to four displays, no NVLink/Crossfire, physical dimensions 227.2 x 123.24 x 49.6 mm, 550W recommended PSU, one 8-pin power connector, and a 2.5-slot design.

The ASUS overview identifies NVIDIA Ada Lovelace, two Axial-tech fans, 0dB technology, Dual BIOS, and a 22.7cm card length. It also lists DLSS 3, NVIDIA Reflex, NVIDIA Encoder, NVIDIA Broadcast, NVIDIA Studio, G-SYNC, Ansel, VR and Resizable BAR features.

## Important mapping cautions

1. `memory_clock_mhz` must **not** be populated with `17` or `17000`: ASUS publishes **17 Gbps** memory speed, not a MHz clock. The current dictionary should have a separately named data-rate field (for example `memory_data_rate_gbps`) if this fact is to be stored without semantic distortion.
2. `boost_clock_mhz` is left unresolved because ASUS lists both 2535 MHz OC mode and 2505 MHz default Boost mode, while the current scalar field cannot represent the profiles separately without a project-wide convention.
3. `recommended_psu_watt=550` is not GPU board power. `board_power_watt` remains unresolved.
4. ASUS gives a three-number dimension tuple and separately states the card is 22.7 cm long. Only the length is mapped here. Width and height remain review items until axis order is confirmed.
5. The tech-spec page lists maximum resolution but not a refresh-rate ceiling or DSC support; those fields remain unresolved.
6. Empty values are intentionally empty. No zeros, N/A placeholders or inferred values were added.

## Image sources

See `gpu_image_sources_DUAL-RTX4060-O8G.csv`. Two official ASUS image assets were identified: a clean product cutout and a distinct angled key visual. An additional front/back/I-O composite from ASCII.jp is marked reference-only and must not be imported without usage-rights review. ASUS page terms and image reuse permissions were not independently confirmed; these links establish provenance, not redistribution permission.

## Scope limitation

Only one exact GPU model can be researched from the currently available conversation materials: `DUAL-RTX4060-O8G`. The current 15-model product list and the latest local `seed/catalog-attribute-evidence.csv` file are not available in this chat workspace. The project's GitHub repository is also not accessible through the connected GitHub account, and the latest checkpoint was reported as local-only. Therefore this package deliberately does not invent the other 14 model identities.

## Source citations

- ASUS Vietnam technical specifications: https://www.asus.com/vn/motherboards-components/graphics-cards/dual/dual-rtx4060-o8g/techspec/
- ASUS Vietnam product overview/gallery: https://www.asus.com/vn/motherboards-components/graphics-cards/dual/dual-rtx4060-o8g/
- ASUS pressroom RTX 4060 image album: https://press.asus.com/media/photos/41/albums/170/
- ASCII.jp product image reference (not an official manufacturer source): https://ascii.jp/elem/000/004/143/4143209/galleryimg.html
