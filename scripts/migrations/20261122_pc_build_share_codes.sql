-- Saved PC builds are opened by an unguessable share code (link sharing, printable quotation).
ALTER TABLE "pc_builds" ADD COLUMN IF NOT EXISTS "share_code" VARCHAR(16);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_pc_builds_share_code" ON "pc_builds" ("share_code");
