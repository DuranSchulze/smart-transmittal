import type { AppData } from "../types"
import { ensureTransmittalPrefix, stripTransmittalPrefix } from "../lib/utils"
import { db } from "./auth"
import { ServiceError, isUniqueConstraintError } from "./service-error"
import type { Prisma } from "@prisma/client"
import { OPEN_ALL_TRANSMITTALS_ENABLED } from "../lib/features"

type DatabaseClient = Pick<typeof db, "agency" | "transmittal">

const asJsonObject = (value: Prisma.JsonValue): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

export function mapTransmittalForApi<
  T extends {
    project: Prisma.JsonValue
    department: string | null
  },
>(transmittal: T) {
  const project = asJsonObject(transmittal.project)
  return {
    ...transmittal,
    project: {
      ...project,
      transmittalNumber: stripTransmittalPrefix(
        String(project.transmittalNumber || ""),
      ),
      department: String(project.department || transmittal.department || ""),
    },
  }
}

const assertAgencyOwnership = async (
  client: DatabaseClient,
  userId: string,
  agencyId: string | null,
) => {
  if (!agencyId) return
  const agency = await client.agency.findFirst({
    where: { id: agencyId, userId },
    select: { id: true },
  })
  if (!agency) throw new ServiceError(400, "Invalid agency")
}

const findNextStoredNumber = async (
  client: DatabaseClient,
  userId: string | null,
  now = new Date(),
) => {
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
  const prefix = `TR-FP-${yearMonth}-`
  const existing = await client.transmittal.findMany({
    where: {
      ...(userId ? { userId } : {}),
      transmittalNumber: { startsWith: prefix },
    },
    select: { transmittalNumber: true },
  })

  let maxSequence = 0
  for (const row of existing) {
    if (!row.transmittalNumber) continue
    const sequence = Number(row.transmittalNumber.slice(prefix.length))
    if (Number.isFinite(sequence) && sequence > maxSequence) {
      maxSequence = sequence
    }
  }

  return `${prefix}${String(maxSequence + 1).padStart(4, "0")}`
}

const buildNestedData = (data: AppData) => ({
  recipients: {
    create: [
      {
        recipientName: data.recipient.to,
        recipientOrganization: data.recipient.company || null,
        recipientAttention: data.recipient.attention || null,
        recipientFullAddress: data.recipient.address || null,
        recipientAgencyContactNumber: data.recipient.contactNumber || null,
        recipientAgencyEmail: data.recipient.email || null,
      },
    ],
  },
  items: {
    create: data.items.map((item) => ({
      qty: item.qty,
      noOfItems: item.noOfItems,
      documentNumber: item.documentNumber,
      description: item.description,
      remarks: item.remarks,
      fileType: item.fileType || null,
      fileSource: item.fileSource || null,
    })),
  },
})

const buildScalarData = (
  data: AppData,
  input: {
    isDraft: boolean
    storedTransmittalNumber: string | null
    projectTransmittalNumber: string
  },
) => {
  const department = data.project.department.trim()
  return {
    notes: data.notes,
    isDraft: input.isDraft,
    transmittalNumber: input.storedTransmittalNumber,
    agencyId: data.agencyId ? String(data.agencyId) : null,
    handDelivery: data.transmissionMethod.personalDelivery,
    pickUp: data.transmissionMethod.pickUp,
    courier: data.transmissionMethod.grabLalamove,
    registeredMail: data.transmissionMethod.registeredMail,
    projectName: data.project.projectName,
    projectNumber: data.project.projectNumber || null,
    engagementRefNumber: data.project.engagementRef || null,
    projectPurpose: data.project.purpose || null,
    department: department || null,
    project: {
      ...data.project,
      transmittalNumber: input.projectTransmittalNumber,
      department,
    } as unknown as Prisma.InputJsonValue,
    sender: data.sender as unknown as Prisma.InputJsonValue,
    receivedBy: data.receivedBy as unknown as Prisma.InputJsonValue,
    footerNotes: data.footerNotes as unknown as Prisma.InputJsonValue,
    preparedBy: data.signatories.preparedBy,
    preparedByRole: data.signatories.preparedByRole,
    notedBy: data.signatories.notedBy,
    notedByRole: data.signatories.notedByRole,
    timeReleased: data.signatories.timeReleased,
  }
}

