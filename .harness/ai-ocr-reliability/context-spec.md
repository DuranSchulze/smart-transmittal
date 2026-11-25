# Spec: Scanned-PDF (OCR) and AI parsing failure reliability

- **Work item:** `.harness/ai-ocr-reliability/`
- **Stage:** spec (draft, not approved)
- **Source issue:** GitHub #2 — [Possible revisit for the possible update of the feature](https://github.com/DuranSchulze/smart-transmittal/issues/2)
- **Intake evidence:** issue title and body only; no comments, no labels, no sample file, no error log, no reproduction steps.
- **Knowledge graph:** rebuilt for this stage (`graphify-out/graph.json`, 2,431 nodes).
- **Prior artifacts:** [Goldfish review](../../goldfish_review_report.md) (findings 9 and 17 on Word extraction and legacy `.doc`), [Transmittal QA](../../docs/TRANSMITTAL_QA.md), [Architecture and data flow](../../docs/ARCHITECTURE.md), [Feature roadmap](../../docs/note.md). Those artifacts describe intent and earlier review state, not current runtime behavior.

This is a draft. It records evidence and hypotheses so the reporter can confirm which failure they saw. It does not authorize source changes.

## 1. Source issue and intake evidence

Issue #2, opened by the project owner, is currently:

- **Title:** "Possible revisit for the possible update of the feature"
- **Body:** "Identifying the possible cause of AI errors and OCR issue in the transmittal"
- **State:** open. **Labels:** none. **Comments:** none.

What the issue establishes:

- A user-visible problem exists in the transmittal workflow involving (a) AI errors and (b) OCR or document-text extraction.
- The reporter wants the **cause identified** before deciding what to update.

What it does **not** establish:

- Which flow (local upload, Drive selection, Drive folder link, single-file link, Drive sheet, or QA).
- Which file type, file size, page count, or whether the document was scanned/image-only.
- The exact message seen, the environment, the model selected, or whether a personal Gemini key was configured.

### Reporter follow-up (this conversation)

- **Flow:** "I dont know where." The reporter cannot say which import or QA path produced the error.
- **OCR direction:** "Local OCR maybe there should be fixes and making it very code efficient." The reporter leans toward local OCR and wants an efficient implementation.
- **Failure trigger:** "The error happens when AI was being used." The failure occurs on the Gemini path, not before it.

These answers close the location question only partially: because the flow is unknown, the spec must instrument **all** import and QA paths and cover the shared AI path, rather than guess one screen. They also make local OCR a candidate solution; §4.1 evaluates it against the dependency that is already installed.

Per the constitution, an issue is intake and evidence, never approval. Because the report is symptom-level, this spec is deliberately hypothesis-first: it names the plausible causes it can evidence in source, states how each would be proven or dismissed, and defines requirements that make the cause observable to the reporter and to support.

## 2. Users, goal, and current behavior

### Actors

- **Preparer** — signed-in user importing a PDF/Word file or Drive files into a transmittal and expecting the item description and document number to be trustworthy.
- **QA operator** — signed-in user running the optional checklist against attached documents.
- **Configuration owner** — whoever manages the shared `GEMINI_API_KEY`, `APP_SETTINGS_ENCRYPTION_KEY`, and model default.
- **Support/developer** — needs a safe, structured reason for a failed import without seeing document contents or keys.

### Goal

Make document import and QA **honest and diagnosable** for text PDFs, scanned PDFs, and Word files:

1. A failure caused by a scan, an unreadable page, a provider limit, a timeout, or a configuration problem is named as such.
2. A scanned document never looks like a successful AI extraction when it is not.
3. The reporter can identify which of the causes in §3 applies without exposing document content or secrets.

### Evidence of current behavior (source, not runtime)

The parsing route is local-first, then Gemini:

