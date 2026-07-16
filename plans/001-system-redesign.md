# Smart Transmittal — System Redesign & Architecture Refactor

> **Plan ID**: 001
> **Status**: 📋 Planning
> **Priority**: 🔴 High
> **Estimated Effort**: XL
> **Created**: 2026-07-15
> **Last Updated**: 2026-07-15

---

## 1. Executive Summary

### What

This plan encompasses a **full-system architecture refactor** of Smart Transmittal. The primary goal is to decompose the monolithic `components/main/App.tsx` (currently 2,641 lines, 70+ state variables, all business logic, API calls, file processing, and export logic in one component) into a clean, maintainable architecture with proper separation of concerns, state management, input validation, error handling, and TypeScript safety.

### Why

The current codebase has accumulated significant technical debt:

- **Single-component monolith**: `App.tsx` owns every `useState`, every `useEffect`, every API call, and every event handler. Adding any new feature requires touching this file.
- **No input validation**: API routes parse raw `request.json()` with no Zod schema, relying on manual `|| ""` fallbacks that silently accept malformed data.
- **Duplicated logic**: `ensureDbTransmittalPrefix`/`stripTransmittalPrefix` appear in both client and server. `POST` and `PUT` transmittal routes share near-identical recipient/item creation blocks.
- **Scattered cross-cutting concerns**: `localStorage` reads/writes for onboarding, AI prompts, and sheet IDs are sprinkled throughout the component. Auth token caching lives in a module-level variable. Status toast logic is copied across 15+ handlers.
- **Loose typing**: Extensive use of `any`, `as any`, and optional chaining on unstructured JSON objects from the API.
- **No error recovery**: A network failure during save silently loses the `AppData` state. No retry mechanism, no offline queue.
- **Missing auth on critical endpoint**: `POST /api/parse-transmittal` has no session check, making it a potential abuse vector.

### How

The redesign follows a **progressive extraction** strategy — no big-bang rewrite. Each concern is extracted incrementally:

1. **State Management Layer**: Extract all `AppData` state and mutations into a `useTransmittalDraft` hook with a reducer pattern.
2. **API Client Layer**: Centralize all `fetch()` calls into typed service functions with error handling and retry logic.
3. **Validation Layer**: Introduce Zod schemas for `AppData`, request bodies, and API responses. Validate at both client (forms) and server (route handlers) boundaries.
4. **Server Refactor**: Extract shared transmittal CRUD logic into `server/transmittal-service.ts`. Add Zod validation middleware. Secure the parse endpoint.
5. **Component Decomposition**: Split `App.tsx` into orchestrated container/presentational components. Each modal, tab, and panel becomes independently testable.
6. **Infrastructure**: Add proper `localStorage` abstraction, toast notification context, and consistent error boundary strategy.

### Scope Boundary

