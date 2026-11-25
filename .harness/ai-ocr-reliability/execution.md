# Execution: Scanned-PDF (OCR) and AI parsing failure reliability

- **Work item:** `.harness/ai-ocr-reliability/`
- **Stage:** execute (complete, pending QA)
- **Approved spec:** [context-spec.md](context-spec.md), revision 3, SHA-256 `8b9e5e56acffe7da5ef082357abcd8cda9ef1e034d3bf0d5e805f725d67edc04`
- **Approved workflow:** [workflow.md](workflow.md), revision 1, SHA-256 `f262c5d2ff793326ed909b4e4bb9acf902a7db534f35d2e8b3d12bf19ed290bc`. It cites the same spec revision. Both approvals are in [approvals.md](approvals.md), and both fingerprints were re-verified against current bytes before any change.
- **Base revision:** `main` at `78d9d81`
- **Branch:** `harness/ai-ocr-reliability` (local). **Not committed or pushed.** No pull request exists.
- **Environment:** macOS 26 (Darwin 25.5.0) arm64, Node via `npx`, Vitest 4.1.10, Next.js production build (`npm run build`).
- **Unrelated working-tree changes left untouched:** `.DS_Store` files and untracked `.agents/`, `.claude/`, `graphify-out/`, and `skills-lock.json`.

## 1. Changes by requirement

### [REQ-1] Classify and propagate parse failure reasons (Steps 2–3)

- New `lib/parse-reasons.ts`:
  - The 13-reason `ParseReason` vocabulary (D1), with user copy (`reasonCopy`) and recovery actions (`reasonRecovery`).
  - `classifyProviderError`, which checks the status code first and then message patterns.
  - `ParseRequestError`, `reasonFromClientError`, `reviewNote`, `needsReview`, and `keyClassFor`.
  - The `ReadMethod`, `KeyClass`, `PersonalKeyStatus`, and `ImportFlow` types.
- `services/geminiService.ts`:
  - `ParseResult` gains `reason`, `readMethod`, `keyClass`, and `personalKeyStatus`.
  - `buildFallbackParseResult` is replaced by the exported `buildFailureParseResult(fileName, reason)`.
  - Every failure path sets exactly one reason.
  - The raw `error.message` passthrough is removed. The failure log is now `{ event, reason, status }` only, where it previously logged the whole SDK error object.
  - The new 8th parameter `ParseOptions.timeoutMs` sets the provider timeout.
- `app/api/parse-transmittal/route.ts`:
  - The response carries `readMethod`, `reason`, `keyClass`, and `personalKeyStatus`.
  - The 413 response carries `reason: "too_large"`.
  - An optional `flow` value is validated against `IMPORT_FLOWS`. Unknown values are ignored.
  - `document_parse_complete` adds `flow`, `readMethod`, `reason`, `keyClass`, `personalKeyStatus`, `pageCount`, `ocrPages`, and `ocrMs`. It never logs the file name or content.
- `lib/validation.ts`: `ParseTransmittalRequestSchema` gains optional `flow`.
- `services/parse-api.ts`: the 90 s client abort now throws `ParseRequestError(…, "provider_timeout")` with "The document took too long to analyze".

### [REQ-2] Mark scanned and unreadable imports honestly (Step 6, D2, D8)

- `types.ts`: `TransmittalItem.extraction?: ItemExtraction` (`readMethod`, `reason?`). It is session-only. `services/transmittal-mappers.ts` / `server/transmittal-service.ts` still persist only their explicit fields, so there is no schema change and saved or printed content is unchanged (W-Q1).
- `hooks/useDocumentParsing.ts`:
  - Each row carries `extraction`.
  - The status names each file needing review with its note, for example "deed.pdf (read visually by AI — Local OCR is unavailable.)".
  - It never calls a visual or fallback row "extracted".
  - It sends `flow: "upload"` and appends a personal-key notice when `personalKeyStatus: "unusable"`.
  - **Behaviour change:** a request that throws, such as the 90 s timeout, now produces a named filename row with its reason. Previously the file was dropped and the status said "File processing failed."
