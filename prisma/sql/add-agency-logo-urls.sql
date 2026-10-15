-- Additive and rerunnable for databases managed with `prisma db push`.
-- Existing logos remain untouched until the data migration succeeds.
ALTER TABLE "agency"
  ADD COLUMN IF NOT EXISTS "logoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "logoFileId" TEXT;
