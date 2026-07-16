# UX Flow Redesign — Guided Transmittal Workflow

> **Plan ID**: 003
> **Status**: 📋 Planning
> **Priority**: 🟡 Medium
> **Estimated Effort**: L
> **Created**: 2026-07-15
> **Last Updated**: 2026-07-15

---

## 1. Executive Summary

### What

This plan redesigns the transmittal creation flow from a free-form tab interface into a **guided, linear workflow** that leads users through the form in a logical sequence: **Sender → Project → Recipient → Items/Import → Review & Sign-off**. Every existing core function — imports, exports, agency presets, live preview, signatories — is preserved and enhanced, not replaced.

### Why

The current interface presents five tabs (Content, Brand, Recipient, Project, Sign-off) in an order that contradicts the user's natural mental model. The most complex tab (Content, with import links, file uploads, Drive browsing, transmission methods, and notes) is placed first. The onboarding tour attempts to teach this layout but most users skip it. There is no visual progress tracking, no "next step" guidance, no empty-state helpers, and no summary review before saving. The result is a disorienting experience where users jump between tabs randomly, miss required fields, and lose context.

Observed pain points from the codebase:

- **Tab order is wrong**: Content first means users face import complexity before setting up sender/project context
- **Sender tab is read-only**: Users can't edit sender details inline — they must open a modal, creating friction
- **No progress visibility**: No indication of which tabs are complete vs. empty
- **Content tab mixes concerns**: Import tools, transmission methods, and notes are unrelated but share one tab
- **No review step**: Users save without a summary confirmation of what they're about to submit
- **Preview-only editing is hidden**: Items can be edited in the preview, but this is not obvious
- **Reordering is undiscoverable**: Drag-and-drop exists but has no visual affordance

### How

The redesign introduces five coordinated changes while preserving **100% of existing functionality**:

1. **Reorder tabs** to match the natural workflow: Brand → Project → Recipient → Items → Review & Sign
2. **Add progress indicators** — each tab shows a completion state (empty, partial, complete) via colored dots
3. **Add "Next Step" navigation** — a prominent button at the bottom of each tab advances the user
4. **Split the Content tab** into a dedicated Items/Import tab and move Transmission + Notes to a separate section
5. **Add a Review & Summary step** before save — a read-only overview of all entered data with edit links
6. **Enhance empty states** — helpful placeholder content when no items exist or fields are blank
7. **Make Sender tab editable inline** — remove the modal friction for simple field edits while keeping agency presets
8. **Add drag handles** to reorderable items — visual affordance for the existing drag-and-drop

### Scope Boundary

