---
type: "query"
date: "2026-11-25T07:06:18.935074+00:00"
question: "Where do scanned PDFs and AI parse failures flow?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["preparePdfForParsing()", "parseTransmittalDocument()"]
---

# Q: Where do scanned PDFs and AI parse failures flow?

## Answer

Scanned or sparse PDFs skip local text, go to Gemini visually with a 60s timeout, then collapse into filename fallback rows; Drive import overwrites the reason and QA forces visual keyword results to uncertain.

## Outcome

- Signal: useful

## Source Nodes

- preparePdfForParsing()
- parseTransmittalDocument()