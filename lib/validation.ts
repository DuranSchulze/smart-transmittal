import { z } from "zod"

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
    logoBase64: z.string().nullable(),
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
    name: z.string().trim().min(1, "Agency name is required"),
    addressLine1: z.string().nullable().optional(),
    addressLine2: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    telephoneNumber: z.string().nullable().optional(),
    contactNumber: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    logoBase64: z.string().nullable().optional(),
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
