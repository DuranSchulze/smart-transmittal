export type PreparedPdf = {
  content: string
  mimeType: string
  isText: boolean
  extractedPdfText: boolean
}

/** Native extraction stays server-side and off the Node event loop. */
export async function preparePdfForParsing(
  content: string,
  mimeType: string,
  isText: boolean,
): Promise<PreparedPdf> {
  const original = { content, mimeType, isText, extractedPdfText: false }
  if (isText || mimeType !== "application/pdf") return original

  try {
    // Load lazily so missing native binaries don't break non-PDF requests.
    const { extractPagesMarkdownAsync } = await import("@firecrawl/pdf-inspector")
    const result = await extractPagesMarkdownAsync(Buffer.from(content, "base64"), [0])
    const cover = result.pages.find(page => page.page === 0)
    const text = cover?.markdown.trim() || ""
    // Keep visual parsing for scans, broken fonts, and sparse cover pages.
    if (!cover || cover.needsOcr || text.length < 80 || text.includes("\uFFFD")) return original
    return {
      content: text.slice(0, 32_000),
      mimeType: "text/plain",
      isText: true,
      extractedPdfText: true,
    }
  } catch {
    // Never log PDF contents; visual parsing remains available on native errors.
    console.warn("PDF Inspector extraction unavailable; using visual PDF parsing.")
    return original
  }
}