const assertNumberAvailable = async (
  client: DatabaseClient,
  userId: string,
  storedNumber: string,
  excludedId?: string,
) => {
  if (!storedNumber) return
  const duplicate = await client.transmittal.findFirst({
    where: {
      userId,
      transmittalNumber: storedNumber,
      ...(excludedId ? { id: { not: excludedId } } : {}),
    },
    select: { id: true },
  })
  if (duplicate) {
    throw new ServiceError(
      409,
      `Transmittal number "${stripTransmittalPrefix(storedNumber)}" is already in use.`,
      "DUPLICATE_TRANSMITTAL_NUMBER",
    )
  }
}

export async function listByUser(userId: string) {
  const records = await db.transmittal.findMany({
    where: { userId },
    include: { items: true, recipients: true, agency: true },
  })
  return records.map(mapTransmittalForApi)
}

export async function getTransmittalById(id: string, userId: string) {
  const record = await db.transmittal.findFirst({
    where: {
      id,
      ...(OPEN_ALL_TRANSMITTALS_ENABLED
        ? { OR: [{ userId }, { isDraft: false }] }
        : { userId }),
    },
    include: { items: true, recipients: true, agency: true },
  })

  if (!record) throw new ServiceError(404, "Transmittal not found")
  return {
    ...mapTransmittalForApi(record),
    isOwner: record.userId === userId,
  }
}

export async function listTransmittalSummaries(
  userId: string,
  scope: "mine" | "all",
  options: {
    page?: number
    pageSize?: number
    search?: string
    date?: string
    status?: "all" | "draft" | "final"
    owner?: string
    sort?:
      | "updated-desc"
      | "created-desc"
      | "project-asc"
      | "number-asc"
      | "owner-asc"
  } = {},
) {
  if (scope === "all" && !OPEN_ALL_TRANSMITTALS_ENABLED) {
    throw new ServiceError(
      403,
      "Open All transmittals is temporarily unavailable.",
      "OPEN_ALL_TRANSMITTALS_DISABLED",
    )
  }

  const pageSize = Math.min(Math.max(options.pageSize || 12, 1), 48)
  const page = Math.max(options.page || 1, 1)
  const search = options.search?.trim()
  const owner = options.owner?.trim()
  const where: Prisma.TransmittalWhereInput = {
    ...(scope === "mine" ? { userId } : { isDraft: false }),
    ...(scope === "mine" && options.status && options.status !== "all"
      ? { isDraft: options.status === "draft" }
      : {}),
    ...(search
      ? {
          OR: [
            { transmittalNumber: { contains: search, mode: "insensitive" } },
            { projectName: { contains: search, mode: "insensitive" } },
            {
              recipients: {
                some: {
                  recipientName: { contains: search, mode: "insensitive" },
                },
              },
            },
            ...(scope === "all"
              ? [
                  {
                    user: {
                      name: { contains: search, mode: "insensitive" as const },
                    },
                  },
                ]
              : []),
          ],
        }
      : {}),
    ...(scope === "all" && owner
      ? { user: { name: { contains: owner, mode: "insensitive" } } }
      : {}),
  }

  if (options.date && /^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    const start = new Date(`${options.date}T00:00:00.000Z`)
    const end = new Date(`${options.date}T23:59:59.999Z`)
    where.createdAt = { gte: start, lte: end }
  }

  const orderBy: Prisma.TransmittalOrderByWithRelationInput =
    options.sort === "created-desc"
      ? { createdAt: "desc" }
      : options.sort === "project-asc"
        ? { projectName: "asc" }
        : options.sort === "number-asc"
          ? { transmittalNumber: "asc" }
          : options.sort === "owner-asc" && scope === "all"
            ? { user: { name: "asc" } }
            : { updatedAt: "desc" }

  const [total, records] = await db.$transaction([
    db.transmittal.count({ where }),
    db.transmittal.findMany({
    where,
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      userId: true,
      isDraft: true,
      transmittalNumber: true,
      projectName: true,
      project: true,
      createdAt: true,
      updatedAt: true,
      recipients: {
        take: 1,
        select: { recipientName: true },
      },
      _count: { select: { items: true } },
      user: { select: { name: true } },
    },
    }),
  ])

  const transmittals = records.map((record) => {
    const project = asJsonObject(record.project)
    return {
      id: record.id,
      transmittalNumber: stripTransmittalPrefix(
        String(project.transmittalNumber || record.transmittalNumber || ""),
      ),
      projectName: String(project.projectName || record.projectName || "Untitled"),
      recipientName: record.recipients[0]?.recipientName || "",
      date: String(
        project.date || record.createdAt.toISOString().split("T")[0],
      ),
      itemCount: record._count.items,
      isDraft: record.isDraft,
      ownerName: record.user.name || "Unknown user",
      isOwner: record.userId === userId,
      updatedAt: record.updatedAt?.toISOString() || null,
    }
  })

  return {
    transmittals,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  }
}

