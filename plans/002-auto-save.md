# Auto-Save & Draft Protection

> **Plan ID**: 002
> **Status**: 📋 Planning
> **Priority**: 🔴 High
> **Estimated Effort**: M
> **Created**: 2026-07-15
> **Last Updated**: 2026-07-15

---

## 1. Executive Summary

### What

This plan adds **automatic draft saving** and **unsaved-changes protection** to the Smart Transmittal editor. When a user is actively filling out a transmittal form and switches tabs, closes the browser, or navigates away, the system will automatically persist their work as a draft and warn them before losing data.

### Why

Currently, the only way to persist work is **manual save** via `Cmd+S` or the File → Save menu item. If the user accidentally closes the tab, navigates away, their browser crashes, or their session expires, **all unsaved work is permanently lost**. There is no recovery mechanism and no warning. This is a critical data-loss risk for users who spend 15–30 minutes building a transmittal with dozens of imported items.

The `hasFormData` check already exists in the codebase (lines 2210–2229 of `App.tsx`) and correctly detects when the user has entered meaningful data — it just isn't wired to any protection mechanism.

### How

The implementation has three coordinated pieces:

1. **Draft tracking** — A `dirty` flag marks the form as modified since the last save. A new `isDraft` boolean on the `Transmittal` model distinguishes auto-saved drafts from finalized transmittals.

2. **Debounced auto-save** — A 3-second debounce after the last user edit triggers a silent save (no toast, no interruption). The first auto-save creates the transmittal as a draft; subsequent auto-saves update the same draft. The user's explicit `Cmd+S` or Save button click finalizes the draft (sets `isDraft: false`).

3. **Tab-close protection** — A `beforeunload` event listener warns the user when the `dirty` flag is set. A `visibilitychange` listener triggers an immediate save when the user switches away from the tab.

### Scope Boundary

| IN Scope | OUT of Scope |
|---|---|
| Debounced auto-save on user edits | Offline-first save queue (requires service worker) |
| Window blur / tab switch triggers immediate save | Multi-tab synchronization |
| `beforeunload` browser warning on unsaved changes | Conflict resolution for simultaneous edits |
| `isDraft` flag on transmittal records | Draft version history / undo stack |
| Draft cleanup (optional, on new transmittal creation) | Auto-save for agency presets |
| Visual "Saving..." / "Draft saved" indicator | Collaborative / real-time editing |
| Debounce configurable via constant (not user setting) | User-configurable auto-save interval |

---

## 2. Current State Analysis

### Existing Code & Architecture

| File / Module | Current Role | Relevance to This Plan |
|---|---|---|
| `components/main/App.tsx` (lines 2151–2169) | `handleSaveTransmittal()` — manual save trigger with duplicate validation | Will gain debounced auto-save wrapper and dirty tracking |
| `components/main/App.tsx` (lines 1007–1061) | `saveTransmittalToDb()` — actual fetch POST/PUT with response handling | Will gain `isDraft` parameter; auto-save skips toast and Sheet sync |
| `components/main/App.tsx` (lines 2210–2229) | `hasFormData` — detects meaningful form content | Will power the `dirty` flag comparator |
| `components/main/App.tsx` (lines 2171–2186) | Cmd+S keyboard shortcut | Will remain as explicit save; auto-save is separate |
| `components/main/SidebarFooter.tsx` (lines 137–141) | File → Save menu item + Cmd+S shortcut rendering | Auto-save status indicator will go here |
| `app/api/transmittals/route.ts` | `POST /api/transmittals` — creates transmittal with number generation | Will accept `isDraft` in body |
| `app/api/transmittals/[id]/route.ts` | `PUT /api/transmittals/[id]` — updates transmittal | Will accept `isDraft` in body |
| `prisma/schema.prisma` (line 92–139) | `Transmittal` model | Will gain `isDraft` boolean field |
| `components/main/App.tsx` (lines 240–292) | `createInitialData()` — fresh form defaults | Will be compared against to detect `dirty` state |