- `app/api/parse-transmittal/route.ts` authenticates, validates, rejects images, caps encoded content at 25 MB, calls `preparePdfForParsing`, tries `parseDocumentText`, and otherwise calls `parseTransmittalDocument`.
- `server/pdf-parsing.ts` extracts **only page 0** with PDF Inspector. If the cover is missing, `needsOcr`, shorter than 80 characters, or contains the replacement character `\uFFFD`, it keeps the original PDF for visual parsing.
- `services/geminiService.ts` sends either extracted text (truncated to 32,000 characters) or the full PDF as `inlineData`, with a 60-second HTTP timeout. On error it maps a few known messages and otherwise returns `buildFallbackParseResult`, which derives a description and a document number from the file name.
- `hooks/useDocumentParsing.ts` only throws when an error arrives with **no items**; otherwise it adds items, reports "fallback was used", and shows no reason.
- `hooks/useDriveImport.ts` catches every parse failure and returns a fallback row; on success with a warning it overwrites `remarks` with `"Imported from Google Drive"`, discarding the AI error text.
- `server/transmittal-qa.ts` treats any scanned, sparse, or broken-font page as `visual`, sends the whole PDF to Gemini, and then forces every AI keyword result to `uncertain`. `Visual` coverage can therefore never produce a `Passed` row.
- `server/user-ai-settings.ts` returns `null` when a stored key cannot be decrypted, while `getUserAiKeyMetadata` still reports `hasCustomGeminiKey: true` from the ciphertext's presence.

Runtime behavior, actual model responses, provider limits, and real scanned files were **not** observed in this stage. Statements about them are labeled as inference in §3.

## 3. Possible causes (hypothesis register)

| ID | Possible cause | Source evidence | Confidence | How to prove or dismiss |
| --- | --- | --- | --- | --- |
| H1 | An image-only (scanned) PDF cannot produce text, so parsing depends entirely on Gemini visual reading; a 60-second provider timeout or a request-size rejection becomes an anonymous fallback row. | `server/pdf-parsing.ts` cover gate; `services/geminiService.ts` 60 s timeout and `inlineData` of the whole PDF; `app/api/parse-transmittal/route.ts` 25 MB encoded cap. | High | Import a scanned PDF at several sizes with a mock/real provider timeout and read the returned `parser`, `error`, `fallbackCount`, and row remarks. |
| H2 | Drive import discards the reason. `analyze` swallows parse exceptions into a fallback row, and a warning result has its remarks replaced by "Imported from Google Drive". | `hooks/useDriveImport.ts` `analyze` catch and `forceRemark` branches; aggregated message in `describeDriveImport`. | High | Mock `parseDocument` to reject, then to return `{ error }` with items; assert what the user sees. |
| H3 | A stored personal key can silently stop working: decryption failure returns `null` (system key used) while the settings endpoint still says a personal key exists. | `server/user-ai-settings.ts` `getDecryptedUserGeminiApiKey` catch; `getUserAiKeyMetadata`; `app/api/user-ai-settings/route.ts`. | Medium-high (configuration-dependent) | Corrupt/rotate `APP_SETTINGS_ENCRYPTION_KEY` in a test DB and compare metadata with the key actually used by the parse route. |
| H4 | QA on scanned PDFs always ends in "Needs review": the visual branch forces every keyword `uncertain`, and aggregation treats `visual` coverage as review-required. | `server/transmittal-qa.ts` visual keyword branch and coverage assignment; `lib/transmittal-qa.ts` `aggregateQa`. | High | Run a scanned PDF with every required phrase visible; confirm the row cannot reach `Passed`. |
| H5 | Only the cover page becomes text, so identifiers that appear on later pages are invisible to Gemini's text path; the result is a missing or filename-derived number. | `server/pdf-parsing.ts` requests `[0]`; `services/geminiService.ts` uses `text.slice(0, 32_000)`. | Medium-high | Use a fixture whose identifier is on page 2 with a text-only cover; assert parser choice and output fields. |
| H6 | Errors are not classified. Provider payload/size errors, invalid model ids, and configuration errors fall through to a generic message, while some raw provider text is returned via `error.message`. | `services/geminiService.ts` catch/mapping; `lib/gemini-models.ts` permissive `normalizeGeminiModel`; `server/route-error.ts` 500 path. | Medium | Mock provider errors of each class and assert the user-facing copy and the absence of raw payloads. |
| H7 | Legacy binary `.doc` is accepted by the UI but not readable by Mammoth, so import/QA fails in a way that looks like an AI/OCR fault. | `hooks/useFileProcessing.ts` `.doc` branch; `services/qa-document-content.ts` `extractQaWord`; Goldfish finding 17. | High, but possibly pre-existing and separately owned | Upload a real `.doc`; if it fails, this is a format-support issue, not OCR. |

