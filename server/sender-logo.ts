import type { SenderInfo } from "../types"
import { uploadAgencyLogo, validateLogoUrl } from "./imagekit"

export async function senderLogoForStorage(sender: SenderInfo): Promise<SenderInfo> {
  if (sender.logoUrl) return { ...sender, logoUrl: validateLogoUrl(sender.logoUrl), logoBase64: null }
  if (sender.logoBase64) {
    const uploaded = await uploadAgencyLogo(sender.logoBase64)
    return { ...sender, logoUrl: uploaded.logoUrl, logoBase64: null }
  }
  return { ...sender, logoUrl: null, logoBase64: null }
}
