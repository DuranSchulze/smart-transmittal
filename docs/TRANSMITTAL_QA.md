# Transmittal QA

QA is an optional advisory workspace tab immediately after Files. Add the expected
name of each document and optional phrases, then choose **Run QA**. Exact phrase
matching ignores case and whitespace. Meaning-based matching uses the configured
Gemini model and requires a supporting excerpt from the document text. Every
phrase must be satisfied within one matching document; multiple candidates need
human review. Extra files are listed without becoming failures. QA never blocks
saving, native printing, PDF, Word, or CSV export and is not part of the printed form.

## Documents and saved results

Local PDF/Word imports and Drive imports associate a stable document reference
with their item rows. The browser retains readable content only in an in-memory
registry for the active editing session, not localStorage or the database. Bytes
are cleared on draft replacement, sign-out/unmount, and removal of the last row
associated with a document. QA reattachment replaces that reference's content
without inserting another item. Choosing a local replacement detaches its former
Drive source for QA (the original transmittal row's source link remains unchanged).

The existing autosave/create/update flows persist the checklist and latest result
snapshot in `Transmittal.qa`, and metadata in `TransmittalItem.document`. Snapshots
contain only findings, short evidence, timestamps, and the metadata/checklist key.
They are advisory snapshots, not signed attestations. Reloaded findings are labelled
previous results. Local documents must be reattached for a fresh check; Drive
files are downloaded through the user's authenticated Drive session on every full
run. Renamed Drive files require reimport or reattachment before checking.

Copying retains requirements and document metadata but discards QA results.
Legacy transmittals have empty checklists; manual/legacy rows without content
remain unverified until a document is attached. Checklist/file changes invalidate
results; responses from an earlier document set or editing session are discarded.
Retry failed checks preserves successful results only from the same unmodified
in-memory run. Otherwise, it checks the entire document set again.

## Server contract and bounds

`POST /api/transmittal-qa` requires the existing Better Auth session. It receives
one document reference, encoded PDF or extracted Word text, an `isText` flag, and
requirements. It returns the document's coverage, per-requirement filename
assessment, per-keyword status/evidence/page, or a safe processing error. It does
not save a document or modify a transmittal. AI settings come from the current
user, with existing system defaults as fallback.

PDF QA uses PDF Inspector to extract **all** pages, with page boundaries. Missing,
scanned, empty, or broken-font extraction sends the entire original PDF to
Gemini. Visual evidence always requires review; incomplete processing never
passes. This is independent of the existing metadata import's cover-page path.
Word uses Mammoth's textual content; original Word pagination is not available.
Word images, headers/footers, embedded objects, and extraction warnings mark
coverage incomplete; reattach a PDF for complete inspection. Standalone images and other file types are unsupported.

Limits are 100 requirements, 30 phrases per requirement (300 characters each),
200 files per run, 18 MB per reattachment/Drive download, 25 MB of encoded content
per QA request, 500,000 extracted characters, and 1,000 PDF pages. Oversize or
incomplete documents are never silently truncated to pass. Provider requests use
60-second timeouts; client QA requests use 90 seconds and the route allows 120.
Documents are processed sequentially. Invalid/truncated AI output fails that file
without discarding successful files. Document content, provider payloads, API
keys, and evidence are not logged. Prompts treat document/checklist text as data.

## Schema deployment and verification

This repository currently synchronizes its existing database with `npm run db:sync`.
The additive SQL in `prisma/migrations/20261019080000_transmittal_qa/migration.sql`
adds nullable JSONB columns without rewriting existing rows. For databases already
managed by Prisma Migrate, baseline their existing schema before adopting this
repository's first migration; do not reset a populated database. The configured
development database was synchronized during implementation.

Run `npm test` and `npm run build`. QA-specific tests cover later-page exact
matches, semantic evidence verification, scans/incomplete coverage, ambiguous
files, authentication, malformed AI output, persistence/copy, reattachment,
session cleanup, retries, Drive failures, stale responses, and checklist controls.