| IN Scope | OUT of Scope |
|---|---|
| Reorder tabs to logical workflow sequence | Rewriting tab components (they're refactored, not rebuilt) |
| Progress indicators on each tab | Multi-step wizard with separate pages (stays single-page) |
| "Next Step" navigation button on each tab | Changing the sidebar/preview split layout |
| Split Content into Items + Settings | Rewriting the preview template |
| Review & Summary step before save | Adding form validation rules (that's Plan 001) |
| Empty state guidance | User-customizable tab order |
| Inline editing for Sender tab | Removing the Agency modal (it stays for presets) |
| Drag handles on item rows | Mobile-first redesign (desktop stays primary) |
| Persistent "guided mode" toggle (expert users can opt out) | Changing the 5-column item table layout |

---

## 2. Current State Analysis

### Existing Code & Architecture

| File / Module | Current Role | Relevance to This Plan |
|---|---|---|
| `components/main/TabBar.tsx` (53 lines) | Renders 5 tabs in fixed order: Content, Brand, Recipient, Project, Sign-off | **Primary target** — reorder tabs, add progress indicators, add "Next Step" button |
| `components/main/App.tsx` (line 444) | `activeTab` state as `"content" | "sender" | "recipient" | "project" | "signatories"` | Will gain new tab keys and guided mode state |
| `components/main/tabs/ContentTab.tsx` (173 lines) | Import tools (smart input, upload, Drive browse), Transmission, Notes | **Will be split** — Import stays, Transmission + Notes move |
| `components/main/tabs/SenderTab.tsx` (214 lines) | Read-only sender info display, agency dropdown, Add/Update/Delete buttons | **Will gain inline editing** — fields become editable with save button |
| `components/main/tabs/RecipientTab.tsx` (122 lines) | Recipient form fields (to, company, attention, address, contact, email) | Minimal change — add "Next Step" button |
| `components/main/tabs/ProjectTab.tsx` (172 lines) | Project fields with combobox suggestions + transmittal number validation | Minimal change — add "Next Step" button |
| `components/main/tabs/SignatoriesTab.tsx` (206 lines) | Prepared by, Noted by with suggestions, time released | **Will merge** into Review & Sign-off tab |
| `components/main/tabs/HistoryTab.tsx` | Exists in directory but unused | **Will be removed** or repurposed |
| `components/NewReportTemplate.tsx` | Live preview template with inline-editable items | Will gain drag handles on reorderable rows |
| `components/OnboardingTour.tsx` (398 lines) | Multi-step tour overlay with target highlighting | Tour steps will be updated to match new tab order |
| `data/onboarding-steps.json` (92 lines) | 15 tour steps in hardcoded order | Will be updated to reflect new flow |
| `components/main/SidebarHeader.tsx` (55 lines) | App title + Drive status + tour launcher | Will add "Guided / Expert" mode toggle |
| `types.ts` | `TabKey = "content" | "sender" | "recipient" | "project" | "signatories"` | Will extend with new tab keys |

### Pain Points / Gaps

| # | Pain Point | Location | Impact |
|---|---|---|---|
| 1 | **Tab order is counter-intuitive** — Content (complex) first, Brand (context) third | `TabBar.tsx:12-18` | Users face import complexity before setting sender/project context |
| 2 | **No progress visibility** — 5 identical-looking tabs with no completion state | `TabBar.tsx:38-51` | Users don't know which tabs need attention |
| 3 | **No guided advancement** — after filling a tab, users must manually click the next tab | All tab components | Users lose flow, jump randomly, miss sections |
| 4 | **Content tab is overloaded** — 3 unrelated concerns in one tab | `ContentTab.tsx` | Cognitive overload; transmission and notes buried below import tools |
| 5 | **Sender tab is read-only** — users must open a modal to edit any field | `SenderTab.tsx:141-204` | Friction for simple edits; feels broken |
| 6 | **No review before save** — users save blind, only the preview panel shows the result | `App.tsx:2151-2169` | Errors discovered after save; no confirmation of what's being submitted |
| 7 | **Empty states are blank** — no guidance when items list is empty or fields are blank | All tab components | New users don't know where to start |
| 8 | **Drag reorder is invisible** — items can be dragged in the preview but there's no visual cue | `NewReportTemplate.tsx` | Users don't discover the reorder feature |
| 9 | **"New Transmittal" clears silently** — reset dialog doesn't warn about unsaved data | `SidebarFooter.tsx:216-237` | Users accidentally lose work |
| 10 | **Smart input placement** — the paste-a-link field is prominent but its purpose isn't obvious without reading the tour | `ContentTab.tsx:72-97` | Underutilized feature; users resort to manual file upload |

---

## 3. Goals & Success Criteria

### Functional Goals

- [ ] Tabs are reordered to: **Brand → Project → Recipient → Items → Review & Sign**
- [ ] Each tab shows a completion indicator (⬤ empty / ◐ partial / ● complete)
- [ ] A "Next: [Tab Name] →" button at the bottom of each tab advances the user
- [ ] The Content tab is split: Items tab gets import tools; Transmission + Notes move to a Settings section
- [ ] A Review & Summary step shows all entered data before save with edit links back to each tab
- [ ] The Sender tab allows inline editing of all fields without opening the Agency modal
- [ ] Empty states show helpful guidance text ("Start by selecting your agency" / "Import documents to begin")
- [ ] Item rows in the preview show visible drag handles (grip icon) for reordering
- [ ] A "Guided Mode" toggle in the header lets expert users switch back to free-form tab navigation
- [ ] All existing imports, exports, saves, and agency preset management work identically

### Non-Functional Goals

- [ ] Tab transitions are animated (slide-in direction reflects forward/backward navigation)
- [ ] Progress indicators update in real-time as fields are filled
- [ ] "Next Step" button is keyboard accessible (Tab → Enter)
- [ ] Guided mode is enabled by default for new users; expert users' preference persists in `localStorage`
- [ ] Zero visual regression on the preview panel — the transmittal template looks identical
- [ ] No additional API calls — progress is computed client-side from existing `AppData`

### Success Metrics

- **Completion rate**: Users who start a transmittal and save it increases (measured by created vs. abandoned transmittals)
- **Time-to-first-save**: New users complete their first transmittal faster (reduced from current average)
- **Tab navigation**: Decrease in random tab-hopping (tracked by tab click frequency per session)
- **Empty states**: Reduction in "empty save" transmittals (those with no items or blank project name)
- **Guided mode adoption**: >80% of new users stay in guided mode; >50% of returning users stay in guided mode

---

## 4. Design & Architecture

### System Impact Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Sidebar (Tab Area)                     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ TabBar — reordered with progress dots              │   │
│  │  [⬤ Brand] → [⬤ Project] → [◐ Recipient] →       │   │
│  │  [⬤ Items] → [⬤ Review]                           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Active Tab Content:                                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Form fields (existing) + Empty state guidance      │   │
│  │                                                      │   │
│  │ ┌──────────────────────────────────────────────┐   │   │
│  │ │         [Next: Project →]  (guided)           │   │   │
│  │ │  or     [Tab Bar]           (expert)          │   │   │
│  │ └──────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Review Tab (new):                                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Summary of all sections (read-only)               │   │
│  │ [Edit Brand] [Edit Project] ... [Save & Export]   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Preview Panel (unchanged layout)             │
│  ┌──────────────────────────────────────────────────┐   │
│  │ PreviewToolbar                                     │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │ TransmittalTemplate (live preview)                 │   │
│  │  ┌──┬─────┬──────────┬────────────┬─────────┐    │   │
│  │  │⋮⋮│ No. │ QTY      │ Doc Number │ Desc... │    │   │
│  │  │⋮⋮│ NEW: drag handles on rows              │    │   │
│  │  └──┴─────┴──────────┴────────────┴─────────┘    │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Key Data Flow** (no server changes — all client-side):

1. User picks an agency in the Brand tab → `progress.sender` updates from `empty` to `complete`
2. User fills project fields → `progress.project` updates based on `projectName || projectNumber`
3. User fills recipient → `progress.recipient` updates based on `recipient.to`
4. User imports/adds items → `progress.items` updates based on `items.length > 0`
5. User fills signatories → `progress.signatories` updates based on `signatories.preparedBy`
6. User reaches Review tab → sees aggregated summary → clicks Save → same `handleSaveTransmittal()` fires

### Data Model Changes

**No database schema changes required.** This is a pure client-side UX redesign.

### API Surface Changes

**No API changes required.** All existing endpoints remain unchanged.

### Type Changes (`types.ts`)

```typescript
// MODIFY: TabKey gains new values
export type TabKey =
  | "brand"        // was "sender"
  | "project"      // unchanged
  | "recipient"    // unchanged
  | "items"        // was "content" (split)
  | "review";      // NEW — summary before save

// Backward compatibility: the old keys still work internally
// via a mapping layer. No data migration needed.

// NEW: Progress state per tab
export type TabProgress = "empty" | "partial" | "complete";

export interface FormProgress {
  brand: TabProgress;
  project: TabProgress;
  recipient: TabProgress;
  items: TabProgress;
  signatories: TabProgress;
}

// NEW: Helper to compute progress from AppData
export function computeFormProgress(data: AppData): FormProgress {
  return {
    brand: data.sender.agencyName ? "complete" : "empty",
    project: data.project.projectName || data.project.projectNumber ? "complete" : "empty",
    recipient: data.recipient.to ? "complete" : "empty",
    items: data.items.length > 0 ? "complete" : "empty",
    signatories: data.signatories.preparedBy ? "complete" : "empty",
  };
}
```

---

## 5. Implementation Plan — File-Level Change Map

| # | File | Action | Description |
|---|---|---|---|
| 1 | `types.ts` | MODIFY | Update `TabKey`, add `TabProgress`, add `FormProgress`, add `computeFormProgress()` |
| 2 | `hooks/useGuidedFlow.ts` | CREATE | Guided mode state, tab advancement logic, progress computation, `localStorage` persistence |
| 3 | `components/main/TabBar.tsx` | MODIFY | Reorder tabs, add progress dots, support guided/expert mode layout |
| 4 | `components/main/tabs/ItemsTab.tsx` | CREATE | New tab: import tools only (smart input, upload, Drive browse) — extracted from ContentTab |
| 5 | `components/main/tabs/SettingsSection.tsx` | CREATE | Transmission methods + notes — extracted from ContentTab, placed in sidebar or review |
| 6 | `components/main/tabs/ReviewTab.tsx` | CREATE | Read-only summary of all sections with edit links + Save & Export actions |
| 7 | `components/main/tabs/SenderTab.tsx` | MODIFY | Add inline editing; keep agency dropdown for presets; read-only → editable |
| 8 | `components/main/tabs/RecipientTab.tsx` | MODIFY | Add "Next Step" button; add empty state guidance |
| 9 | `components/main/tabs/ProjectTab.tsx` | MODIFY | Add "Next Step" button; add empty state guidance |
| 10 | `components/main/tabs/SignatoriesTab.tsx` | MODIFY | Merge into ReviewTab or keep as standalone; add "Next Step" |
| 11 | `components/main/tabs/ContentTab.tsx` | MODIFY | **Reduce** — becomes thin wrapper or removed after extraction to ItemsTab + SettingsSection |
| 12 | `components/main/SidebarHeader.tsx` | MODIFY | Add Guided/Expert mode toggle |
| 13 | `components/main/App.tsx` | MODIFY | Wire new tabs, hook up `useGuidedFlow`, pass progress to TabBar |
| 14 | `components/NewReportTemplate.tsx` | MODIFY | Add drag handle icons on reorderable item rows |
| 15 | `data/onboarding-steps.json` | MODIFY | Update tour steps to match new tab order and flow |
| 16 | `components/main/tabs/HistoryTab.tsx` | DELETE | Unused — clean up |

### Detailed Change Specifications

#### `#1 — types.ts`

- **Action**: MODIFY — Update types for new flow
- **Why**: New tab keys, progress tracking, and guided mode state need type definitions.
- **Changes**:
  - Change `TabKey` from `"content" | "sender" | "recipient" | "project" | "signatories"` to `"brand" | "project" | "recipient" | "items" | "review"`
  - Add `TabProgress = "empty" | "partial" | "complete"`
  - Add `FormProgress` interface mapped to each tab
  - Add `computeFormProgress(data: AppData): FormProgress` function
  - Keep a backward-compat mapping: `type LegacyTabKey = "content" | "sender" | ...` for internal use if needed during migration

#### `#2 — hooks/useGuidedFlow.ts`

- **Action**: CREATE
- **Why**: Encapsulates all guided-mode logic: mode toggle, tab advancement, progress computation, localStorage persistence.
- **Shape**:
  ```typescript
  interface UseGuidedFlowOptions {
    data: AppData;
    initialTab?: TabKey;
  }
  
  interface UseGuidedFlowReturn {
    activeTab: TabKey;
    setActiveTab: (tab: TabKey) => void;
    goToNextTab: () => void;
    goToPrevTab: () => void;
    progress: FormProgress;
    isGuidedMode: boolean;
    toggleGuidedMode: () => void;
    hasNextTab: boolean;
    hasPrevTab: boolean;
    nextTabLabel: string | null;
    tabOrder: TabKey[];
  }
  ```
- **Implementation**:
  - `tabOrder`: `["brand", "project", "recipient", "items", "review"]`
  - `goToNextTab()`: finds current tab index in `tabOrder`, advances to next
  - `goToPrevTab()`: goes back one tab
  - `progress`: computed via `computeFormProgress(data)` with `useMemo`
  - `isGuidedMode`: read from `localStorage("transmittal_guided_mode_v1")`, defaults to `true`
  - `toggleGuidedMode()`: flips the boolean and persists to localStorage
  - In expert mode, `goToNextTab`/`goToPrevTab` are no-ops (user clicks tabs directly)

#### `#3 — components/main/TabBar.tsx`

- **Action**: MODIFY — Reorder tabs, add progress dots, support both modes
- **Why**: Core of the UX change. The tab bar becomes the primary navigation and progress indicator.
- **Changes**:
  1. Reorder tabs array: `[{ key: "brand", label: "Brand" }, { key: "project", label: "Project" }, { key: "recipient", label: "Recipient" }, { key: "items", label: "Items" }, { key: "review", label: "Review" }]`
  2. Accept new props: `progress: FormProgress`, `isGuidedMode: boolean`
  3. Each tab button renders a colored progress dot before the label:
     - `empty` → gray circle (`bg-slate-300`)
     - `partial` → amber circle with half-fill (`bg-amber-400`)
     - `complete` → green circle with check (`bg-emerald-500`)
  4. In guided mode: clicking tabs is disabled (user must use Next/Back buttons). Tab bar acts as a progress indicator only. The active tab is highlighted.
  5. In expert mode: tabs are clickable (existing behavior). Progress dots are still visible but smaller.

#### `#4 — components/main/tabs/ItemsTab.tsx`

- **Action**: CREATE — New Items tab with import tools only
- **Why**: The existing Content tab mixes import, transmission, and notes. Extracting import into a dedicated tab reduces cognitive load and makes the flow cleaner.
- **Content**: Smart input field, "Upload Files" button, "Browse Drive" button — exactly the "Intelligent Import" section from `ContentTab.tsx` (lines 59–131). Empty state shows "No items yet. Import documents or add them manually in the preview panel."
- **Bottom**: "Next: Review →" button in guided mode.

#### `#5 — components/main/tabs/SettingsSection.tsx`

- **Action**: CREATE — Transmission methods + Notes
- **Why**: These are form settings, not content items. They belong near the Review step or in a collapsible section within the Review tab.
- **Placement decision**: Place as a collapsible section at the top of the Review tab (or in the Items tab as a secondary section). The Review tab makes more sense — transmission method and notes are final decisions before save.
- **Content**: Transmission method checkboxes + Internal Notes textarea — extracted from `ContentTab.tsx` (lines 134–170).

#### `#6 — components/main/tabs/ReviewTab.tsx`

- **Action**: CREATE — Summary review before save
- **Why**: Users currently save blind. A review step surfaces all entered data in one scrollable view, lets users spot errors, and provides edit links to jump back to specific sections.
- **Layout**: 
  - **Brand section**: Agency name, address, logo thumbnail. [Edit Brand] link → switches to brand tab.
  - **Project section**: Project name, number, transmittal ID, department. [Edit Project] link.
  - **Recipient section**: To, company, address, email, contact. [Edit Recipient] link.
  - **Items section**: Item count badge ("12 items"). [Edit Items] link.
  - **Signatories section**: Prepared by, noted by, time released. [Edit Sign-off] link.
  - **Transmission section** (from SettingsSection): Selected methods + notes.
  - **Action buttons**: [Save & Finalize] (primary, prominent) + [Export as PDF] + [Export as DOCX]
- Each section is a card with a subtle border and the edit link aligned right.

#### `#7 — components/main/tabs/SenderTab.tsx`

- **Action**: MODIFY — Make sender fields editable inline
- **Why**: Currently the sender info is read-only. Users must open the Agency modal to change anything. This is unnecessary friction for quick edits. Agency presets remain for frequent switching.
- **Changes**:
  1. All currently read-only `<p>` elements become `<Input>` elements
  2. Fields are pre-populated from the selected agency preset
  3. A "Save as New Agency" button appears when edits differ from the selected preset
  4. The agency dropdown still works — selecting a preset fills the fields
  5. Edits are applied directly to `data.sender` via `updateField`
  6. Logo upload stays (it's already in the Agency modal, but add an inline option too)
  7. Add a subtle "Editing {agency name}" label when preset is selected but modified

#### `#8 — components/main/tabs/RecipientTab.tsx`

- **Action**: MODIFY — Add Next Step button + empty state
- **Why**: Same form fields, improved UX with navigation and guidance.
- **Changes**:
  1. Add `onNext?: () => void` and `isGuidedMode?: boolean` props
  2. When `isGuidedMode` and `onNext` are provided, render a "Next: Items →" button at the bottom
  3. Empty state: when all fields are empty, show a centered message: "Enter the recipient's details. This information appears in the 'To:' block of the transmittal form." with a subtle illustration/icon.

#### `#9 — components/main/tabs/ProjectTab.tsx`

- **Action**: MODIFY — Add Next Step button + empty state
- **Why**: Same approach as RecipientTab.
- **Changes**:
  1. Add `onNext?: () => void` and `isGuidedMode?: boolean` props
  2. "Next: Recipient →" button at bottom in guided mode
  3. Empty state guidance: "Set the project context. The Transmittal ID is auto-generated."

#### `#10 — components/main/tabs/SignatoriesTab.tsx`

- **Action**: MODIFY — Options: merge into ReviewTab or keep standalone with Next button
- **Recommendation**: Keep as standalone tab for now (less risky), add Next button. The Review tab shows the signatories summary with an [Edit] link that opens this tab.
- **Changes**: Add `onNext?: () => void`, `isGuidedMode?: boolean`. "Next: Review →" button.

#### `#11 — components/main/tabs/ContentTab.tsx`

- **Action**: MODIFY — Reduce to a thin re-export or redirect
- **Why**: After extraction of import tools (#4) and settings (#5), ContentTab has no remaining unique content. It becomes a backward-compat redirect.
- **Option A (recommended)**: Delete the file and remove all references. The new `ItemsTab` replaces it.
- **Option B**: Keep as a thin wrapper that renders `ItemsTab` for backward compat. Remove after a release cycle.

#### `#12 — components/main/SidebarHeader.tsx`

- **Action**: MODIFY — Add Guided/Expert mode toggle
- **Why**: Expert users need an escape hatch from guided mode. The toggle must be discoverable but not intrusive.
- **Changes**:
  1. Add `isGuidedMode: boolean` and `onToggleGuidedMode: () => void` props
  2. Render a small toggle switch or button next to the tour help icon
  3. Label: "Guided" (with a wand/book icon) → toggles to "Expert" (with a compass/rocket icon)
  4. Tooltip on hover: "Guided mode walks you through each step. Expert mode gives free access to all tabs."

#### `#13 — components/main/App.tsx`

- **Action**: MODIFY — Wire up the new flow
- **Why**: Integration hub — replace old tab system with guided flow.
- **Changes**:
  1. Replace `const [activeTab, setActiveTab] = useState<TabKey>("content")` with `useGuidedFlow({ data })` — destructure `activeTab`, `setActiveTab`, `goToNextTab`, `goToPrevTab`, `progress`, `isGuidedMode`, `toggleGuidedMode`
  2. Replace `<TabBar activeTab={activeTab} onTabChange={setActiveTab} />` with `<TabBar activeTab={activeTab} onTabChange={setActiveTab} progress={progress} isGuidedMode={isGuidedMode} />`
  3. Replace `{activeTab === "content" && <ContentTab ... />}` with `{activeTab === "items" && <ItemsTab ... />}`
  4. Add `{activeTab === "review" && <ReviewTab ... />}` 
  5. Replace all old tab key references (`"content"` → `"items"`, `"sender"` → `"brand"`, `"signatories"` → stays but Review has it too)
  6. Pass `onNext={goToNextTab}` and `isGuidedMode` to each tab component
  7. Initial active tab on new transmittal: `"brand"` (was `"content"`)
  8. Initial active tab when opening existing transmittal: `"review"` (so user can see the summary first, then edit)

#### `#14 — components/NewReportTemplate.tsx`

- **Action**: MODIFY — Add drag handle icons
- **Why**: Item reordering via drag-and-drop exists but has no visual affordance. Users don't know they can reorder rows.
- **Changes**:
  1. Add a narrow column (20px) to the left of the item table with a grip icon (`GripVertical` from lucide-react or a simple `⋮⋮` unicode)
  2. The grip column is only visible/active when the form is in edit mode (not during PDF generation)
  3. Each grip icon has `cursor: grab` and `cursor: grabbing` on active
  4. The existing drag-and-drop handlers (`onReorderItems`) are already wired — no logic change needed

#### `#15 — data/onboarding-steps.json`

- **Action**: MODIFY — Update tour to match new flow
- **Why**: The current tour references old tab names and order. It must be updated or it will confuse users.
- **Changes**:
  1. Update step IDs and labels to match new tab names
  2. Reorder tour steps to follow the new tab order (Brand → Project → Recipient → Items → Review)
  3. Update `targetSelector` values if DOM `data-tour` attributes change
  4. Add a new step explaining guided vs. expert mode
  5. Remove any references to the old "Content" tab

#### `#16 — components/main/tabs/HistoryTab.tsx`

- **Action**: DELETE
- **Why**: This file exists in the directory but is never imported or rendered anywhere in the app. It's dead code from the pre-DB era when history was stored in localStorage. Cleaning up reduces confusion during this refactor.

---

## 6. Implementation Checklist

| Done | Task | File(s) | Dependencies | Notes |
|---|---|---|---|---|
| ⬜ | 1. Update TypeScript types | `types.ts` | — | New `TabKey`, `TabProgress`, `FormProgress`, `computeFormProgress()` |
| ⬜ | 2. Create `useGuidedFlow` hook | `hooks/useGuidedFlow.ts` | #1 | Mode toggle, tab advancement, progress, localStorage |
| ⬜ | 3. Delete dead HistoryTab | `components/main/tabs/HistoryTab.tsx` | — | Verify no imports reference it |
| ⬜ | 4. Rebuild TabBar with progress dots | `components/main/TabBar.tsx` | #1, #2 | Reorder tabs, progress indicators, guided/expert layout |
| ⬜ | 5. Create ItemsTab | `components/main/tabs/ItemsTab.tsx` | #1, #2 | Extract import section from ContentTab; add empty state + Next button |
| ⬜ | 6. Create SettingsSection | `components/main/tabs/SettingsSection.tsx` | #1 | Extract transmission + notes from ContentTab |
| ⬜ | 7. Create ReviewTab | `components/main/tabs/ReviewTab.tsx` | #1, #2, #6 | Summary cards with edit links + Save/Export actions |
| ⬜ | 8. Make SenderTab inline-editable | `components/main/tabs/SenderTab.tsx` | #1, #2 | Input fields replace read-only paragraphs; agency preset still works |
| ⬜ | 9. Add Next Step to RecipientTab | `components/main/tabs/RecipientTab.tsx` | #1, #2 | Add onNext prop + empty state guidance |
| ⬜ | 10. Add Next Step to ProjectTab | `components/main/tabs/ProjectTab.tsx` | #1, #2 | Add onNext prop + empty state guidance |
| ⬜ | 11. Add Next Step to SignatoriesTab | `components/main/tabs/SignatoriesTab.tsx` | #1, #2 | Add onNext prop |
| ⬜ | 12. Remove/reduce ContentTab | `components/main/tabs/ContentTab.tsx` | #5, #6 | Redirect to ItemsTab or delete |
| ⬜ | 13. Add mode toggle to SidebarHeader | `components/main/SidebarHeader.tsx` | #2 | Guided/Expert toggle |
| ⬜ | 14. Add drag handles to preview | `components/NewReportTemplate.tsx` | — | Grip icon on reorderable rows |
| ⬜ | 15. Update onboarding tour steps | `data/onboarding-steps.json` | #1–14 | Match new tab order and features |
| ⬜ | 16. Wire everything in App.tsx | `components/main/App.tsx` | #2, #4, #5, #6, #7, #8, #9, #10, #11, #13 | Replace old tab system with guided flow |
| ⬜ | 17. Run full build | — | #1–16 | `npm run build` — zero errors |
| ⬜ | 18. Manual QA — Guided mode full flow | — | #17 | Brand → Project → Recipient → Items → Review → Save |
| ⬜ | 19. Manual QA — Expert mode | — | #17 | Toggle to expert → free tab navigation → progress dots still visible |
| ⬜ | 20. Manual QA — Existing transmittal open | — | #17 | Opens to Review tab; can navigate and edit |
| ⬜ | 21. Manual QA — Import flows | — | #17 | Smart input, upload, Drive browse all work from Items tab |
| ⬜ | 22. Manual QA — Export flows | — | #17 | PDF, DOCX, CSV all work from Review tab |
| ⬜ | 23. Manual QA — Agency presets | — | #17 | Create, update, delete, apply from Brand tab with inline editing |
| ⬜ | 24. Manual QA — Mobile responsive | — | #17 | Guided mode works on small screens; toggle to preview still works |

---

## 7. Edge Cases & Error Handling

| Edge Case | Handling Strategy |
|---|---|
| **User in guided mode, clicks browser back** | No change — the app is an SPA within one page. Browser back would leave the app entirely. `beforeunload` from Plan 002 handles this. |
| **User switches to expert mode mid-flow, then back to guided** | `useGuidedFlow` tracks the current active tab regardless of mode. Switching to guided mode resumes from the current tab. No state lost. |
| **User reaches Review tab with missing required info** | Review tab shows "⚠️ Incomplete" badges on empty sections. Edit links are more prominent. Save button shows a subtle warning: "Some sections are incomplete. Save anyway?" |
| **User is in Items tab but has 0 items** | Empty state: "No items yet. Import documents using the tools above, or add items directly in the preview panel using the + Add Item button." The preview panel's + button is highlighted via a subtle animation. |
| **User edits sender inline, then selects a different agency preset** | Show a confirmation: "Switching agencies will discard your unsaved edits. Continue?" — yes/no. If no, stay on current edits. If yes, load the preset. |
| **User navigates quickly (spam-clicks Next)** | `goToNextTab()` is idempotent — if already on the last tab, it's a no-op. No double-advancement possible. |
| **Progress dots don't update because `AppData` reference doesn't change** | `computeFormProgress` uses `useMemo` with `data` as dependency. Since mutations create new object references (via spread), progress always recalculates correctly. |
| **Tour references old tab names after update** | The tour JSON update (#15) must ship in the same deployment as the tab changes. The tour is loaded from JSON — if it references non-existent `data-tour` attributes, those steps gracefully show centered (no highlight). |
| **User opens an old transmittal that has data in fields that are now in a different tab** | No data migration needed — the tabs just display different slices of the same `AppData`. A transmittal with items opens the same regardless of which tab shows them. |
| **Keyboard navigation in guided mode** | Tab key moves between form fields. Enter on the "Next: [Tab] →" button advances. Arrow keys navigate the tour (existing). No new keyboard shortcuts needed. |

---

## 8. Testing Strategy

### Unit Tests

- **`computeFormProgress()`**:
  - Empty `AppData` → all tabs `"empty"`
  - `sender.agencyName = "Filepino"` → `brand: "complete"`, others unchanged
  - `project.projectName = "Test"` → `project: "complete"`
  - `recipient.to = "John"` → `recipient: "complete"`
  - `items.length = 3` → `items: "complete"`
  - `signatories.preparedBy = "Admin"` → `signatories: "complete"`
  - All filled → all `"complete"`

- **`useGuidedFlow` hook** (via React Testing Library):
  - `goToNextTab()` from "brand" → activeTab becomes "project"
  - `goToNextTab()` from "review" → stays "review" (no-op)
  - `goToPrevTab()` from "project" → activeTab becomes "brand"
  - `toggleGuidedMode()` flips `isGuidedMode` and persists to localStorage
  - `progress` updates when `data` changes

### Integration Tests

- TabBar renders 5 tabs with correct labels: Brand, Project, Recipient, Items, Review
- TabBar shows correct progress dots for each completion state
- In guided mode, clicking a non-active tab does nothing
- In expert mode, clicking a tab changes the active tab
- Review tab renders all 5 summary sections with correct data from `AppData`
- Clicking "Edit Brand" on Review tab navigates to brand tab
- Sender tab fields are editable and update `data.sender` on change

### E2E / Manual Tests

- [ ] New user opens app → guided mode active → Brand tab is first
- [ ] User fills Brand → clicks Next → Project tab appears with slide animation
- [ ] User fills Project → Next → Recipient → Next → Items → imports via smart link
- [ ] User reaches Review tab → all data visible → clicks Save → "Transmittal saved" toast
- [ ] User clicks "Edit Project" on Review → jumps to Project tab → edits → clicks Review tab → sees updated data
- [ ] User toggles to Expert mode → tabs become clickable → navigates freely → progress dots still update
- [ ] User toggles back to Guided mode → current tab stays active → Next/Back buttons reappear
- [ ] User opens existing transmittal → lands on Review tab → all data pre-populated
- [ ] Empty Items tab shows guidance message → user imports → guidance disappears, items count shows
- [ ] Drag handles visible on item rows in preview → drag row → reorder works
- [ ] Mobile: sidebar shows guided tabs → toggle preview → preview shows with drag handles
- [ ] Keyboard: Tab through form fields → Enter on Next button → advances
- [ ] Works on Chrome, Firefox, Safari

---

## 9. Rollout & Migration

### Database Migration

**No database migration required.** This is a pure client-side change. The database schema, API routes, and data shapes are untouched.

### Backward Compatibility

✅ **Fully backward compatible.** 
- All existing saved transmittals open correctly — the tab system just displays the same `AppData` through different tabs
- API contracts unchanged
- Export formats unchanged
- `localStorage` keys are new (`transmittal_guided_mode_v1`) — no collision with existing keys

### Deployment Checklist

- [ ] Run `npm run build` — must pass with zero errors
- [ ] Verify no broken imports (HistoryTab removed, ContentTab reduced)
- [ ] Smoke test on staging: sign in → guided mode full flow → save → reopen → verify
- [ ] Smoke test on staging: expert mode → navigate freely → save → verify
- [ ] Verify onboarding tour launches and steps are correct
- [ ] Verify mobile responsive: sidebar/preview toggle still works on small screens
- [ ] Deploy to production
- [ ] Monitor for increased tab-click events (expected from guided mode)
- [ ] Monitor for any increase in "empty save" transmittals (should decrease)

### Rollback Plan

1. **Revert deployment** to previous build
2. **No data impact** — no database changes, no API changes
3. **User impact**: Users who used guided mode will see the old free-form tab layout on rollback. All saved transmittals are intact. The `transmittal_guided_mode_v1` localStorage key will be ignored by the old code — clean, no conflicts.

---

## 10. Open Questions & Risks

| # | Question / Risk | Severity | Owner | Resolution |
|---|---|---|---|---|
| 1 | **Will expert users resent guided mode being default?** They may find the step-by-step flow patronizing if they use the app daily. | 🟡 Medium | — | **Mitigated by the toggle.** Guided mode is default for new users (detected by no `transmittal_guided_mode_v1` key). Expert mode is one click away and persists. Returning users who previously chose expert mode stay in expert mode. We could also auto-switch to expert mode after the user completes 5+ transmittals. |
| 2 | **Should the Review tab show editable fields or read-only?** Making them read-only reduces errors but adds friction for last-minute changes. | 🟢 Low | — | **Read-only with edit links.** This matches the intent of a review step (verify, don't edit). The edit links jump directly to the relevant tab. The "Back" button also lets users navigate back through tabs. This is consistent with how e-commerce checkouts and form wizards work. |
| 3 | **What happens to the Transmission + Notes section?** Currently in Content tab. If Content becomes Items, where do these go? | 🟡 Medium | — | **Place in the Review tab as a "Settings" section.** Transmission method and notes are final decisions, not content items. They naturally belong at the review/save stage. Alternative: place as a secondary collapsible section in the Items tab. Decision: Review tab — better flow. |
| 4 | **The Sender tab currently shows read-only fields drawn from the agency preset. Making them editable could cause confusion: are edits saved to the preset or just this transmittal?** | 🟡 Medium | — | **Edits apply to this transmittal only.** A subtle indicator shows when edits diverge from the preset: "Modified from {preset name}." A "Save as New Preset" button lets the user persist changes to the agency. This is clearer than the current modal-only approach. |
| 5 | **The onboarding tour has 15 steps — updating it for the new flow is significant work. Should we reduce the tour?** | 🟢 Low | — | **Yes, reduce to 8 steps for guided mode.** Keep only: Welcome, File Menu, Brand tab, Project tab, Recipient tab, Items/Import tab, Review tab, Summary. The guided mode already teaches the flow — a shorter tour reinforces it. Remove per-button steps (upload, browse Drive) since guided mode explains them contextually. |

---

## 11. References

- **Architecture**: `docs/ARCHITECTURE.md` — UI entrypoint, module boundaries, runtime flow
- **System Overview**: `docs/SYSTEM_OVERVIEW.md` — primary workflow, review and editing surface
- **Tab System**: `components/main/TabBar.tsx` — current 5-tab layout with keys and labels
- **Tab Components**: `components/main/tabs/ContentTab.tsx`, `SenderTab.tsx`, `RecipientTab.tsx`, `ProjectTab.tsx`, `SignatoriesTab.tsx` — current implementations
- **Preview Template**: `components/NewReportTemplate.tsx` — item table with inline editing and drag reorder
- **Onboarding**: `components/OnboardingTour.tsx` + `data/onboarding-steps.json` — guided tour with 15 steps
- **Core Types**: `types.ts` — `TabKey`, `AppData`, all field interfaces
- **Related Plans**:
  - `plans/001-system-redesign.md` — Architecture refactor that will extract state management into hooks, making this UX refactor easier to implement (progress computation becomes a clean derived value)
  - `plans/002-auto-save.md` — Auto-save fires on every field change; the progress dots will update in real-time as the user types, providing visual momentum
- **External Docs**:
  - [React useMemo](https://react.dev/reference/react/useMemo) — for `computeFormProgress`
  - [localStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) — guided mode persistence
  - [WAI-ARIA Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) — accessibility for the tab bar
