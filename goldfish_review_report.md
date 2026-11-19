# Smart Transmittal Goldfish review

**Status** · Round 1, awaiting resolution  
**Target** · The full Smart Transmittal application at commit `3816e42`

The EGM review loop was adapted from a single-document review to the application. All three independent reviewers completed round 1. Reviewers used the EGM Codebase Details and Implementation Readiness personas with the implementation-readiness standard, and Design Critic with the feature-spec standard. The review covered editing, persistence, the File Library, import, QA, delivery, and export. The README and relevant operational and QA docs provided context.

## Verification

- The production build, TypeScript check, and all 206 existing tests passed.
- Two temporary tests using a mocked API reproduced findings 2 and 3. The temporary test file was removed.
- The built app returned HTTP 200 for the home page, health endpoint, session endpoint, and both legal pages. The private File Library endpoint returned the expected 401 when signed out.
- Focused browser and in-memory probes confirmed the PDF page-boundary issue, DOCX XML and Unicode issues, saved document-number substitution, and the QA extraction and matching cases described below.
- Google sign-in, PostgreSQL writes, Drive, Sheets, ImageKit, and Gemini were outside the live verification. Source-backed findings are identified below. The print checks did not include a physical printer or native print dialogs across browsers.

## Blocker

### 1. The README setup stops before a fresh checkout can reach the editor

**ID** `codebase-details-1-setup` · **Disposition** Propose fix · **Evidence** Source review