### Pain Points / Gaps

| # | Pain Point | Impact |
|---|---|---|
| 1 | **No auto-save** — all persistence is manual | Data loss if browser crashes, tab closes, or session expires unexpectedly |
| 2 | **No beforeunload warning** — tab can close silently with unsaved work | Users lose 15–30 min of work with no warning |
| 3 | **No visibilitychange handler** — switching tabs does nothing | User assumes their work is safe when switching to reference another tab |
| 4 | **No dirty tracking** — `hasFormData` detects data but isn't compared to last saved state | Can't distinguish "unchanged since save" from "modified since save" |
| 5 | **Save requires a valid transmittal number** — duplicate check blocks save if number conflicts | Auto-save must handle this gracefully (skip or use generated number) |
| 6 | **Save always shows toast** — "Transmittal saved/updated" every time | Would be annoying if firing every 3 seconds |

---

## 3. Goals & Success Criteria

### Functional Goals

- [ ] User's form data is automatically saved as a draft within 3 seconds of their last edit
- [ ] Switching browser tabs or minimizing the window triggers an immediate draft save
- [ ] Closing the browser tab with unsaved changes shows a native "Leave site?" confirmation dialog
- [ ] Explicit save (Cmd+S or Save button) finalizes the draft (marks it as non-draft)
- [ ] Draft transmittals are visible in the Open Transmittal list, marked with a "Draft" badge
- [ ] Creating a new transmittal clears the previous draft from the form
- [ ] Auto-save does not fire during active file processing (parsing/importing)

### Non-Functional Goals

- [ ] Auto-save debounce is 3 seconds (configurable via a single constant)
- [ ] Auto-save network requests are silent — no toast notification, no status message
- [ ] Auto-save does not append to Google Sheets (only explicit save does)
- [ ] `beforeunload` fires only when `dirty` is true, not after every save
- [ ] Zero impact on existing manual save behavior

### Success Metrics

- **Data loss prevention**: Users who accidentally close tabs or crash during editing recover their work from the last draft 100% of the time
- **Perceived performance**: Auto-save is invisible to the user — no UI jank, no focus stealing, no unnecessary re-renders
- **Adoption**: Existing manual save users are not disrupted (Cmd+S still works, Save button unchanged)
- **Network efficiency**: Auto-save sends minimal payloads (PUT is small for simple edits; POST only on first save)

---

## 4. Design & Architecture

### System Impact Diagram

```
User types in form field
        │
        ▼
onChange handler fires
        │
        ├──▶ setData(...) updates state immediately (no change)
        │
        └──▶ setDirty(true) marks form as modified
                │
                ▼
        debouncedAutoSave() schedules save after 3s idle
                │
                ▼ (3 seconds pass with no new edits)
        saveTransmittalToDb({ isDraft: true, silent: true })
                │
                ├──▶ activeTransmittalId exists?
                │       ├── YES → PUT /api/transmittals/[id] { data, isDraft: true }
                │       └── NO  → POST /api/transmittals { data, isDraft: true }
                │                    └──▶ sets activeTransmittalId from response
                │
                └──▶ setDirty(false) — form is now in sync with server

User switches tabs (visibilitychange → 'hidden')
        │
        ▼
Immediate save (no debounce): saveTransmittalToDb({ isDraft: true, silent: true })

User presses Cmd+S or clicks Save
        │
        ▼
saveTransmittalToDb({ isDraft: false, silent: false })
        │
        ├──▶ Finalizes the draft
        ├──▶ Shows "Transmittal saved" toast
        ├──▶ Appends to Google Sheets (if linked)
        └──▶ setDirty(false)

User tries to close tab
        │
        ▼
beforeunload event fires
        │
        ├──▶ dirty === true?
        │       └── YES → event.preventDefault() → browser shows "Leave site?" dialog
        │       └── NO  → allow close
```

### Data Model Changes

Add a single boolean field to the `Transmittal` model:

