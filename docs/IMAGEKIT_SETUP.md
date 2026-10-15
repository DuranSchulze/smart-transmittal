# Agency logo storage

Agency logos are uploaded to ImageKit by the authenticated agency save routes.
The database stores the returned `Agency.logoUrl` and `Agency.logoFileId`.
Sender snapshots store `sender.logoUrl`; new saves do not persist inline image data.

## Configuration

Copy the ImageKit settings from `.env.example` into your ignored `.env` or deployment environment:

```dotenv
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/g34rc6almj
IMAGEKIT_PUBLIC_KEY=your-public-key
IMAGEKIT_PRIVATE_KEY=your-private-key
```

The private key is server-only. Do not prefix it with `NEXT_PUBLIC_`, put it in client code, or commit it to an example file. The public key is included for account configuration; this server upload flow authenticates with the private key. Rotate any key that has been shared outside your secret store.

## Database rollout and legacy logos

This repository uses Prisma schema synchronization rather than an existing Prisma Migrate history. The additive, rerunnable SQL in `prisma/sql/add-agency-logo-urls.sql` adds the nullable URL and file ID columns without dropping existing columns or data.

```bash
# Inspect records that still contain inline logos; no changes or uploads.
npm run db:migrate-logos

# Add URL columns and migrate agency logos and historical sender snapshots.
npm run db:migrate-logos -- --apply

# Regenerate the Prisma client and build the application.
npm run build
```

The migration uploads each distinct inline logo and replaces its image data with the delivery URL only after upload succeeds. Historical transmittals retain their original logo, even if the agency's current logo differs. Existing PNG data labelled as JPEG is recognized by its actual image signature. Conditional updates avoid overwriting a concurrent edit. Failed records retain their data and are reported; rerun the migration to retry them. A dry run after success reports zero legacy agency and transmittal logos.

The deprecated `logoBase64` column/property remains nullable for a safe rollout and is cleared on successful migration or save. It is used only as a pending-upload transport or to read an older record. Do not run database reset commands for this change.

## Upload and reuse

- Local uploads and Drive logo imports accept PNG, JPG, WebP, and GIF, up to 2 MB.
- Image bytes are checked on the server before upload; arbitrary remote upload URLs and SVG are not accepted.
- Uploads use the `/agency-logos` folder. Names are derived from a SHA-256 content hash, so retrying the same image uses the same URL and cannot replace a different image.
- Agency create/update requests are authenticated. Only the creator can update an agency, and ownership is checked before an upload is attempted.
- Existing logo URLs must belong to the configured ImageKit delivery endpoint.
- Upload failures keep the agency unchanged and show an error in the editor.
- Removing or replacing a logo changes the agency reference. It does not delete the old file from ImageKit, because saved transmittals can still reference it. Review references before any manual storage cleanup.

## Preview and exports

The agency picker, modal preview, and transmittal preview load the stored URL. CORS-enabled logo images are awaited before PDF rendering. Word downloads a PNG rendition from ImageKit and embeds its bytes in the document. The stored original URL remains unchanged. Missing remote logos cause an export error rather than an unnoticed blank letterhead.

Document image imports remain disabled. Agency logos use a separate image path.

## Verification

```bash
npm test
npm run build
npm run db:migrate-logos
```

After deployment, create an agency with a logo, reopen it from another signed-in account, and verify that the saved logo URL loads in the sender preview, PDF, and Word export. Confirm that the database has a URL/file ID and no inline logo bytes for the agency or new transmittal snapshot.
