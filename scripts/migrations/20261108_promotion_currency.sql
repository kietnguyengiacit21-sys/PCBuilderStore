BEGIN;

ALTER TABLE "product_promotions"
    ADD COLUMN IF NOT EXISTS "discount_currency_code" VARCHAR(3);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_product_promotion_currency_code'
          AND conrelid = '"product_promotions"'::regclass
    ) THEN
        ALTER TABLE "product_promotions"
            ADD CONSTRAINT "chk_product_promotion_currency_code"
            CHECK (
                "discount_currency_code" IS NULL
                OR "discount_currency_code" ~ '^[A-Z]{3}$'
            );
    END IF;
END
$$;

COMMIT;