The README presents Node, a Gemini key, and `npm run dev` as the local setup. The editor requires a signed-in user, and authentication and persistence require PostgreSQL and configured Google OAuth. A developer who follows the README can reach the sign-in screen without a usable workspace. Link the README directly to the runbook and environment template, with PostgreSQL initialization and one OAuth provider in the quick start. Identify AI configuration as optional for basic use. [README](README.md#L7), [sign-in gate](components/main/App.tsx#L769), [database connection](server/auth.ts#L153), [runbook](docs/RUNBOOK.md).

## Major

### 2. Autosave turns finalized transmittals back into drafts

**ID** `codebase-details-1-status` · **Disposition** Propose fix · **Evidence** Reproduced with a mocked API and verified against the server update

Open a finalized record, edit one field, and wait for autosave. The editor sends `isDraft: true`; the server persists the status, and the record leaves finalized results. The same option is used by several transition handlers. Preserve the current lifecycle status on automatic saves and reserve status changes for explicit user actions. Cover queued autosaves around finalization. [Autosave options](hooks/useAutoSave.ts#L38), [server update](server/transmittal-service.ts#L393), [finalized list filter](server/transmittal-service.ts#L221).

### 3. New, Open, and Copy can discard unsaved edits

**ID** `codebase-details-1-switch` · **Disposition** Propose fix · **Evidence** New reproduced with a mocked API; other paths traced in source

The first editor starts without a transmittal ID. Some edits, including a preparer name by itself, mark it dirty but leave the form-data check false. New calls `saveNow`, which returns false without saving, then clears the editor. Open, Copy, and sign-out also ignore a skipped save. While an Open request is in flight, the library closes immediately and the old form still accepts edits. A later response can clear those edits or a late save can restore the previous active ID. Require a successful save or an explicit discard before leaving a dirty form. Bind requests and responses to the document they started from. [Form-data check](hooks/useTransmittalDraft.ts#L165), [skipped save](hooks/useAutoSave.ts#L90), [Open and Copy](hooks/useTransmittalPersistence.ts#L202), [New](hooks/useTransmittalPersistence.ts#L270), [sign-out](components/main/App.tsx#L264), [library open](components/modals/TransmittalListModal.tsx#L450).

### 4. QA changes can disappear when the record is reopened

**ID** `codebase-details-1-qa-save` · **Disposition** Propose fix · **Evidence** Source review

Editing only the checklist, reattaching a file, or finishing a QA run updates the form without marking it dirty. On an otherwise clean record, autosave never persists these changes despite the QA documentation describing that behavior. Track committed QA changes with the same dirty-state mechanism as other edits. Keep the in-memory file bytes out of persistence. [QA mutations](hooks/useTransmittalQa.ts#L50), [result write](hooks/useTransmittalQa.ts#L150), [workspace wiring](components/main/App.tsx#L214), [documented persistence](docs/TRANSMITTAL_QA.md#L21).

### 5. An import can append files to the wrong transmittal

**ID** `design-critic-1-import-session` · **Disposition** Propose fix · **Evidence** Source review

A Sheets import can finish after the user switches records and append to the currently open editor. The Drive link and folder flows can also capture the replacement editor's session after awaiting metadata or folder listing. Capture the original document session before the first network request. Check it before adding rows, forwarding data into the Drive importer, or displaying the operation's result. [Sheets and Drive link import](hooks/useSmartImport.ts#L73), [Drive session capture](hooks/useDriveImport.ts#L164), [bulk Drive lookup](hooks/useDriveImport.ts#L211), [processing state](components/main/App.tsx#L618).

### 6. Internal notes are printed and exported for recipients

**ID** `implementation-readiness-1-notes` · **Disposition** Propose fix · **Evidence** Source review

Delivery labels the field “Internal notes” and invites internal context. The same value is included in native print, PDF, and Word. If the value is intended for recipients, use a recipient-visible label and help text. If it is intended for staff, store it separately from recipient instructions and exclude it from recipient-facing formats. Confirm how existing notes should be handled before changing their visibility. [Delivery field](components/main/panels/DeliveryPanel.tsx#L55), [print and PDF template](components/transmittal/TransmittalTemplate.tsx#L870), [DOCX generator](services/docxGenerator.ts#L345).

### 7. Word export writes table widths such as 5000%

**ID** `implementation-readiness-1-docx-width` · **Disposition** Propose fix · **Evidence** Confirmed in generated `word/document.xml`

The generator supplies scaled widths to an API that interprets the numbers as literal percentages. A synthetic export wrote `5000%` for a full-width table and `750%` for one cell. Supply ordinary percentages that add up to 100 and assert the serialized widths in the existing export tests. Appearance in individual Word clients was outside this probe. [Width helpers](services/docxGenerator.ts#L116), [column widths](services/docxGenerator.ts#L194).

### 8. Print can differ from the version that was saved

**ID** `implementation-readiness-1-print-snapshot` · **Disposition** Propose fix · **Evidence** Source review

Print first saves a captured snapshot, then finds and clones the live preview after the save returns. Edits or import results arriving while the save is pending can land in the printed copy even though they were absent from that save. Render the print copy from the saved snapshot, including the server-assigned transmittal ID. [Print action](components/main/App.tsx#L566), [save snapshot](hooks/useAutoSave.ts#L102), [live preview clone](hooks/useExport.ts#L196).

### 9. Word extraction can label incomplete text as complete

**ID** `design-critic-1-qa-word` · **Disposition** Propose fix · **Evidence** Confirmed with a synthetic DOCX

A DOCX containing a footnote produced body text only, with zero Mammoth warnings, and was reported as complete. QA can then use that partial text to draw a conclusion about the whole document. Extract footnotes and endnotes, or flag documents containing those parts as incomplete and suggest a PDF for full coverage. [Word extraction](services/qa-document-content.ts#L4), [QA coverage](server/transmittal-qa.ts#L116).

### 10. Exact QA matching accepts a word inside its opposite

**ID** `design-critic-1-qa-phrase` · **Disposition** Propose fix · **Evidence** Confirmed with a synthetic text probe

The exact check finds `approved` in `unapproved` and can pass the requirement on that evidence. Use Unicode-aware boundaries at word-like phrase endpoints while preserving case and whitespace normalization. Add tests for opposites, punctuation, and intended identifier matching. [Exact phrase logic](server/transmittal-qa.ts#L66), [requirement outcome](lib/transmittal-qa.ts#L111).

### 11. Unrelated unreadable files can prevent a QA pass

**ID** `design-critic-1-qa-extra-file` · **Disposition** Propose fix · **Evidence** Confirmed with a synthetic aggregation probe

With a complete `Permit.pdf` and an unavailable `Delivery log.csv`, aggregation returned “Needs review” for the permit. The current rule treats all unreadable files as unknown candidates. Resolve likely filename matches independently of extraction and require review only when unreadable files could satisfy that requirement. [QA aggregation](lib/transmittal-qa.ts#L93), [extra-file behavior](docs/TRANSMITTAL_QA.md#L3).

### 12. The QA checklist editor silently drops phrases

**ID** `design-critic-1-qa-limits` · **Disposition** Propose fix · **Evidence** Source review

Saving the checklist shortens phrases beyond 300 characters and drops phrases past the first 30. This can produce a pass for fewer checks than the user entered. Validate before saving and tell the user which input needs editing. Independently, the run rejects a valid maximum-size checklist because the serialized input key can exceed 300,000 characters even with zero files. Use a compact stable fingerprint and report checklist and file limits separately. [Checklist normalization](components/main/panels/QaPanel.tsx#L45), [save flow](components/main/panels/QaPanel.tsx#L83), [run guard](hooks/useTransmittalQa.ts#L88), [key construction](lib/transmittal-qa.ts#L72).

### 13. The next editor save can undo a File Library rename

**ID** `codebase-details-1-rename` · **Disposition** Propose fix · **Evidence** Source review

Rename a record that is also active in the workspace. The PATCH updates the library row while the editor retains the old name and number. Editing any unrelated field then saves the stale project fields back to the same record. Synchronize the active editor after a successful rename and serialize the patch with saves. [Library rename](components/modals/TransmittalListModal.tsx#L228), [workspace wiring](components/main/App.tsx#L1073), [full editor update](hooks/useTransmittalPersistence.ts#L131).

### 14. Finalizing an existing draft can leave its ID blank

**ID** `codebase-details-1-number` · **Disposition** Propose fix · **Evidence** Source review

The Project form describes the ID as automatically generated. Creation handles a blank ID, but a final save through the update path stores a null number when the input is blank. Preserve an existing final ID or allocate a number transactionally when finalizing. Cover collisions between drafts that show the same provisional number. [Project form](components/main/tabs/ProjectTab.tsx#L95), [create behavior](server/transmittal-service.ts#L340), [update behavior](server/transmittal-service.ts#L393).

### 15. Saved document numbers can change when reopened

**ID** `codebase-details-1-reopen-number` · **Disposition** Propose fix · **Evidence** Confirmed with a synthetic mapper probe

Reopening a record with a manually blank document number and description “Monthly Status Report” produced `REP-PENDING`. The loader reruns import heuristics on already-saved fields. Preserve stored values during hydration and apply number inference only when importing. [Persistence](server/transmittal-service.ts#L87), [hydration](services/transmittal-mappers.ts#L56).

### 16. Sheet imports can use “Document Name” as the document number

**ID** `design-critic-1-sheet-columns` · **Disposition** Propose fix · **Evidence** Source review

With columns “Document Name” followed by “Document Number”, the broad `document` match chooses the first column for the number. Prefer explicit aliases for each field and cover this header order in the import tests. [Header matcher](hooks/useSmartImport.ts#L36), [column selection](hooks/useSmartImport.ts#L87).

### 17. Legacy Word files are advertised but cannot be read for QA

**ID** `design-critic-1-legacy-doc` · **Disposition** Propose fix · **Evidence** Source review

The upload and QA controls accept legacy binary `.doc`, but the Word extractor expects a ZIP-based DOCX. Mixed local uploads can also report the successful files without surfacing individual failures. Support conversion or limit the advertised formats to those the parser can read, and list skipped or failed files by name. [Upload formats](components/modals/FileUploadModal.tsx#L49), [QA attachment](components/main/panels/QaPanel.tsx#L278), [Word extractor](services/qa-document-content.ts#L4), [batch status](hooks/useDocumentParsing.ts#L120).

### 18. Export formatting can corrupt Unicode and flatten Word line breaks

**ID** `implementation-readiness-1-unicode` · **Disposition** Propose fix · **Evidence** Confirmed in generated DOCX XML

The text wrapper chunks long strings by UTF-16 units. In a synthetic export, an emoji crossing a chunk boundary became two replacement characters separated by a zero-width space. The same formatter is used in the HTML template. Word also writes user-entered line breaks as raw newline characters in its text runs. The generated preview collapses them into spaces. Wrap at grapheme boundaries, preserve identifier text, and emit explicit Word line-break runs. [Export formatter](services/exportText.ts#L8), [HTML template](components/transmittal/TransmittalTemplate.tsx#L90), [Word text run](services/docxGenerator.ts#L537), [Word preview](components/modals/DocxPreviewModal.tsx#L48).

### 19. The File Library date filter uses a different date from the one it displays

**ID** `app-review-1-list-date` · **Disposition** Propose fix · **Evidence** Source review

The cards display the transmittal's document date, with creation date as a fallback. The date picker queries the database creation timestamp in UTC. A document can therefore disappear when filtering by the date visibly printed on its card. Filter by the displayed document date with a legacy fallback, or clearly label the filter and card field if creation date is the intended contract. [List card](components/modals/TransmittalListModal.tsx#L524), [query](server/transmittal-service.ts#L255), [display mapping](server/transmittal-service.ts#L298).

### 20. A PDF page boundary can cut through oversized text

**ID** `implementation-readiness-1-pdf-break` · **Disposition** Propose fix · **Evidence** Reproduced with a synthetic Chromium layout fixture

The latest pagination logic keeps normal rows together, but skips blocks taller than a page. Export then slices the raster at fixed page intervals. An 80-line fixture placed the first 960 px boundary inside a text rectangle spanning 947–963 px. Split large blocks at measured text or paragraph boundaries, or render pages individually with browser fragmentation. Verify the rendered result for long notes and item descriptions. [Page-break calculation](lib/pdf-layout.ts#L33), [PDF raster export](hooks/useExport.ts#L158), [existing oversized-content test](lib/pdf-layout.test.ts#L61).

### 21. Legacy logos can be embedded under the wrong image type

**ID** `implementation-readiness-1-logo-type` · **Disposition** Propose fix · **Evidence** Confirmed in generated DOCX media

The inline-logo path decodes bytes without converting them. A legacy GIF fixture produced a Word media entry named as a PNG whose bytes began with the GIF signature. Convert inline logos to real PNG before packaging and verify both media signature and type in the export test. [Inline logo loading](services/logo-image.ts#L5), [Word image packaging](services/docxGenerator.ts#L106).

### 22. Exported letterheads omit the sender name

**ID** `implementation-readiness-1-letterhead` · **Disposition** Propose fix · **Evidence** Confirmed in generated DOCX XML; PDF and native print traced in source

The sender name entered in the workspace is absent from the exported letterhead. When an agency has no logo, the HTML letterhead shows a placeholder alongside contact information. Show the sender name in both templates and remove the editing placeholder from recipient output. [Sender form](components/main/tabs/SenderTab.tsx#L71), [HTML letterhead](components/transmittal/TransmittalTemplate.tsx#L399), [Word letterhead](services/docxGenerator.ts#L106).

## Nit

### 23. New and copied documents mix UTC dates with local times

**ID** `codebase-details-1-local-date` · **Disposition** Propose fix · **Evidence** Confirmed for the copy path with an Asia/Manila fixture; new-document path traced in source

At 07:00 in Manila on November 19, a copy used November 18 as the date and 07:00 as the time. Derive both values from the same time zone. [New draft defaults](hooks/useTransmittalDraft.ts#L12), [copied draft defaults](services/transmittal-mappers.ts#L119).

### 24. Some failed File Library actions look like normal results

**ID** `codebase-details-1-library-errors` · **Disposition** Propose fix · **Evidence** Source review

Failed list requests leave the previous results or an empty list visible. Delete catches errors in the modal while the parent simply forwards the rejecting request. Show an actionable error alongside any stale list and keep the affected record visible after a failed delete. [List loading](components/modals/TransmittalListModal.tsx#L137), [delete handler](components/modals/TransmittalListModal.tsx#L188), [parent wiring](components/main/App.tsx#L728).

### 25. Delivery loses the generated file on a failed Drive upload

**ID** `implementation-readiness-1-drive-export` · **Disposition** Propose fix · **Evidence** Source review

The folder picker closes before the upload. On failure, the pending file is cleared in the same cleanup as on success, so the user must generate it again. Retain the file after failure and let the user retry or download it locally. [Upload workflow](hooks/useExport.ts#L110).

### 26. The email draft says a file is attached

**ID** `implementation-readiness-1-email-draft` · **Disposition** Propose fix · **Evidence** Source review

Email Recipient opens a message with “Please find the attached transmittal.” The action supplies only a recipient, subject, and body. Prompt the sender to attach the exported document or use wording that does not assert an attachment. [Email action](components/main/App.tsx#L599).
