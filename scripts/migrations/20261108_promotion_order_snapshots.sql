BEGIN;

ALTER TABLE "order_items"
    ADD COLUMN IF NOT EXISTS "promotion_snapshot" JSONB;

COMMIT;
