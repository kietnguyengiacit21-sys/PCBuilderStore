\set ON_ERROR_STOP on
BEGIN;

DO $$
BEGIN
  IF (SELECT count(*) FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE') <> 35 THEN
    RAISE EXCEPTION 'Expected the existing 35-table schema; refusing storefront data cleanup.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM products
    WHERE model_code = 'PBC-PC-GAME-002'
      AND short_description IN (
        'Entry Gaming PC RTX 3050 - catalog tham khảo PC Builder Store.',
        'Entry Gaming PC RTX 4060 - catalog tham khảo PC Builder Store.')
  ) THEN
    RAISE EXCEPTION 'PBC-PC-GAME-002 short description differs from the expected value.';
  END IF;
END
$$;

UPDATE products
SET short_description = 'Entry Gaming PC RTX 4060 - catalog tham khảo PC Builder Store.'
WHERE model_code = 'PBC-PC-GAME-002'
  AND short_description = 'Entry Gaming PC RTX 3050 - catalog tham khảo PC Builder Store.';

CREATE TEMP TABLE storefront_image_replacements (
  model_code text NOT NULL,
  broken_url text NOT NULL,
  replacement_url text NOT NULL
) ON COMMIT DROP;

INSERT INTO storefront_image_replacements (model_code, broken_url, replacement_url) VALUES
  ('24G2SP',
   'https://www.kustompcs.co.uk/images/detailed/53/60402_6.jpg',
   'https://cdn2.cellphones.com.vn/x/media/catalog/product/t/_/t_i_xu_ng_-_2023-02-15t233617.174.png'),
  ('SKC3000D/2048G',
   'https://backend.gigatron.rs/media/catalog/product/cache/d62e1a0582bf7257bddc609f302ce89c/i/m/image618e3a6c2b2be.jpg',
   'https://product.hstatic.net/200000420363/product/kingston-kc3000-2tb-m.2-nvme-pcie-4.0_7b7665eede184e989acd9bbae9a55a44_master.png'),
  ('FN240-BLACK',
   'https://www.thermalright.com/wp-content/uploads/2023/03/Frozen-Notte-240-Black-1.jpg',
   'https://cdn.shoplightspeed.com/shops/623240/files/59822053/thermalright-thermalright-frozen-notte-240-black-a.jpg'),
  ('CC-9011200-WW',
   'https://www.corsair.com/cdn/shop/products/4000D_AIRFLOW_BLACK_01.webp?v=1701170763',
    'https://www.invidcomputers.com/images/000000000041309044388-base-4000d-airflow-config-Gallery-4000D-AF-BLACK-01.jpg'),
    ('GV-N407SWF3OC-12GD',
    'https://www.dateks.lv/images/pic/2400/2400/713/1579.jpg',
      'https://media2.nbb-cdn.de/images/products/GeForce_RTX_4070_SUPER_WINDFORCE_OC_12G_-_CandB_cc08.png'),
      ('MLW-D24M-A18PK-R1',
      'https://www.coolermaster.com/catalog/coolers/cpu-liquid-coolers/masterliquid-240l-core/images/1.jpg',
      'https://nvs.tn-cdn.net/2023/05/cooler-master-masterliquid-240l-core-argb-01.jpg');

DO $$
BEGIN
  IF (SELECT count(*) FROM storefront_image_replacements) <> 6 THEN
    RAISE EXCEPTION 'Expected six verified exact-model image replacements.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM storefront_image_replacements replacement
    LEFT JOIN products product ON product.model_code = replacement.model_code
    WHERE product.product_id IS NULL
  ) THEN
    RAISE EXCEPTION 'A replacement image references an unknown model.';
  END IF;
END
$$;

UPDATE product_images image
SET image_url = replacement.replacement_url
FROM storefront_image_replacements replacement
JOIN products product ON product.model_code = replacement.model_code
WHERE image.product_id = product.product_id
  AND image.image_url = replacement.broken_url;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM products
    WHERE model_code = 'PBC-PC-GAME-002'
      AND short_description = 'Entry Gaming PC RTX 4060 - catalog tham khảo PC Builder Store.'
  ) THEN
    RAISE EXCEPTION 'PBC-PC-GAME-002 description correction was not applied.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM storefront_image_replacements replacement
    JOIN products product ON product.model_code = replacement.model_code
    WHERE NOT EXISTS (
      SELECT 1 FROM product_images image
      WHERE image.product_id = product.product_id
        AND image.image_url = replacement.replacement_url
    )
  ) THEN
    RAISE EXCEPTION 'At least one exact-model image replacement was not applied.';
  END IF;
END
$$;

COMMIT;