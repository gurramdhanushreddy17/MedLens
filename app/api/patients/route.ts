import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { PatientIntakeSchema, PatientSearchSchema } from "@/lib/schemas";
import { logAudit } from "@/lib/audit";
import { ok, err, zodErr, serverErr } from "@/lib/api";

// GET /api/patients — list patients (admin: all, clinician: own)
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = req.nextUrl;
  const parsed = PatientSearchSchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    page: searchParams.get("page") ?? 1,
    limit: searchParams.get("limit") ?? 20,
  });

  if (!parsed.success) return zodErr(parsed.error);

  const { q, page, limit } = parsed.data;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  // Clinicians see only their own patients
  if (auth.user.role !== "admin") {
    where.createdBy = auth.user.id;
  }

  if (q) {
    where.name = { contains: q, mode: "insensitive" };
  }

  try {
    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          _count: {
            select: {
              labResults: true,
              reports: true,
              inconsistencies: { where: { resolved: false } },
            },
          },
          summaries: {
            orderBy: { generatedAt: "desc" },
            take: 1,
            select: { id: true, generatedAt: true },
          },
        },
      }),
      prisma.patient.count({ where }),
    ]);

    return ok({ patients, total, page, limit });
  } catch (e) {
    return serverErr(e);
  }
}

// POST /api/patients — create patient with full intake
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("Request body must be valid JSON");
  }

  const parsed = PatientIntakeSchema.safeParse(body);
  if (!parsed.success) return zodErr(parsed.error);

  const { patient: patientData, symptoms, existingConditions, allergies, noKnownAllergies, medications, notes } = parsed.data;

  try {
    const patient = await prisma.patient.create({
      data: {
        ...patientData,
        dateOfBirth: patientData.dateOfBirth ? new Date(patientData.dateOfBirth) : null,
        createdBy: auth.user.id,
        profileEntries: {
          create: [
            ...symptoms.map((v) => ({
              category: "symptom",
              value: v,
              source: "user-entered",
              enteredBy: auth.user.id,
            })),
            ...existingConditions.map((v) => ({
              category: "existing_condition",
              value: v,
              source: "user-entered",
              enteredBy: auth.user.id,
            })),
            ...(noKnownAllergies
              ? [
                  {
                    category: "allergy",
                    value: "No known allergies",
                    notes: "Explicitly confirmed by patient/clinician",
                    source: "user-entered",
                    enteredBy: auth.user.id,
                  },
                ]
              : allergies.map((v) => ({
                  category: "allergy",
                  value: v,
                  source: "user-entered",
                  enteredBy: auth.user.id,
                }))),
            ...medications.map((m) => ({
              category: "medication",
              value: m.name,
              notes: [m.dose, m.frequency].filter(Boolean).join(" | ") || null,
              source: "user-entered",
              enteredBy: auth.user.id,
            })),
            ...(notes
              ? [
                  {
                    category: "other",
                    value: notes,
                    source: "user-entered",
                    enteredBy: auth.user.id,
                  },
                ]
              : []),
          ],
        },
      },
      include: {
        profileEntries: true,
      },
    });

    await logAudit({
      patientId: patient.id,
      actorId: auth.user.id,
      action: "create_patient",
      entityType: "Patient",
      entityId: patient.id,
      details: { name: patient.name },
    });

    return ok(patient, 201);
  } catch (e) {
    return serverErr(e);
  }
}
