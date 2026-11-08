BEGIN;

ALTER TABLE "promotion_campaigns"
    ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "order_inventory_reservations"
        GROUP BY "order_item_id", "offer_id"
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Duplicate order-item/offer reservations exist; refusing to alter reservation uniqueness.';
    END IF;
END $$;

ALTER TABLE "order_inventory_reservations"
    DROP CONSTRAINT IF EXISTS "order_inventory_reservations_order_item_id_key";

CREATE UNIQUE INDEX IF NOT EXISTS "uq_order_inventory_reservation_item_offer"
    ON "order_inventory_reservations" ("order_item_id", "offer_id");

CREATE INDEX IF NOT EXISTS "ix_product_promotions_campaign"
    ON "product_promotions" ("campaign_id", "is_enabled", "priority");

COMMIT;