The two most likely explanations of a report phrased as "AI errors and OCR issue" are **H1 + H2** (scanned PDFs fail and the reason is hidden) and **H4** (scanned PDFs can never pass QA). H3 and H5 explain cases where text-based documents still produce wrong numbers.

**After the reporter follow-up:** "the error happens when AI was being used" keeps H1, H2, H3, H4, H5, and H6 in play because all of them surface while Gemini or its configuration is active. H7 (legacy `.doc`) is less likely but not excluded, since a `.doc` failure reaches the AI path as missing text. "I don't know where" means the first deliverable is per-flow evidence, not a single-screen fix.

## 4. Scope

### Included

- A cause-verification plan using synthetic fixtures and mocked PDF Inspector / Gemini.
- A structured, non-sensitive **failure reason** on parse and QA results, propagated to local upload, Drive import, and the QA panel.
- Explicit **scanned/unreadable** classification per file, so a scanned PDF is not presented as a successful extraction.
- Safe, structured diagnostics (sizes, page counts, parser, reason code, model class, key class) with no document content, keys, or raw provider payloads.
- Accurate recovery copy and per-file listing for mixed batches.
- Config-integrity signal when a stored personal key cannot be used.
- **Local OCR for the pages that need it**, through the already-installed `@firecrawl/pdf-inspector` OCR API (`processPdfWithOcr`) and only after Q6 confirms the runtime can be deployed. The design keeps OCR selective and bounded, not per-upload or per-page.
- A short-lived, local eligibility check that records which flow and file class fails, so an unknown location becomes evidence on the next occurrence.
- Regression tests for every hypothesis that is confirmed.

### Exclusions (unless a question in §8 changes this)

- A hosted OCR service or a second OCR vendor; OCR stays next to the existing PDF Inspector dependency.
- OCR of every page or every upload. Only pages flagged by classification or quality signals are routed.
- Changing the QA safety policy so scanned documents can pass (see Q3).
- Converting legacy `.doc` files; Goldfish finding 17 stays separate unless pulled in.
- Redesigning document-number heuristics beyond suppressing a misleading number on unreadable documents.
- Schema changes to `Transmittal`, `TransmittalItem`, or `Transmittal.qa`.
- UI restyling or new screens; this is messaging and state accuracy.
- Any change to saved/printed/exported transmittal content.

### 4.1 Local OCR options

`@firecrawl/pdf-inspector@1.25.2` already exposes `processPdfWithOcr(buffer, { mode: OcrMode.Auto, pageNumbers })` with per-page provenance (`PageContentSource.Native` / `Ocr`), confidence, timing, and `pagesRecommendingHosted`. The package embeds **no** OCR models, PDFium, or ONNX Runtime: routed work needs `PDFIUM_LIB_PATH` and `ORT_DYLIB_PATH`, and the pinned model set is downloaded and checksum-verified on first use (or supplied via `modelDirectory` + `offline: true`).

**Decision (Q6): Option A.** The deployed runtime can carry PDFium, ONNX Runtime, and a bundled model directory. Option B is not used, and Option C remains only as the automatic degrade path when the native OCR call itself reports unavailable.

- **Option A — `processPdfWithOcr` in `Auto` mode (selected).** Gain: no new JavaScript dependency, OCR runs on the native thread pool, only rejected pages are OCR'd, and provenance tells us whether text was native or OCR. Lose: deployment must ship PDFium/ONNX Runtime and a warm model cache; cold calls can download models; Vercel bundle/cold-start risk. Affects: `server/pdf-parsing.ts`, `server/transmittal-qa.ts`, `next.config.mjs`, deployment. Fits because it reuses the dependency the parser already relies on.
- **Option B — `tesseract.js` (WASM).** Gain: no native shared libraries, works on managed serverless where the bundle can include language data. Lose: new dependency, slower per page, larger cold start, another model/training-data lifecycle. Affects: route bundles, QA latency. Fits only if Q6 says native libs cannot be shipped.
- **Option C — keep Gemini visual reading only.** Gain: no runtime work, smallest change. Lose: the reporter's OCR problem remains for scans when the provider fails; errors stay length- and timeout-bound. Affects: scanned import and QA remain review-only. Fits only if Q2/Q6 reject A and B.

The **code-efficiency rules** below apply to A or B:

