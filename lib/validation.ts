import { DocumentReferenceSchema, QaStateSchema } from "./transmittal-qa"
import { z } from "zod"
import { LOGO_DATA_URL_PATTERN } from "./agency-logo"

export const TransmittalItemSchema = z
  .object({
    id: z.string(),
    qty: z.string(),
    noOfItems: z.string(),
    documentNumber: z.string(),
    description: z.string(),
    remarks: z.string(),
    fileType: z.enum(["upload", "gdrive", "link"]).optional(),
    fileSource: z.string().optional(),
    document: DocumentReferenceSchema.optional(),
  })
  .passthrough()

export const RecipientInfoSchema = z
  .object({
    to: z.string(),
    email: z.string(),
    company: z.string(),
    attention: z.string(),
    address: z.string(),
    contactNumber: z.string(),
  })
  .passthrough()

export const ProjectInfoSchema = z
  .object({
    projectName: z.string(),
    projectNumber: z.string(),
    engagementRef: z.string(),
    purpose: z.string(),
    transmittalNumber: z.string(),
    department: z.string(),
    date: z.string(),
    timeGenerated: z.string(),
  })
  .passthrough()

export const SenderInfoSchema = z
  .object({
    agencyName: z.string(),
    addressLine1: z.string(),
    addressLine2: z.string(),
    website: z.string(),
    mobile: z.string(),
    telephone: z.string(),
    email: z.string(),
    logoUrl: z.string().url().refine(value => value.startsWith("https://"), "Logo URL must use HTTPS").nullable().optional(),
    logoBase64: z.string().max(2_800_000).regex(LOGO_DATA_URL_PATTERN).nullable(),
  })
  .passthrough()

export const SignatoriesSchema = z
  .object({
    preparedBy: z.string(),
    preparedByRole: z.string(),
    notedBy: z.string(),
    notedByRole: z.string(),
    timeReleased: z.string(),
  })
  .passthrough()

export const ReceivedBySchema = z
  .object({
    name: z.string(),
    date: z.string(),
    time: z.string(),
    remarks: z.string(),
  })
  .passthrough()

export const FooterNotesSchema = z
  .object({
    acknowledgement: z.string(),
    disclaimer: z.string(),
  })
  .passthrough()

export const TransmissionMethodSchema = z
  .object({
    personalDelivery: z.boolean(),
    pickUp: z.boolean(),
    grabLalamove: z.boolean(),
    registeredMail: z.boolean(),
  })
  .passthrough()

export const AppDataSchema = z
  .object({
    qa: QaStateSchema.optional(),
    recipient: RecipientInfoSchema,
    project: ProjectInfoSchema,
    items: z.array(TransmittalItemSchema),
    sender: SenderInfoSchema,
    signatories: SignatoriesSchema,
    receivedBy: ReceivedBySchema,
    footerNotes: FooterNotesSchema,
    notes: z.string(),
    agencyId: z.string().nullable().optional(),
    transmissionMethod: TransmissionMethodSchema,
  })
  .passthrough()

export const TransmittalSaveRequestSchema = z
  .object({
    data: AppDataSchema,
    isDraft: z.boolean().optional().default(false),
  })
  .passthrough()

export const TransmittalPatchRequestSchema = z
  .object({
    projectName: z.string().optional(),
    transmittalNumber: z.string().optional(),
  })
  .refine(
    (value) =>
      value.projectName !== undefined || value.transmittalNumber !== undefined,
    { message: "At least one field is required" },
  )

export const AgencyInputSchema = z
  .object({
    name: z.string().trim().min(1, "Agency name is required").max(160),
    addressLine1: z.string().nullable().optional(),
    addressLine2: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    telephoneNumber: z.string().nullable().optional(),
    contactNumber: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    logoUrl: z.string().url().max(2048).refine(value => value.startsWith("https://"), "Logo URL must use HTTPS").nullable().optional(),
    logoBase64: z.string().max(2_800_000, "Logo must be 2 MB or smaller").regex(/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/, "Use a PNG, JPG, WebP, or GIF logo").nullable().optional(),
  })
  .passthrough()

export const AgencyRequestSchema = z
  .object({ agency: AgencyInputSchema })
  .passthrough()

export const ParseTransmittalRequestSchema = z
  .object({
    content: z.string().min(1, "Content is required"),
    mimeType: z.string().min(1, "MIME type is required"),
    isText: z.boolean().optional().default(false),
    fileName: z.string().optional(),
  })
  .passthrough()

export type AppDataInput = z.infer<typeof AppDataSchema>
export type AgencyInput = z.infer<typeof AgencyInputSchema>
export type ParseTransmittalInput = z.infer<
  typeof ParseTransmittalRequestSchema
>

export function validateAppData(data: unknown) {
  return AppDataSchema.safeParse(data)
}

export function validatePartialAppData(data: unknown) {
  return AppDataSchema.partial().safeParse(data)
}
