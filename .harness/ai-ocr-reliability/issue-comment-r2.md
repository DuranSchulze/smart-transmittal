Spec revision 2 for this issue (replaces the revision 1 fingerprint).

- Draft: `.harness/ai-ocr-reliability/context-spec.md`
- SHA-256: `3efb6a23b4981d70941f4f676c572ae523b2092cb854491227040b20f6224bbe`
- Status: draft, not approved.

Changes in this revision:
- Recorded the reporter's answers: flow unknown, prefers local OCR with efficient code, error occurs while AI is used.
- Q1 is resolved as scope: every import path and QA will report flow + failure reason, so the next occurrence locates itself.
- Added §4.1 on local OCR. `@firecrawl/pdf-inspector` already exposes `processPdfWithOcr`, but it needs PDFium + ONNX Runtime and a downloaded model set, none installed today.
- Added REQ-8 for selective, bounded, cached OCR with provenance and honest fallback.
- Added Q6: can the deployed runtime (Vercel, `sin1`) ship PDFium/ONNX plus a bundled model directory, or must OCR be pure WASM?

Still blocking approval: Q2 (local OCR in scope), Q3 (may a scanned PDF pass QA), Q6 (OCR runtime path).
