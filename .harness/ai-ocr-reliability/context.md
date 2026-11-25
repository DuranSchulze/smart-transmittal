# Task memory — ai-ocr-reliability

- **Goal:** Identify and fix the cause(s) of "AI errors and OCR issue" reported in GitHub #2 across import and QA.
- **Current stage:** QA run, verification incomplete. Q1–Q9 are blocked: no `.env`, the only sign-in is Google OAuth, and the branch is not deployed ([qa.md](qa.md)). The code is on local branch `harness/ai-ocr-reliability`, uncommitted. Spec revision 3 and workflow revision 1 are approved.
- **Next action:** the user provides a local `.env` plus a signed-in browser, or pushes a Vercel preview, then QA reruns. See [qa.md §5](qa.md#5-what-is-needed-to-complete-qa).

## Pointers

- Changes and evidence by requirement: [execution.md](execution.md). Hypotheses H1–H6 were confirmed and H7 was not exercised ([§3](execution.md#3-hypothesis-register-outcome-req-7)).
- Reason vocabulary: `lib/parse-reasons.ts` (`classifyProviderError`, `reasonFromClientError`, `reviewNote`, `keyClassFor`).
- OCR: `server/ocr.ts` `ocrPages`, used by `server/pdf-parsing.ts` `preparePdfForParsing` and `server/transmittal-qa.ts` `prepareQaDocument`. It is off unless `OCR_ENABLED=true`.
- Runtime: `scripts/fetch-ocr-runtime.sh` (`OCR_BUNDLE_RUNTIME=true`) fills `vendor/ocr/{lib,models}` (about 62.5 MB on Linux, 65 MB on macOS). Model files: `pp-ocrv6_small_det.onnx`, `pp-ocrv6_small_rec.onnx`, `ppocrv6_dict.txt`.
- Real OCR verified on mac-arm64: 1-page scan in 618–756 ms, confidence 0.995, and the cache hit takes 1 ms.
- Behaviour change to check in QA: a local-upload timeout now creates a named review row instead of dropping the file.
- Checks: 58 files and 277 tests passed. `npm run build` passed. Better Design review not done, because the tools were unavailable.

## Trail

- [Spec revision 3](context-spec.md) — approved.
- [Workflow revision 1](workflow.md) — approved.
- [Approvals](approvals.md) — spec and workflow.
- [QA](qa.md) — incomplete (all scenarios blocked, no failures).
- [Execution](execution.md) — implementation and evidence ([red baseline](evidence/step1-red.txt), [full suite](evidence/full-suite.txt), [build](evidence/build.txt)).