```prisma
model Transmittal {
  // ... existing fields ...

  isDraft   Boolean  @default(true)  // NEW: true = auto-saved draft, false = finalized

  // ... existing fields ...
}
```

- **Default `true`**: All new transmittals start as drafts. The explicit Save action sets it to `false`.
- **Backward compatibility**: Existing transmittals in the database have no `isDraft` field. The Prisma migration will add it with a default of `false` for existing rows (they were all manually saved).
- **Index**: No additional index needed — draft filtering happens on the client side from the already-loaded transmittal list.

Migration approach:

```prisma
// Step 1: Add field as optional with default
isDraft Boolean? @default(true)

// Step 2: Backfill existing records
// UPDATE "transmittal" SET "isDraft" = false WHERE "isDraft" IS NULL;

// Step 3: Make required
isDraft Boolean @default(true)
```

For simplicity with `prisma db push`, we can add it as non-nullable with a default — Prisma will handle the backfill:

```prisma
isDraft Boolean @default(false) // existing records get false; new records start as true via application code
```

Wait — we want `@default(true)` so new records are drafts by default. But existing records should be `false` (they were manually saved). Since Prisma's `db push` doesn't backfill, we need to handle this:

**Recommended migration**: Add as `Boolean @default(false)` in the schema, then set `isDraft: true` explicitly in the application code when creating via auto-save, and `isDraft: false` when creating via manual save.

```prisma
isDraft Boolean @default(false)
```

### API Surface Changes

| Method | Route | Auth | Change |
|---|---|---|---|
| POST | `/api/transmittals` | Required | Accept optional `isDraft: boolean` in body. Default `false` for backward compat. |
| PUT | `/api/transmittals/[id]` | Required | Accept optional `isDraft: boolean` in body. When `isDraft: false`, perform full validation (duplicate number check). When `isDraft: true`, skip duplicate number check. |

**Key design decision**: Auto-save (`isDraft: true`) **skips the duplicate transmittal number check**. This is critical because:

1. Auto-save fires while the user is mid-edit — their transmittal number may be a placeholder or duplicate
2. Blocking auto-save on number validation would cause silent failures and data loss
3. The duplicate check only matters at finalization time (explicit save)

Server-side changes to `POST`:
```typescript
// In app/api/transmittals/route.ts POST handler:
const isDraft = body?.isDraft === true;
// ...
// When isDraft is true and no number is provided, use a temporary generated number
// When isDraft is false (or absent), do full duplicate checking (existing behavior)
```

Server-side changes to `PUT`:
```typescript
// In app/api/transmittals/[id]/route.ts PUT handler:
const isDraft = body?.isDraft === true;
// ...
// When isDraft is true, skip dbTransmittalNumber duplicate check
// Always include isDraft in the update data
```

### Type Changes (`types.ts`)