- `services/geminiService.ts`: `isGenericFileName` and `resolveDocumentNumberWithFallback({ unreadable })` leave the number empty for unreadable rows with generic names (Q4 default, D8).
- `components/main/panels/FilesPanel.tsx`: the new exported `reviewItems` feeds a "Needs review · N" section listing each row's name, note, and recovery. It uses the panel's existing classes and tokens and adds no new screen.

### [REQ-3] Preserve Drive failure reasons (Step 6, D3)

- `hooks/useDriveImport.ts`:
  - The `forceRemark` overwrite is removed. Remarks keep the item's own remark, which for fallback rows is the reason copy, or `"Imported from Google Drive"`.
  - The `analyze` catch maps the error with `reasonFromClientError`.
  - `fallbackItem(file, reason?)` carries `extraction` and the reason copy, and leaves generic names unnumbered.
  - `DriveImportResult.reviewFiles` holds `{ name, note }` per file.
  - `describeDriveImport` lists "Needs review: name (note); …", with the old count sentence kept as a fallback.
  - `importFilesWithAi(files, label, flow?)` derives `drive-selection`, `drive-link`, or `drive-folder` from the label and passes it to the server.

### [REQ-4] Distinguish QA visual coverage from unreadable coverage (Step 7, D4)

- `lib/transmittal-qa.ts`:
  - `QaDocumentResultSchema` gains optional `contentSource` (`native`, `ocr`, `gemini-visual`) and `reason`. Legacy snapshots still parse.
  - The new `qaCoverageLabel` returns the per-document label.
  - `SCANNED_REVIEW_EXPLANATION` reads "Scanned — visually read, review required. Accept after checking the evidence, or attach a text PDF."
  - In `aggregateQa`, `visual` still never yields `Passed`. The default "could not check" copy now adds "Reattach the file or retry."
- `components/main/panels/QaPanel.tsx`: the per-document "Content:" line uses `qaCoverageLabel`.
- `server/transmittal-qa.ts` (with REQ-8): OCR-derived QA keeps `coverage: "visual"`, and every keyword becomes `uncertain` while keeping its evidence and page.
- `app/api/transmittal-qa/route.ts`: logs `document_qa_complete` (coverage, content source, reason, key class, personal key status).

### [REQ-5] Report unusable personal keys (Steps 3–4)

- `server/user-ai-settings.ts`:
  - `resolveUserGeminiKey(userId) → { apiKey, personalKeyStatus }`.
  - `getUserAiKeyMetadata` adds `personalKeyStatus`, found by attempting a decrypt, and keeps `hasCustomGeminiKey`.
  - `getDecryptedUserGeminiApiKey` stays as a wrapper.
  - The decrypt-failure log now records only the first sentence of the error, not the error object.
- Both the parse and QA routes use the resolver. `keyClassFor` reports `user`, `system`, or `none`.
- `components/account/FloatingAccount.tsx` shows "Key source: System key" plus an alert line, "Personal key unusable — re-enter it below." Remove stays enabled. `services/user-ai-settings-api.ts` adds the field.

### [REQ-6] Preflight provider size and timeout risks (Steps 3, 5)

- Parse route: a visual PDF over `GEMINI_INLINE_MAX_BYTES` (default 20 MB decoded) or 1,000 pages returns `buildFailureParseResult(fileName, "too_large")` without a provider call.
- The provider timeout is `clamp(85 s − time already spent, 20 s, 60 s)`, which keeps the response inside the client's 90 s.
- The timeout copy, "took too long", is distinct from `provider_rejected` ("The AI service failed or rejected the request").
- `docs/ARCHITECTURE.md` and `docs/TRANSMITTAL_QA.md` now state the reconciled limits and behaviour.

### [REQ-7] Prove the chosen cause with regression tests (Steps 1, 11)

- Ten new test files hold 47 tests, plus 2 added to `components/main/panels/FilesPanel.test.tsx`. Results and hypothesis outcomes are in §2 and §3.

### [REQ-8] OCR only the pages that need it, Option A (Steps 8–10, D5–D6, D9)

