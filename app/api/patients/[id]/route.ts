import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { PatientUpdateSchema } from "@/lib/schemas";
import { logAudit } from "@/lib/audit";
import { ok, err, zodErr, serverErr } from "@/lib/api";

interface Params {
  params: { id: string };
}

// GET /api/patients/[id] — full patient record
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const patient = await prisma.patient.findUnique({
      where: { id: params.id },
      include: {
        profileEntries: { orderBy: { enteredAt: "asc" } },
        reports: {
          orderBy: { uploadedAt: "desc" },
          include: {
            labResults: {
              orderBy: { testName: "asc" },
            },
          },
        },
        labResults: {
          orderBy: [{ testName: "asc" }],
          include: { report: { select: { reportDate: true, originalFilename: true } } },
        },
        summaries: { orderBy: { generatedAt: "desc" }, take: 1 },
        inconsistencies: {
          where: { resolved: false },
          orderBy: { id: "asc" },
        },
        auditLogs: { orderBy: { timestamp: "desc" }, take: 50 },
      },
    });

    if (!patient) return err("Patient not found", 404);

    // Access control: admin can see all, clinician only their own
    if (auth.user.role !== "admin" && patient.createdBy !== auth.user.id) {
      return err("Access denied", 403);
    }

    return ok(patient);
  } catch (e) {
    return serverErr(e);
  }
}

// PATCH /api/patients/[id] — update patient info
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("Request body must be valid JSON");
  }

  const parsed = PatientUpdateSchema.safeParse(body);
  if (!parsed.success) return zodErr(parsed.error);

  try {
    const existing = await prisma.patient.findUnique({ where: { id: params.id } });
    if (!existing) return err("Patient not found", 404);

    if (auth.user.role !== "admin" && existing.createdBy !== auth.user.id) {
      return err("Access denied", 403);
    }

    const updated = await prisma.patient.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : undefined,
      },
    });

    await logAudit({
      patientId: params.id,
      actorId: auth.user.id,
      action: "update_patient",
      entityType: "Patient",
      entityId: params.id,
      details: parsed.data,
    });

    return ok(updated);
  } catch (e) {
    return serverErr(e);
  }
}

// DELETE /api/patients/[id] — clinician (own patient) or admin
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const existing = await prisma.patient.findUnique({ where: { id: params.id } });
    if (!existing) return err("Patient not found", 404);

    if (auth.user.role !== "admin" && existing.createdBy !== auth.user.id) {
      return err("Access denied — you can only delete patients in your registry", 403);
    }

    await prisma.patient.delete({ where: { id: params.id } });

    await logAudit({
      patientId: params.id,
      actorId: auth.user.id,
      action: "delete_patient",
      entityType: "Patient",
      entityId: params.id,
      details: { patientName: existing.name },
    }).catch(() => {});

    return ok({ deleted: true });
  } catch (e) {
    return serverErr(e);
  }
}