1. Classify first (`classifyPdfAsync` / `classifyPdf`); never OCR a text-based PDF.
2. OCR only `pagesNeedingOcr` / `pagesRoutedToOcr`, never all pages by default.
3. Cap pages per request and stop at a time budget; return a typed `ocr_timeout` rather than hanging the route.
4. Cache by content hash so a retry or a QA re-run does not re-OCR the same bytes.
5. Reuse the OCR text for both parsing and QA; do not run two OCR passes on one document.
6. Keep OCR off the Node event loop (the native API already does; a WASM worker must too).
7. Degrade honestly: if OCR is unavailable, say so and keep the current visual path, never a silent fallback.

## 5. Journeys, alternate paths, and recovery

### J1 — Local upload of a scanned PDF

1. User selects a scanned PDF in the upload dialog.
2. PDF Inspector reports `needsOcr` or no usable cover text; the original PDF goes to Gemini visually.
3. **Expected:** one row appears, flagged as scanned/unreadable or as a visual extraction needing review, with the reason. The user can keep, correct, or remove it.
4. **Alternate:** Gemini returns a usable item. **Expected:** row is usable but still marked visual so the user re-checks the number.
5. **Recovery:** retry, choose a text PDF, or enter the number manually; the app says which action applies.

### J2 — Drive folder with mixed files

1. Folder import analyzes files sequentially.
2. One scanned file fails; one text file succeeds.
3. **Expected:** the successful item is added; the failed file is named in the status and marked in its row; the error reason survives (not replaced by the import remark).
4. **Recovery:** reselect only the failed file after sharing/visibility fixes, or add it manually.

### J3 — Text PDF whose identifier is not on the cover

1. Cover extraction succeeds and passes the 80-character gate.
2. The identifier appears on page 2.
3. **Expected:** the parser either finds it through a bounded later-page check or reports `document_number_unresolved` instead of silently asserting a filename-derived number.

### J4 — QA on a scanned PDF

1. QA extraction finds `needsOcr`/broken text and sends the whole PDF visually.
2. **Expected:** the panel distinguishes "scanned: visually read, review required" from "could not check", explains why a pass is withheld, and shows the AI evidence where present.
3. **Recovery:** attach a text PDF or manually confirm the result; retrying the same scan is not presented as a fix.

### J5 — Personal key unusable

1. A stored key exists but decryption fails or the provider rejects it.
2. **Expected:** settings says the personal key is unusable and asks for re-entry; the import says it used the shared/default path. It never claims the personal key is active while using another.

## 6. Requirements

### [REQ-1] Classify and propagate parse failure reasons

Add an optional, stable machine-readable `reason` to parse results with at least: `scan_unreadable`, `extraction_failed`, `provider_timeout`, `provider_limit`, `provider_rejected`, `invalid_model`, `config_missing`, `config_unusable`, `invalid_output`. Keep `error` as user-facing copy.

**Acceptance criteria**

- Every failure path in `services/geminiService.ts` assigns exactly one reason.
- `POST /api/parse-transmittal` returns the reason; no existing success shape is broken.
- The client never receives raw provider payloads, document text, or key material.
- A test asserts each mapped provider condition produces the intended reason and copy.

### [REQ-2] Mark scanned and unreadable imports honestly

Every imported row must carry whether its content came from reliable text, visual reading, or no reading at all.

**Acceptance criteria**

- A row from a visual-only PDF is distinguishable from a row from extracted text (state available to the UI; no schema change).
- When no content was read, the row is marked for review and the user is told the row came from the file name, not the document.
- A batch summary names each such file, not only a aggregate fallback count.
- No test or copy describes a visual or fallback row as "extracted".

### [REQ-3] Preserve Drive failure reasons

**Acceptance criteria**

- `hooks/useDriveImport.ts` never replaces a failure or review reason in `remarks` with the generic import remark.
- A parse rejection produces a named per-file failure with the same reason vocabulary as local upload.
- `describeDriveImport` lists the files that need review or failed, with reasons.
- Tests cover rejection, `{ error, items }`, and success.

### [REQ-4] Distinguish QA visual coverage from unreadable coverage

**Acceptance criteria**

- The QA panel explains "scanned — visually read, review required" separately from "could not check".
- `visual` coverage continues to withhold an automatic pass unless §8 Q3 changes the policy.
- Every withheld pass has a visible reason and a recovery action.
- Tests assert the panel/aggregation wording and that `visual` cannot masquerade as `full-text`.

### [REQ-5] Report unusable personal keys

**Acceptance criteria**

