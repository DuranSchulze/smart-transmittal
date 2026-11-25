// Downloads and checksum-verifies the pinned OCR model set into
// PDF_INSPECTOR_MODEL_CACHE by OCR-ing one blank, generated page.
// Run by scripts/fetch-ocr-runtime.sh at build time, never at request time.
import { processPdfWithOcr } from "@firecrawl/pdf-inspector"

function blankPdf() {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << >> >>",
    "<< /Length 0 >>\nstream\n\nendstream",
  ]
  let body = "%PDF-1.4\n"
  const offsets = []
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body))
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = Buffer.byteLength(body)
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  body += offsets.map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(body)
}

const started = Date.now()
// "Force" OCRs the selected page even though it is blank, which loads every model.
const result = await processPdfWithOcr(blankPdf(), { mode: "Force", pageNumbers: [1], offline: false })
console.log(`ocr-warmup: routed ${result.pagesRoutedToOcr.length} page(s) in ${Date.now() - started} ms`)
