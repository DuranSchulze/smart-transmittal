Spec revision 3 for this issue (supersedes revision 2).

- Draft: `.harness/ai-ocr-reliability/context-spec.md`
- SHA-256: `8b9e5e56acffe7da5ef082357abcd8cda9ef1e034d3bf0d5e805f725d67edc04`
- Status: awaiting explicit approval.

Decisions recorded:
- Q6 = Option A: the runtime can carry PDFium, ONNX Runtime, and a bundled OCR model directory. `processPdfWithOcr` runs in `Auto` mode with `offline: true`; no request downloads models.
- Q3 = scanned PDFs stay review-only in QA: `visual` coverage withholds an automatic pass, but the panel shows AI evidence and an explicit "visually verified" state so an operator can accept it deliberately.
- Q2 = local OCR is in scope, selective and bounded per REQ-8.
- Q1 = every import path and QA reports flow + failure reason, because the failing flow is unknown.

No blocking questions remain. Q4 (filename-derived numbers on unreadable documents) and Q5 (legacy `.doc`) remain non-blocking defaults.

Approval requires an explicit approval of the SHA-256 above against the current file bytes.
