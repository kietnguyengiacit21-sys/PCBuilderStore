# V11 source register

All values in `catalog-v11-verified-attribute-values.csv` include their exact source URL and source locator. Primary manufacturer sources used include:

## Monitors
- AOC 24G2SP: https://ap.aoc.com/product/24G2SP
- AOC 24G2SP US product page: https://www.aoc.com/us/gaming/monitors/24g2sp
- AOC 24G2SP specification sheet: https://www.aoc.com/api/asset/pi29772?ext=pdf&name=AOC+24G2SP_English
- ASUS TUF Gaming VG27AQ1A technical specifications: https://www.asus.com/us/displays-desktops/monitors/tuf-gaming/tuf-gaming-vg27aq1a/techspec/

## Mice
- Logitech G102 LIGHTSYNC: https://www.logitechg.com/vi-vn/shop/p/g102-lightsync-rgb-gaming-mouse.910-005802
- Logitech G102 LIGHTSYNC fact sheet (ASBIS): https://www.asbis.com/download/Logitech/cache/G102_LIGHTSYNC_GAMING_MOUSE_Fact_Sheet_FINAL.pdf?cid=20200421061733746738000000
- Logitech G502 HERO specifications: https://support.logi.com/hc/vi/articles/360023303534-Specification-G502-HERO-Gaming-Mouse
- Logitech G PRO X Superlight 2 specifications: https://support.logi.com/hc/en-150/articles/15235304069783-Specification-G-PRO-X-Superlight-2-Lightspeed-Gaming-Mouse
- Razer DeathAdder Essential support/specifications: https://mysupport.razer.com/app/answers/detail/a_id/20332/kw/razer%20deathadder%20essential%20driver

## Keyboards
- Razer BlackWidow V3 official support/specifications: https://mysupport.razer.com/app/answers/detail/a_id/3827/kw/black%20widow%20keyboard
- AULA F75 official manual: https://aulastar.com/uploads/soft/20241113/1-241113162Z3364.pdf
- Keychron K8 Pro official specification page: https://www.keychron.com/collections/wireless-mechanical-keyboards/products/keychron-k8-pro-qmk-via-wireless-mechanical-keyboard

## Headset
- HyperX Cloud III official announcement/specifications (part 727A8AA): https://hyperx.com/blogs/press/hyperx-announces-cloud-iii-gaming-headset
- HyperX Cloud III official product page: https://row.hyperx.com/products/hyperx-cloud-iii-Wired-gaming-headset

Values with model/variant-dependent options are stored as structured JSON or explanatory text (for example Keychron frame variants and AULA F75 polling rate by connection mode). Thresholds such as `>40 G` and `>888 IPS` remain text and are not converted into false exact values.
