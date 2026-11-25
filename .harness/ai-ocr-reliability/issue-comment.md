Harness spec draft for this issue.

- Draft: `.harness/ai-ocr-reliability/context-spec.md`
- SHA-256: `bc3ec97d6662f4996a98e9080731cc7c6f2ff0b2bcf43bccf314fc403041265d`
- Status: draft, not approved.

The draft records seven source-backed possible causes (H1–H7), with the two strongest being that scanned PDFs depend on Gemini visual reading and then lose their failure reason, and that QA forces scanned documents to "Needs review".

Blocking questions before approval:
1. Which flow and file type produced the error (local upload, Drive, QA), and what message appeared?
2. Should scanned PDFs get local OCR, or continue with Gemini visual reading plus explicit review states?
3. May a scanned PDF reach "Passed" in QA when Gemini visually finds every phrase, or must visual coverage stay review-only?
