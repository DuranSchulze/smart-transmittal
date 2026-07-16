export function resolveApiUrl(path: string, baseUrl?: string): string {
  if (!baseUrl) return path
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString()
}