No new interfaces needed. The `isDraft` flag flows through the existing `AppData` → API request path without being part of `AppData` itself (it's a metadata parameter on the save call).

However, the `SavedTransmittalRecord` type in `App.tsx` (used for the transmittal list) should include the `isDraft` field:

```typescript
// In App.tsx, add to SavedTransmittalRecord:
type SavedTransmittalRecord = {
  // ... existing fields ...
  isDraft?: boolean;  // NEW
};
```

---

## 5. Implementation Plan — File-Level Change Map

| # | File | Action | Description |
|---|---|---|---|
| 1 | `prisma/schema.prisma` | MODIFY | Add `isDraft Boolean @default(false)` to `Transmittal` model |
| 2 | `app/api/transmittals/route.ts` | MODIFY | Accept `isDraft` in POST body; skip duplicate number check when drafting |
| 3 | `app/api/transmittals/[id]/route.ts` | MODIFY | Accept `isDraft` in PUT body; skip duplicate number check when drafting |
| 4 | `hooks/useAutoSave.ts` | CREATE | Core hook: dirty tracking, debounced save, visibilitychange, beforeunload |
| 5 | `components/main/App.tsx` | MODIFY | Integrate `useAutoSave`, add `isDraft` to save calls, add save status indicator |
| 6 | `components/main/SidebarFooter.tsx` | MODIFY | Show "Draft" / "Saving..." indicator in the File menu label |
| 7 | `components/modals/TransmittalListModal.tsx` | MODIFY | Show "Draft" badge on draft transmittals in the list |

### Detailed Change Specifications

#### `#1 — prisma/schema.prisma`

- **Action**: MODIFY — Add `isDraft` field to `Transmittal` model
- **Why**: Distinguishes auto-saved drafts from finalized transmittals. Drafts can skip duplicate number validation and get cleaned up.
- **Change**: Add after `notes` field (line 95):
  ```prisma
  isDraft Boolean @default(false)
  ```
- **Migration**: `npx prisma db push` — all existing rows get `isDraft = false` (correct — they were manually saved)

#### `#2 — app/api/transmittals/route.ts`

- **Action**: MODIFY — Accept `isDraft` in POST, conditionally skip duplicate number check
- **Why**: Auto-save creates transmittals while the user is mid-edit. A temporary/duplicate number should not block the draft save. The duplicate check only matters at finalization.
- **Changes**:
  1. Extract `isDraft` from body: `const isDraft = body?.isDraft === true;`
  2. In the duplicate number check block (lines 101–113), wrap in `if (!isDraft)`: only validate when not a draft
  3. Pass `isDraft` to the `tx.transmittal.create({ data: { ... isDraft } })` call
  4. When `isDraft && !dbTransmittalNumber`, auto-generate a temporary number using the existing sequence logic (same as when number is empty)

#### `#3 — app/api/transmittals/[id]/route.ts`

- **Action**: MODIFY — Accept `isDraft` in PUT, skip duplicate check when drafting
- **Why**: Auto-save updates use PUT. Should not be blocked by duplicate number validation.
- **Changes**:
  1. Extract `isDraft` from body: `const isDraft = body?.isDraft === true;`
  2. In the duplicate check block (lines 212–226), wrap in `if (!isDraft)`
  3. Pass `isDraft` to `db.transmittal.update({ data: { ... isDraft } })`

#### `#4 — hooks/useAutoSave.ts`

- **Action**: CREATE — Core hook encapsulating all auto-save logic
- **Why**: Clean separation of concerns. All auto-save timing, debouncing, and event listeners live in one place.
- **Shape**:

```typescript
interface UseAutoSaveOptions {
  /** The current AppData state */
  data: AppData;
  /** Whether we're editing an existing transmittal (has an ID) */
  activeTransmittalId: string | null;
  /** Save function that accepts isDraft and silent flags */
  onSave: (opts: { isDraft: boolean; silent: boolean }) => Promise<void>;
  /** Whether document processing is active (blocks auto-save) */
  isDocumentProcessing: boolean;
  /** Debounce delay in milliseconds (default 3000) */
  debounceMs?: number;
}

interface UseAutoSaveReturn {
  /** True when there are unsaved changes since last save */
  dirty: boolean;
  /** Mark the form as dirty (call on every user edit) */
  markDirty: () => void;
  /** True when an auto-save is in progress */
  isSaving: boolean;
  /** Last time an auto-save completed successfully */
  lastSavedAt: Date | null;
}
```

- **Implementation details**:
  - `dirty` is a `useRef<boolean>` (not state — avoids re-renders on every keystroke)
  - `markDirty()` sets the ref to `true` and triggers debounced save
  - Debounce uses `useRef` for the timeout ID, cleared on unmount
  - After successful save, sets `dirty` to `false` and updates `lastSavedAt`
  - `visibilitychange` listener: on `'hidden'`, if dirty, calls `onSave({ isDraft: true, silent: true })` immediately (no debounce)
  - `beforeunload` listener: if dirty, calls `event.preventDefault()` (triggers browser native dialog)
  - `isDocumentProcessing` check: if true, skips auto-save (don't save while parsing files)
  - Cleanup on unmount: clear debounce timeout, remove event listeners

#### `#5 — components/main/App.tsx`

- **Action**: MODIFY — Integrate `useAutoSave`, modify save flow, add status indicator
- **Why**: The main integration point. Auto-save hooks into the existing save mechanism.
- **Changes**:
  1. Import `useAutoSave` hook
  2. Add `const { dirty, markDirty, isSaving, lastSavedAt } = useAutoSave({ data, activeTransmittalId, onSave: handleAutoSave, isDocumentProcessing });`
  3. Create `handleAutoSave` wrapper that calls `saveTransmittalToDb()` with `isDraft: true, silent: true`
  4. Modify `saveTransmittalToDb()` signature to accept `{ isDraft?: boolean; silent?: boolean }` options:
     - `silent: true` → skip toast/statusMsg
     - `isDraft: true` → skip Google Sheets append
     - `isDraft` is passed through to the API in the request body
  5. Modify `handleSaveTransmittal()` (manual save) to call `saveTransmittalToDb({ isDraft: false, silent: false })`
  6. Wire `markDirty()` into `updateField`, `updateItem`, `addItems`, `removeItem`, `adjustItemQty`, `handleUpdateSignatory`, `handleUpdateReceivedBy`, `handleUpdateFooter`, `handleUpdateNotes`, `updateTransmission` — every mutation function
  7. Pass `isSaving` and `lastSavedAt` to `SidebarFooter` for the status indicator
  8. Pass `isDraft` flag to `TransmittalListModal` for filtering/display

#### `#6 — components/main/SidebarFooter.tsx`

- **Action**: MODIFY — Add auto-save status indicator
- **Why**: Users need subtle visual feedback that auto-save is working. No intrusive toast — just a small indicator.
- **Changes**:
  1. Add new props: `isSaving: boolean`, `lastSavedAt: Date | null`, `isDraft: boolean`
  2. In the File menu label area (line 120), show:
     - `isSaving` → "Saving..." with a subtle pulse animation
     - `isDraft && !isSaving && lastSavedAt` → "Draft saved at {time}"
     - Neither → current behavior
  3. The indicator text should be small (`text-[10px]`), muted (`text-slate-400`), and non-intrusive

#### `#7 — components/modals/TransmittalListModal.tsx`

- **Action**: MODIFY — Show draft badge
- **Why**: Users need to distinguish drafts from finalized transmittals in the list.
- **Changes**:
  1. Accept `isDraft` field from the transmittal record
  2. Render a small "Draft" badge (pill-shaped, amber/neutral color) next to draft transmittal names
  3. Optional: sort finalized transmittals above drafts

---

## 6. Implementation Checklist

| Done | Task | File(s) | Dependencies | Notes |
|---|---|---|---|---|
| ⬜ | 1. Add `isDraft` field to Prisma schema | `prisma/schema.prisma` | — | `Boolean @default(false)` on `Transmittal` |
| ⬜ | 2. Run DB migration | — | #1 | `npx prisma db push` |
| ⬜ | 3. Update POST transmittal route | `app/api/transmittals/route.ts` | #1 | Accept `isDraft`, skip duplicate check when drafting |
| ⬜ | 4. Update PUT transmittal route | `app/api/transmittals/[id]/route.ts` | #1 | Accept `isDraft`, skip duplicate check when drafting |
| ⬜ | 5. Create `useAutoSave` hook | `hooks/useAutoSave.ts` | — | Dirty tracking, debounce, visibilitychange, beforeunload |
| ⬜ | 6. Modify `saveTransmittalToDb` signature | `components/main/App.tsx` | #3, #4 | Add `{ isDraft, silent }` options parameter |
| ⬜ | 7. Create `handleAutoSave` wrapper | `components/main/App.tsx` | #5, #6 | Calls save with `isDraft: true, silent: true` |
| ⬜ | 8. Integrate `useAutoSave` hook | `components/main/App.tsx` | #5, #7 | Pass data, activeId, onSave, isDocumentProcessing |
| ⬜ | 9. Wire `markDirty()` into all mutation functions | `components/main/App.tsx` | #5, #8 | updateField, updateItem, addItems, removeItem, etc. |
| ⬜ | 10. Update manual save to finalize draft | `components/main/App.tsx` | #6 | `handleSaveTransmittal` passes `isDraft: false` |
| ⬜ | 11. Add save status indicator to sidebar | `components/main/SidebarFooter.tsx` | #8 | isSaving, lastSavedAt, isDraft props |
| ⬜ | 12. Add draft badge to transmittal list | `components/modals/TransmittalListModal.tsx` | #1 | Show "Draft" badge, pass isDraft from records |
| ⬜ | 13. Handle draft on "New Transmittal" | `components/main/App.tsx` | #8 | Reset clears draft; optionally delete old draft auto-saves |
| ⬜ | 14. Run full build | — | #1–13 | `npm run build` |
| ⬜ | 15. Manual QA — auto-save flow | — | #14 | Edit → wait 3s → check DB → draft exists |
| ⬜ | 16. Manual QA — tab switch save | — | #14 | Edit → switch tabs → switch back → data persisted |
| ⬜ | 17. Manual QA — beforeunload warning | — | #14 | Edit → try to close tab → browser warns |
| ⬜ | 18. Manual QA — no warning after save | — | #14 | Edit → save → try to close tab → no warning |
| ⬜ | 19. Manual QA — draft visible in list | — | #14 | Auto-save → open list → draft badge visible |

---

## 7. Edge Cases & Error Handling

| Edge Case | Handling Strategy |
|---|---|
| **Auto-save fires during file parsing/import** | `useAutoSave` checks `isDocumentProcessing` flag. If true, save is skipped (don't save partial import state). The dirty flag is still set — save will fire when processing completes. |
| **Auto-save fails (network error)** | `dirty` remains `true`. Next keystroke re-triggers the debounce. No error toast shown for auto-save failures (silent). If failures persist, the `beforeunload` warning still fires because `dirty` is still `true`. |
| **Auto-save creates duplicate transmittal (race condition)** | Unlikely: only one auto-save runs at a time. The debounce ensures sequential saves. If somehow two POSTs fire, the second will fail on the `@@unique([userId, transmittalNumber])` constraint — but draft saves skip the duplicate check so generated numbers would differ. |
| **User has unsaved data and session expires** | `apiFetch` returns 401 → `handleAutoSave` catches error → `dirty` stays `true`. `beforeunload` still warns. When user signs back in, the stale draft is still in the DB from the last successful auto-save. |
| **User types transmittal number that conflicts, then auto-saves** | Auto-save skips the duplicate check. The draft is saved with whatever number the user typed. When they manually save, the duplicate check fires and shows the error (existing behavior). |
| **User opens a draft, edits it, then creates "New Transmittal"** | The explicit "New Transmittal" action resets the form. The previous draft remains in the DB (orphaned). Optionally, we can delete the old draft on "New Transmittal" to avoid accumulating stale drafts. |
| **Multiple browser tabs editing different transmittals** | No cross-tab coordination in scope. Each tab maintains its own `activeTransmittalId` and draft. Last save wins (existing behavior). |
| **User rapidly types, generating many keystrokes** | Debounce resets on each `markDirty()` call. Save only fires 3 seconds after the *last* keystroke. No request flooding. |
| **Visibilitychange fires during debounce window** | The visibilitychange handler calls `onSave` immediately (flushes the pending debounce). Clear the debounce timeout first to avoid duplicate saves. |
| **User pastes large dataset (100+ items at once)** | `addItems` calls `markDirty()`. Auto-save will fire 3 seconds later with the full item list. The save payload includes all items (existing behavior — no pagination). |
| **Draft transmittal has no project name** | Allowed. Drafts are incomplete by nature. The existing `projectName: ""` default is fine. The transmittal is still identifiable by its generated number. |
| **User's browser doesn't support `beforeunload` custom messages** | Modern browsers (Chrome 51+, Firefox 44+, Safari 9.1+) have removed custom messages from `beforeunload`. They all show a generic "Leave site? Changes you made may not be saved." dialog. This is fine — the point is to block accidental closures, not to craft a custom message. |

---

## 8. Testing Strategy

### Unit Tests

- **`useAutoSave` hook**:
  - `markDirty()` sets dirty flag to `true`
  - After debounce elapses, `onSave` is called exactly once
  - Multiple rapid `markDirty()` calls result in only one `onSave` call (debounce resets)
  - `isDocumentProcessing === true` prevents `onSave` from being called
  - `visibilitychange` to `'hidden'` triggers immediate `onSave` when dirty
  - `visibilitychange` to `'hidden'` does nothing when not dirty
  - `beforeunload` fires `preventDefault` when dirty
  - `beforeunload` does nothing when not dirty
  - Cleanup removes all event listeners and clears timeout

- **API routes**:
  - `POST /api/transmittals` with `isDraft: true` and duplicate number → 200 (skips check)
  - `POST /api/transmittals` with `isDraft: false` and duplicate number → 409 (existing behavior)
  - `PUT /api/transmittals/[id]` with `isDraft: true` and duplicate number → 200 (skips check)
  - `PUT /api/transmittals/[id]` with `isDraft: false` and duplicate number → 409 (existing behavior)

### Integration Tests

- Auto-save creates a new transmittal when `activeTransmittalId` is null → DB has new record with `isDraft: true`
- Auto-save updates existing transmittal when `activeTransmittalId` is set → DB record updated, `isDraft` unchanged
- Manual save (Cmd+S) sets `isDraft: false` on the transmittal
- Manual save shows toast; auto-save does not

### E2E / Manual Tests

- [ ] User opens app → fills recipient name → waits 4 seconds → opens transmittal list → draft exists with "Draft" badge
- [ ] User edits draft → switches to another tab → switches back → opens draft → changes are persisted
- [ ] User types in form → attempts to close tab → browser shows "Leave site?" warning
- [ ] User saves manually (Cmd+S) → attempts to close tab → no warning (clean state)
- [ ] User edits → auto-save fires (no visible toast) → Cmd+S → "Transmittal saved" toast appears
- [ ] User opens a draft from list → edits → auto-save updates the same record (no duplicate created)
- [ ] User has unsaved changes → browser crashes → reopens browser → opens app → opens transmittal list → draft exists with last auto-saved state
- [ ] User creates new transmittal while editing a draft → form resets → old draft remains in list (or is cleaned up)
- [ ] During file import/parsing → edit a field → auto-save does NOT fire until parsing completes
- [ ] Sidebar shows "Saving..." indicator during auto-save → "Draft saved at {time}" after completion
- [ ] Works on Chrome, Firefox, Safari (latest versions)
- [ ] Mobile: Works on iOS Safari, Android Chrome (visibilitychange and beforeunload have mobile quirks)

---

## 9. Rollout & Migration

### Database Migration

```bash
# After adding isDraft to schema.prisma:
npx prisma db push
```

**Backward compatibility**: ✅ Fully backward compatible.

- All existing transmittals get `isDraft = false` (via `@default(false)`)
- Existing API clients that don't send `isDraft` → server treats as `false` (existing behavior)
- The new `isDraft` column is nullable-free with a default — no data migration script needed
- Rollback: remove the column and run `db push` again — no data loss

### Deployment Checklist

- [ ] Run `npx prisma db push` (apply schema change)
- [ ] Run `npm run build` — must pass with zero errors
- [ ] Smoke test on staging: sign in → type something → wait 4s → refresh → open list → draft exists
- [ ] Smoke test: type something → try to close tab → browser warns
- [ ] Verify existing save behavior (Cmd+S) still works identically
- [ ] Verify existing transmittals load and display correctly (no "Draft" badge on pre-migration records)
- [ ] Deploy to production
- [ ] Monitor for increased API traffic (auto-save adds PUT requests every ~3-30s for active editors)

### Rollback Plan

1. **Revert deployment** to previous build
2. **Database**: No destructive changes. The `isDraft` column can be left in place (ignored by old code) or dropped via `prisma db push` after reverting the schema.
3. **User impact**: Users who had drafts auto-saved will see them in the transmittal list (they're marked `isDraft: true` but the old code ignores this field). They'll appear as normal transmittals — no data loss.

---

## 10. Open Questions & Risks

| # | Question / Risk | Severity | Owner | Resolution |
|---|---|---|---|---|
| 1 | **Should auto-save append to Google Sheets?** Currently, only the initial POST save appends a row. Auto-save uses PUT (update), which doesn't append. But the first auto-save is a POST — should it append? | 🟡 Medium | — | **No.** Auto-save is silent and should not trigger external side effects. Google Sheets logging should only happen on explicit manual save. The first auto-save POST should also skip Sheets append. |
| 2 | **Should we clean up stale drafts?** If a user auto-saves a draft, then creates a "New Transmittal" without ever finalizing the draft, it becomes orphaned. Over time, the user's transmittal list accumulates stale drafts. | 🟢 Low | — | **Defer to follow-up.** For now, drafts are visible in the list and can be manually deleted. A future plan could add automatic draft cleanup (e.g., delete drafts older than 7 days, or delete the previous draft when starting a new one). |
| 3 | **What happens if the user is mid-edit and their session expires?** The auto-save will fail (401), `dirty` stays `true`, and `beforeunload` still warns. But the user can't sign back in without losing their form state (current sign-in redirects). | 🟡 Medium | — | **Accept for now.** The `beforeunload` warning prevents accidental closure. The user must manually sign in again. A future plan could add session refresh or preserve form state across re-auth. |
| 4 | **Debounce timing: is 3 seconds right?** Too short = excessive API calls. Too long = risk of losing more data if crash occurs in the window. | 🟢 Low | — | **3 seconds is a good default.** It's a standard choice (Google Docs, Notion use similar). Make it a single constant (`AUTOSAVE_DEBOUNCE_MS`) so it's trivially adjustable. |
| 5 | **Should auto-save fire on the preview panel too?** Users can edit items directly in the live preview (the `TransmittalTemplate` component has inline editing). | 🟡 Medium | — | **Yes.** The preview's edit handlers (`onUpdateItem`, `onAdjustItemQty`, etc.) already call the same mutation functions that will have `markDirty()` wired in. No extra work needed — it comes for free with wiring `markDirty()` into those functions. |

---

## 11. References

- **Architecture**: `docs/ARCHITECTURE.md` — save pipeline (lines 98–119), API surface (lines 156–206)
- **System Overview**: `docs/SYSTEM_OVERVIEW.md` — primary workflow, persistence model
- **Save Flow**: `components/main/App.tsx` lines 1007–1061 (`saveTransmittalToDb`), lines 2151–2169 (`handleSaveTransmittal`)
- **Form Data Detection**: `components/main/App.tsx` lines 2210–2229 (`hasFormData`)
- **Sidebar File Menu**: `components/main/SidebarFooter.tsx` — Save button, Cmd+S shortcut display
- **Transmittal List Modal**: `components/modals/TransmittalListModal.tsx`
- **Database Schema**: `prisma/schema.prisma` — `Transmittal` model
- **Related Plans**:
  - `plans/001-system-redesign.md` — The save retry infrastructure in Plan 001 provides a foundation that auto-save can leverage (the `apiFetch` wrapper with retry logic)
  - `plans/003-flow-redesign.md` — Flow redesign may affect where auto-save hooks are placed
- **External Docs**:
  - [Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api) — `visibilitychange` behavior
  - [beforeunload event](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event) — MDN reference
  - [Prisma Schema Reference](https://www.prisma.io/docs/orm/prisma-schema/overview) — adding fields