| IN Scope | OUT of Scope |
|---|---|
| Extract state management from `App.tsx` | Rewriting the DOCX generator (`services/docxGenerator.ts`) |
| Add Zod validation throughout | Changing the Gemini prompt/schema |
| Refactor API routes (shared logic, auth) | Migrating from Prisma to another ORM |
| Centralize API client layer | Adding a test framework (that's a follow-up plan) |
| Component decomposition | Changing the UI design system (Tailwind/shadcn stays) |
| Type safety improvements | SSR/hybrid rendering (stays client-heavy SPA) |
| `localStorage` and toast abstractions | Real-time collaboration features |
| Error boundary & retry strategy | Offline-first/PWA capabilities |

---

## 2. Current State Analysis

### Existing Code & Architecture

| File / Module | Current Role | Relevance to This Plan |
|---|---|---|
| `components/main/App.tsx` (2,641 lines) | Monolithic orchestrator: owns all state, API calls, imports, exports, modals, file processing, auth session, and UI layout | **Primary target** — will be decomposed into ~8 modules |
| `types.ts` (92 lines) | Core type definitions: `AppData`, `TransmittalItem`, `RecipientInfo`, etc. | Will gain Zod schemas alongside interfaces. `HistoryItem` is unused |
| `app/api/transmittals/route.ts` (216 lines) | `GET` + `POST` handlers for transmittal CRUD | Will refactor shared logic into `server/transmittal-service.ts` |
| `app/api/transmittals/[id]/route.ts` (292 lines) | `PATCH`, `DELETE`, `PUT` handlers | Contains duplicated recipient/item creation; will share logic with POST |
| `app/api/parse-transmittal/route.ts` | Gemini parsing endpoint | **Has no auth check** — must secure |
| `hooks/useFileProcessing.ts` (244 lines) | File upload preprocessing, image resizing, parsing queue | Well-structured — minimal changes needed |
| `services/geminiService.ts` (~560 lines) | Gemini parsing, document-number fallback | Well-isolated — minimal changes needed |
| `services/googleDriveService.ts` | Drive API wrapper with token management | Token cache uses module-level variable — should move to context |
| `services/googleSheetsService.ts` | Sheet read/write, `localStorage` for sheet ID | Sheet ID storage should move to shared `localStorage` abstraction |
| `services/docxGenerator.ts` | DOCX blob generation | No changes planned |
| `lib/auth-client.ts` (11 lines) | Better Auth client setup | No changes planned |
| `server/auth.ts` | Better Auth server config + Prisma | No changes planned |
| `prisma/schema.prisma` (196 lines) | Database models | Minor: add `updatedAt` index, consider nullable consistency |
| `app/layout.tsx` (78 lines) | Root layout, external scripts (html2pdf, GSI, GAPI), `OfflineAlert` | Will restructure script loading |
| `components/ErrorBoundary.tsx` (78 lines) | Single top-level error boundary | Will add granular boundaries at feature boundaries |
| `components/main/tabs/*.tsx` (6 files) | Tab content components | Will refactor to accept focused props instead of whole `AppData` |

### Pain Points / Gaps

| # | Pain Point | Location | Severity |
|---|---|---|---|
| 1 | `App.tsx` has 30+ `useState` calls and 15+ `useEffect` calls — impossible to reason about render cycles | `App.tsx:423-600` | 🔴 Critical |
| 2 | No input validation — API routes accept any JSON shape and silently default invalid fields | All API route files | 🔴 Critical |
| 3 | `POST /api/parse-transmittal` has no auth check — anyone can consume Gemini quota | `app/api/parse-transmittal/route.ts` | 🔴 Critical |
| 4 | Duplicate `ensureDbTransmittalPrefix` in 3 files (client + 2 API routes) | `App.tsx`, `transmittals/route.ts`, `[id]/route.ts` | 🟡 Medium |
| 5 | Duplicate recipient/item create blocks in `POST` and `PUT` transmittal handlers | `transmittals/route.ts:168-191`, `[id]/route.ts:252-277` | 🟡 Medium |
| 6 | `localStorage` reads/writes scattered across component with no abstraction | `App.tsx:481-503`, `App.tsx:809-817`, `App.tsx:859-863` | 🟡 Medium |
| 7 | Status toast logic (setMsg + setTimeout clear) duplicated 15+ times | Throughout `App.tsx` | 🟡 Medium |
| 8 | Google token cache as module-level mutable variable — not reactive, no invalidation on sign-out edge cases | `googleDriveService.ts:8-10` | 🟡 Medium |
| 9 | `HistoryItem` type in `types.ts` references old localStorage-based history, not DB | `types.ts:82-92` | 🟢 Low |
| 10 | CSV export uses simple comma join — no escaping for commas in data | `App.tsx:2136-2143` | 🟢 Low |
| 11 | Column name mismatch: `transmissionMethod.personalDelivery` → `handDelivery`, `grabLalamove` → `courier` | `types.ts` vs `schema.prisma` | 🟡 Medium |
| 12 | Extensive `any` typing erodes TypeScript safety — 40+ `as any` casts | Throughout `App.tsx` and API routes | 🟡 Medium |

---

## 3. Goals & Success Criteria

### Functional Goals

- [ ] All transmittal CRUD operations work identically to current behavior after refactor
- [ ] All import pipelines (local upload, Drive file, Drive folder, Sheets link, smart input) function unchanged
- [ ] All export pipelines (PDF, DOCX, CSV, Drive upload) function unchanged
- [ ] Auth flow (Google OAuth, DDS OAuth, session restore, sign-out) works identically
- [ ] Agency presets (create, update, delete, apply) work identically
- [ ] Onboarding tour and AI key prompt work identically
- [ ] Keyboard shortcut (Cmd/Ctrl+S) for save works identically
- [ ] `POST /api/parse-transmittal` requires valid session (security fix)
- [ ] Invalid API request bodies return 400 with descriptive Zod errors instead of 500

### Non-Functional Goals

- [ ] `App.tsx` reduced from 2,641 lines to under 400 lines (orchestration only)
- [ ] No single file exceeds 400 lines after refactor
- [ ] Zero new `any` type casts introduced
- [ ] Save operation has retry logic (up to 3 attempts with exponential backoff)
- [ ] Error boundaries at feature level prevent one feature crash from taking down the whole app
- [ ] Build passes with `npm run build` with zero TypeScript errors
- [ ] No runtime regressions — all existing user flows function identically

### Success Metrics

- **Maintainability**: A new developer can add a "receivedBy" field in under 30 minutes by touching only the relevant hook, tab component, and Zod schema
- **Reliability**: Save failures from transient network errors decrease by 90% (retry handles them)
- **Security**: Unauthenticated parse requests return 401 instead of consuming Gemini quota
- **Type Safety**: `strict` TypeScript mode passes across all new/extracted modules
- **Bundle Size**: No increase (extraction should not add weight; tree-shaking should help)

---

## 4. Design & Architecture

### System Impact Diagram

The refactor preserves the existing data flow but reorganizes the code layers:

```
┌─────────────────────────────────────────────────────────┐
│                    App.tsx (thin shell)                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐  │
│  │ Auth     │  │ Toast    │  │ Onboarding Provider    │  │
│  │ Provider │  │ Provider │  │                        │  │
│  └──────────┘  └──────────┘  └───────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │         useTransmittalDraft (Reducer Hook)         │   │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │   │
│  │  │ State    │  │ Actions  │  │ Side Effects    │  │   │
│  │  │ (AppData)│  │ (dispatch)│  │ (useEffect)    │  │   │
│  │  └──────────┘  └──────────┘  └────────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              API Client Layer                      │   │
│  │  transmittalApi  agencyApi  parseApi  driveApi   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Sidebar  │ │ Preview  │ │ Modals   │ │ Floating │   │
│  │ + Tabs   │ │ Panel    │ │ (8 total)│ │ Account  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└─────────────────────────────────────────────────────────┘

Server:
┌─────────────────────────────────────────────────────────┐
│  app/api/                                                │
│  ┌────────────────┐  ┌──────────────────────────────┐   │
│  │ Zod Middleware  │  │ server/transmittal-service.ts │   │
│  │ (validate body) │  │ (shared CRUD logic)           │   │
│  └────────────────┘  └──────────────────────────────┘   │
│  ┌────────────────┐  ┌──────────────────────────────┐   │
│  │ Zod Schemas    │  │ server/validation.ts           │   │
│  │ (shared types) │  │ (AppData schema, etc.)         │   │
│  └────────────────┘  └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Key Data Flows (unchanged behavior, reorganized code):**

1. **Save Flow**: `handleSaveTransmittal()` → `transmittalApi.save(data)` → `fetch(POST/PUT)` → Zod validates on server → `transmittal-service` → Prisma → Response
2. **Import Flow**: `useFileProcessing` → `parseApi.parseDocument(content)` → `fetch(POST /api/parse-transmittal)` → Gemini → ParseResult → `dispatch({ type: 'ADD_ITEMS', items })` 
3. **Load Flow**: `useEffect` on session → `transmittalApi.list()` + `agencyApi.list()` → `dispatch({ type: 'SET_SAVED_TRANSMITTALS' })` + `dispatch({ type: 'SET_AGENCIES' })`

### Data Model Changes

**No new models required.** Minor schema consistency improvements:

```prisma
model Transmittal {
  // ... existing fields ...

  // CHANGE: Make updatedAt non-nullable with @updatedAt (it already has @updatedAt but is nullable)
  updatedAt DateTime @updatedAt  // was: DateTime?

  // ADD: index for list queries sorted by update time
  @@index([userId, updatedAt])
}
```

This is a non-breaking change — `updatedAt` is already populated by Prisma on every write.

### API Surface Changes

| Method | Route | Auth | Change |
|---|---|---|---|
| GET | `/api/transmittals` | Required | Refactor: extract to `transmittal-service.listByUser()` |
| POST | `/api/transmittals` | Required | Refactor: extract to `transmittal-service.create()`, add Zod validation |
| PUT | `/api/transmittals/[id]` | Required | Refactor: extract to `transmittal-service.update()`, share code with POST |
| PATCH | `/api/transmittals/[id]` | Required | Add Zod validation for body |
| DELETE | `/api/transmittals/[id]` | Required | No functional change |
| GET | `/api/transmittals/next-number` | Required | No functional change |
| GET | `/api/agencies` | Required | No functional change |
| POST | `/api/agencies` | Required | Add Zod validation |
| PUT | `/api/agencies/[id]` | Required | Add Zod validation |
| DELETE | `/api/agencies/[id]` | Required | No functional change |
| GET | `/api/google-token` | Required | No functional change |
| POST | `/api/parse-transmittal` | **ADD auth** | ⚠️ Breaking security fix: requires valid session |
| GET | `/api/export-transmittals` | Token | No functional change |
| GET | `/api/transmittal-suggestions` | Required | No functional change |
| GET | `/api/user-ai-settings` | Required | No functional change |

### Type Changes (`types.ts`)

The existing interfaces remain as the canonical shapes. New additions:

```typescript
// NEW: Shared validation schemas (co-located with types for discoverability)
import { z } from 'zod';

export const TransmittalItemSchema = z.object({
  id: z.string(),
  qty: z.string(),
  noOfItems: z.string(),
  documentNumber: z.string(),
  description: z.string(),
  remarks: z.string(),
  fileType: z.enum(['upload', 'gdrive', 'link']).optional(),
  fileSource: z.string().optional(),
});

export const AppDataSchema = z.object({
  recipient: RecipientInfoSchema,
  project: ProjectInfoSchema,
  items: z.array(TransmittalItemSchema),
  sender: SenderInfoSchema,
  signatories: SignatoriesSchema,
  receivedBy: ReceivedBySchema,
  footerNotes: FooterNotesSchema,
  notes: z.string(),
  agencyId: z.string().nullable().optional(),
  transmissionMethod: z.object({
    personalDelivery: z.boolean(),
    pickUp: z.boolean(),
    grabLalamove: z.boolean(),
    registeredMail: z.boolean(),
  }),
});

// REMOVE: HistoryItem — no longer used (DB-backed history)
// export interface HistoryItem { ... }  ← DELETE

// NEW: Draft action types for the reducer
export type DraftAction =
  | { type: 'SET_DATA'; data: AppData }
  | { type: 'UPDATE_FIELD'; section: keyof AppData; field: string; value: unknown }
  | { type: 'ADD_ITEMS'; items: TransmittalItem[] }
  | { type: 'UPDATE_ITEM'; index: number; field: keyof TransmittalItem; value: string }
  | { type: 'REMOVE_ITEM'; index: number }
  | { type: 'MOVE_ITEM'; index: number; direction: 'up' | 'down' }
  | { type: 'REORDER_ITEMS'; fromIndex: number; toIndex: number }
  | { type: 'ADJUST_QTY'; index: number; delta: number }
  | { type: 'UPDATE_TRANSMISSION'; method: string; checked: boolean }
  | { type: 'RESET' };
```

---

## 5. Implementation Plan — File-Level Change Map

| # | File | Action | Description |
|---|---|---|---|
| 1 | `types.ts` | MODIFY | Add Zod schemas; add `DraftAction` union; remove unused `HistoryItem` |
| 2 | `lib/validation.ts` | CREATE | Re-export Zod schemas; add `validateAppData()`, `validatePartial()` helpers |
| 3 | `lib/storage.ts` | CREATE | Typed `localStorage` abstraction (`getItem`, `setItem`, `removeItem` with key constants) |
| 4 | `lib/toast.tsx` | CREATE | Toast notification context + `useToast()` hook (replaces scattered `setStatusMsg`/`setTimeout`) |
| 5 | `lib/api-client.ts` | CREATE | Centralized `fetch()` wrapper with auth, retry, and typed response handling |
| 6 | `services/transmittal-api.ts` | CREATE | `list()`, `get()`, `create()`, `update()`, `patch()`, `delete()`, `getNextNumber()`, `getSuggestions()` |
| 7 | `services/agency-api.ts` | CREATE | `list()`, `create()`, `update()`, `delete()` |
| 8 | `services/parse-api.ts` | CREATE | `parseDocument()`, wraps `POST /api/parse-transmittal` |
| 9 | `server/validation.ts` | CREATE | Server-side Zod schemas + `validateBody()` middleware helper |
| 10 | `server/transmittal-service.ts` | CREATE | Shared CRUD: `listByUser()`, `createTransmittal()`, `updateTransmittal()`, `deleteTransmittal()`, `generateNextNumber()` |
| 11 | `app/api/transmittals/route.ts` | MODIFY | Use `transmittal-service` + `validateBody()`; remove duplicated prefix logic |
| 12 | `app/api/transmittals/[id]/route.ts` | MODIFY | Use `transmittal-service` + `validateBody()`; remove duplicated recipient/item blocks |
| 13 | `app/api/parse-transmittal/route.ts` | MODIFY | **Add auth check**; add Zod validation for request body |
| 14 | `app/api/agencies/route.ts` | MODIFY | Add Zod validation |
| 15 | `app/api/agencies/[id]/route.ts` | MODIFY | Add Zod validation |
| 16 | `hooks/useTransmittalDraft.ts` | CREATE | Reducer-based state hook: `state`, `dispatch`, derived values |
| 17 | `hooks/useTransmittalPersistence.ts` | CREATE | Load transmittals + agencies on session; handle save with retry; coordinate with Sheets |
| 18 | `hooks/useDriveImport.ts` | CREATE | Drive file listing, selection, AI import orchestration |
| 19 | `hooks/useDocumentParsing.ts` | CREATE | Local file upload → parse → items pipeline |
| 20 | `hooks/useSmartImport.ts` | CREATE | Smart input analysis (Sheet/Drive link detection → import) |
| 21 | `hooks/useExport.ts` | CREATE | PDF/DOCX/CSV generation + Drive upload + download |
| 22 | `hooks/useAgencyManager.ts` | CREATE | Agency CRUD, logo upload, Drive logo import |
| 23 | `hooks/useOnboarding.ts` | CREATE | Tour state, AI key prompt, localStorage persistence |
| 24 | `components/main/AppProviders.tsx` | CREATE | Wraps `App` with ToastProvider, etc. |
| 25 | `components/main/App.tsx` | MODIFY | **Major reduction**: becomes thin orchestrator composing hooks and layout |
| 26 | `components/main/tabs/ContentTab.tsx` | MODIFY | Accept focused props instead of drilling through App |
| 27 | `components/main/tabs/SenderTab.tsx` | MODIFY | Accept focused props |
| 28 | `components/main/tabs/RecipientTab.tsx` | MODIFY | Accept focused props |
| 29 | `components/main/tabs/ProjectTab.tsx` | MODIFY | Accept focused props |
| 30 | `components/main/tabs/SignatoriesTab.tsx` | MODIFY | Accept focused props |
| 31 | `components/ErrorBoundary.tsx` | MODIFY | Add `ErrorBoundary` variant for feature-level boundaries (accept `fallback` prop) |
| 32 | `services/googleDriveService.ts` | MODIFY | Move token cache from module-level to a class/context-based cache |
| 33 | `lib/utils.ts` | MODIFY | Add `ensureTransmittalPrefix()` and `stripTransmittalPrefix()` as shared utils |
| 34 | `prisma/schema.prisma` | MODIFY | Make `Transmittal.updatedAt` non-nullable; add `@@index([userId, updatedAt])` |

### Detailed Change Specifications

#### `#1 — types.ts`

- **Action**: MODIFY — Add Zod schemas, DraftAction, remove HistoryItem
- **Why**: Zod schemas become the single source of truth for validation at both client and server boundaries. `DraftAction` enables type-safe reducer dispatch. `HistoryItem` references old localStorage history that no longer exists.
- **Changes**:
  - Add `import { z } from 'zod'` at top
  - Add `TransmittalItemSchema`, `RecipientInfoSchema`, `ProjectInfoSchema`, `SenderInfoSchema`, `SignatoriesSchema`, `ReceivedBySchema`, `FooterNotesSchema`, `AppDataSchema`
  - Add `DraftAction` discriminated union type
  - Remove `HistoryItem` interface
  - Keep all existing interfaces (they remain the runtime types)

#### `#2 — lib/validation.ts`

- **Action**: CREATE
- **Why**: Provides a single import point for validation. `validateAppData()` gives structured errors instead of silent fallbacks.
- **Shape**:
  ```typescript
  import { AppDataSchema, /* ... */ } from '@/types';
  
  export function validateAppData(data: unknown) { return AppDataSchema.safeParse(data); }
  export function validatePartialAppData(data: unknown) { return AppDataSchema.partial().safeParse(data); }
  export type ValidationResult<T> = z.SafeParseReturnType<unknown, T>;
  ```

#### `#3 — lib/storage.ts`

- **Action**: CREATE
- **Why**: All `localStorage` access goes through typed getters/setters with key constants. Prevents key typos and centralizes cleanup logic.
- **Shape**:
  ```typescript
  const KEYS = {
    ONBOARDING: 'transmittal_onboarding_state_v1',
    AI_PROMPT_DISMISS: (userId: string) => `transmittal_ai_key_prompt_dismissed_v1:${userId}`,
    SHEET_ID: 'transmittal_linked_sheet_id',
  } as const;
  
  export const storage = {
    getOnboardingState: () => localStorage.getItem(KEYS.ONBOARDING),
    setOnboardingState: (value: string) => localStorage.setItem(KEYS.ONBOARDING, value),
    // ... etc
  };
  ```

#### `#4 — lib/toast.tsx`

- **Action**: CREATE
- **Why**: Replaces 15+ duplicated `setStatusMsg`/`setTimeout` patterns. Provides `useToast()` with `toast.success()`, `toast.error()`, `toast.info()` that auto-dismiss.
- **Shape**: React context with `ToastProvider`, `useToast()` hook. Manages a queue of toasts with configurable duration. Each toast has `message`, `type` (`'success' | 'error' | 'info'`), and `duration`.

#### `#5 — lib/api-client.ts`

- **Action**: CREATE
- **Why**: Every `fetch()` call in `App.tsx` manually sets `credentials: 'include'`, parses JSON, checks `response.ok`, and throws. Centralize this with retry logic.
- **Shape**:
  ```typescript
  async function apiFetch<T>(url: string, options?: RequestInit & { retries?: number }): Promise<T> {
    const MAX_RETRIES = options?.retries ?? 0;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const response = await fetch(url, { credentials: 'include', ...options });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        if (attempt < MAX_RETRIES && response.status >= 500) {
          await sleep(1000 * Math.pow(2, attempt)); // exponential backoff
          continue;
        }
        throw new ApiError(response.status, error.error || 'Request failed');
      }
      return response.json();
    }
    throw new ApiError(0, 'Max retries exceeded');
  }
  ```

#### `#6 — services/transmittal-api.ts`

- **Action**: CREATE
- **Why**: All transmittal API calls in one place. Typed return values. Uses `apiFetch` from `#5`.
- **Functions**: `listTransmittals()`, `createTransmittal(data: AppData)`, `updateTransmittal(id: string, data: AppData)`, `patchTransmittal(id: string, fields)`, `deleteTransmittal(id: string)`, `getNextNumber()`, `getSuggestions()`

#### `#7 — services/agency-api.ts`

- **Action**: CREATE
- **Why**: Agency CRUD centralized.
- **Functions**: `listAgencies()`, `createAgency(agency)`, `updateAgency(id, agency)`, `deleteAgency(id)`

#### `#8 — services/parse-api.ts`

- **Action**: CREATE
- **Why**: Isolate parse endpoint calls.
- **Functions**: `parseDocument(content: string, mimeType: string, isText: boolean, fileName?: string): Promise<ParseResult>`

#### `#9 — server/validation.ts`

- **Action**: CREATE
- **Why**: Server-side Zod validation. Shared schemas (import from `types.ts` work on server too).
- **Functions**: `validateBody<T>(request: Request, schema: z.ZodSchema<T>): Promise<{ success: true; data: T } | { success: false; error: z.ZodError }>`

#### `#10 — server/transmittal-service.ts`

- **Action**: CREATE
- **Why**: Eliminates duplicated CRUD logic between `POST /api/transmittals` and `PUT /api/transmittals/[id]`.
- **Functions**:
  - `listByUser(userId: string)` — `db.transmittal.findMany({ where: { userId }, include: { items, recipients, agency } })`
  - `createTransmittal(userId: string, data: AppData)` — transaction with number generation, duplicate check, recipient/item creation
  - `updateTransmittal(id: string, userId: string, data: AppData)` — ownership check, duplicate check, deleteMany+create for recipients/items
  - `deleteTransmittal(id: string, userId: string)` — ownership check + delete
  - `generateNextNumber(userId: string)` — existing next-number logic
  - `mapTransmittalForApi(transmittal)` — shared response mapping (strip prefix)

#### `#11 — app/api/transmittals/route.ts`

- **Action**: MODIFY — Refactor to use `transmittal-service` and `validateBody`
- **Why**: Remove ~100 lines of duplicated logic. Route becomes thin: validate → call service → respond.
- **POST handler**: `validateBody(request, AppDataSchema)` → `createTransmittal(userId, data)` → respond
- **GET handler**: `listByUser(userId)` → respond

#### `#12 — app/api/transmittals/[id]/route.ts`

- **Action**: MODIFY — Refactor to use `transmittal-service` and `validateBody`
- **Why**: Remove duplicated recipient/item creation block. PATCH and PUT share validation.
- **PUT handler**: `validateBody(request, AppDataSchema)` → `updateTransmittal(id, userId, data)` → respond
- **PATCH handler**: Validate partial body → update specific fields
- **DELETE handler**: `deleteTransmittal(id, userId)` → respond

#### `#13 — app/api/parse-transmittal/route.ts`

- **Action**: MODIFY — **Add auth check** + Zod validation
- **Why**: Security fix. Currently anyone can call this endpoint and consume Gemini quota.
- **Changes**:
  ```typescript
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  ```
  Add Zod schema for `{ content: z.string(), mimeType: z.string(), isText: z.boolean().optional(), fileName: z.string().optional() }`

#### `#14–15 — Agency API routes`

- **Action**: MODIFY — Add `validateBody()` with agency Zod schema
- **Why**: Prevent invalid agency data from reaching the database.

#### `#16 — hooks/useTransmittalDraft.ts`

- **Action**: CREATE — Core state management hook
- **Why**: Replaces all `useState<AppData>` and 15+ setter functions in `App.tsx`. Single `dispatch` function handles all state transitions.
- **Shape**:
  ```typescript
  function draftReducer(state: AppData, action: DraftAction): AppData { /* ... */ }
  
  export function useTransmittalDraft() {
    const [state, dispatch] = useReducer(draftReducer, createInitialData());
    const hasFormData = useMemo(() => /* existing check */, [state]);
    
    return {
      data: state,
      dispatch,
      hasFormData,
      // Convenience action creators
      updateField: (section, field, value) => dispatch({ type: 'UPDATE_FIELD', section, field, value }),
      addItems: (items) => dispatch({ type: 'ADD_ITEMS', items }),
      // ... etc
    };
  }
  ```

#### `#17 — hooks/useTransmittalPersistence.ts`

- **Action**: CREATE
- **Why**: Encapsulates all load/save/delete logic with retry, error handling, and Sheet sync.
- **Shape**: `useTransmittalPersistence({ apiBaseUrl, data, activeTransmittalId, dispatch, toast })` returns `{ savedTransmittals, loadFromDb, saveToDb, deleteFromDb, openTransmittal, copyTransmittal }`

#### `#18 — hooks/useDriveImport.ts`

- **Action**: CREATE
- **Why**: Extracts ~200 lines of Drive modal, search, selection, and import logic.
- **Shape**: `useDriveImport({ apiBaseUrl, dispatch, toast })` returns `{ driveFiles, isOpen, openModal, closeModal, search, toggle, toggleAll, importSelected, isLoading, ... }`

#### `#19 — hooks/useDocumentParsing.ts`

- **Action**: CREATE
- **Why**: Extracts local file upload → parse → add items pipeline.
- **Shape**: `useDocumentParsing({ apiBaseUrl, dispatch, toast })` returns `{ processFiles, isProcessing, progress, uploadFiles, ... }`

#### `#20 — hooks/useSmartImport.ts`

- **Action**: CREATE
- **Why**: Extracts smart input text analysis (Sheet/Drive link detection → import).
- **Shape**: `useSmartImport({ apiBaseUrl, isDriveReady, dispatch, toast })` returns `{ smartInput, setSmartInput, analyze, isAnalyzing }`

#### `#21 — hooks/useExport.ts`

- **Action**: CREATE
- **Why**: Extracts PDF, DOCX, CSV generation + Drive upload + local download.
- **Shape**: `useExport({ data, toast })` returns `{ exportPdf, exportDocx, exportCsv, previewDocx, isGenerating, ... }`

#### `#22 — hooks/useAgencyManager.ts`

- **Action**: CREATE
- **Why**: Extracts agency CRUD, logo handling, Drive logo import.
- **Shape**: `useAgencyManager({ apiBaseUrl, dispatch, toast })` returns `{ agencies, selectedId, selectAgency, createAgency, updateAgency, deleteAgency, ... }`

#### `#23 — hooks/useOnboarding.ts`

- **Action**: CREATE
- **Why**: Extracts tour state and AI key prompt logic with localStorage.
- **Shape**: `useOnboarding({ userId })` returns `{ isTourOpen, tourStep, nextStep, prevStep, skipTour, finishTour, startTour, isAiPromptOpen, dismissAiPrompt, ... }`

#### `#24 — components/main/AppProviders.tsx`

- **Action**: CREATE
- **Why**: Provides React context providers at the app root without cluttering `App.tsx`.
- **Shape**: Wraps children in `<ToastProvider>`. Future providers (Theme, etc.) go here.

#### `#25 — components/main/App.tsx`

- **Action**: MODIFY — **Massive reduction** to thin orchestrator
- **Why**: After extracting all hooks, `App.tsx` becomes ~300–400 lines that:
  1. Calls `useSession()` for auth
  2. Calls all extracted hooks
  3. Renders the layout shell + passes props to tabs and modals
- **Before**: 2,641 lines, 30+ useState, 15+ useEffect
- **After**: ~350 lines, 0 useState (all in hooks), 2 useEffect (auth redirect + keyboard shortcut)

#### `#26–30 — Tab components`

- **Action**: MODIFY — Accept focused props
- **Why**: Currently some tabs receive whole objects; refactor to accept only the slices they need for cleaner interfaces and easier testing.

#### `#31 — components/ErrorBoundary.tsx`

- **Action**: MODIFY — Add `fallback` prop for feature-level boundaries
- **Why**: Currently only one top-level boundary. We'll wrap each major section (sidebar, preview, modals) with its own boundary so a crash in the Drive modal doesn't take down the whole app.

#### `#32 — services/googleDriveService.ts`

- **Action**: MODIFY — Refactor token cache
- **Why**: Module-level `cachedAccessToken` is invisible to React and doesn't react to sign-out. Move to a simple class or context.
- **Change**: Export a `DriveTokenManager` class with `getToken()`, `clearToken()`. `App.tsx` creates one instance and passes it down. `clearGoogleToken()` calls `tokenManager.clearToken()`.

#### `#33 — lib/utils.ts`

- **Action**: MODIFY — Add shared prefix utilities
- **Why**: `ensureDbTransmittalPrefix` and `stripTransmittalPrefix` are duplicated across 3 files. Move to one shared location.

#### `#34 — prisma/schema.prisma`

- **Action**: MODIFY — Minor schema cleanup
- **Why**: `updatedAt` is marked `DateTime?` but always set by `@updatedAt`. Making it non-nullable catches missing-update bugs. Adding the index improves list-load performance.
- **Changes**:
  - Line 102: `updatedAt DateTime @updatedAt` (remove `?`)
  - Add: `@@index([userId, updatedAt])` on `Transmittal`

---

## 6. Implementation Checklist

| Done | Task | File(s) | Dependencies | Notes |
|---|---|---|---|---|
| ⬜ | 1. Add Zod dependency | `package.json` | — | `npm install zod` |
| ⬜ | 2. Add shared prefix utilities | `lib/utils.ts` | — | Move `ensureDbTransmittalPrefix`, `stripTransmittalPrefix` |
| ⬜ | 3. Add Zod schemas to types | `types.ts` | #1 | All interfaces get corresponding schemas; remove `HistoryItem` |
| ⬜ | 4. Create validation helpers | `lib/validation.ts` | #1, #3 | `validateAppData()`, `validatePartial()` |
| ⬜ | 5. Create localStorage abstraction | `lib/storage.ts` | — | Typed keys, getter/setter for onboarding, AI prompt, sheet ID |
| ⬜ | 6. Create Toast notification system | `lib/toast.tsx` | — | `ToastProvider`, `useToast()` with success/error/info |
| ⬜ | 7. Create API client wrapper | `lib/api-client.ts` | — | `apiFetch()` with retry, `ApiError` class |
| ⬜ | 8. Create transmittal API service | `services/transmittal-api.ts` | #7 | `list()`, `create()`, `update()`, `patch()`, `delete()`, `getNextNumber()`, `getSuggestions()` |
| ⬜ | 9. Create agency API service | `services/agency-api.ts` | #7 | `list()`, `create()`, `update()`, `delete()` |
| ⬜ | 10. Create parse API service | `services/parse-api.ts` | #7 | `parseDocument()` |
| ⬜ | 11. Create server validation helper | `server/validation.ts` | #1, #3 | `validateBody()` middleware |
| ⬜ | 12. Create server transmittal service | `server/transmittal-service.ts` | #2, #11 | `listByUser()`, `createTransmittal()`, `updateTransmittal()`, `deleteTransmittal()`, `generateNextNumber()`, `mapForApi()` |
| ⬜ | 13. Refactor POST/GET transmittals route | `app/api/transmittals/route.ts` | #12, #11 | Use service + validateBody |
| ⬜ | 14. Refactor PUT/PATCH/DELETE transmittal route | `app/api/transmittals/[id]/route.ts` | #12, #11 | Use service + validateBody |
| ⬜ | 15. Add auth + validation to parse route | `app/api/parse-transmittal/route.ts` | #11 | Session check + Zod body validation |
| ⬜ | 16. Add validation to agency routes | `app/api/agencies/route.ts`, `app/api/agencies/[id]/route.ts` | #11 | Zod body validation |
| ⬜ | 17. Create useTransmittalDraft hook | `hooks/useTransmittalDraft.ts` | #3 | Reducer + dispatch + derived values |
| ⬜ | 18. Create useTransmittalPersistence hook | `hooks/useTransmittalPersistence.ts` | #8, #17, #5 | Load/save with retry + Sheet sync |
| ⬜ | 19. Create useDriveImport hook | `hooks/useDriveImport.ts` | #8, #10, #17 | Drive listing, selection, AI import |
| ⬜ | 20. Create useDocumentParsing hook | `hooks/useDocumentParsing.ts` | #10, #17 | File upload → parse → items |
| ⬜ | 21. Create useSmartImport hook | `hooks/useSmartImport.ts` | #8, #10, #17, #19 | Smart input analysis |
| ⬜ | 22. Create useExport hook | `hooks/useExport.ts` | #17 | PDF/DOCX/CSV + Drive upload |
| ⬜ | 23. Create useAgencyManager hook | `hooks/useAgencyManager.ts` | #9, #17, #5 | Agency CRUD + logo |
| ⬜ | 24. Create useOnboarding hook | `hooks/useOnboarding.ts` | #5 | Tour + AI prompt + localStorage |
| ⬜ | 25. Create AppProviders wrapper | `components/main/AppProviders.tsx` | #6 | ToastProvider wrapping |
| ⬜ | 26. Refactor Google Drive token cache | `services/googleDriveService.ts` | — | Class-based token manager |
| ⬜ | 27. Enhance ErrorBoundary | `components/ErrorBoundary.tsx` | — | Add `fallback` prop for feature boundaries |
| ⬜ | 28. Refactor App.tsx (major reduction) | `components/main/App.tsx` | #17–24 | Orchestrator only: compose hooks, render layout |
| ⬜ | 29. Update tab components | `components/main/tabs/*.tsx` | #17 | Focused props |
| ⬜ | 30. Schema cleanup | `prisma/schema.prisma` | — | Non-nullable `updatedAt`, add index |
| ⬜ | 31. Run DB migration | — | #30 | `npx prisma db push` |
| ⬜ | 32. Full build verification | — | #1–31 | `npm run build` — must pass with zero errors |
| ⬜ | 33. Manual QA — Full user flow | — | #32 | Sign in → create → import → edit → save → export → reopen → delete |
| ⬜ | 34. Manual QA — Error states | — | #32 | Network offline, invalid data, auth expiry, Drive disconnect |
| ⬜ | 35. Manual QA — Security | — | #15 | Unauthenticated request to `/api/parse-transmittal` → 401 |

---

## 7. Edge Cases & Error Handling

| Edge Case | Handling Strategy |
|---|---|
| **Network failure during save** | `apiFetch` retries up to 3 times with exponential backoff (1s, 2s, 4s). On final failure, toast error with "Save failed — your data is still in the form. Please try again." `AppData` remains intact in memory. |
| **Concurrent tab editing same transmittal** | Last-write-wins (current behavior preserved). Server-side duplicate transmittal number check catches conflicts. Toast notifies user if save fails due to conflict. |
| **Empty/invalid API request body** | Zod validation returns 400 with `{ error: 'Validation failed', details: [{ path: 'recipient.to', message: 'Required' }] }`. Client-side validation catches most issues before submission. |
| **Session expiry mid-session** | `apiFetch` detects 401 → dispatches sign-out → `LoginScreen` renders. Current draft data is lost (acceptable — user was inactive). |
| **Gemini API key missing (no env key, no user key)** | `geminiService.ts` already falls back to regex parser. Parse endpoint returns fallback items with `fallbackCount > 0`. Client displays "Document # fallback was used" message. |
| **Gemini API rate limited** | `parse-transmittal` endpoint returns 429. Client `useFileProcessing` already uses sequential queue with 1.2s delay. No additional server-side rate limiting in this plan. |
| **Google Drive token expired during import** | `driveApiFetch` auto-retries once with fresh token on 401. If refresh fails, toast "Drive access expired. Please sign in again." |
| **PDF generation fails (html2pdf not loaded)** | `handlePrint` checks `!window.html2pdf` → returns silently. Toast "PDF generation unavailable. Please refresh the page." |
| **DOCX generation fails** | `handleDownloadDocx` catches error → `setIsGeneratingDocx(false)`. Toast with friendly error. No partial download. |
| **Large dataset (>500 items)** | Current implementation loads all items into memory. **Out of scope for this plan** — will address in a future performance plan (virtualization/pagination). |
| **User closes tab with unsaved data** | `beforeunload` event listener (existing pattern not currently implemented — **add in this plan**). Shows browser native "You have unsaved changes" dialog. |
| **Malformed CSV data (commas in fields)** | Current implementation: simple comma join (broken). **Fix in this plan**: Use proper CSV escaping (wrap fields with commas in quotes, double-quote escaping). |

---

## 8. Testing Strategy

### Unit Tests (Recommended — Not Mandatory for This Plan)

- Test `draftReducer()` with each `DraftAction` type:
  - `ADD_ITEMS` with empty array → no change
  - `ADD_ITEMS` with items → items appended and reindexed
  - `REMOVE_ITEM` at valid index → item removed, remaining reindexed
  - `REMOVE_ITEM` at invalid index → no change
  - `ADJUST_QTY` with various deltas → qty updated, minimum 1 enforced
  - `REORDER_ITEMS` → items reordered and reindexed
- Test `validateAppData()`:
  - Valid `AppData` → `success: true`
  - Missing `recipient.to` → `success: false` with path error
  - Invalid `fileType` → `success: false`
- Test `ensureTransmittalPrefix()` / `stripTransmittalPrefix()`:
  - `"001"` → `"TR-FP-001"` → `"001"` (roundtrip)
  - Empty string → `""`
  - Already prefixed → unchanged

### Integration Tests

- **API Route Tests** (using `fetch` against a test server):
  - `POST /api/transmittals` with valid data + session → 200, transmittal created
  - `POST /api/transmittals` with invalid data (missing recipient.to) → 400 with Zod errors
  - `POST /api/transmittals` without session → 401
  - `POST /api/parse-transmittal` without session → **401** (was 200 before this plan)
  - `PUT /api/transmittals/[id]` with valid data → 200
  - `PUT /api/transmittals/[id]` for another user's transmittal → 404
  - `DELETE /api/transmittals/[id]` → 200, record removed
  - Duplicate transmittal number on create → 409

### E2E / Manual Tests

- [ ] User signs in with Google → session restores → transmittals load
- [ ] User creates new transmittal → fills all tabs → saves → reopens → data matches
- [ ] User imports PDF file → items appear in preview with AI-extracted data
- [ ] User imports Google Drive folder → files listed → selected → imported
- [ ] User pastes Google Sheets link → rows imported as items
- [ ] User exports PDF → downloads file → opens correctly
- [ ] User exports DOCX → downloads file → opens in Word
- [ ] User exports CSV → downloads file → opens in Excel with proper columns
- [ ] User uploads export to Google Drive → file appears in selected folder
- [ ] User copies a transmittal → new draft with fresh number, all data preserved
- [ ] User deletes a transmittal → removed from list, active draft resets if it was the active one
- [ ] Network disconnected → save fails → toast appears → data retained → retry on reconnect succeeds
- [ ] Unauthenticated request to parse endpoint → 401
- [ ] Tab close with unsaved data → browser confirmation dialog
- [ ] Works on Chrome, Firefox, Safari (latest 2 versions)

---

## 9. Rollout & Migration

### Database Migration

```bash
# After updating prisma/schema.prisma (#30):
npx prisma db push
```

**Backward compatibility**: ✅ Yes. The only schema change is making `updatedAt` non-nullable — all existing rows already have this field populated by Prisma. The new index is additive. No data migration needed.

### Environment Variables

No new environment variables required. Existing set continues to work:
- `NEXT_PUBLIC_BETTER_AUTH_URL`
- `DATABASE_URL`
- `GEMINI_API_KEY` (optional — user-level key takes precedence)
- `SEND_API_TOKEN`

### New Dependency

```bash
npm install zod
```

Zod (v3.24+) is already in `package.json` as a dependency. No new package needed.

### Deployment Checklist

- [ ] Run `npm install` (ensure zod is installed)
- [ ] Run `npx prisma generate` (regenerate client after schema change)
- [ ] Run `npx prisma db push` (apply schema change)
- [ ] Run `npm run build` — must pass with zero errors
- [ ] Smoke test on staging: sign in, create transmittal, save, reopen, delete
- [ ] Smoke test security: curl parse endpoint without cookie → 401
- [ ] Deploy to production
- [ ] Monitor error logs for 24 hours for unexpected validation errors
- [ ] Monitor Gemini API usage — should decrease (no more unauthenticated requests)

### Rollback Plan

If critical issues are found after deployment:

1. **Revert the deployment** to the previous build (the refactor preserves identical API contracts — form data shapes are unchanged).
2. **Database**: No destructive changes. The `updatedAt` non-nullable change and new index are backward-compatible — no rollback needed.
3. **Monitor**: If Zod validation is too strict (rejecting previously-accepted data), adjust schemas to be more permissive (use `.optional()` for fields that were historically empty).

---

## 10. Open Questions & Risks

| # | Question / Risk | Severity | Owner | Resolution |
|---|---|---|---|---|
| 1 | Will extracting `useTransmittalDraft` with `useReducer` cause performance issues with 30+ fields? | 🟡 Medium | — | `useReducer` with a pure reducer function is generally faster than 30 `useState` calls (fewer re-renders). If needed, split into sub-reducers. Not a blocker. |
| 2 | Should we introduce React Query / TanStack Query for API caching? | 🟢 Low | — | Out of scope for this plan. Current simple fetch pattern is sufficient. Can adopt React Query in a future plan if we need caching, stale-while-revalidate, or optimistic updates. |
| 3 | The `transmissionMethod` field names in `types.ts` (`personalDelivery`, `grabLalamove`) differ from Prisma (`handDelivery`, `courier`). Should we align them? | 🟡 Medium | — | **Yes, but in a separate plan.** Renaming database columns requires a migration and temporarily breaks the API. Do this as a follow-up PR (#005 or similar). |
| 4 | Adding auth to `parse-transmittal` will break any external integrations using it without auth. Do any exist? | 🔴 High | — | **Needs investigation before deployment.** Check server logs for unauthenticated requests to `/api/parse-transmittal`. If external services depend on this, add a separate API key auth path alongside session auth. |
| 5 | `App.tsx` at 2,641 lines — extracting hooks is safe but tedious. Risk of introducing subtle behavioral differences. | 🔴 High | — | **Mitigation**: Extract one hook at a time, test each in isolation. Start with `useToast` (pure addition), then `useOnboarding` (isolated concern), then `useTransmittalDraft` (core). Save extraction for last. Run full manual QA after each extraction. |

---

## 11. References

- **Architecture**: `docs/ARCHITECTURE.md` — current module boundaries, runtime flow, API surface
- **System Overview**: `docs/SYSTEM_OVERVIEW.md` — primary workflow, import/export options, constraints
- **Database Schema**: `prisma/schema.prisma` — all Prisma models
- **Core Types**: `types.ts` — all client-side interfaces
- **Related Plans**:
  - `plans/002-auto-save.md` — "Save as draft or auto save feature" (complementary — this plan adds the save retry infrastructure that auto-save can build on)
  - `plans/003-flow-redesign.md` — "Fixing the whole flow preserving its natural core functions" (complementary — this plan provides the architectural foundation for flow changes)
- **External Docs**:
  - [Zod Documentation](https://zod.dev/) — schema validation
  - [React useReducer](https://react.dev/reference/react/useReducer) — reducer pattern
  - [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) — API route patterns
  - [Prisma Relations](https://www.prisma.io/docs/orm/prisma-schema/relations) — schema design
  - [Better Auth Session](https://www.better-auth.com/docs/concepts/session) — session management
