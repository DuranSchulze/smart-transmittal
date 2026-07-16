# Runbook

## Prerequisites

- Node.js installed
- access to a PostgreSQL database
- Google OAuth credentials for the enabled providers
- a Gemini API key if AI parsing should be enabled

## Install

```bash
npm install
```

## Required Environment Variables

Create an `.env` file in the project root and set the values required for your environment.

### Core App And Auth

- `DATABASE_URL`
  - PostgreSQL connection string
  - also used by the Prisma client configuration in `server/auth.ts`
- `DB_POOL_MAX`
  - optional maximum PostgreSQL connections per Fluid Compute instance
  - defaults to `5`; confirm the database connection limit before increasing it
- `BETTER_AUTH_SECRET`
  - secret used by Better Auth
- `BETTER_AUTH_URL`
  - server-side canonical auth base URL
  - example: `http://localhost:3000`
- `NEXT_PUBLIC_BETTER_AUTH_URL`
  - browser-visible auth base URL used by the client
  - if omitted, the client falls back to `window.location.origin`
- `BETTER_AUTH_TRUSTED_ORIGINS`
  - optional comma-separated trusted origins

### Google OAuth

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_DDS_CLIENT_ID`
- `GOOGLE_DDS_CLIENT_SECRET`

These power the `google` and `google-dds` Better Auth providers and are also used by `/api/google-token` when refreshing access tokens.

### Gemini Parsing

`services/geminiService.ts` checks these names in this order:

- `NEXT_PUBLIC_GEMINI_API_KEY`
- `NEXT_PUBLIC_GOOGLE_API_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_API_KEY`

Optional:

- `GEMINI_MODEL`
  - defaults to `gemini-2.5-flash`

### User AI Key Encryption

- `APP_SETTINGS_ENCRYPTION_KEY`
  - required for storing and reading user-saved Gemini API keys
  - used by `server/user-ai-settings.ts` for encryption/decryption
  - should be a strong secret and kept server-side only

### Export API

- `SEND_API_TOKEN`
  - required for `GET /api/export-transmittals`
  - send only in the `x-api-token` header; query-string tokens are rejected

## Database Setup

Generate the Prisma client and sync the schema:

```bash
npm run db:sync
```

Reset the database schema if needed:

```bash
npm run db:reset
```

> Never run `db:reset`, `prisma db push --force-reset`, or destructive migrations
> against production. The Vercel optimization work does not require a migration.

## Run Locally

Start the development server:

```bash
npm run dev
```

By default, the app is typically served from:

```text
http://localhost:3000
```

## Build And Start

Production build:

```bash
npm run build
```

Run the production server:

```bash
npm run start
```

## Vercel Fluid Compute

- `vercel.json` enables Fluid Compute and pins functions to Singapore (`sin1`).
- Verify that the production PostgreSQL database is also in Singapore before deployment.
- Keep a single function region for database-writing routes unless the database is replicated.
- Normal CRUD routes have a 15-second ceiling, auth and token routes 30 seconds,
  bulk export 30 seconds, and AI parsing 120 seconds.
- Better Auth uses a signed five-minute session cookie cache. Session revocation can
  therefore take up to five minutes to propagate to cached requests.

### Connection Budget Check

Before increasing `DB_POOL_MAX`, verify:

```text
DB_POOL_MAX × maximum concurrent Fluid instances < database connection limit
```

Reserve additional database connections for administration, migrations, and monitoring.

## Paginated Export API

Call `GET /api/export-transmittals?limit=100` with `x-api-token`. The response
contains `rows`, `nextCursor`, `hasMore`, and `exportedTransmittals`. Continue
requesting with `cursor=<nextCursor>` until `hasMore` is false. Limits must be
between 1 and 200 transmittals.

## Production Observability Review

Use Vercel Observability → Functions to review invocations, Active CPU,
provisioned-memory time, p50/p95/p99 duration, cold starts, and errors. Target
the transmittal list/detail routes, auth session checks, exports, parsing,
suggestions, agencies, and Google token route.

Sampled `api_request_complete` logs add status, total duration, database query
count, database time, and response bytes without recording document contents,
tokens, cookies, personal AI keys, or database URLs. Compare seven days before
and after deployment.

## Google Token Flow

The browser does not directly manage long-lived Google OAuth tokens.

Instead:

1. The user signs in through Better Auth.
2. The client calls `GET /api/google-token`.
3. The server loads the linked `Account` record.
4. If the access token is expired and a refresh token exists, the server refreshes it.
5. The server returns a usable access token to the client.

`services/googleDriveService.ts` uses this route for Drive and Sheets actions.

## Better Auth Redirect Notes

For local development, make sure your Google OAuth applications allow the callback URLs used by Better Auth under:

```text
/api/auth/callback/google
/api/auth/callback/google-dds
```

The full URL depends on `BETTER_AUTH_URL`.

Example local callback URLs:

```text
http://localhost:3000/api/auth/callback/google
http://localhost:3000/api/auth/callback/google-dds
```

## Available NPM Scripts

- `npm run dev`
- `npm run dev:clean`
- `npm run build`
- `npm run start`
- `npm run db:sync`
- `npm run db:reset`

## Troubleshooting

### Authentication Fails

- verify `BETTER_AUTH_SECRET`
- verify `BETTER_AUTH_URL`
- verify Google client IDs, secrets, and callback URLs
- verify trusted origins if `BETTER_AUTH_TRUSTED_ORIGINS` is set

### Google Drive Is Unavailable

- verify the signed-in user has a linked Google account
- verify `GET /api/google-token` succeeds
- verify the relevant Google client ID and secret are present
- if the token expired without a refresh token, sign in again

### Parsing Falls Back Instead Of Using AI

- verify one of the supported Gemini env vars is set
- verify the key is valid and not quota-limited
- if using personal AI keys, verify `APP_SETTINGS_ENCRYPTION_KEY` is configured
- verify `GET /api/user-ai-settings` and `PUT /api/user-ai-settings` work for the signed-in user
- remember that weak or generic document numbers are intentionally replaced by fallback logic

### Export API Returns 401

- verify `SEND_API_TOKEN` is configured
- verify the request supplies the same token in the `x-api-token` header
