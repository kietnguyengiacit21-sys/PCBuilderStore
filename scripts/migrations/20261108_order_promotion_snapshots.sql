BEGIN;

ALTER TABLE "order_items"
    ADD COLUMN IF NOT EXISTS "inventory_components_snapshot" JSONB,
    ADD COLUMN IF NOT EXISTS "base_unit_price_snapshot" NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS "promotion_id_snapshot" BIGINT,
    ADD COLUMN IF NOT EXISTS "campaign_name_snapshot" VARCHAR(180),
    ADD COLUMN IF NOT EXISTS "promotion_display_copy_snapshot" VARCHAR(300),
    ADD COLUMN IF NOT EXISTS "promotion_discount_type_snapshot" VARCHAR(20),
    ADD COLUMN IF NOT EXISTS "promotion_discount_value_snapshot" NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS "promotion_discount_amount_snapshot" NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS "is_gift_snapshot" BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS "gift_parent_order_item_id" NUMERIC(20,0);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_order_items_gift_parent'
          AND conrelid = '"order_items"'::regclass
    ) THEN
        ALTER TABLE "order_items"
            ADD CONSTRAINT "fk_order_items_gift_parent"
            FOREIGN KEY ("gift_parent_order_item_id")
            REFERENCES "order_items" ("order_item_id") ON DELETE RESTRICT;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "cart_item_gifts" (
    "cart_item_id" NUMERIC(20,0) NOT NULL,
    "promotion_id" BIGINT NOT NULL,
    "gift_offer_id" NUMERIC(20,0) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_cart_item_gifts"
        PRIMARY KEY ("cart_item_id", "promotion_id", "gift_offer_id"),
    CONSTRAINT "fk_cart_item_gift_cart_item"
        FOREIGN KEY ("cart_item_id") REFERENCES "cart_items" ("cart_item_id") ON DELETE CASCADE,
    CONSTRAINT "fk_cart_item_gift_promotion"
        FOREIGN KEY ("promotion_id") REFERENCES "product_promotions" ("promotion_id") ON DELETE RESTRICT,
    CONSTRAINT "fk_cart_item_gift_offer"
        FOREIGN KEY ("gift_offer_id") REFERENCES "product_offers" ("offer_id") ON DELETE RESTRICT,
    CONSTRAINT "chk_cart_item_gift_quantity" CHECK ("quantity" > 0)
);

CREATE INDEX IF NOT EXISTS "ix_cart_item_gifts_promotion"
    ON "cart_item_gifts" ("promotion_id", "gift_offer_id");

COMMIT;