- When decryption fails, metadata reports the personal key as unusable without disclosing why beyond a safe category.
- The account UI asks the user to re-enter the key.
- The parse path reports which key class it used (`user`, `system`, `none`) in the existing safe log fields, never the key.
- Tests cover metadata with corrupted ciphertext and a missing encryption secret.

### [REQ-6] Preflight provider size and timeout risks

Before sending a visual PDF, estimate page count/encoded size and refuse or degrade with a typed reason instead of depending on a provider failure.

**Acceptance criteria**

- Oversized visual input returns `provider_limit` or a dedicated `too_large` reason before the provider call when the limit is knowable locally.
- Timeout copy distinguishes "the document took too long" from "the AI service failed".
- Limits match the documented contract (25 MB parse, 18 MB QA, 1,000 pages QA, 60 s provider, 90 s client, 120 s route) or the docs are corrected with the same change.

### [REQ-7] Prove the chosen cause with regression tests

**Acceptance criteria**

- Tests use synthetic fixtures and mocked `@firecrawl/pdf-inspector` and `@google/genai`; no live provider call.
- Confirmed hypotheses from §3 each get a test that fails on the current behavior and passes after the fix.
- Dismissed hypotheses are recorded with the evidence that dismissed them.

### [REQ-8] OCR only the pages that need it, with Option A

The runtime decision is Q6: Option A (`processPdfWithOcr`, `Auto`, `offline: true`, bundled model directory).

**Acceptance criteria**

- A text-based PDF never invokes OCR and never loads an OCR model; classification alone decides.
- Only pages whose native extraction is missing, scanned, or broken-font are routed, and the page list is bounded by a configured maximum.
- Each result records provenance (`Native` / `Ocr`), confidence, and whether hosted OCR was recommended, without logging text.
- A time budget stops OCR and returns `ocr_timeout`; the route does not exceed its `maxDuration`.
- OCR text feeds both parsing and QA through one pass, and repeated runs on identical bytes reuse a cache.
- If PDFium/ONNX/models are absent or offline, the request returns `ocr_unavailable` and falls back to the current visual path with a visible reason.
- The OCR call is lazy: no model, library, or native handle is loaded until a page is routed, and an import that needs no OCR pays no OCR cost.
- Tests mock the native module; no model download occurs in CI.

## 7. Constraints, assumptions, and dependencies

### Constraints

- **No OCR runtime installed today.** `docs/ARCHITECTURE.md` states local extraction requires no OCR runtime and Gemini is the visual reader; PDF Inspector only flags `needsOcr`. The package's OCR API exists but needs PDFium, ONNX Runtime, and a model set.
- **Deployment (decided):** `vercel.json` runs `fluid: true` in `sin1`; `next.config.mjs` externalizes `@firecrawl/pdf-inspector`. The runtime can carry the native libraries and a bundled model directory (Q6 = A). The build must therefore ship PDFium, ONNX Runtime, and `modelDirectory`, and set `offline: true` so no request downloads models. The unzipped function size and cold-start cost must be measured before release.
- **Bounds:** parse request 25 MB encoded (`app/api/parse-transmittal/route.ts`), QA 25 MB encoded plus 200,000 bytes of framing, 18 MB client attachment, 1,000 QA pages, 500,000 QA characters, 100 requirements.
- **Timeouts:** Gemini 60 s, client parse 90 s, route `maxDuration = 120`. OCR needs its own budget below these.
- **Privacy:** document content, provider payloads, keys, and evidence must not be logged (`docs/TRANSMITTAL_QA.md`).
- **Native dependency:** `@firecrawl/pdf-inspector` is externalized in `next.config.mjs`; failures must stay graceful.
- **Compatibility:** existing fallback parsing and document-number fallback remain the final safety net; new result fields are optional.

### Assumptions

- **A1 (recorded):** the failing flow is unknown, so all import paths and QA are instrumented and covered. The reporter's file is assumed to be an image-only/scanned PDF because the issue names OCR; if it is a text PDF or Word file, H5/H7 rise and H1 falls.
- **A2 (inference):** Gemini's practical `generateContent` inline payload ceiling is below the 25 MB encoded route cap, so a large scan can be locally accepted and remotely rejected. Verify against the selected model before relying on it.
- **A3:** the reporter can supply the original file or a redacted equivalent for a fixture, or confirm the file type and observed message.
- **A4:** personal-key decryption failures are possible in practice (secret rotation, missing secret) and are not currently surfaced.
- **A5 (confirmed):** local OCR uses PDFium + ONNX Runtime + a bundled model cache on the deployed runtime (Q6 = A). Vercel's filesystem is read-only except `/tmp`, so the model directory is bundled at build time and `offline: true` is set; no cold request downloads a model.

