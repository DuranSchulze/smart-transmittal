import "dotenv/config"
import { readFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import { Pool } from "pg"
import { decodeLogo, imagekitConfig, uploadAgencyLogo, validateLogoUrl, type UploadedLogo } from "../server/imagekit"

const apply = process.argv.includes("--apply")
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 10_000 })

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.")
  if (apply) {
    imagekitConfig()
    await pool.query(await readFile(new URL("../prisma/sql/add-agency-logo-urls.sql", import.meta.url), "utf8"))
  }
  const agencies = await pool.query(`SELECT id, "logoBase64", to_jsonb(agency)->>'logoUrl' AS "logoUrl" FROM agency WHERE "logoBase64" IS NOT NULL AND "logoBase64" <> ''`)
  const transmittals = await pool.query(`SELECT id, sender FROM transmittal WHERE sender->>'logoBase64' IS NOT NULL AND sender->>'logoBase64' <> ''`)
  const inlineLogos = [...agencies.rows.map(row => row.logoBase64), ...transmittals.rows.map(row => row.sender.logoBase64)] as string[]
  const invalidLogos = inlineLogos.filter(value => { try { decodeLogo(value); return false } catch { return true } }).length
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", legacyAgencies: agencies.rowCount, legacyTransmittals: transmittals.rowCount,
    distinctLogos: new Set(inlineLogos.map(value => createHash("sha256").update(value).digest("hex"))).size,
    largestInlineLogoBytes: Math.max(0, ...inlineLogos.map(value => Buffer.byteLength(value))),
    invalidLogos,
  }))
  if (!apply) return
  const uploads = new Map<string, UploadedLogo>()
  const getLogo = async (dataUrl: string) => {
    const hash = createHash("sha256").update(dataUrl).digest("hex")
    if (!uploads.has(hash)) uploads.set(hash, await uploadAgencyLogo(dataUrl))
    return uploads.get(hash)!
  }
  let migrated = 0
  let failed = 0
  for (const agency of agencies.rows) {
    try {
      const logo = agency.logoUrl ? { logoUrl: validateLogoUrl(agency.logoUrl), logoFileId: null } : await getLogo(agency.logoBase64)
      const result = await pool.query(`UPDATE agency SET "logoUrl"=$1, "logoFileId"=COALESCE($2,"logoFileId"), "logoBase64"=NULL WHERE id=$3 AND "logoBase64"=$4`, [logo.logoUrl, logo.logoFileId, agency.id, agency.logoBase64])
      migrated += result.rowCount || 0
      if (migrated && migrated % 50 === 0) console.log(JSON.stringify({ migrated, failed, uploadedFiles: uploads.size }))
    } catch (error) {
      failed++
      console.error(`Agency ${agency.id}: ${error instanceof Error ? error.message : "migration failed"}`)
    }
  }
  for (const record of transmittals.rows) {
    try {
      // Preserve the historical logo, rather than substituting today's agency logo.
      const logo = record.sender.logoUrl ? { logoUrl: validateLogoUrl(record.sender.logoUrl) } : await getLogo(record.sender.logoBase64)
      const sender = { ...record.sender, logoUrl: logo.logoUrl, logoBase64: null }
      const result = await pool.query(`UPDATE transmittal SET sender=$1::jsonb WHERE id=$2 AND sender->>'logoBase64'=$3`, [JSON.stringify(sender), record.id, record.sender.logoBase64])
      migrated += result.rowCount || 0
      if (migrated && migrated % 50 === 0) console.log(JSON.stringify({ migrated, failed, uploadedFiles: uploads.size }))
    } catch (error) {
      failed++
      console.error(`Transmittal ${record.id}: ${error instanceof Error ? error.message : "migration failed"}`)
    }
  }
  console.log(JSON.stringify({ migrated, failed, uploadedFiles: uploads.size }))
  if (failed) process.exitCode = 1
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Migration failed"); process.exitCode = 1 })
  .finally(() => pool.end())
