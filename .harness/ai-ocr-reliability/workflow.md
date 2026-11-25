# Implementation workflow: Scanned-PDF (OCR) and AI parsing failure reliability

- **Work item:** `.harness/ai-ocr-reliability/`
- **Stage:** workflow, revision 1 (draft, not approved)
- **Approved spec:** [context-spec.md](context-spec.md), revision 3, SHA-256 `8b9e5e56acffe7da5ef082357abcd8cda9ef1e034d3bf0d5e805f725d67edc04`. The approval is recorded in [approvals.md](approvals.md). The bytes were re-verified when this workflow was drafted.
- **Source revision observed:** `main` at `78d9d81`. The only working-tree changes are untracked harness, skill, and `.DS_Store` files. No source diff exists.
- **Source issue:** GitHub #2.
- **Task memory:** [context.md](context.md).

## 1. Entry points, dependencies, and risk areas

### Entry points (normal user paths that QA must exercise)

| Flow | Client entry | Server entry |
| --- | --- | --- |
| Local upload (PDF/Word) | `hooks/useDocumentParsing.ts` `processUploadedFiles` → `services/parse-api.ts` `parseDocument` | `app/api/parse-transmittal/route.ts` `POST` |
| Drive selection, Drive folder link, single-file link | `hooks/useDriveImport.ts` `importFilesWithAi` / `importFolderLink` / `addSelected` (wired in `components/main/App.tsx`) | same route |
| QA checklist | `hooks/useTransmittalQa.ts` → `components/main/panels/QaPanel.tsx` | `app/api/transmittal-qa/route.ts` `POST` → `server/transmittal-qa.ts` `checkQaDocument` |
| Personal key settings | `components/account/FloatingAccount.tsx`, `services/user-ai-settings-api.ts` | `app/api/user-ai-settings/route.ts` → `server/user-ai-settings.ts` |

### Shared components touched

- `services/geminiService.ts`: `ParseResult`, `parseTransmittalDocument`, `buildFallbackParseResult`, `resolveDocumentNumberWithFallback`
- `server/pdf-parsing.ts`: `preparePdfForParsing`, which currently extracts cover page `[0]` only
- `server/transmittal-qa.ts`: `prepareQaDocument`, `checkQaDocument`
- `lib/transmittal-qa.ts`: `QaDocumentResultSchema`, `aggregateQa`
- `lib/validation.ts`: `ParseTransmittalRequestSchema`, `TransmittalItemSchema`
- `server/user-ai-settings.ts`: `getDecryptedUserGeminiApiKey`, `getUserAiKeyMetadata`
- `next.config.mjs` (`serverExternalPackages`), `package.json` scripts, `vercel.json` (`fluid`, `sin1`)
- New: `lib/parse-reasons.ts`, `server/ocr.ts`, `scripts/fetch-ocr-runtime.sh`

### Dependencies verified in source

