export type GoogleLink = {
  id: string
  kind: "file" | "folder" | "sheet"
  resourceKey?: string
}

/** Parse only actual Google URLs; never match IDs inside arbitrary text/domains. */
export function parseGoogleLink(input: string): GoogleLink | null {
  try {
    const url = new URL(input.trim())
    if (url.protocol !== "https:" || url.username || url.password ||
        !["drive.google.com", "docs.google.com"].includes(url.hostname)) return null
    const folder = url.pathname.match(/^\/(?:drive\/(?:u\/\d+\/)?|)(?:folders)\/([\w-]+)(?:\/|$)/)
    const document = url.pathname.match(/^\/(file|document|spreadsheets|presentation)\/(?:u\/\d+\/)?d\/([\w-]+)(?:\/|$)/)
    const queryId = ["/open", "/uc", "/thumbnail"].includes(url.pathname)
      ? url.searchParams.get("id") : null
    const id = folder?.[1] || document?.[2] || queryId
    if (!id || !/^[\w-]{10,}$/.test(id)) return null
    return {
      id,
      kind: folder ? "folder" : document?.[1] === "spreadsheets" ? "sheet" : "file",
      ...(url.searchParams.get("resourcekey") ? { resourceKey: url.searchParams.get("resourcekey")! } : {}),
    }
  } catch { return null }
}
