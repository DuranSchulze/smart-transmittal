-- Additive: existing transmittals have no QA checklist until one is created.
ALTER TABLE "transmittal" ADD COLUMN "qa" JSONB;
ALTER TABLE "transmittal_item" ADD COLUMN "document" JSONB;
