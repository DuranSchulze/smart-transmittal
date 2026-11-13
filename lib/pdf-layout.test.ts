import { afterEach, describe, expect, it } from "vitest"
import { createPdfExportSource, paginatePdfExport, waitForPdfImages } from "./pdf-layout"

afterEach(() => { document.body.innerHTML = "" })
const rect = (node: Element, top: number, height: number) => {
  node.getBoundingClientRect = () => ({ top, bottom: top + height, left: 0, right: 720, width: 720, height, x: 0, y: top, toJSON() {} })
}

describe("PDF export layout", () => {
  it("waits for remote letterhead images before rendering", async () => {
    const root = document.createElement("div")
    root.innerHTML = '<img src="https://ik.imagekit.io/account/logo.png">'
    const image = root.querySelector("img")!
    Object.defineProperty(image, "complete", { value: false })
    const waiting = waitForPdfImages(root)
    image.dispatchEvent(new Event("load"))
    await expect(waiting).resolves.toBeUndefined()
  })
  it("rejects a failed letterhead image instead of silently omitting it", async () => {
    const root = document.createElement("div")
    root.innerHTML = '<img src="https://ik.imagekit.io/account/missing.png">'
    const image = root.querySelector("img")!
    Object.defineProperty(image, "complete", { value: false })
    const waiting = waitForPdfImages(root)
    image.dispatchEvent(new Event("error"))
    await expect(waiting).rejects.toThrow("company logo")
  })
  it("uses a separate printable-width clone without changing the editor", () => {
    const source = document.createElement("div")
    source.id = "print-container"
    source.style.minHeight = "1056px"
    document.body.append(source)
    const output = createPdfExportSource(source)
    expect(output.element.style.width).toBe("720px")
    expect(output.element.id).toBe("")
    expect(source.style.minHeight).toBe("1056px")
    output.cleanup()
    expect(output.element.isConnected).toBe(false)
    expect(source.isConnected).toBe(true)
  })

  const longTable = (footerHeight = 273) => {
    const root = document.createElement("div")
    root.innerHTML = `<table class="transmittal-items"><thead><tr><th>Description</th></tr></thead><tbody>${Array.from({ length: 4 }, (_, i) => `<tr><td>Document ${i + 1}</td></tr>`).join("")}</tbody></table><div class="transmittal-closing"><div class="avoid-break">Signatures and acknowledgement</div></div>`
    document.body.append(root)
    rect(root, 0, 850 + footerHeight)
    rect(root.querySelector("table")!, 450, 400)
    root.querySelectorAll("tbody tr").forEach((row, i) => rect(row, 500 + i * 85, 85))
    rect(root.querySelector(".avoid-break")!, 850, footerHeight)
    return root
  }

  it("keeps rows that fit on the page when the sign-off needs a page break", () => {
    const root = longTable()
    paginatePdfExport(root)
    expect(root.querySelector(".avoid-break")?.previousElementSibling?.getAttribute("aria-hidden")).toBe("true")
    expect(Array.from(root.querySelectorAll("tbody tr"), row => row.textContent))
      .toEqual(["Document 1", "Document 2", "Document 3", "Document 4"])
  })

  it("allows a closing section taller than a page to flow rather than clipping it", () => {
    const root = longTable(1200)
    paginatePdfExport(root)
    expect(root.querySelector("[aria-hidden]")).toBeNull()
    expect(root.querySelectorAll("tbody tr")).toHaveLength(4)
  })
})
