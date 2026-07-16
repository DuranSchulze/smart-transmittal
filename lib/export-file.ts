const INVALID_FILE_NAME_CHARACTERS = /[<>:"/\\|?*\u0000-\u001f]/g

export const sanitizeExportBaseName = (value: string): string => {
  const sanitized = value
    .trim()
    .replace(INVALID_FILE_NAME_CHARACTERS, "-")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .slice(0, 80)

  return sanitized || "transmittal"
}

export const createExportFileName = (
  transmittalNumber: string,
  suffix: string,
  extension: "pdf" | "docx" | "csv",
): string =>
  `${sanitizeExportBaseName(transmittalNumber)}${suffix}.${extension}`
