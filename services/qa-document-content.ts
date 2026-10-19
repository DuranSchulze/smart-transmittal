import type { QaDocumentContent } from "../lib/transmittal-qa"
import { isImageDocument } from "../lib/import-file-policy"

export async function extractQaWord(arrayBuffer: ArrayBuffer): Promise<QaDocumentContent> {
  const [{ extractRawText }, { default: JSZip }] = await Promise.all([import("mammoth"), import("jszip")])
  const [result, zip] = await Promise.all([extractRawText({ arrayBuffer }), JSZip.loadAsync(arrayBuffer)])
  if (!result.value.trim()) throw new Error("No text could be read from this Word file. Reattach a readable PDF or Word document.")
  // Mammoth omits visual content and additional Word sections. Never call this full coverage.
  const omittedSections = Object.keys(zip.files).some(name => /^word\/(?:media|embeddings|charts|diagrams)\//.test(name) || /^word\/(?:header|footer)\d*\.xml$/.test(name))
  return { content: result.value, mimeType: "text/plain", isText: true, textComplete: !omittedSections && !result.messages.length }
}

export async function prepareQaContent(content: string, mimeType: string, name: string): Promise<QaDocumentContent> {
  if (isImageDocument(mimeType, name)) throw new Error("Use a PDF or Word document for QA.")
  if (mimeType === "text/plain") return { content, mimeType, isText: true }
  if (/\.(docx|doc)$/i.test(name) || ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"].includes(mimeType)) {
    const bytes = Uint8Array.from(atob(content), c => c.charCodeAt(0))
    return extractQaWord(bytes.buffer)
  }
  if (mimeType !== "application/pdf" && !/\.pdf$/i.test(name)) throw new Error("QA supports PDF and Word documents. Reattach a supported file.")
  return { content, mimeType: "application/pdf", isText: false }
}

export async function readQaFile(file: File): Promise<QaDocumentContent> {
  if (file.size > 18 * 1024 * 1024) throw new Error("File is too large (maximum 18 MB).")
  const content = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(",")[1])
    reader.onerror = () => reject(new Error("Could not read the file. Try attaching it again."))
    reader.readAsDataURL(file)
  })
  return prepareQaContent(content, file.type, file.name)
}
