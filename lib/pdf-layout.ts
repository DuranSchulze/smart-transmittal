// Letter paper, half-inch margins: a 7.5 x 10 inch content area at 96 CSS dpi.
export const PDF_CONTENT_WIDTH = 720
const PDF_CONTENT_HEIGHT = 960

/** Don't silently export a blank letterhead while its remote logo is loading. */
export async function waitForPdfImages(element: HTMLElement) {
  await Promise.all(Array.from(element.querySelectorAll("img")).map(image => new Promise<void>((resolve, reject) => {
    if (image.complete) {
      if (image.naturalWidth > 0) resolve()
      else reject(new Error("Could not load the company logo for the document."))
      return
    }
    const finish = (error?: Error) => {
      clearTimeout(timer)
      image.removeEventListener("load", loaded)
      image.removeEventListener("error", failed)
      error ? reject(error) : resolve()
    }
    const loaded = () => finish()
    const failed = () => finish(new Error("Could not load the company logo for the document."))
    const timer = setTimeout(() => finish(new Error("Company logo took too long to load. Please retry.")), 15_000)
    image.addEventListener("load", loaded, { once: true })
    image.addEventListener("error", failed, { once: true })
  })))
}

/** Place page breaks between rows and between individual sign-off blocks. */
export function paginatePdfExport(element: HTMLElement) {
  const table = element.querySelector<HTMLTableElement>(".transmittal-items")
  const rows = Array.from(table?.tBodies[0]?.rows ?? [])
  const origin = element.getBoundingClientRect().top

  const spaceToNextPage = (first: Element, last = first) => {
    const top = first.getBoundingClientRect().top
    const bottom = last.getBoundingClientRect().bottom
    const available = PDF_CONTENT_HEIGHT - ((top - origin) % PDF_CONTENT_HEIGHT)
    const height = bottom - top
    return height > available && height <= PDF_CONTENT_HEIGHT ? available : 0
  }

  const padBefore = (block: Element, last = block) => {
    const gap = spaceToNextPage(block, last)
    if (!gap) return
    const spacer = block.ownerDocument.createElement("div")
    spacer.style.height = `${gap}px`
    spacer.setAttribute("aria-hidden", "true")
    block.before(spacer)
  }

  element.querySelectorAll(".transmittal-meta > div").forEach(block => padBefore(block))

  if (table && rows[0]) padBefore(table, rows[0])
  for (const row of rows) {
    const gap = spaceToNextPage(row)
    if (!gap) continue
    // A spacer inside a table body must participate in the table's row layout.
    const spacer = row.ownerDocument.createElement("tr")
    const cell = spacer.insertCell()
    cell.colSpan = Array.from(row.cells).reduce((columns, item) => columns + item.colSpan, 0)
    cell.style.cssText = `height:${gap}px;padding:0;border:0;`
    spacer.setAttribute("aria-hidden", "true")
    row.before(spacer)
  }

  element.querySelectorAll(".transmittal-closing .avoid-break").forEach(block => padBefore(block))
}

/** Render at the PDF's real width without resizing or transforming the editor. */
export function createPdfExportSource(source: HTMLElement) {
  const host = document.createElement("div")
  host.style.cssText = `position:absolute;left:0;top:0;width:${PDF_CONTENT_WIDTH}px;z-index:-1;pointer-events:none;`
  const element = source.cloneNode(true) as HTMLElement
  element.removeAttribute("id")
  element.classList.add("pdf-export")
  element.style.cssText = `width:${PDF_CONTENT_WIDTH}px;min-height:0;height:auto;transform:none;background:white;`

  // A single outer table row around the whole document prevents reliable print fragmentation.
  const layout = element.querySelector<HTMLTableElement>(".transmittal-layout")
  const content = layout?.tBodies[0]?.rows[0]?.cells[0]
  const brand = layout?.querySelector(".transmittal-brand")
  if (layout && content && brand) {
    const body = document.createElement("div")
    body.className = "transmittal-output-body"
    body.append(...Array.from(content.childNodes))
    layout.replaceWith(brand, body)
  }

  const style = document.createElement("style")
  style.textContent = `
    .pdf-export *, .pdf-export { transition: none !important; animation: none !important; }
    .pdf-export .transmittal-output-body { padding-top: 8px; }
    .pdf-export .transmittal-brand { height: 100px !important; }
    .pdf-export .transmittal-brand { padding: 12px 0 0 !important; }
    .pdf-export .transmittal-brand img { height: 64px !important; }
    .pdf-export .transmittal-title { font-size: 20px; margin-bottom: 16px; }
    .pdf-export .transmittal-meta { font-size: 12px; margin-bottom: 16px; }
    .pdf-export .transmittal-meta > div { min-height: 26px; }
    .pdf-export .transmittal-items { font-size: 12px; }
    .pdf-export .transmittal-items th, .pdf-export .transmittal-items td { font-size: 12px; padding: 6px; line-height: 1.35; }
    .pdf-export .transmittal-closing { margin-top: 12px; }
    .pdf-export .transmittal-closing > div { padding-top: 16px; }
    .pdf-export .transmittal-closing .mb-8 { margin-bottom: 16px; }
    .pdf-export .transmittal-closing .mb-6 { margin-bottom: 14px; }
    .pdf-export .transmittal-closing .p-5 { padding: 12px; }
    .pdf-export .transmittal-closing .p-6 { padding: 14px; }
    .pdf-export .transmittal-closing .gap-y-6 { row-gap: 14px; }
    .pdf-export .transmittal-closing .gap-12 { gap: 24px; }
  `
  element.prepend(style)
  host.append(element)
  document.body.appendChild(host)
  return { element, cleanup: () => host.remove() }
}
