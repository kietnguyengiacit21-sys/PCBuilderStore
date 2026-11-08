BEGIN;

ALTER TABLE "product_upgrade_options"
    DROP CONSTRAINT IF EXISTS "chk_product_upgrade_price_delta";

CREATE TABLE IF NOT EXISTS "cart_item_upgrade_selections" (
    "cart_item_id" NUMERIC(20,0) NOT NULL,
    "upgrade_group_id" BIGINT NOT NULL,
    "upgrade_option_id" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "pk_cart_item_upgrade_selections"
        PRIMARY KEY ("cart_item_id", "upgrade_group_id"),
    CONSTRAINT "fk_cart_item_upgrade_selection_item"
        FOREIGN KEY ("cart_item_id") REFERENCES "cart_items" ("cart_item_id") ON DELETE CASCADE,
    CONSTRAINT "fk_cart_item_upgrade_selection_group"
        FOREIGN KEY ("upgrade_group_id") REFERENCES "product_upgrade_groups" ("upgrade_group_id") ON DELETE RESTRICT,
    CONSTRAINT "fk_cart_item_upgrade_selection_option"
        FOREIGN KEY ("upgrade_option_id") REFERENCES "product_upgrade_options" ("upgrade_option_id") ON DELETE RESTRICT,
    CONSTRAINT "chk_cart_item_upgrade_selection_quantity" CHECK ("quantity" > 0)
);

CREATE TABLE IF NOT EXISTS "cart_item_bundle_selections" (
    "cart_item_id" NUMERIC(20,0) NOT NULL,
    "bundle_id" BIGINT NOT NULL,
    "offer_id" NUMERIC(20,0) NOT NULL,
    CONSTRAINT "pk_cart_item_bundle_selections"
        PRIMARY KEY ("cart_item_id", "bundle_id", "offer_id"),
    CONSTRAINT "fk_cart_item_bundle_selection_item"
        FOREIGN KEY ("cart_item_id") REFERENCES "cart_items" ("cart_item_id") ON DELETE CASCADE,
    CONSTRAINT "fk_cart_item_bundle_selection_item_offer"
        FOREIGN KEY ("bundle_id", "offer_id")
        REFERENCES "product_bundle_items" ("bundle_id", "offer_id") ON DELETE RESTRICT
);

ALTER TABLE "order_items"
    ADD COLUMN IF NOT EXISTS "configuration_snapshot" JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "order_items"
    ADD CONSTRAINT "chk_order_item_configuration_snapshot_object"
        CHECK (jsonb_typeof("configuration_snapshot") = 'object') NOT VALID;

COMMIT;