- `@firecrawl/pdf-inspector@1.25.2` (`node_modules/@firecrawl/pdf-inspector/index.d.ts`) exports `processPdfWithOcr(buffer, OcrOptions)`. `OcrOptions` includes `mode`, 1-indexed `pageNumbers`, `dpi`, `minimumConfidence`, `hostedRecommendationConfidence`, `modelDirectory`, and `offline`. The result has `pages[].provenance.{source, ocrConfidence, hostedRecommended, warnings}`, `pagesRoutedToOcr`, `pagesRecommendingHosted`, and `ocrTimeMs`.
- **No timeout, cancellation, or thread option exists** in the typings or the [OCR runtime guide](https://github.com/firecrawl/pdf-inspector/blob/main/docs/ocr-runtime.md). The time budget must be enforced by the caller, and a native call that outlives its budget keeps running in the background. The page cap is therefore the real bound on work, and the time budget bounds the response.
- **No built-in result cache.** The model cache is separate (`PDF_INSPECTOR_MODEL_CACHE`).
- `OcrMode` and `PageContentSource` are ambient `const enum`s. `tsconfig.json` sets `isolatedModules: true`, so the code compares against string literals (`"Auto"`, `"Ocr"`) cast to the type and does not import enum values.
- Runtime artifacts from the OCR runtime guide (Linux x64 glibc):
  - PDFium `native-v7988` (`firecrawl-pdfium-linux-x64.tgz`, with `SHA256SUMS`)
  - ONNX Runtime `1.27.0` `libonnxruntime.so.1.27.0`, taken from the PyPI wheel `onnxruntime-1.27.0-cp312-cp312-manylinux_2_27_x86_64.manylinux_2_28_x86_64.whl`
  - PP-OCRv6 Small model set `oar-ocr-v0.7.0`, about 31 MB in three files
  - The guide does not document the model file names. Step 9 discovers them by warming a cache.
- The guide documents full OCR end to end only on Linux x64. macOS arm64 is labelled "preview", and Intel macOS has no ONNX Runtime 1.27 build. Local dev therefore defaults to OCR off.

### Risk areas

| Risk | Impact | Mitigation in this plan |
| --- | --- | --- |
| Vercel function size or cold start grows with PDFium, ONNX Runtime, and models | Deploy failure or slow first request | Step 9 measures unzipped size and cold start before release. `OCR_ENABLED` kill switch (Step 10). |
| A native OCR call outlives its budget | Route stays busy past the response | Hard page caps, budget below `maxDuration`, and no concurrent OCR per instance (single-flight per hash). |
| The ambient `TransmittalItem` and QA snapshot contracts are strict Zod objects | A new field rejected on save or QA | New fields are optional. Old saved data and snapshots still parse. Covered by tests in Steps 3 and 7. |
| Raw provider text currently reaches the client through `error.message` | Privacy | Step 2 replaces passthrough with mapped copy. |
| Native module missing in dev or test | Crash on import | All OCR imports stay lazy and are mocked in tests. A missing runtime maps to `ocr_unavailable`. |

## 2. Design decisions taken in this workflow

These are local implementation choices within the approved spec. None of them changes approved behavior.

- **D1. Reason vocabulary (REQ-1, REQ-6, REQ-8, J3).** A single `ParseReason` union lives in `lib/parse-reasons.ts`, which client and server can both import: `scan_unreadable`, `extraction_failed`, `provider_timeout`, `provider_limit`, `provider_rejected`, `invalid_model`, `config_missing`, `config_unusable`, `invalid_output`, `too_large`, `ocr_timeout`, `ocr_unavailable`, `document_number_unresolved`. Each reason has one user-copy string and one recovery action.
- **D2. Read-method marker (REQ-2).** `ParseResult` gains an optional `readMethod: "text" | "ocr" | "visual" | "none"`. `TransmittalItem` gains an optional, session-only `extraction?: { readMethod; reason? }`. It is added as `.optional()` to `TransmittalItemSchema` but is **not** persisted by `services/transmittal-mappers.ts`, because the spec excludes schema changes and changes to saved content. After a reload, the review state survives only as the existing remark text (see D3). See W-Q1.
- **D3. Remarks (REQ-3).** The fallback row already carries the mapped user message in `remarks` (`buildFallbackParseResult`). The workflow keeps that existing behaviour for Drive by no longer overwriting it, and it introduces no new printed content. A successful extraction keeps its AI remark or `"Imported from Google Drive"` as it does today.
- **D4. OCR for QA stays review-only (REQ-4, Q3).** OCR-derived QA text sets a new optional `contentSource: "native" | "ocr" | "gemini-visual"` on `QaDocumentResult` and keeps `coverage: "visual"`, so `aggregateQa` still withholds `Passed`. Exact-mode keywords are matched locally against OCR text as evidence, but their status stays `uncertain`.
- **D5. Budgets (spec §9, to confirm in Step 9).** `OCR_PARSE_MAX_PAGES=3` (cover plus bounded later pages for J3), `OCR_QA_MAX_PAGES=10`, `OCR_TIME_BUDGET_MS=45000`, `dpi` 150 (the default). The worst case, OCR 45 s plus Gemini 60 s, fits the route's `maxDuration = 120` but not the client's 90 s abort. So the parse route subtracts the OCR time already spent from the Gemini timeout, with a 20 s floor, and returns `provider_timeout` rather than exceeding the client's 90 s.
- **D6. Cache (REQ-8).** An in-process LRU cache in `server/ocr.ts` is keyed by the SHA-256 of the PDF bytes and stores per-page OCR results. It has a 32-entry, 64 MB text cap and a 30-minute TTL. A request OCRs only the pages it lacks, and concurrent requests for one hash share one in-flight promise. On Fluid compute this reuses across warm invocations on one instance, but it is not cross-instance. That satisfies "repeated runs on identical bytes reuse a cache" on a warm instance, and the limit is stated in docs.
- **D7. Flow instrumentation (Q1, spec §4 "eligibility check").** `ParseTransmittalRequestSchema` gains optional `flow: "upload" | "drive-selection" | "drive-folder" | "drive-link"`. The route's existing `document_parse_complete` log adds `flow`, `reason`, `readMethod`, `keyClass`, `ocrPages`, and `ocrMs`, but never text, keys, or file names. The QA route logs a parallel `document_qa_complete` event. The spec's "short-lived" check is implemented as these log fields. Removing them is a later decision.
- **D8. Q4 default.** For `readMethod: "none"` rows only, `resolveDocumentNumberWithFallback` gets an `unreadable` flag. Generic file stems (`scan`, `document`, `file`, `img`, `untitled`, optionally followed by digits or a date) yield an empty number and `document_number_unresolved`. Meaningful file names keep today's derived number.
- **D9. Kill switch and rollout.** `OCR_ENABLED` (default `false` in dev, `true` in Vercel production once Step 9 passes). When it is false or the runtime is absent, behaviour is Option C (visual Gemini) with `ocr_unavailable` surfaced as the reason, which is the spec's degrade path.

## 3. Ordered steps

| Step | Requirement IDs | Component and planned change | Prerequisites |
| --- | --- | --- | --- |
| 1 | REQ-7 | **Baseline red tests.** In the existing suites, add failing tests that reproduce the current behaviour for H1, H2, H4, H5, and H6, plus H3 if metadata is reachable with mocked `db`. Use synthetic fixtures under `test/fixtures/ocr/` (generated, ≤ 50 KB each: text PDF with cover id, text PDF with id on page 2, image-only 1-page PDF, mixed PDF, broken-font stub through mocks), with mocked `@firecrawl/pdf-inspector` and `@google/genai`. Record each test's red result in `evidence.md`. Files: `services/geminiService.test.ts`, `server/pdf-parsing.test.ts`, `hooks/useDriveImport.test.tsx`, `hooks/useFileProcessing.test.tsx` or a new `hooks/useDocumentParsing.test.tsx`, `lib/transmittal-qa.test.ts`, `server/transmittal-qa.test.ts`, new `server/user-ai-settings.test.ts`. | Approved workflow |
| 2 | REQ-1, REQ-6 | **Reason classification.** Add `lib/parse-reasons.ts` (D1) with `classifyProviderError(error)`, which maps a status or code from the `@google/genai` `ApiError` first (`status` 408/504 → timeout, 429 → `provider_limit`, 413 or payload messages → `provider_limit`, 400 with model-not-found → `invalid_model`, 401/403 → `provider_rejected`, 5xx → `provider_rejected`) and falls back to message patterns. JSON parse failure and a schema miss → `invalid_output`. A missing key → `config_missing`. `parseTransmittalDocument` sets exactly one `reason` on every failure path and replaces `error.message` passthrough with the mapped copy. The `console.warn` logs only `{ reason, status }`, not the error object. Extend `ParseResult` with `reason?`, `readMethod?`, and `keyClass?`. | 1 |
| 3 | REQ-1, REQ-5 | **Route contract.** `app/api/parse-transmittal/route.ts` returns `reason`, `readMethod`, and `keyClass` (optional, additive). It adds `flow` to the request schema (D7) and the safe log fields. The 413 response for over 25 MB carries `reason: "too_large"`. `services/parse-api.ts` maps the client 90 s abort to `reason: "provider_timeout"` with distinct copy ("The document took too long to analyze"). Tests are added to `app/api/parse-transmittal/route.test.ts` and `services/parse-api.test.ts`, and they assert that no raw provider string is returned. | 2 |
| 4 | REQ-5 | **Personal key integrity.** In `server/user-ai-settings.ts`, add `resolveUserGeminiKey(userId) → { apiKey: string \| null; keyClass: "user" \| "system" \| "none"; personalKeyStatus: "none" \| "usable" \| "unusable" }`. Keep `getDecryptedUserGeminiApiKey` as a thin wrapper for compatibility. `getUserAiKeyMetadata` adds `personalKeyStatus` by attempting a decrypt, without exposing the cause beyond `unusable`, and keeps `hasCustomGeminiKey`. Both routes use the resolver. When the status is `unusable` and the system key is used, the result carries `keyClass: "system"` and the import status line says the shared key was used. `components/account/FloatingAccount.tsx` shows "Personal key unusable — re-enter it" in place of "Personal key", and `services/user-ai-settings-api.ts` adds the field. Tests cover corrupted ciphertext and a missing `APP_SETTINGS_ENCRYPTION_KEY`. | 2 |
| 5 | REQ-6 | **Visual preflight.** Before a visual `inlineData` call, compute decoded bytes and, through `classifyPdfAsync` (already used by QA, about 10–50 ms), the page count. Refuse with `too_large` when the PDF exceeds `GEMINI_INLINE_MAX_BYTES` (default 20 MB decoded; the value is verified in Step 9 against the selected model per spec A2) or 1,000 pages. Reconcile the limits in `docs/TRANSMITTAL_QA.md` and `docs/ARCHITECTURE.md` in the same change. | 2 |
| 6 | REQ-2, REQ-3 | **Honest rows on the client.** In `hooks/useDocumentParsing.ts`, stop collapsing fallback into a count. Build rows with `extraction: { readMethod, reason }` and set the status message to name each file needing review together with its reason copy, for example "Needs review: scan-01.pdf (scanned, read visually), memo.pdf (AI timed out — read from file name)". The word "extraction" is never used for a visual or fallback row. In `hooks/useDriveImport.ts`, delete the `forceRemark` overwrite so the fallback reason in `remarks` is kept (D3). The `analyze` catch branch maps the error to a reason with `classifyProviderError` and records `{ file, reason }`. `describeDriveImport` lists review and failed files with reasons. Apply D8 for `readMethod: "none"`. Pass `flow` from each entry point. Show a small "Review" marker on rows whose `extraction.readMethod` is not `"text"` in the existing files/items list (`components/main/panels/FilesPanel.tsx`), with no new screen and no restyle. | 3, 4 |
| 7 | REQ-4 | **QA coverage honesty.** `lib/transmittal-qa.ts` adds optional `contentSource` and `reason` to `QaDocumentResultSchema`, and old snapshots still parse. `aggregateQa` keeps withholding `Passed` for `visual` and gives a distinct explanation: "Scanned — visually read, review required. Accept after checking the evidence, or attach a text PDF." Unavailable or error documents keep "could not check" copy with a reason. `components/main/panels/QaPanel.tsx` shows the scan copy, the AI evidence that already exists, and the recovery action. Retrying the same scan is not offered as the fix. Tests in `lib/transmittal-qa.test.ts`, `components/main/panels/QaPanel.test.tsx`, and `server/transmittal-qa.test.ts` assert that `visual` never yields `Passed` or the `full-text` copy. | 2 |
| 8 | REQ-8 | **Selective OCR module.** Add `server/ocr.ts` with `ocrPages(bytes, { pages, maxPages, budgetMs }) → { pages: { page, text, source, confidence, hostedRecommended }[]; reason?: "ocr_timeout" \| "ocr_unavailable" }`. It returns `ocr_unavailable` immediately when `OCR_ENABLED` is not true or the library or model paths are missing. It resolves `PDFIUM_LIB_PATH`, `ORT_DYLIB_PATH`, and `modelDirectory` from `path.join(process.cwd(), "vendor/ocr/…")` before the lazy `import()`. It calls `processPdfWithOcr` with `mode: "Auto"`, `offline: true`, and 1-indexed `pageNumbers` restricted to the flagged pages, capped at `maxPages`. It applies D6 cache and single-flight, uses `Promise.race` for the budget (D5), and logs only page numbers, counts, confidence, and timings. **Parse path:** `server/pdf-parsing.ts` runs `classifyPdfAsync` first. A text-based PDF never calls `ocrPages` (rule 1). If the cover needs OCR, it OCRs pages 1..`OCR_PARSE_MAX_PAGES` among `pagesNeedingOcr` and feeds the text into the existing `parseDocumentText` and Gemini text path with `readMethod: "ocr"`. Otherwise it uses today's visual path with `readMethod: "visual"` and the OCR reason. **J3:** when the cover text passes but `parseDocumentText` and Gemini text yield no strong identifier, it extracts native pages 2..3 once (`extractPagesMarkdownAsync`) and retries the local identifier scan. Otherwise it returns `document_number_unresolved`. **QA path:** `prepareQaDocument` OCRs `pagesNeedingOcr` up to `OCR_QA_MAX_PAGES` through the same cache, merges native and OCR pages, and sets `contentSource: "ocr"` with `coverage: "visual"` (D4). If it is over the cap or `ocr_timeout`, it falls back to today's whole-PDF visual call with the reason. | 2, 5, 7 |
| 9 | REQ-8 | **Runtime provisioning and measurement.** Add `scripts/fetch-ocr-runtime.sh`, which downloads the PDFium tgz and the ONNX Runtime wheel, verifies them against `SHA256SUMS` and the PyPI SHA-256 (pinned in the script), and extracts `libpdfium.so` and `libonnxruntime.so.1.27.0` into `vendor/ocr/lib/`. It warms the model set once with `PDF_INSPECTOR_MODEL_CACHE=vendor/ocr/cache` on a 1-page scan, copies the resolved PP-OCRv6 files to `vendor/ocr/models/`, and records their names and SHA-256 in `vendor/ocr/MANIFEST.txt`. Add `vendor/ocr/` to `.gitignore`. Add a `vercel-build` script (`sh scripts/fetch-ocr-runtime.sh && npm run build`, keeping `.next` per `next.config.mjs`). Add `outputFileTracingIncludes` for `/api/parse-transmittal` and `/api/transmittal-qa` → `./vendor/ocr/**`. Measure on a Vercel preview (sin1): unzipped function size, cold-start ms, 1-page and 10-page OCR wall time, and an `offline: true` run, with the network proven unused by a missing-model test that returns `ocr_unavailable` and makes no fetch. Record the results in `evidence.md` and adjust the D5 budgets if needed. | 8 |
| 10 | REQ-8 | **Rollout.** Ship with `OCR_ENABLED=false` in production first, so Steps 2–7 deliver diagnostics alone. Enable on preview, then on production after the Step 9 budgets pass. Recovery: set `OCR_ENABLED=false` and redeploy the last build (Vercel applies env changes only on redeploy). Document this in `docs/ARCHITECTURE.md`. | 9 |
| 11 | REQ-7 | **Close the hypothesis register.** Turn the Step 1 tests green, add dismissed or retained notes (H7 stays out of scope per Q5, with evidence), and run the full suite and build. Write `evidence.md` with the revision, commands, and expected versus observed results. | 2–10 |

## 4. Checks

| Check | Requirement IDs | Implementation or QA | Action and expected observation |
| --- | --- | --- | --- |
| C1 | REQ-1, REQ-6 | Implementation | `npx vitest run services/geminiService.test.ts lib/parse-reasons.test.ts`. A mocked SDK throwing timeout, 429, 413, model-not-found, 401, 500, malformed JSON, `finishReason` other than `STOP`, and a missing key each yields exactly one expected `reason` and its copy. No result contains the mocked raw provider string. |
| C2 | REQ-1, REQ-5, REQ-6 | Implementation | `npx vitest run app/api/parse-transmittal/route.test.ts services/parse-api.test.ts`. The response carries `reason`, `readMethod`, and `keyClass`. Over 25 MB → 413 with `too_large`. A client abort → `provider_timeout` with "took too long" copy. The logged JSON has `flow` and `reason`, and no `content`, key, or file name. Existing success-shape assertions still pass. |
| C3 | REQ-5 | Implementation | `npx vitest run server/user-ai-settings.test.ts`. Corrupted ciphertext → `personalKeyStatus: "unusable"`, `hasCustomGeminiKey: true`, resolver `keyClass: "system"`. A missing encryption secret gives the same result. The key value never appears in output or logs. |
| C4 | REQ-2, REQ-3 | Implementation | `npx vitest run hooks/useDriveImport.test.tsx hooks/useDocumentParsing.test.tsx`. A parse rejection gives a named per-file failure with a reason. `{ error, items }` keeps the reason in `remarks` and does not show "Imported from Google Drive". The status names each review file. Success stays unchanged. A generic `scan.pdf` fallback has an empty number and `document_number_unresolved` (D8). |
| C5 | REQ-4 | Implementation | `npx vitest run lib/transmittal-qa.test.ts server/transmittal-qa.test.ts components/main/panels/QaPanel.test.tsx`. A `visual` document with all phrases found → `Needs review` with the scan copy, never `Passed` and never "Full document text checked". An old snapshot without `contentSource` still parses. |
| C6 | REQ-8 | Implementation | `npx vitest run server/ocr.test.ts server/pdf-parsing.test.ts`, with `@firecrawl/pdf-inspector` mocked. A text PDF never calls `processPdfWithOcr`, and the lazy import is not triggered for OCR. A scan routes only `pagesNeedingOcr`, capped at `maxPages`. A second call with identical bytes calls native zero more times. Two concurrent calls share one native call. A budget overrun → `ocr_timeout` and the visual fallback. `OCR_ENABLED` unset → `ocr_unavailable`, with no import of the OCR function. Logs contain no page text. |
| C7 | REQ-7 | Implementation | The Step 1 tests were red on `78d9d81` (recorded) and are green after Step 11. `evidence.md` lists each H1–H7 as confirmed or dismissed, with evidence. |
| C8 | all | Implementation | `npm test` (whole Vitest suite) and `npm run build` complete with zero failures and no type errors. |
| C9 | REQ-8 | Implementation (deploy) | Step 9 measurements on a Vercel preview. The unzipped function is under Vercel's 250 MB limit and the size is recorded. Cold start is recorded. A 1-page scan OCRs in ≤ 10 s. A 10-page scan OCRs only flagged pages and completes within 110 s end to end. `offline: true` with models removed returns `ocr_unavailable` and makes no outbound fetch. |
| Q1 | REQ-2, REQ-8 | QA (user-facing) | On a preview with `OCR_ENABLED=true`, upload a 1-page scanned PDF in the upload dialog. **Expect:** one row with a "Review" marker, a status naming the file as "scanned, read with OCR", and the item description and number from the scan text. A second upload of the same file is noticeably faster (cache hit in the log). |
| Q2 | REQ-1, REQ-2, REQ-8 | QA | Same as Q1 with `OCR_ENABLED=false`. **Expect:** the row is marked "read visually — review", the status gives the reason "local OCR unavailable", and the user is never told it was "extracted". |
| Q3 | REQ-1, REQ-2 | QA | With an invalid system key and no personal key, upload a text-less scan. **Expect:** a row from the file name, a status saying the AI key was rejected and the row came from the file name, no raw provider text, and an empty number for a file named `scan.pdf`. |
| Q4 | REQ-3 | QA | Import a Drive folder holding one text PDF and one scanned PDF, with OCR off and a mocked or forced provider timeout on the scan. **Expect:** the text item is added normally. The status names the scan with "AI timed out". The scan row's remarks show the timeout reason, not "Imported from Google Drive". |
| Q5 | REQ-4 | QA | Run QA on a scanned PDF whose cover visibly contains every required phrase. **Expect:** the row shows "Needs review" with "Scanned — visually read, review required", the AI or OCR evidence is shown, and the recovery tells the user to accept after checking or to attach a text PDF. A text PDF with the same phrases shows "Passed". |
| Q6 | REQ-5 | QA | Save a personal key, then change `APP_SETTINGS_ENCRYPTION_KEY` on the preview and redeploy. **Expect:** the account panel says "Personal key unusable — re-enter it", and an import status says the shared key was used. Re-entering the key restores "Personal key". |
| Q7 | REQ-6 | QA | Upload a scanned PDF over `GEMINI_INLINE_MAX_BYTES` but under 25 MB encoded. **Expect:** an immediate "too large to read visually" reason (no 60 s wait), and the row is marked for review. |
| Q8 | REQ-1, D7 | QA | After Q1–Q7, read the preview's function logs. **Expect:** every `document_parse_complete` and `document_qa_complete` line has `flow`, `reason`, `readMethod`, and `keyClass`, and none contains document text, a key, or a file name. |
| Q9 | REQ-1 | QA | With a text PDF whose identifier is only on page 2 (J3). **Expect:** the identifier is found through the bounded later-page check, or the row says "document number not found" with an empty number, not a filename-derived one. |

### Traceability

| Requirement | Steps | Checks |
| --- | --- | --- |
| [REQ-1](context-spec.md#req-1-classify-and-propagate-parse-failure-reasons) | 2, 3 | C1, C2, Q2, Q3, Q8, Q9 |
| [REQ-2](context-spec.md#req-2-mark-scanned-and-unreadable-imports-honestly) | 6 | C4, Q1, Q2, Q3 |
| [REQ-3](context-spec.md#req-3-preserve-drive-failure-reasons) | 6 | C4, Q4 |
| [REQ-4](context-spec.md#req-4-distinguish-qa-visual-coverage-from-unreadable-coverage) | 7, 8 | C5, Q5 |
| [REQ-5](context-spec.md#req-5-report-unusable-personal-keys) | 3, 4 | C2, C3, Q6 |
| [REQ-6](context-spec.md#req-6-preflight-provider-size-and-timeout-risks) | 2, 3, 5 | C1, C2, Q7 |
| [REQ-7](context-spec.md#req-7-prove-the-chosen-cause-with-regression-tests) | 1, 11 | C7, C8 |
| [REQ-8](context-spec.md#req-8-ocr-only-the-pages-that-need-it-with-option-a) | 8, 9, 10 | C6, C9, Q1, Q2 |

## 5. Compatibility, recovery, and manual notes

- **API compatibility:** every new response and request field is optional (`reason`, `readMethod`, `keyClass`, `flow`, `personalKeyStatus`, `contentSource`). Existing clients and saved transmittals are unaffected. There is no Prisma migration.
- **Saved content:** printed and exported transmittals are unchanged. D2 is session-only, and D3 only stops an overwrite that exists today.
- **QA snapshots:** stored `Transmittal.qa` snapshots without the new fields still validate.
- **Recovery:** `OCR_ENABLED=false` plus a redeploy returns to the Gemini-visual path (Option C) with an honest reason. Steps 2–7 have no runtime dependency and stay live.
- **Local dev:** OCR is off by default. To try it on Linux x64, run `sh scripts/fetch-ocr-runtime.sh` and set `OCR_ENABLED=true`. macOS arm64 is "preview" upstream.
- **Privacy:** logs and responses never include document text, OCR text, provider payloads, keys, or file names.

## 6. Questions

| ID | Question | Impact | Blocks approval? | Consequence if wrong | Recommended answer |
| --- | --- | --- | --- | --- | --- |
| W-Q1 | Should the per-row "Review" marker (D2) persist across reloads? Persisting it means adding an optional field inside the `document` JSON (no Prisma migration, but a change to the strict `DocumentReferenceSchema` used by QA requests). | 3 | No | Session-only: after a reload, only the remark text shows a row needs review. Persisted: a wider contract change. | Session-only now, and revisit if users reload mid-review. |
| W-Q2 | Is it acceptable to land Steps 1–7 (diagnostics) first with `OCR_ENABLED=false`, and enable OCR only after the Step 9 measurements? | 3 | No | Enabling OCR at once risks a deploy or cold-start regression before it is measured. | Yes, staged rollout (Step 10). |

Neither question changes approved behaviour. If the answer to either differs from the recommendation, this workflow is revised. The spec is not reopened.

## 7. Not done in this stage

No source was changed, and no test, build, or deployment was run for this workflow. The fingerprint of this file is presented for approval separately and recorded in [approvals.md](approvals.md) only after explicit approval.
