export const escapeCsvField = (value: unknown): string => {
  const text = value == null ? "" : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const createCsv = (rows: unknown[][]): string =>
  rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n")
