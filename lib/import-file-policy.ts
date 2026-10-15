/** Applies to transmittal document imports, not agency logos. */
export function isImageDocument(mimeType: string, fileName = ""): boolean {
  return mimeType.trim().toLowerCase().startsWith("image/") ||
    /\.(?:png|jpe?g|gif|webp|bmp|tiff?|svg|ico|avif|hei[cf]|heics|heifs|jxl)$/i.test(fileName.trim())
}
