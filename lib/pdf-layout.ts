// Letter paper, half-inch margins: a 7.5 x 10 inch content area at 96 CSS dpi.
export const PDF_CONTENT_WIDTH = 720
const PDF_CONTENT_HEIGHT = 960

/** Don't silently export a blank letterhead while its remote logo is loading. */
export async function waitForPdfImages(element: HTMLElement) {
  await Promise.all(Array.from(element.querySelectorAll("img")).map(image => new Promise<void>((resolve, reject) => {
    if (image.complete) {
      if (image.naturalWidth > 0) resolve()
      else reject(new Error("Could not load the company logo for PDF export."))
      return
    }
    const finish = (error?: Error) => {
      clearTimeout(timer)
      image.removeEventListener("load", loaded)
      image.removeEventListener("error", failed)
      error ? reject(error) : resolve()
    }
    const loaded = () => finish()
    const failed = () => finish(new Error("Could not load the company logo for PDF export."))
    const timer = setTimeout(() => finish(new Error("Company logo took too long to load. Please retry the PDF export.")), 15_000)
    image.addEventListener("load", loaded, { once: true })
    image.addEventListener("error", failed, { once: true })
  })))
}

/** Keep a few trailing rows with an otherwise isolated sign-off page. */
export function balanceClosingSection(element: HTMLElement) {
  const table = element.querySelector<HTMLTableElement>(".transmittal-items")
  const closing = element.querySelector<HTMLElement>(".transmittal-closing")
  if (!table || !closing) return
  const rows = Array.from(table.tBodies[0]?.rows || [])
  const origin = element.getBoundingClientRect().top
  let padding = 0
  const rowPages = new Map<Element, number>()
  // Match html2pdf's row-avoidance padding before deciding where the footer lands.
  for (const block of element.querySelectorAll(".transmittal-meta > div, .transmittal-items tr")) {
    const rect = block.getBoundingClientRect()
    let top = rect.top - origin + padding
    if (rect.height <= PDF_CONTENT_HEIGHT && Math.floor(top / PDF_CONTENT_HEIGHT) !==
        Math.floor((top + rect.height) / PDF_CONTENT_HEIGHT)) {
      const gap = PDF_CONTENT_HEIGHT - top % PDF_CONTENT_HEIGHT
      padding += gap
      top += gap
    }
    rowPages.set(block, Math.floor(top / PDF_CONTENT_HEIGHT))
  }
  const rect = closing.getBoundingClientRect()
  const top = rect.top - origin + padding
  const page = Math.floor(top / PDF_CONTENT_HEIGHT)
  const lastRowPage = rowPages.get(rows[rows.length - 1])
  const footerIsAlone = lastRowPage !== undefined && lastRowPage < page
  if (!rect.height || rect.height >= PDF_CONTENT_HEIGHT ||
      (!footerIsAlone && page === Math.floor((top + rect.height) / PDF_CONTENT_HEIGHT))) return

  const headerHeight = table.tHead?.getBoundingClientRect().height || 0
  let groupHeight = rect.height + headerHeight + 16
  const trailing: HTMLTableRowElement[] = []
  for (const row of rows.slice(1).reverse()) {
    const height = row.getBoundingClientRect().height
    if (rowPages.get(row) !== (footerIsAlone ? lastRowPage : page) || groupHeight + height > PDF_CONTENT_HEIGHT - 16) break
    trailing.unshift(row)
    groupHeight += height
    if (groupHeight >= PDF_CONTENT_HEIGHT / 2) break
  }
  if (!trailing.length) return
  const group = document.createElement("div")
  group.className = "avoid-break transmittal-closing-group"
  const continuation = table.cloneNode(false) as HTMLTableElement
  continuation.classList.remove("transmittal-items")
  continuation.classList.add("transmittal-continuation")
  if (table.tHead) continuation.appendChild(table.tHead.cloneNode(true))
  const body = continuation.createTBody()
  trailing.forEach(row => body.appendChild(row))
  closing.before(group)
  group.append(continuation, closing)
}

/** Render at the PDF's real width without resizing or transforming the editor. */
export function createPdfExportSource(source: HTMLElement) {
  const host = document.createElement("div")
  host.style.cssText = `position:absolute;left:0;top:0;width:${PDF_CONTENT_WIDTH}px;z-index:-1;pointer-events:none;`
  const element = source.cloneNode(true) as HTMLElement
  element.removeAttribute("id")
  element.classList.add("pdf-export")
  element.style.cssText = `width:${PDF_CONTENT_WIDTH}px;min-height:0;height:auto;transform:none;background:white;`
  const style = document.createElement("style")
  style.textContent = `
    .pdf-export *, .pdf-export { transition: none !important; animation: none !important; }
    .pdf-export .transmittal-layout { height: auto !important; }
    .pdf-export .transmittal-layout > tbody > tr > td { padding: 8px 0 0 !important; }
    .pdf-export .transmittal-header, .pdf-export .transmittal-brand { height: 100px !important; }
    .pdf-export .transmittal-brand { padding: 12px 0 0 !important; }
    .pdf-export .transmittal-brand img { height: 64px !important; }
    .pdf-export .transmittal-title { font-size: 20px; margin-bottom: 16px; }
    .pdf-export .transmittal-meta { font-size: 12px; margin-bottom: 16px; }
    .pdf-export .transmittal-meta > div { min-height: 26px; }
    .pdf-export .transmittal-items, .pdf-export .transmittal-continuation { font-size: 12px; }
    .pdf-export .transmittal-items th, .pdf-export .transmittal-items td,
    .pdf-export .transmittal-continuation th, .pdf-export .transmittal-continuation td { font-size: 12px; padding: 6px; line-height: 1.35; }
    .pdf-export .transmittal-closing { margin-top: 12px; break-inside: avoid; page-break-inside: avoid; }
    .pdf-export .transmittal-closing > div { padding-top: 16px; }
    .pdf-export .transmittal-closing .mb-8 { margin-bottom: 16px; }
    .pdf-export .transmittal-closing .mb-6 { margin-bottom: 14px; }
    .pdf-export .transmittal-closing .p-5 { padding: 12px; }
    .pdf-export .transmittal-closing .p-6 { padding: 14px; }
    .pdf-export .transmittal-closing .gap-y-6 { row-gap: 14px; }
    .pdf-export .transmittal-closing .gap-12 { gap: 24px; }
    .pdf-export .transmittal-meta > div, .pdf-export .transmittal-items tr,
    .pdf-export .avoid-break { break-inside: avoid; page-break-inside: avoid; }
  `
  host.append(style, element)
  document.body.appendChild(host)
  balanceClosingSection(element)
  return { element, cleanup: () => host.remove() }
}
