---
type: "query"
date: "2026-11-25T07:13:14.634672+00:00"
question: "Which OCR design did the spec select?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["processPdfWithOcr"]
---

# Q: Which OCR design did the spec select?

## Answer

Option A: processPdfWithOcr in Auto mode with offline true and a bundled model directory; selective page routing, cache by content hash, and ocr_unavailable fallback. QA visual coverage stays review-only with visible evidence.

## Outcome

- Signal: useful

## Source Nodes

- processPdfWithOcr