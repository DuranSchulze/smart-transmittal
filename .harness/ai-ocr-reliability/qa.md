# QA: Scanned-PDF (OCR) and AI parsing failure reliability

- **Work item:** `.harness/ai-ocr-reliability/`
- **Stage:** QA. **Verdict: verification incomplete.** No user-facing scenario could be run, and no failure was observed.
- **Expected behaviour:** [spec revision 3](context-spec.md) (approved), with the QA plan in [workflow revision 1 §4](workflow.md#4-checks) (approved, Q1–Q9). See [approvals.md](approvals.md).
- **Target:** working tree on local branch `harness/ai-ocr-reliability`, based on `78d9d81`, uncommitted. The tracked diff fingerprint is `012eb644465adb56` (first 16 hex of the SHA-256 of `git diff`). No product source file is newer than [execution.md](execution.md), so the execution evidence still applies to this tree.
- **Date:** 2026-11-25. **Host:** macOS (Darwin 25.5.0), arm64.

## 1. Environment findings (why the journeys are blocked)

| Need for Q1–Q9 | Found | Effect |
| --- | --- | --- |
| A signed-in session. The app's only sign-in is Google OAuth (`server/auth.ts`). | No `.env`. `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, and `DATABASE_URL` are all unset. | The app cannot authenticate, so `/api/parse-transmittal` and `/api/transmittal-qa` return 401 before any import or QA logic runs. |
| A database for sessions, AI settings, and saves | `DATABASE_URL` unset | Personal-key scenarios (Q6) and saving cannot run. |
| A Gemini key, plus an invalid one for Q3 | `GEMINI_API_KEY` unset | AI-path scenarios cannot reach the provider. |
| `APP_SETTINGS_ENCRYPTION_KEY` to rotate for Q6 | unset | Q6 cannot be staged. |
| Google Drive access for Q4 | Requires an OAuth session | Q4 cannot run. |
| A deployed preview running this change (Q8 logs, C9) | The branch is not pushed, and the Vercel connector is unauthenticated | A deployed environment would run `main`, not this change. |

Static inspection and unit tests are not substituted for any scenario below.

## 2. Scenario results

| Scenario | Requirement IDs | Expected (from workflow §4) | Observed | Result |
| --- | --- | --- | --- | --- |
| Q1 Upload a 1-page scan with OCR on | REQ-2, REQ-8 | A row with a Review marker. The status names the file "scanned, read with local OCR". The number comes from the scan text. The repeat upload is faster. | Not run (no session) | Blocked |
| Q2 Same with OCR off | REQ-1, REQ-2, REQ-8 | "Read visually — review" with "Local OCR is unavailable". Never called "extracted". | Not run | Blocked |
| Q3 Invalid system key, no personal key | REQ-1, REQ-2 | A filename row with the key-rejected reason, no raw text, and an empty number for `scan.pdf` | Not run | Blocked |
| Q4 Drive folder: text PDF plus scan with a timeout | REQ-3 | The text item is added. The scan is named with "took too long", and its remarks keep the reason. | Not run (no Drive session) | Blocked |
| Q5 QA on a scan containing every phrase | REQ-4 | "Needs review" with "Scanned — visually read, review required", evidence, and recovery. A text PDF passes. | Not run | Blocked |
| Q6 Rotate the encryption secret | REQ-5 | The account panel shows "Personal key unusable — re-enter it". The import notes the shared key. Re-entering restores it. | Not run (no DB or secret) | Blocked |
| Q7 Scan over `GEMINI_INLINE_MAX_BYTES` | REQ-6 | An immediate "too large to read visually", with no 60 s wait | Not run | Blocked |
| Q8 Function logs | REQ-1, D7 | `flow`, `reason`, `readMethod`, and `keyClass` present. No text, key, or file name. | Not run (no deployment of this change) | Blocked |
| Q9 Identifier only on page 2 (J3) | REQ-1 | Found through the later-page check, or "document number not found" with an empty number | Not run | Blocked |
| Regression: an ordinary text PDF upload and save | — | Unchanged import and save | Not run | Blocked |

## 3. Supporting evidence (not a substitute for the scenarios)

- **Automated suite, re-run on the QA target tree:** `npx vitest run --environment jsdom` passed 58 files and 277 tests ([qa-suite.txt](evidence/qa-suite.txt)). It covers the server, route, hook, and panel behaviour behind each scenario, with mocked auth, Gemini, and PDF Inspector.
- **Real OCR in execute ([execution.md §2](execution.md#2-checks-run)):** these runs called the app's `preparePdfForParsing` and `prepareQaDocument` directly, below the auth layer and without the UI.
  - With OCR on, a generated image-only PDF was read with `readMethod: "ocr"` in 756 ms, at confidence 0.995. A repeat took 1 ms from the cache, and QA reused it with `contentSource: "ocr"`.
  - With OCR off or the models missing, the result was `visual` plus `ocr_unavailable`.

## 4. Issues filed

None. No requirement or scenario was observed to fail, and blocked scenarios do not get issues.

## 5. What is needed to complete QA

Any one of these:

1. **A local environment.** A `.env` with `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (with `http://localhost:3000` as an authorized redirect), `GEMINI_API_KEY`, and `APP_SETTINGS_ENCRYPTION_KEY`. Then run `npm run ocr:runtime`, `OCR_ENABLED=true npm run dev`, and a browser session you sign into.
2. **A Vercel preview.** Push the branch. Set `OCR_BUNDLE_RUNTIME=true` on the preview, toggling `OCR_ENABLED` between runs, and grant log access. This also covers the deploy measurement C9.

Fixtures for Q1, Q2, Q5, Q7, and Q9 can be generated the same way as in execute (text PDF to PNG to image-only PDF with `sips`). Q4 needs a shared Drive folder.
