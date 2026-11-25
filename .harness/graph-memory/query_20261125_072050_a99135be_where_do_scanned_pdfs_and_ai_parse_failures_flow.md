---
type: "query"
date: "2026-11-25T07:20:50.355816+00:00"
question: "Where do scanned PDFs and AI parse failures flow (workflow stage)?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["parseTransmittalDocument()", "useDriveImport()", "buildFallbackParseResult()"]
---

# Q: Where do scanned PDFs and AI parse failures flow (workflow stage)?

## Answer

Confirmed spec paths: geminiService.parseTransmittalDocument, pdf-parsing.preparePdfForParsing, useDriveImport.analyze, transmittal-qa.prepareQaDocument; only useDocumentParsing and useDriveImport call parseDocument

## Outcome

- Signal: useful

## Source Nodes

- parseTransmittalDocument()
- useDriveImport()
- buildFallbackParseResult()