- New `server/ocr.ts` `ocrPages(bytes, { pages, maxPages, budgetMs })`:
  - It is off unless `OCR_ENABLED=true` and the libraries and `models/` directory (or warm cache) exist. Otherwise it returns `ocr_unavailable` without importing the native OCR call.
  - It loads lazily and calls `processPdfWithOcr` with `mode: "Auto"` and `offline: true`, on 1-indexed deduped pages capped at `maxPages`.
  - It caches per SHA-256 and per page (an LRU of 32 documents and 64 MB, 30 min TTL), and concurrent identical requests share one in-flight call.
  - `Promise.race` enforces the budget and returns `ocr_timeout`. The native call keeps running and fills the cache for a retry.
  - Logs carry counts and timings only.
- `server/pdf-parsing.ts`:
  - `preparePdfForParsing` runs `classifyPdfAsync` and then the cover extraction. A reliable cover never touches OCR.
  - Otherwise it OCRs the cover plus flagged pages ≤ `OCR_PARSE_MAX_PAGES` (default 3), giving `readMethod: "ocr"` text, or falls back to visual with a reason.
  - The new `extractLaterPagesText` reads native pages 2–3 for J3.
- Parse route J3: when the cover's identifier is weak, it reads pages 2–3 once. A labelled identifier found there replaces the weak number. Otherwise the result carries `document_number_unresolved`.
- `server/transmittal-qa.ts` `prepareQaDocument` OCRs only the unreliable pages when there are ≤ `OCR_QA_MAX_PAGES` (10) of them, merges native and OCR pages, and sends text, not `inlineData`. Otherwise it sends the whole PDF visually with a reason.
- New `scripts/fetch-ocr-runtime.sh`, enabled by `OCR_BUNDLE_RUNTIME=true`:
  - It downloads the checksum-pinned PDFium `native-v7988` and ONNX Runtime 1.27.0 wheel (linux-x64 and mac-arm64).
  - It warms the models with the new `scripts/ocr-warmup.mjs`, copies the three model files to a read-only `vendor/ocr/models/`, drops the lock-file cache, and writes `vendor/ocr/MANIFEST.txt`.
- `next.config.mjs` adds `outputFileTracingIncludes` for the parse and QA routes. `package.json` adds `vercel-build` (fetch, then `prisma generate && next build`) and `ocr:runtime`. `.gitignore` adds `/vendor/ocr/`, and `.env.example` documents the variables.

### Test files adjusted for the new contract

| File | Change | Why |
| --- | --- | --- |
| `services/geminiService.test.ts` | The raw-message assertion (`error === "AI unavailable"`) is replaced by `reason: "provider_rejected"` plus a not-contains check. | That assertion pinned the H6 defect. |
| `server/pdf-parsing.test.ts` | `toEqual` becomes `toMatchObject`, and `readMethod`/`reason` are asserted. | New optional fields. |
| `app/api/parse-transmittal/route.test.ts` | Mocks use `importOriginal` plus `resolveUserGeminiKey`. The timeout option is expected, and `toMatchObject` is used. | New 8th parameter and resolver. All old assertions kept. |
| `app/api/transmittal-qa/route.test.ts` | The mock exposes `resolveUserGeminiKey`. | Resolver. |
| `services/parse-api.test.ts` | New timeout copy, and asserts `reason: "provider_timeout"`. | REQ-6 copy. |

## 2. Checks run

