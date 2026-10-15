# System Overview — Smart Transmittal

## What This System Is

Smart Transmittal is an authenticated web application for creating, saving, reopening, updating, deleting, and exporting formal transmittal forms.

The UI runs in the browser, but the system is not browser-only. Authentication, transmittal persistence, agency persistence, token exchange, and export data APIs are handled through Next.js server routes backed by Prisma and PostgreSQL.

## Primary User Workflow

1. The user signs in through Better Auth using either the `google` or `google-dds` provider.
2. The app restores the session, loads saved agencies, and requests the next transmittal number.
3. The user builds a transmittal by importing or manually editing line items and header fields.
4. The user saves the transmittal to the database.
5. The user exports the transmittal as PDF, DOCX, or CSV, or uploads the export to Google Drive.
6. The user can reopen and update previously saved transmittals later.

## Supported Import Sources

Standalone image imports are disabled across local uploads, pasted Drive links, bulk imports, and the parsing API. PDF and Word imports remain available; scanned content inside a PDF is still supported. Agency logos are separate from document imports.

Google imports share the same authenticated Drive client. Pasted links are validated as actual Google URLs and support standard file/folder links, account-specific URLs, `open?id=` links, and shared-link resource keys. Bulk folder import reads every result page and imports direct files only; subfolders are excluded.

Browse Drive supports paged loading, shared-drive results, escaped name searches, and preserves selections while loading more. Google Docs and Slides are exported to PDF and sent through the same PDF Inspector/Gemini pipeline as uploaded PDFs. Sheets links read the first actual worksheet, including renamed tabs.

Expired/rejected tokens trigger server-side renewal. Concurrent token requests are shared and token caching respects the server expiry. Failed downloads or permission checks do not create document rows. Successful batch files remain imported; Browse Drive keeps failed files selected for retry. Re-importing a Drive file already present in the current transmittal skips it.

- Local uploads:
  - PDF files
- Google Drive file selection from the in-app Drive browser
- Google Drive folder link
- Google Drive single file link
- Google Sheets link

## Review And Editing Surface

The app uses a split interface:

- Sidebar tabs for:
  - content
  - sender
  - recipient
  - project
  - signatories
- A live printable transmittal preview rendered from the current `AppData`

The user can:

- edit transmittal header fields
- edit item rows
- reorder rows
- adjust quantities
- remove rows
- bulk import rows from supported sources
- select shared agencies created by any signed-in user, or create new agencies with company details and a logo
- edit or delete agencies they created

## Export And Delivery Options

- PDF export
- DOCX export
- CSV export of item rows
- Upload exported files to Google Drive
- `mailto:` helper for opening a prefilled email draft

## Persistence Model

Agencies form a shared library available to all signed-in users. Names, addresses, and contact information are stored in `Agency`; logo files are stored in ImageKit, with their delivery URL and file ID in `Agency.logoUrl` and `Agency.logoFileId`. The creator remains the only user allowed to update or delete a shared record. Logo files support PNG, JPG, WebP, or GIF up to 2 MB; logos are separate from the document-image import restriction. See [ImageKit setup](IMAGEKIT_SETUP.md) for configuration and legacy data migration.

Selecting an agency copies its details and logo URL into the transmittal sender snapshot. Loading or refreshing the directory does not replace a saved snapshot. Edits in the Sender fields apply only to that transmittal; “Edit shared agency” updates the reusable record. ImageKit integration adds nullable logo URL and file ID columns; the additive migration preserves existing records.

Primary persistence is server-backed:

- transmittals are stored in PostgreSQL
- agencies are stored in PostgreSQL
- transmittal items and recipients are stored relationally

Client-side browser storage is still used for a small amount of local configuration:

- the linked Google Sheet ID is stored in `localStorage`

## Important Current Constraints

- PDFs are preprocessed on the server with `@firecrawl/pdf-inspector` using asynchronous cover-page Markdown extraction. Reliable cover text is parsed locally first. A descriptive labelled title and explicit document identifier allow a local result without Gemini; uncertain metadata is sent to Gemini as text for interpretation; scanned, sparse, or unreliable pages and native extraction failures use the original visual PDF path. This applies to both local and Google Drive PDF imports.
- PDF Inspector is a native server dependency, externalized in Next.js. Deployment must install the matching platform optional dependency. Local OCR runtimes are not required for this integration.

- Parsing requests have a 60-second Gemini request timeout and a 90-second browser timeout.
- Local uploads remain sequential to limit quota pressure, without a fixed pause between files. Drive imports also remain sequential and add completed results immediately.
- For Gemini 2.5 Flash (excluding Flash-Lite), extraction defaults to a thinking budget of `0`. Set `GEMINI_THINKING_BUDGET=-1` to restore dynamic thinking, or a supported token budget up to `24576` to tune accuracy and latency. Other models retain their default thinking settings.
- Parsing responses expose `auth`, `settings`, `extract`, and `parse` durations in `Server-Timing`; server logs record stage timings and fallback use without document contents or keys.

- Gemini uses the encrypted personal API key when configured, otherwise the system environment key. Locally accepted PDFs do not require an AI key.
- Parsing can fall back when Gemini fails, returns invalid output, or returns a weak document number.
- Document-number fallback uses deterministic extraction and placeholder generation from file names, descriptions, and detected tokens.
- Google Drive actions depend on an authenticated session with a linked Google account and a valid access token from `/api/google-token`.
