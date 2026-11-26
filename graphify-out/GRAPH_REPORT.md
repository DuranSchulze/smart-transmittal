# Graph Report - smart-transmittal  (2026-11-25)

## Corpus Check
- 303 files · ~213,452 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .example 1, .css 1)

## Summary
- 2651 nodes · 6355 edges · 153 communities (131 shown, 22 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 215 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `78d9d814`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- transmittals/[id]/route.ts
- harness-review/scripts/harness-graph.mjs
- react
- Components
- harness-execute/scripts/harness-graph.mjs
- harness-review/scripts/harness-brain.sh
- ErrorBoundary
- package.json
- Runbook
- Auto-Save & Draft Protection
- harness-workflow/scripts/harness-issue.sh
- cn
- AppContent
- OnboardingTour.tsx
- cn
- Detailed Change Specifications
- transmittal-service.ts
- harness-bug/scripts/harness-graph.mjs
- harness-meditate/scripts/harness-graph.mjs
- harness-spec/scripts/harness-graph.mjs
- Spec: Scanned-PDF (OCR) and AI parsing failure reliability
- react
- transmittal-qa/route.ts
- useExport.ts
- Major
- preparePdfForParsing
- parse-reasons.ts
- harness-bug/scripts/harness-graph.sh
- harness-bug/scripts/harness-brain.sh
- harness-execute/scripts/harness-brain.sh
- harness-meditate/scripts/harness-brain.sh
- harness-qa/scripts/harness-brain.sh
- harness-qa/scripts/harness-graph.mjs
- harness-reflect/scripts/harness-brain.sh
- harness-spec/scripts/harness-graph.sh
- harness-spec/scripts/harness-brain.sh
- harness-workflow/scripts/harness-brain.sh
- harness-workflow/scripts/harness-graph.mjs
- transmittal-qa/route.ts
- Feature 1: User-Saved AI API Key Support ✅ FINISHED
- lib/transmittal-qa.ts
- Detailed Change Specifications
- harness-qa/scripts/harness-graph.sh
- harness-reflect/scripts/harness-graph.sh
- user-ai-settings.ts
- lib/validation.ts
- harness-bug/scripts/harness-issue.sh
- harness-execute/scripts/harness-issue.sh
- harness-meditate/scripts/harness-issue.sh
- harness-qa/scripts/harness-issue.sh
- harness-reflect/scripts/harness-issue.sh
- harness-review/scripts/harness-issue.sh
- harness-spec/scripts/harness-issue.sh
- types.ts
- googleDriveService.ts
- compilerOptions
- Detailed Change Specifications
- geminiService.ts
- components.json
- vitest
- harness-workflow/scripts/harness-graph.sh
- devDependencies
- Implementation workflow: Scanned-PDF (OCR) and AI parsing failure reliability
- server/transmittal-qa.ts
- imagekit.ts
- Plan Implementer — Smart Transmittal
- Google Setup Guide
- useDocumentParsing.ts
- useAgencyManager.ts
- useAutoSave.ts
- harness-execute/scripts/harness-graph.sh
- harness-meditate/scripts/harness-graph.sh
- harness-review/scripts/harness-graph.sh
- useDriveImport.ts
- QaPanel.tsx
- Harness Factory constitution
- Import Pipelines
- Important Changes Or Additions To Public APIs / Interfaces / Types
- .tmp-export-check-cjs/services/docxGenerator.js
- ErrorBoundary
- Plan Enhancer — Smart Transmittal
- docxGenerator.ts
- Closed Items
- Smart Transmittal — System Redesign & Architecture Refactor
- googleSheetsService.ts
- scripts
- .tmp-export-check/services/docxGenerator.js
- Feature 2: In-App Onboarding Guided Tour ✅ FINISHED
- Feature 3: Column Width / Position Control Improvements
- Feature 4: Project Number UX Clarity Improvement
- Feature 5: Project + Sign-Off Suggestion Dropdowns
- instrumentation.ts
- useTransmittalPersistence.ts
- parse-transmittal/route.ts
- Test Cases And Scenarios
- ocr.ts
- index.tsx
- Q: Which OCR design did the spec select?
- Smart Transmittal Documentation
- index.ts
- vercel.json
- policy
- policy
- policy
- policy
- policy
- policy
- policy
- policy
- env.d.ts
- next.config.mjs
- postcss.config.mjs
- web-research/SKILL.md
- { signIn, signOut, useSession }
- lib/gemini-models.ts
- storage.ts
- Q: Was the OCR spec approved?
- Q: Where do scanned PDFs and AI parse failures flow?
- useSmartImport.ts
- Q: Can local OCR run on the existing pdf-inspector dependency?
- Q: Where do scanned PDFs and AI parse failures flow (execute stage)?
- auth.ts
- useAutoSave
- 1. Changes by requirement
- agencies/[id]/route.ts
- Smart Transmittal Feature Roadmap
- Q: Where do scanned PDFs and AI parse failures flow (workflow stage)?
- WorkspaceNavigation.tsx
- apiFetch
- fetch-ocr-runtime.sh
- export-transmittals/route.ts
- google-token/route.ts
- 6. Requirements
- agencies/route.ts
- context-spec.md
- 5. Journeys, alternate paths, and recovery
- Unit Tests (Recommended — Not Mandatory for This Plan)
- 9. Rollout & Migration
- Transmittal QA
- QA: Scanned-PDF (OCR) and AI parsing failure reliability
- useDriveImport.test.tsx
- 4. Design & Architecture
- 7. Constraints, assumptions, and dependencies
- 3. Goals & Success Criteria
- Approvals

## God Nodes (most connected - your core abstractions)
1. `cn()` - 88 edges
2. `react` - 61 edges
3. `vitest` - 61 edges
4. `AppContent()` - 49 edges
5. `AppData` - 46 edges
6. `Button()` - 45 edges
7. `Detailed Change Specifications` - 30 edges
8. `apiFetch()` - 27 edges
9. `Input()` - 26 edges
10. `useDriveImport()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `New / Changed Client State` --references--> `ProjectInfo`  [INFERRED]
  docs/note.md → types.ts
- `Google Sheets Link` --references--> `TransmittalItem`  [INFERRED]
  docs/ARCHITECTURE.md → types.ts
- `Persistence Model` --references--> `TransmittalItem`  [INFERRED]
  docs/ARCHITECTURE.md → types.ts
- `Exclusions (unless a question in §8 changes this)` --references--> `TransmittalItem`  [INFERRED]
  .harness/ai-ocr-reliability/context-spec.md → types.ts
- `Risk areas` --references--> `TransmittalItem`  [INFERRED]
  .harness/ai-ocr-reliability/workflow.md → types.ts

## Import Cycles
- None detected.

## Communities (153 total, 22 thin omitted)

### Community 0 - "transmittals/[id]/route.ts"
Cohesion: 0.10
Nodes (27): getHandler(), postHandler(), DELETE, deleteHandler(), GET, getHandler(), maxDuration, PATCH (+19 more)

### Community 1 - "harness-review/scripts/harness-graph.mjs"
Cohesion: 0.09
Nodes (39): Brain, Context across stages, GitHub issues, Harness Factory constitution, One invocation, one stage, Project knowledge graph, Project memory, Questions and evidence (+31 more)

### Community 2 - "react"
Cohesion: 0.08
Nodes (37): LoginScreen(), LoginScreenProps, DetailsDialog(), fields, Logo(), SenderTab(), agency, setup() (+29 more)

### Community 3 - "Components"
Cohesion: 0.04
Nodes (45): Agent Prompt Guide, Animation Philosophy, Border Radius, Components, CSS Custom Properties, Customer Logo Strip, Deal Card, Do (+37 more)

### Community 4 - "harness-execute/scripts/harness-graph.mjs"
Cohesion: 0.09
Nodes (39): Brain, Context across stages, GitHub issues, Harness Factory constitution, One invocation, one stage, Project knowledge graph, Project memory, Questions and evidence (+31 more)

### Community 5 - "harness-review/scripts/harness-brain.sh"
Cohesion: 0.24
Nodes (26): append_note(), archived_files(), cmd_add(), cmd_check(), cmd_forget(), cmd_get(), cmd_index(), cmd_init() (+18 more)

### Community 6 - "ErrorBoundary"
Cohesion: 0.19
Nodes (12): Page(), App(), AppProviders(), ToastApi, ToastContext, ToastItem, ToastOptions, ToastProvider() (+4 more)

### Community 7 - "package.json"
Cohesion: 0.06
Nodes (44): dependencies, @base-ui/react@^1.1.0, class-variance-authority@^0.7.1, clsx@^2.1.1, date-fns@^4.1.0, @firecrawl/pdf-inspector@^1.25.2, @google/genai@^1.31.0, html2pdf.js@0.14.0 (+36 more)

### Community 8 - "Runbook"
Cohesion: 0.05
Nodes (38): Agency logo storage, Configuration, Database rollout and legacy logos, Preview and exports, Upload and reuse, Verification, Authentication Fails, Available NPM Scripts (+30 more)

### Community 9 - "Auto-Save & Draft Protection"
Cohesion: 0.08
Nodes (24): 10. Open Questions & Risks, 11. References, 1. Executive Summary, 2. Current State Analysis, 3. Goals & Success Criteria, 4. Design & Architecture, 9. Rollout & Migration, API Surface Changes (+16 more)

### Community 10 - "harness-workflow/scripts/harness-issue.sh"
Cohesion: 0.26
Nodes (23): can_use_github(), cmd_check(), cmd_comment(), cmd_create(), cmd_ensure_labels(), cmd_find(), cmd_repo(), cmd_update() (+15 more)

### Community 11 - "cn"
Cohesion: 0.08
Nodes (39): DeliveryPanel(), DeliveryPanelProps, options, ProjectTab(), ProjectTabProps, TransmittalValidationState, ExpandingTextarea(), RecipientTab() (+31 more)

### Community 12 - "AppContent"
Cohesion: 0.10
Nodes (31): AppContent(), FILE_MENU_ITEMS, resolveSessionErrorNotice(), TOUR_STEPS, LoadingScreen(), WorkspaceNavigation(), SidebarMenuBar(), SidebarMenuBarProps (+23 more)

### Community 13 - "OnboardingTour.tsx"
Cohesion: 0.28
Nodes (8): computePopoverPosition(), getTargetRect(), OnboardingTour(), OnboardingTourProps, PopoverPosition, TargetRect, TourStep, TourStepItem

### Community 14 - "cn"
Cohesion: 0.10
Nodes (38): PrivacyPolicyPage(), TermsOfServicePage(), ErrorBoundaryProps, ErrorBoundaryState, AlertDialogMedia(), Card(), CardAction(), CardContent() (+30 more)

### Community 15 - "Detailed Change Specifications"
Cohesion: 0.12
Nodes (17): `#10 — components/main/tabs/SignatoriesTab.tsx`, `#11 — components/main/tabs/ContentTab.tsx`, `#12 — components/main/SidebarHeader.tsx`, `#13 — components/main/App.tsx`, `#14 — components/NewReportTemplate.tsx`, `#15 — data/onboarding-steps.json`, `#16 — components/main/tabs/HistoryTab.tsx`, `#1 — types.ts` (+9 more)

### Community 16 - "transmittal-service.ts"
Cohesion: 0.25
Nodes (17): ensureTransmittalPrefix(), stripTransmittalPrefix(), isUniqueConstraintError(), ServiceError, asJsonObject(), assertAgencyAvailable(), assertNumberAvailable(), buildNestedData() (+9 more)

### Community 17 - "harness-bug/scripts/harness-graph.mjs"
Cohesion: 0.09
Nodes (40): Bug spec, Brain, Context across stages, GitHub issues, Harness Factory constitution, One invocation, one stage, Project knowledge graph, Project memory (+32 more)

### Community 18 - "harness-meditate/scripts/harness-graph.mjs"
Cohesion: 0.16
Nodes (28): capture(), cmdCheck(), cmdEnsure(), cmdInstall(), cmdLessons(), cmdQuery(), cmdRemember(), cmdSection() (+20 more)

### Community 19 - "harness-spec/scripts/harness-graph.mjs"
Cohesion: 0.08
Nodes (56): capture(), cmdCheck(), cmdEnsure(), cmdInstall(), cmdLessons(), cmdQuery(), cmdRemember(), cmdSection() (+48 more)

### Community 20 - "Spec: Scanned-PDF (OCR) and AI parsing failure reliability"
Cohesion: 0.20
Nodes (10): 10. Handoff, 1. Source issue and intake evidence, 4.1 Local OCR options, 4. Scope, 8. Questions, 9. Verification plan, Exclusions (unless a question in §8 changes this), Included (+2 more)

### Community 21 - "react"
Cohesion: 0.13
Nodes (15): metadata, RootLayout(), AutoSaveIndicator(), AutoSaveIndicatorProps, renderIndicator(), PreviewToolbarProps, ZOOM_STEPS, OfflineAlert() (+7 more)

### Community 22 - "transmittal-qa/route.ts"
Cohesion: 0.16
Nodes (12): GET, getHandler(), maxDuration, runtime, AvailableGeminiModel, listAvailableGeminiModels(), modelVersion(), newestFirst() (+4 more)

### Community 23 - "useExport.ts"
Cohesion: 0.11
Nodes (21): ExportFormat, assertGeneratedBlob(), localDownload(), PdfDocument, StatusType, pdfMocks, timestamp(), useExport() (+13 more)

### Community 24 - "Major"
Cohesion: 0.06
Nodes (31): 10. Exact QA matching accepts a word inside its opposite, 11. Unrelated unreadable files can prevent a QA pass, 12. The QA checklist editor silently drops phrases, 13. The next editor save can undo a File Library rename, 14. Finalizing an existing draft can leave its ID blank, 15. Saved document numbers can change when reopened, 16. Sheet imports can use “Document Name” as the document number, 17. Legacy Word files are advertised but cannot be read for QA (+23 more)

### Community 25 - "preparePdfForParsing"
Cohesion: 0.15
Nodes (16): Pointers, 2. Checks run, [REQ-8] OCR only the pages that need it, Option A (Steps 8–10, D5–D6, D9), 3. Supporting evidence (not a substitute for the scenarios), 3. Ordered steps, @firecrawl/pdf-inspector, started, ocrPages() (+8 more)

### Community 26 - "parse-reasons.ts"
Cohesion: 0.15
Nodes (21): FilesPanel(), FilesPanelProps, reviewItems(), sentence(), setup(), [REQ-1] Classify and propagate parse failure reasons (Steps 2–3), reviewFor(), classifyProviderError() (+13 more)

### Community 27 - "harness-bug/scripts/harness-graph.sh"
Cohesion: 0.43
Nodes (14): cmd_check(), cmd_ensure(), cmd_install(), cmd_lessons(), cmd_query(), cmd_remember(), cmd_section(), cmd_update() (+6 more)

### Community 28 - "harness-bug/scripts/harness-brain.sh"
Cohesion: 0.24
Nodes (26): append_note(), archived_files(), cmd_add(), cmd_check(), cmd_forget(), cmd_get(), cmd_index(), cmd_init() (+18 more)

### Community 29 - "harness-execute/scripts/harness-brain.sh"
Cohesion: 0.24
Nodes (26): append_note(), archived_files(), cmd_add(), cmd_check(), cmd_forget(), cmd_get(), cmd_index(), cmd_init() (+18 more)

### Community 30 - "harness-meditate/scripts/harness-brain.sh"
Cohesion: 0.24
Nodes (26): append_note(), archived_files(), cmd_add(), cmd_check(), cmd_forget(), cmd_get(), cmd_index(), cmd_init() (+18 more)

### Community 31 - "harness-qa/scripts/harness-brain.sh"
Cohesion: 0.24
Nodes (26): append_note(), archived_files(), cmd_add(), cmd_check(), cmd_forget(), cmd_get(), cmd_index(), cmd_init() (+18 more)

### Community 32 - "harness-qa/scripts/harness-graph.mjs"
Cohesion: 0.16
Nodes (28): capture(), cmdCheck(), cmdEnsure(), cmdInstall(), cmdLessons(), cmdQuery(), cmdRemember(), cmdSection() (+20 more)

### Community 33 - "harness-reflect/scripts/harness-brain.sh"
Cohesion: 0.13
Nodes (37): Brain, Context across stages, GitHub issues, Harness Factory constitution, One invocation, one stage, Project knowledge graph, Project memory, Questions and evidence (+29 more)

### Community 34 - "harness-spec/scripts/harness-graph.sh"
Cohesion: 0.43
Nodes (14): cmd_check(), cmd_ensure(), cmd_install(), cmd_lessons(), cmd_query(), cmd_remember(), cmd_section(), cmd_update() (+6 more)

### Community 35 - "harness-spec/scripts/harness-brain.sh"
Cohesion: 0.24
Nodes (26): append_note(), archived_files(), cmd_add(), cmd_check(), cmd_forget(), cmd_get(), cmd_index(), cmd_init() (+18 more)

### Community 36 - "harness-workflow/scripts/harness-brain.sh"
Cohesion: 0.24
Nodes (26): append_note(), archived_files(), cmd_add(), cmd_check(), cmd_forget(), cmd_get(), cmd_index(), cmd_init() (+18 more)

### Community 37 - "harness-workflow/scripts/harness-graph.mjs"
Cohesion: 0.09
Nodes (40): Brain, Context across stages, GitHub issues, Harness Factory constitution, One invocation, one stage, Project knowledge graph, Project memory, Questions and evidence (+32 more)

### Community 38 - "transmittal-qa/route.ts"
Cohesion: 0.22
Nodes (7): maxDuration, POST, runtime, input, mocks, MAX_QA_CONTENT, QaRequestSchema

### Community 39 - "Feature 1: User-Saved AI API Key Support ✅ FINISHED"
Cohesion: 0.29
Nodes (7): Acceptance Criteria, Current Stateq, Feature 1: User-Saved AI API Key Support ✅ FINISHED, Feature Objective, Risks / Dependencies, Scope, User Problem

### Community 40 - "lib/transmittal-qa.ts"
Cohesion: 0.11
Nodes (25): [REQ-4] Distinguish QA visual coverage from unreadable coverage (Step 7, D4), content, doc(), initial(), mocks, setup(), useTransmittalQa(), aggregateQa() (+17 more)

### Community 41 - "Detailed Change Specifications"
Cohesion: 0.06
Nodes (32): 10. Open Questions & Risks, 11. References, 1. Executive Summary, 2. Current State Analysis, 3. Goals & Success Criteria, 4. Design & Architecture, 5. Implementation Plan — File-Level Change Map, 6. Implementation Checklist (+24 more)

### Community 42 - "harness-qa/scripts/harness-graph.sh"
Cohesion: 0.15
Nodes (25): Brain, Context across stages, GitHub issues, Harness Factory constitution, One invocation, one stage, Project knowledge graph, Project memory, Questions and evidence (+17 more)

### Community 43 - "harness-reflect/scripts/harness-graph.sh"
Cohesion: 0.43
Nodes (14): cmd_check(), cmd_ensure(), cmd_install(), cmd_lessons(), cmd_query(), cmd_remember(), cmd_section(), cmd_update() (+6 more)

### Community 44 - "user-ai-settings.ts"
Cohesion: 0.17
Nodes (23): postHandler(), authenticate(), DELETE(), GET(), maxDuration, PUT(), runtime, 3. Possible causes (hypothesis register) (+15 more)

### Community 45 - "lib/validation.ts"
Cohesion: 0.09
Nodes (21): DocumentReferenceSchema, AgencyInput, AgencyInputSchema, AppDataInput, AppDataSchema, FooterNotesSchema, ParseTransmittalInput, ParseTransmittalRequestSchema (+13 more)

### Community 46 - "harness-bug/scripts/harness-issue.sh"
Cohesion: 0.26
Nodes (23): can_use_github(), cmd_check(), cmd_comment(), cmd_create(), cmd_ensure_labels(), cmd_find(), cmd_repo(), cmd_update() (+15 more)

### Community 47 - "harness-execute/scripts/harness-issue.sh"
Cohesion: 0.26
Nodes (23): can_use_github(), cmd_check(), cmd_comment(), cmd_create(), cmd_ensure_labels(), cmd_find(), cmd_repo(), cmd_update() (+15 more)

### Community 48 - "harness-meditate/scripts/harness-issue.sh"
Cohesion: 0.26
Nodes (23): can_use_github(), cmd_check(), cmd_comment(), cmd_create(), cmd_ensure_labels(), cmd_find(), cmd_repo(), cmd_update() (+15 more)

### Community 49 - "harness-qa/scripts/harness-issue.sh"
Cohesion: 0.26
Nodes (23): can_use_github(), cmd_check(), cmd_comment(), cmd_create(), cmd_ensure_labels(), cmd_find(), cmd_repo(), cmd_update() (+15 more)

### Community 50 - "harness-reflect/scripts/harness-issue.sh"
Cohesion: 0.26
Nodes (23): can_use_github(), cmd_check(), cmd_comment(), cmd_create(), cmd_ensure_labels(), cmd_find(), cmd_repo(), cmd_update() (+15 more)

### Community 51 - "harness-review/scripts/harness-issue.sh"
Cohesion: 0.26
Nodes (23): can_use_github(), cmd_check(), cmd_comment(), cmd_create(), cmd_ensure_labels(), cmd_find(), cmd_repo(), cmd_update() (+15 more)

### Community 52 - "harness-spec/scripts/harness-issue.sh"
Cohesion: 0.12
Nodes (35): Brain, Context across stages, GitHub issues, Harness Factory constitution, One invocation, one stage, Project knowledge graph, Project memory, Questions and evidence (+27 more)

### Community 53 - "types.ts"
Cohesion: 0.17
Nodes (26): Project Context (Always Refresh Before Writing), Project Context (Always Refresh Before Implementing), PreviewPanelProps, RecipientTabProps, AgencyPresetModalProps, AutoResizeTextArea(), ComboBox(), getExportValue() (+18 more)

### Community 54 - "googleDriveService.ts"
Cohesion: 0.17
Nodes (17): isImageDocument(), `#32 — services/googleDriveService.ts`, clearGoogleToken(), DriveAccessError, driveApiFetch(), DriveFile, DriveTokenManager, driveTokenManager (+9 more)

### Community 55 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, experimentalDecorators, incremental, isolatedModules, jsx (+15 more)

### Community 56 - "Detailed Change Specifications"
Cohesion: 0.08
Nodes (25): `#10 — server/transmittal-service.ts`, `#11 — app/api/transmittals/route.ts`, `#12 — app/api/transmittals/[id]/route.ts`, `#13 — app/api/parse-transmittal/route.ts`, `#14–15 — Agency API routes`, `#16 — hooks/useTransmittalDraft.ts`, `#17 — hooks/useTransmittalPersistence.ts`, `#18 — hooks/useDriveImport.ts` (+17 more)

### Community 57 - "geminiService.ts"
Cohesion: 0.12
Nodes (27): Shared components touched, stripExtension(), useDocumentParsing(), reasonCopy(), buildFailureParseResult(), DocumentNumberResolutionInput, extractIdentifierFromText(), extractLabeledIdentifier() (+19 more)

### Community 58 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 59 - "vitest"
Cohesion: 0.10
Nodes (18): progress, agency, mocks, useFixture(), mocks, createInitialTransmittalData(), currentDate(), currentTime() (+10 more)

### Community 60 - "harness-workflow/scripts/harness-graph.sh"
Cohesion: 0.43
Nodes (14): cmd_check(), cmd_ensure(), cmd_install(), cmd_lessons(), cmd_query(), cmd_remember(), cmd_section(), cmd_update() (+6 more)

### Community 61 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, autoprefixer@^10.4.24, jsdom@^29.1.1, postcss@^8.5.6, tailwindcss@^3.4.19, @testing-library/react@^16.3.2, tsx@^4.23.15, @types/node@^22.14.0 (+9 more)

### Community 62 - "Implementation workflow: Scanned-PDF (OCR) and AI parsing failure reliability"
Cohesion: 0.20
Nodes (10): 1. Entry points, dependencies, and risk areas, 4. Checks, 5. Compatibility, recovery, and manual notes, 6. Questions, 7. Not done in this stage, Dependencies verified in source, Entry points (normal user paths that QA must exercise), Implementation workflow: Scanned-PDF (OCR) and AI parsing failure reliability (+2 more)

### Community 63 - "server/transmittal-qa.ts"
Cohesion: 0.13
Nodes (14): normalizeQaText(), QaFindingSchema, QaKeywordFinding, QaRequest, AiResultSchema, checkQaDocument(), ContentSource, exactQaKeyword() (+6 more)

### Community 64 - "imagekit.ts"
Cohesion: 0.26
Nodes (13): apply, main(), pool, decodeLogo(), imagekitConfig(), LogoInput, prepareAgencyLogo(), StoredLogo (+5 more)

### Community 65 - "Plan Implementer — Smart Transmittal"
Cohesion: 0.12
Nodes (16): Important Notes, Phase 1 — READ & UNDERSTAND, Phase 2 — ALIGN, Phase 3 — IMPLEMENT, Plan Implementer — Smart Transmittal, Quality Standards, Step 1: Identify the Plan, Step 2: Scan the Relevant Codebase (+8 more)

### Community 66 - "Google Setup Guide"
Cohesion: 0.12
Nodes (16): 1. Configure The OAuth Consent Screen, 2. Create OAuth 2.0 Client Credentials, Auth Model, Drive Or Sheets Requests Fail, `GET /api/google-token` Returns 401, `GET /api/google-token` Returns 404, Google Cloud Console Setup, Google Drive (+8 more)

### Community 67 - "useDocumentParsing.ts"
Cohesion: 0.15
Nodes (15): 2. Design decisions taken in this workflow, ParsedFileResult, UseDocumentParsingOptions, readFileAsBase64(), resizeImage(), useFileProcessing(), ParseReason, ReadMethod (+7 more)

### Community 68 - "useAgencyManager.ts"
Cohesion: 0.20
Nodes (18): SenderTabProps, emptySender(), mapAgencyToSender(), StatusHandler, useAgencyManager(), UseAgencyManagerOptions, apiJsonOptions(), AgencyRecord (+10 more)

### Community 69 - "useAutoSave.ts"
Cohesion: 0.33
Nodes (5): AUTO_SAVE_OPTIONS, AUTOSAVE_DEBOUNCE_MS, SaveTransmittalOptions, UseAutoSaveOptions, UseAutoSaveReturn

### Community 70 - "harness-execute/scripts/harness-graph.sh"
Cohesion: 0.43
Nodes (14): cmd_check(), cmd_ensure(), cmd_install(), cmd_lessons(), cmd_query(), cmd_remember(), cmd_section(), cmd_update() (+6 more)

### Community 71 - "harness-meditate/scripts/harness-graph.sh"
Cohesion: 0.43
Nodes (14): cmd_check(), cmd_ensure(), cmd_install(), cmd_lessons(), cmd_query(), cmd_remember(), cmd_section(), cmd_update() (+6 more)

### Community 72 - "harness-review/scripts/harness-graph.sh"
Cohesion: 0.43
Nodes (14): cmd_check(), cmd_ensure(), cmd_install(), cmd_lessons(), cmd_query(), cmd_remember(), cmd_section(), cmd_update() (+6 more)

### Community 73 - "useDriveImport.ts"
Cohesion: 0.19
Nodes (18): Analysis, analyzable(), describeDriveImport(), describeReview(), driveDocument(), DriveReviewFile, fallbackItem(), fallbackNumber() (+10 more)

### Community 74 - "QaPanel.tsx"
Cohesion: 0.20
Nodes (13): PanelHeader(), PanelHeaderProps, modeLabels, parseKeywords(), QaController, QaPanel(), RequirementEditor, statusColors (+5 more)

### Community 75 - "Harness Factory constitution"
Cohesion: 0.15
Nodes (11): Brain, Context across stages, GitHub issues, Harness Factory constitution, One invocation, one stage, Project knowledge graph, Project memory, Questions and evidence (+3 more)

### Community 76 - "Import Pipelines"
Cohesion: 0.09
Nodes (22): API Surface, Architecture And Data Flow, Authenticated Routes, Core Module Boundaries, Create, Export Pipeline, Google Drive File Selection, Google Drive Folder Link (+14 more)

### Community 77 - "Important Changes Or Additions To Public APIs / Interfaces / Types"
Cohesion: 0.29
Nodes (7): Detailed TODO Checklist, Important Changes Or Additions To Public APIs / Interfaces / Types, New / Changed Client State, New Local Storage Keys, New Persistence Model For AI Key Support, New Server APIs For AI Key Support, UserAiSettings

### Community 78 - ".tmp-export-check-cjs/services/docxGenerator.js"
Cohesion: 0.24
Nodes (10): docx@8.5.0, docx, base64ToUint8Array(), createFloatingSignatoryBox(), createHeaderCell(), createItemCell(), docx_1, generateTransmittalDocx() (+2 more)

### Community 79 - "ErrorBoundary"
Cohesion: 0.29
Nodes (3): ErrorBoundary, PreviewPanel(), PreviewToolbar()

### Community 80 - "Plan Enhancer — Smart Transmittal"
Cohesion: 0.22
Nodes (8): Important Notes, Output Format, Plan Enhancer — Smart Transmittal, Quality Standards, Step 1 — Read the Plan File, Step 2 — Scan the Relevant Codebase Areas, Step 3 — Expand the Plan, Workflow

### Community 81 - "docxGenerator.ts"
Cohesion: 0.36
Nodes (9): AlignmentValue, createFloatingSignatoryBox(), createHeaderCell(), createItemCell(), createWrappedParagraph(), generateTransmittalDocx(), formatExportText(), splitLongToken() (+1 more)

### Community 82 - "Closed Items"
Cohesion: 0.22
Nodes (9): Acceptance Criteria, Closed Items, Current State, Detailed TODO Checklist, Feature 6: Project & Sign-Off Extra Rows (Closed / Superseded), Feature Objective, Risks / Dependencies, Scope (+1 more)

### Community 83 - "Smart Transmittal — System Redesign & Architecture Refactor"
Cohesion: 0.17
Nodes (12): 11. References, 1. Executive Summary, 2. Current State Analysis, `#33 — lib/utils.ts`, 7. Edge Cases & Error Handling, How, Pain Points / Gaps, Scope Boundary (+4 more)

### Community 84 - "googleSheetsService.ts"
Cohesion: 0.21
Nodes (12): normalizeTransmittalNumber(), checkDriveAccess(), getGoogleAccessToken(), uploadFileToDrive(), appendTransmittalRow(), ensureHeaders(), getLinkedSheetId(), getSpreadsheetTitle() (+4 more)

### Community 85 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, db:migrate-logos, db:reset, db:sync, dev, dev:clean, ocr:runtime (+3 more)

### Community 86 - ".tmp-export-check/services/docxGenerator.js"
Cohesion: 0.42
Nodes (7): base64ToUint8Array(), createFloatingSignatoryBox(), createHeaderCell(), createItemCell(), generateTransmittalDocx(), formatExportText(), splitLongToken()

### Community 87 - "Feature 2: In-App Onboarding Guided Tour ✅ FINISHED"
Cohesion: 0.25
Nodes (8): Acceptance Criteria, Current State, Detailed TODO Checklist, Feature 2: In-App Onboarding Guided Tour ✅ FINISHED, Feature Objective, Risks / Dependencies, Scope, User Problem

### Community 88 - "Feature 3: Column Width / Position Control Improvements"
Cohesion: 0.25
Nodes (8): Acceptance Criteria, Current State, Detailed TODO Checklist, Feature 3: Column Width / Position Control Improvements, Feature Objective, Risks / Dependencies, Scope, User Problem

### Community 89 - "Feature 4: Project Number UX Clarity Improvement"
Cohesion: 0.25
Nodes (8): Acceptance Criteria, Current State, Detailed TODO Checklist, Feature 4: Project Number UX Clarity Improvement, Feature Objective, Risks / Dependencies, Scope, User Problem

### Community 90 - "Feature 5: Project + Sign-Off Suggestion Dropdowns"
Cohesion: 0.25
Nodes (8): Acceptance Criteria, Current State, Detailed TODO Checklist, Feature 5: Project + Sign-Off Suggestion Dropdowns, Feature Objective, Risks / Dependencies, Scope, User Problem

### Community 91 - "instrumentation.ts"
Cohesion: 0.25
Nodes (6): @opentelemetry/sdk-trace-base@^2.9.0, @prisma/instrumentation@^7.8.0, @vercel/otel@^2.1.3, @opentelemetry/sdk-trace-base, @prisma/instrumentation, @vercel/otel

### Community 92 - "useTransmittalPersistence.ts"
Cohesion: 0.18
Nodes (20): EMPTY_SUGGESTIONS, useTransmittalPersistence(), UseTransmittalPersistenceOptions, QaStateSchema, requirement, createTransmittal(), deleteTransmittal(), getNextTransmittalNumber() (+12 more)

### Community 93 - "parse-transmittal/route.ts"
Cohesion: 0.13
Nodes (16): decodedBytes(), inlineMaxBytes(), maxDuration, POST, postHandler(), mocks, pdf, post() (+8 more)

### Community 94 - "Test Cases And Scenarios"
Cohesion: 0.29
Nodes (7): Closed Project & Sign-Off Rows Item, Column Layout, Onboarding, Project Number UX, Project + Sign-Off Suggestions, Test Cases And Scenarios, User AI API Key

### Community 95 - "ocr.ts"
Cohesion: 0.10
Nodes (20): cache, CacheEntry, cacheGet(), cachePut(), inflight, ocrBudgetMs(), OcrOutcome, OcrPage (+12 more)

### Community 96 - "index.tsx"
Cohesion: 0.33
Nodes (4): root, rootElement, react-dom@^19.2.1, react-dom

### Community 97 - "Q: Which OCR design did the spec select?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Which OCR design did the spec select?, Source Nodes

### Community 98 - "Smart Transmittal Documentation"
Cohesion: 0.40
Nodes (4): Documents, Quick Context, Smart Transmittal Documentation, Source Of Truth

### Community 99 - "index.ts"
Cohesion: 0.13
Nodes (10): better-auth@^1.4.18, dotenv@^16.4.5, prisma@7.8.0, better-auth, dotenv, prisma, prisma, app (+2 more)

### Community 100 - "vercel.json"
Cohesion: 0.50
Nodes (3): fluid, regions, $schema

### Community 118 - "lib/gemini-models.ts"
Cohesion: 0.38
Nodes (7): FloatingAccount(), FloatingAccountProps, DEFAULT_GEMINI_MODEL, GEMINI_MODEL_OPTIONS, GeminiModelOption, getGeminiModelLabel(), isSupportedGeminiModelId()

### Community 119 - "storage.ts"
Cohesion: 0.33
Nodes (7): getStorage(), OnboardingState, read(), remove(), storage, STORAGE_KEYS, write()

### Community 120 - "Q: Was the OCR spec approved?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Was the OCR spec approved?, Source Nodes

### Community 121 - "Q: Where do scanned PDFs and AI parse failures flow?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Where do scanned PDFs and AI parse failures flow?, Source Nodes

### Community 123 - "useSmartImport.ts"
Cohesion: 0.19
Nodes (14): DriveFileMeta, DriveImportResult, findColumn(), StatusType, mocks, useSmartImport(), UseSmartImportOptions, GoogleLink (+6 more)

### Community 124 - "Q: Can local OCR run on the existing pdf-inspector dependency?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Can local OCR run on the existing pdf-inspector dependency?, Source Nodes

### Community 125 - "Q: Where do scanned PDFs and AI parse failures flow (execute stage)?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Where do scanned PDFs and AI parse failures flow (execute stage)?, Source Nodes

### Community 126 - "auth.ts"
Cohesion: 0.07
Nodes (33): DELETE, GET, handler, maxDuration, PATCH, POST, PUT, runtime (+25 more)

### Community 127 - "useAutoSave"
Cohesion: 0.13
Nodes (16): useAutoSave(), `#1 — prisma/schema.prisma`, `#2 — app/api/transmittals/route.ts`, `#3 — app/api/transmittals/[id]/route.ts`, `#4 — hooks/useAutoSave.ts`, `#5 — components/main/App.tsx`, 5. Implementation Plan — File-Level Change Map, `#6 — components/main/SidebarFooter.tsx` (+8 more)

### Community 129 - "1. Changes by requirement"
Cohesion: 0.18
Nodes (12): 1. Changes by requirement, 3. Hypothesis register outcome (REQ-7), 4. Deviations and notes, 5. Still unverified, and next steps, Execution: Scanned-PDF (OCR) and AI parsing failure reliability, [REQ-2] Mark scanned and unreadable imports honestly (Step 6, D2, D8), [REQ-3] Preserve Drive failure reasons (Step 6, D3), [REQ-5] Report unusable personal keys (Steps 3–4) (+4 more)

### Community 130 - "agencies/[id]/route.ts"
Cohesion: 0.20
Nodes (10): DELETE, deleteHandler(), maxDuration, PUT, putHandler(), RouteContext, runtime, mocks (+2 more)

### Community 131 - "Smart Transmittal Feature Roadmap"
Cohesion: 0.40
Nodes (4): Implementation Priorities, Notes And Assumptions, Purpose, Smart Transmittal Feature Roadmap

### Community 132 - "Q: Where do scanned PDFs and AI parse failures flow (workflow stage)?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Where do scanned PDFs and AI parse failures flow (workflow stage)?, Source Nodes

### Community 134 - "WorkspaceNavigation.tsx"
Cohesion: 0.29
Nodes (6): sections, WorkspaceNavigationProps, computeWorkspaceProgress(), hasValue(), WorkspaceProgress, WorkspaceSection

### Community 135 - "apiFetch"
Cohesion: 0.26
Nodes (9): ApiError, apiFetch(), ApiRequestOptions, getErrorMessage(), readResponsePayload(), RETRYABLE_STATUS_CODES, shouldRetryStatus(), sleep() (+1 more)

### Community 136 - "fetch-ocr-runtime.sh"
Cohesion: 0.70
Nodes (4): detect(), fetch-ocr-runtime.sh script, sha256(), verify()

### Community 137 - "export-transmittals/route.ts"
Cohesion: 0.24
Nodes (7): exportHandler(), GET, maxDuration, runtime, stripTransmittalPrefix(), mocks, db

### Community 138 - "google-token/route.ts"
Cohesion: 0.24
Nodes (8): GET, getHandler(), getProviderCredentials(), GOOGLE_PROVIDER_IDS, GoogleProviderId, maxDuration, runtime, mocks

### Community 140 - "6. Requirements"
Cohesion: 0.22
Nodes (9): 6. Requirements, [REQ-1] Classify and propagate parse failure reasons, [REQ-2] Mark scanned and unreadable imports honestly, [REQ-3] Preserve Drive failure reasons, [REQ-4] Distinguish QA visual coverage from unreadable coverage, [REQ-5] Report unusable personal keys, [REQ-6] Preflight provider size and timeout risks, [REQ-7] Prove the chosen cause with regression tests (+1 more)

### Community 141 - "agencies/route.ts"
Cohesion: 0.32
Nodes (6): GET, maxDuration, POST, runtime, mocks, AgencyRequestSchema

### Community 143 - "5. Journeys, alternate paths, and recovery"
Cohesion: 0.33
Nodes (6): 5. Journeys, alternate paths, and recovery, J1 — Local upload of a scanned PDF, J2 — Drive folder with mixed files, J3 — Text PDF whose identifier is not on the cover, J4 — QA on a scanned PDF, J5 — Personal key unusable

### Community 144 - "Unit Tests (Recommended — Not Mandatory for This Plan)"
Cohesion: 0.33
Nodes (6): `#1 — types.ts`, 8. Testing Strategy, E2E / Manual Tests, Integration Tests, Unit Tests (Recommended — Not Mandatory for This Plan), DraftAction

### Community 145 - "9. Rollout & Migration"
Cohesion: 0.33
Nodes (6): 9. Rollout & Migration, Database Migration, Deployment Checklist, Environment Variables, New Dependency, Rollback Plan

### Community 146 - "Transmittal QA"
Cohesion: 0.40
Nodes (4): Documents and saved results, Schema deployment and verification, Server contract and bounds, Transmittal QA

### Community 147 - "QA: Scanned-PDF (OCR) and AI parsing failure reliability"
Cohesion: 0.40
Nodes (5): 1. Environment findings (why the journeys are blocked), 2. Scenario results, 4. Issues filed, 5. What is needed to complete QA, QA: Scanned-PDF (OCR) and AI parsing failure reliability

### Community 148 - "useDriveImport.test.tsx"
Cohesion: 0.40
Nodes (3): bad, good, mocks

### Community 149 - "4. Design & Architecture"
Cohesion: 0.40
Nodes (5): 4. Design & Architecture, API Surface Changes, Data Model Changes, System Impact Diagram, Type Changes (`types.ts`)

### Community 150 - "7. Constraints, assumptions, and dependencies"
Cohesion: 0.50
Nodes (4): 7. Constraints, assumptions, and dependencies, Assumptions, Constraints, Dependencies

### Community 151 - "3. Goals & Success Criteria"
Cohesion: 0.50
Nodes (4): 3. Goals & Success Criteria, Functional Goals, Non-Functional Goals, Success Metrics

### Community 152 - "Approvals"
Cohesion: 0.67
Nodes (3): Approvals, Spec, Workflow

## Knowledge Gaps
- **1 isolated node(s):** `{ signIn, signOut, useSession }`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 916 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `transmittals/[id]/route.ts`, `agencies/[id]/route.ts`, `react`, `apiFetch`, `package.json`, `export-transmittals/route.ts`, `google-token/route.ts`, `agencies/route.ts`, `transmittal-service.ts`, `useDriveImport.test.tsx`, `react`, `transmittal-qa/route.ts`, `useExport.ts`, `preparePdfForParsing`, `parse-reasons.ts`, `transmittal-qa/route.ts`, `lib/transmittal-qa.ts`, `user-ai-settings.ts`, `lib/validation.ts`, `googleDriveService.ts`, `geminiService.ts`, `devDependencies`, `server/transmittal-qa.ts`, `imagekit.ts`, `useDocumentParsing.ts`, `useDriveImport.ts`, `QaPanel.tsx`, `googleSheetsService.ts`, `useTransmittalPersistence.ts`, `parse-transmittal/route.ts`, `ocr.ts`, `lib/gemini-models.ts`, `storage.ts`, `useSmartImport.ts`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Are the 19 inferred relationships involving `AppData` (e.g. with `Project Context (Always Refresh Before Writing)` and `Project Context (Always Refresh Before Implementing)`) actually correct?**
  _`AppData` has 19 INFERRED edges - model-reasoned connections that need verification._
- **What connects `{ signIn, signOut, useSession }` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `transmittals/[id]/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10037878787878787 - nodes in this community are weakly interconnected._
- **Why does `AppData` connect `types.ts` to `transmittals/[id]/route.ts`, `WorkspaceNavigation.tsx`, `Runbook`, `Auto-Save & Draft Protection`, `cn`, `AppContent`, `Unit Tests (Recommended — Not Mandatory for This Plan)`, `transmittal-service.ts`, `useExport.ts`, `lib/transmittal-qa.ts`, `Detailed Change Specifications`, `lib/validation.ts`, `vitest`, `useAgencyManager.ts`, `useAutoSave.ts`, `QaPanel.tsx`, `Import Pipelines`, `docxGenerator.ts`, `Smart Transmittal — System Redesign & Architecture Refactor`, `googleSheetsService.ts`, `useTransmittalPersistence.ts`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `harness-review/scripts/harness-graph.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.09191583610188261 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `react`, `ErrorBoundary`, `package.json`, `cn`, `AppContent`, `OnboardingTour.tsx`, `cn`, `useExport.ts`, `parse-reasons.ts`, `lib/transmittal-qa.ts`, `types.ts`, `vitest`, `useDocumentParsing.ts`, `useAgencyManager.ts`, `useAutoSave.ts`, `useDriveImport.ts`, `QaPanel.tsx`, `useTransmittalPersistence.ts`, `index.tsx`, `lib/gemini-models.ts`, `useSmartImport.ts`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._