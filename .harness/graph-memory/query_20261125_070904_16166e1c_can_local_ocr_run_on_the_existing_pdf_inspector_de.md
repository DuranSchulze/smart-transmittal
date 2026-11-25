---
type: "query"
date: "2026-11-25T07:09:04.056171+00:00"
question: "Can local OCR run on the existing pdf-inspector dependency?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["processPdfWithOcr"]
---

# Q: Can local OCR run on the existing pdf-inspector dependency?

## Answer

processPdfWithOcr exists but needs PDFium, ONNX Runtime and a downloaded model set; none are installed, so deployment feasibility (Vercel sin1 read-only fs) is the deciding constraint.

## Outcome

- Signal: useful

## Source Nodes

- processPdfWithOcr