### Dependencies

- Answers to Q1–Q3 in §8.
- A confirmed reproduction file or message.
- Agreement that scanned-document QA remains review-only or changes deliberately.

## 8. Questions

| ID | Question | Impact | Blocks approval? | Consequence if wrong | Recommended answer |
| --- | --- | --- | --- | --- | --- |
| Q1 | Which flow and file produced the error? Reporter: "I dont know where." | 4 | No — resolved by scope | If we guess one screen, we may fix the wrong path. | Instrument every import path and QA; report flow + reason on the next occurrence. |
| Q2 | Is local OCR in scope? Reporter: "Local OCR maybe there should be fixes and making it very code efficient." | 5 | No — answered yes | Implementing OCR changes dependencies, deployment, and latency; not implementing it may leave scans unusable. | Yes: local OCR with Option A, selective and bounded per §4.1. |
| Q3 | Should a scanned PDF be allowed to reach `Passed` in QA when Gemini visually finds all required phrases, or must `visual` stay review-only? | 4 | No — answered "keep review-only" | Changing the policy weakens the documented safety contract; keeping it means scans can never pass automatically. | Keep `visual` review-only. The panel shows AI evidence and an explicit "visually verified" state so an operator can accept it deliberately. |
| Q4 | For an unreadable document, should the app stop deriving a document number from the file name? | 3 | No | Removing it may break the intended "never leave the field blank" behavior; keeping it may mislead. | Suppress filename-derived numbers for generic names (`scan`, `document`, `file`) and keep them for meaningful names. |
| Q5 | Is legacy `.doc` support part of this work item? | 2 | No | Folding it in broadens scope beyond the reported AI/OCR symptom. | Keep Goldfish finding 17 as a separate item unless the reporter's file is `.doc`. |
| Q6 | Can the deployed runtime ship PDFium + ONNX Runtime and a bundled/warm OCR model directory (Option A), or must OCR be pure WASM (Option B), or is OCR unavailable (Option C)? | 5 | No — answered A | Option A is the efficient path but may fail on Vercel; choosing wrong yields a feature that downloads models per cold start or cannot start at all. | Option A with `offline: true`, a bundled `modelDirectory`, and a documented fallback to Option C. |

## 9. Verification plan

- **Fixtures:** text PDF with cover identifier, text PDF with identifier only on page 2, image-only PDF at 1/5/15 MB, mixed PDF (text cover, scanned later page), PDF with broken fonts (`\uFFFD`), scanned PDF in QA, legacy `.doc`, `.docx` with a footnote.
- **Mocks:** `@firecrawl/pdf-inspector` returning `needsOcr`, sparse text, missing pages, `pagesNeedingOcr`, OCR provenance, and thrown errors; `@google/genai` returning timeout, 429, 413/limit, invalid model, malformed JSON, and `finishReason !== "STOP"`.
- **Assertions:** reason code, user copy, row review state, per-file status naming, absence of raw provider text, key-class log field, QA coverage wording, OCR page selection and provenance, cache reuse, time-budget stop.
- **OCR performance budget (to confirm in workflow):** text PDF runs zero OCR and loads no model; a 1-page scan stays under a stated wall-clock budget; a 10-page scan OCRs only flagged pages and stays within the route's `maxDuration`.
- **Deployment budget (to confirm in workflow):** measured unzipped function size and cold-start time with PDFium, ONNX Runtime, and the model directory; `offline: true` proven by a network-disabled run.
- **Commands:** `npm test` (Vitest) for the affected suites, then `npm run build` for type and route compilation.
- **Not run in this stage.** No source was changed; no test or build was executed for this draft.

## 10. Handoff

- **Status:** draft; no blocking questions remain. Q1, Q2, Q3, and Q6 are resolved; Q4 and Q5 are non-blocking defaults recorded above.
- **Next stage after approval:** workflow. Source changes belong to execute.
- **Approval:** record separately in `approvals.md` only after the current bytes are presented and explicitly approved.
