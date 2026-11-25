---
type: "query"
date: "2026-11-25T07:41:58.841053+00:00"
question: "Where do scanned PDFs and AI parse failures flow (execute stage)?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["parseTransmittalDocument()", "useDriveImport()"]
---

# Q: Where do scanned PDFs and AI parse failures flow (execute stage)?

## Answer

Graph recall matched the spec's paths; only useDocumentParsing and useDriveImport call parseDocument; the route, pdf-parsing, transmittal-qa and user-ai-settings were the integration points

## Outcome

- Signal: useful

## Source Nodes

- parseTransmittalDocument()
- useDriveImport()