| Check | Requirement IDs | Command or action | Expected | Observed | Result |
| --- | --- | --- | --- | --- | --- |
| Baseline | — | `npx vitest run --environment jsdom` on `78d9d81` before changes | All green | 48 files, 206 tests passed | Pass |
| C7 red | REQ-7 | The 10 new test files on unchanged source ([step1-red.txt](evidence/step1-red.txt)) | New behaviour absent | 46 failed, 1 passed. The pass is "keeps OCR-read scans review-only", which confirms the existing H4 policy. Of the failures, 3 files failed to load (new modules missing) and 8 tests hit missing exports. The rest were behavioural assertion failures. | Pass (as red) |
| C1 | REQ-1, REQ-6 | `lib/parse-reasons.test.ts`, `services/geminiService.reasons.test.ts`, `services/geminiService.test.ts` | One reason per provider condition. No raw text in error or remarks. | All passed | Pass |
| C2 | REQ-1, REQ-5, REQ-6 | `app/api/parse-transmittal/route*.test.ts`, `services/parse-api.test.ts` | Fields returned. 413 gives `too_large`. Preflight skips Gemini. The log has flow and reason, with no name or content. J3 hit and miss. Timeout between 20 and 60 s. | 19 route tests passed. The parse-api timeout test asserts `provider_timeout`. | Pass |
| C3 | REQ-5 | `server/user-ai-settings.test.ts` | Rotated secret, corrupted ciphertext, or missing secret gives `unusable`. The key is never in the output. | 4 passed | Pass |
| C4 | REQ-2, REQ-3 | `hooks/useDriveImport*.test.tsx`, `hooks/useDocumentParsing.test.tsx`, `components/main/panels/FilesPanel.test.tsx` | Reason kept in remarks. Files named. `scan.pdf` blank. Flow passed. Review list excludes text rows. | All passed | Pass |
| C5 | REQ-4 | `lib/transmittal-qa*.test.ts`, `server/transmittal-qa*.test.ts`, `components/main/panels/QaPanel.test.tsx` | Visual never passes, has the scan copy and a recovery. Legacy snapshot parses. OCR text is sent, not the PDF. | 27 passed | Pass |
| C6 | REQ-8 | `server/ocr.test.ts`, `server/pdf-parsing.ocr.test.ts` | Disabled means no native import. Caps, dedupe, `Auto`, `offline`. Cache and single-flight. Budget gives `ocr_timeout`. Native error gives `ocr_unavailable`, with no text logged. | All passed | Pass |
| C8 | all | `npx vitest run --environment jsdom` ([full-suite.txt](evidence/full-suite.txt)) | Zero failures | 58 files, 277 tests passed | Pass |
| C8 | all | `npm run build` ([build.txt](evidence/build.txt)) | Compiles with no type errors | Exit 0. All routes built. Better Auth warnings are about missing local env and pre-existing. | Pass |
| C8 | all | `npx tsc --noEmit` after the build's `prisma generate` | No errors | No output. Before `prisma generate` it reported only the 2 pre-existing `@prisma/client` export errors. | Pass |
| C9 (local part) | REQ-8 | `OCR_BUNDLE_RUNTIME=true sh scripts/fetch-ocr-runtime.sh` on mac-arm64 | Checksums verified, models warmed | PDFium and ORT checksums matched. Warm-up took 5–9 s. Bundle 65 MB: ORT dylib 29.7 MB, PDFium 7.2 MB, det 9.9 MB, rec 21.2 MB, dict 75 KB. | Pass |
| C9 (local part) | REQ-8 | Real OCR on generated fixtures: `text.pdf` and image-only `scan.pdf` built with `sips`. Read-only model directory, `offline: true`. | Text routes nothing. Scan is OCR'd. | `text.pdf` routed `[]` in 2 ms. `scan.pdf` routed `[1]` in 618 ms at confidence 0.995, and the text matched the source, including "Document No: DAS-2024-0187". | Pass |
| C9 (local part) | REQ-8 | App path through `tsx` with `preparePdfForParsing` and `prepareQaDocument`, using `OCR_ENABLED=true`, then disabled, then models removed with proxies blocked | ocr, cache hit, QA reuse, honest degrade | Enabled: text gives `readMethod: "text"` (53 ms). Scan gives `ocr` (756 ms), then 1 ms from the cache. QA gives `contentSource: "ocr"`. Disabled, or models missing: `visual` plus `ocr_unavailable`, with no native call. | Pass |
| C9 (local part) | REQ-8 | `.next-build/server/app/api/*/route.js.nft.json` | `vendor/ocr` traced for the parse and QA routes only | 6 files in each of parse and QA. 0 in `user-ai-settings`. | Pass |
| C9 (local part) | REQ-8 | Linux x64 artifact sizes from the pinned archives | Under 250 MB | `libonnxruntime.so.1.27.0` 23.7 MB, plus a 14 KB providers stub. `libpdfium.so` 7.7 MB. Models 31.1 MB. About 62.5 MB added to each OCR route. | Pass (estimate) |
| C9 (deploy) | REQ-8 | Vercel preview: unzipped size, cold start, 10-page scan within 110 s | Measured on sin1 | **Not run.** No Vercel access in this session (the Vercel connector is unauthenticated), and nothing was pushed. | Blocked |
| Q1–Q9 | all | User-facing QA scenarios in [workflow §4](workflow.md#4-checks) | — | Not run. They belong to the separate QA stage. | Skipped |

## 3. Hypothesis register outcome (REQ-7)

| ID | Outcome | Evidence |
| --- | --- | --- |
| H1 | **Confirmed.** Scans had no local text path, and every provider failure became an anonymous filename row. | Source (`preparePdfForParsing` had no OCR, `buildFallbackParseResult` had no reason). The red tests in `pdf-parsing.ocr` and `geminiService.reasons` were behavioural failures. Fixed with reasons, `readMethod`, and selective OCR. |
| H2 | **Confirmed.** Drive replaced the reason with "Imported from Google Drive". | Source (`forceRemark`). The red file failed to load because the new `ParseRequestError` was missing, so its behaviour is shown green after the fix rather than red before it. |
| H3 | **Confirmed in source.** A decrypt failure returned `null` while metadata said a personal key existed. | `getDecryptedUserGeminiApiKey` and `getUserAiKeyMetadata`. Red tests hit the missing resolver export. A green test covers rotated, corrupted, and missing secrets. |
| H4 | **Confirmed as policy, retained (Q3).** Visual never passes. The defect was the unexplained "Needs review". | The one test passing in the red run. Wording and recovery fixed. |
| H5 | **Confirmed in source.** Only cover page `[0]` became text. | Bounded pages 2–3 lookup added, with route tests for J3 hit and miss. |
| H6 | **Confirmed.** Raw provider text reached the client and the logs. | The existing test asserted `result.error === "AI unavailable"`, the raw SDK message. The red-run log shows the old code printing the full error ("Gemini Service Failed: SyntaxError: …"). Fixed. |
| H7 | **Not exercised.** Legacy `.doc` stays out of scope (Q5). | No `.doc` fixture or change. Goldfish finding 17 remains separate. |

The reporter's specific occurrence is still not reproduced, because no file or message was provided. The new `document_parse_complete` and `document_qa_complete` fields (`flow`, `reason`, `readMethod`, `keyClass`) make the next occurrence diagnosable from logs.

## 4. Deviations and notes

- **Model bundling (Step 9).** The workflow planned a warmed cache copied to `models/`. That is what was done, and in addition the managed cache is removed after copying, because it contains `.lock` files a read-only deployment cannot create. Real OCR was verified with a `chmod 555` model directory.
- **`keyClassFor`** lives in `lib/parse-reasons.ts`, not `server/user-ai-settings.ts`, so route mocks stay simple. Behaviour is unchanged.
- **Local upload timeouts** now produce a named review row (§1, REQ-2) instead of dropping the file. This follows J1 and REQ-2 and is called out for QA.
- **`vercel-build`** replaces Vercel's default `build` invocation. It is the same build without the local `.next-build` dist override, which Vercel ignores anyway. If the Vercel project sets a custom Build Command in its settings, that setting wins, and the OCR fetch will not run.
- **Better Design review.** The user's global instructions require the Better Design MCP tools for UI work. Only their `authenticate` tool was exposed in this session, so the two small UI additions (the Files panel review list and the account key alert) were **not** design-reviewed with those tools. They reuse existing component classes and tokens.
- **Build side effects.** `npm run build` rewrote `next-env.d.ts` and `tsconfig.tsbuildinfo`. Both were restored with `git checkout`.

## 5. Still unverified, and next steps

1. A Vercel preview with `OCR_BUNDLE_RUNTIME=true`, to measure unzipped function size and cold start, and to run a 10-page scan end to end (C9 deploy). This is blocked on deploy access.
2. Production rollout per [workflow Step 10](workflow.md#3-ordered-steps): ship with `OCR_ENABLED=false`, then enable after step 1.
3. The QA stage (Q1–Q9) is a separate invocation.
4. Commit and push are not done. Run them when you ask.