export async function createTransmittal(
  userId: string,
  data: AppData,
  isDraft: boolean,
) {
  try {
    return await db.$transaction(async (transaction) => {
      const agencyId = data.agencyId ? String(data.agencyId) : null
      await assertAgencyOwnership(transaction, userId, agencyId)

      const requestedNumber = data.project.transmittalNumber.trim()
      let projectStoredNumber = ensureTransmittalPrefix(requestedNumber)
      if (!projectStoredNumber) {
        projectStoredNumber = await findNextStoredNumber(transaction, userId)
      }
      const storedNumber = isDraft ? null : projectStoredNumber
      if (storedNumber) {
        await assertNumberAvailable(transaction, userId, storedNumber)
      }

      const record = await transaction.transmittal.create({
        data: {
          userId,
          ...buildScalarData(data, {
            isDraft,
            storedTransmittalNumber: storedNumber,
            projectTransmittalNumber: projectStoredNumber,
          }),
          ...buildNestedData(data),
        },
        include: { items: true, recipients: true, agency: true },
      })
      return mapTransmittalForApi(record)
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ServiceError(409, "Transmittal number is already in use.")
    }
    throw error
  }
}

export async function updateTransmittal(
  id: string,
  userId: string,
  data: AppData,
  isDraft: boolean,
) {
  try {
    return await db.$transaction(async (transaction) => {
      const existing = await transaction.transmittal.findFirst({
        where: { id, userId },
      })
      if (!existing) throw new ServiceError(404, "Transmittal not found")

      const agencyId = data.agencyId ? String(data.agencyId) : null
      await assertAgencyOwnership(transaction, userId, agencyId)

      const projectStoredNumber = ensureTransmittalPrefix(
        data.project.transmittalNumber,
      )
      const storedNumber = isDraft
        ? existing.transmittalNumber
        : projectStoredNumber || null
      if (!isDraft && storedNumber) {
        await assertNumberAvailable(transaction, userId, storedNumber, id)
      }

      const record = await transaction.transmittal.update({
        where: { id },
        data: {
          ...buildScalarData(data, {
            isDraft,
            storedTransmittalNumber: storedNumber,
            projectTransmittalNumber: projectStoredNumber,
          }),
          recipients: {
            deleteMany: {},
            ...buildNestedData(data).recipients,
          },
          items: {
            deleteMany: {},
            ...buildNestedData(data).items,
          },
        },
        include: { items: true, recipients: true, agency: true },
      })
      return { transmittal: mapTransmittalForApi(record), wasDraft: existing.isDraft }
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ServiceError(409, "Transmittal number is already in use.")
    }
    throw error
  }
}

export async function patchTransmittal(
  id: string,
  userId: string,
  fields: { projectName?: string; transmittalNumber?: string },
) {
  const existing = await db.transmittal.findFirst({ where: { id, userId } })
  if (!existing) throw new ServiceError(404, "Transmittal not found")

  const project = asJsonObject(existing.project)
  const data: Prisma.TransmittalUpdateInput = {}

  if (fields.projectName !== undefined) {
    const projectName = fields.projectName.trim()
    data.projectName = projectName
    project.projectName = projectName
  }

  if (fields.transmittalNumber !== undefined) {
    const rawNumber = fields.transmittalNumber.trim()
    const storedNumber = ensureTransmittalPrefix(rawNumber)
    if (!existing.isDraft && storedNumber) {
      await assertNumberAvailable(db, userId, storedNumber, id)
      data.transmittalNumber = storedNumber
    }
    project.transmittalNumber = storedNumber
  }

  data.project = project as Prisma.InputJsonValue
  await db.transmittal.update({ where: { id }, data })

  return {
    ok: true as const,
    projectName: String(project.projectName || existing.projectName),
    transmittalNumber: stripTransmittalPrefix(
      String(project.transmittalNumber || existing.transmittalNumber || ""),
    ),
  }
}

export async function deleteTransmittal(id: string, userId: string) {
  const existing = await db.transmittal.findFirst({
    where: { id, userId },
    select: { id: true },
  })
  if (!existing) throw new ServiceError(404, "Transmittal not found")
  await db.transmittal.delete({ where: { id } })
}

export async function generateNextNumber() {
  return stripTransmittalPrefix(await findNextStoredNumber(db, null))
}
