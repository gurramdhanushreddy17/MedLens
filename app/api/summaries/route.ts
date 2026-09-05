import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { SummaryGenerateSchema } from "@/lib/schemas";
import { generateSummary } from "@/lib/claude";
import { logAudit } from "@/lib/audit";
import { ok, err, zodErr, serverErr } from "@/lib/api";

// POST /api/summaries — generate AI summary for a patient
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("Request body must be valid JSON");
  }

  const parsed = SummaryGenerateSchema.safeParse(body);
  if (!parsed.success) return zodErr(parsed.error);

  const { patientId } = parsed.data;

  try {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        profileEntries: true,
        labResults: {
          include: {
            report: { select: { id: true, reportDate: true } },
          },
          orderBy: { testName: "asc" },
        },
        reports: { select: { id: true } },
      },
    });

    if (!patient) return err("Patient not found", 404);

    if (auth.user.role !== "admin" && patient.createdBy !== auth.user.id) {
      return err("Access denied", 403);
    }

    const symptoms = patient.profileEntries
      .filter((e) => e.category === "symptom")
      .map((e) => e.value);
    const conditions = patient.profileEntries
      .filter((e) => e.category === "existing_condition")
      .map((e) => e.value);
    const allergies = patient.profileEntries
      .filter((e) => e.category === "allergy")
      .map((e) => e.value);
    const medications = patient.profileEntries
      .filter((e) => e.category === "medication")
      .map((e) => {
        const parts = e.notes?.split(" | ") ?? [];
        return { name: e.value, dose: parts[0], frequency: parts[1] };
      });

    const { summaryText, modelVersion, usedFallback } = await generateSummary({
      patientName: patient.name,
      age: patient.age,
      sex: patient.sex,
      symptoms,
      conditions,
      allergies,
      medications,
      labResults: patient.labResults.map((lr) => ({
        testName: lr.testName,
        value: lr.value,
        unit: lr.unit,
        flag: lr.flag,
        referenceRangeRaw: lr.referenceRangeRaw,
      })),
    });

    const reportIds = patient.reports.map((r) => r.id);

    const summary = await prisma.aISummary.create({
      data: {
        patientId,
        summaryText,
        modelVersion,
        source: "ai-generated",
        basedOnReportIds: reportIds,
        disclaimerShown: true,
      },
    });

    await logAudit({
      patientId,
      actorId: auth.user.id,
      action: "generate_summary",
      entityType: "AISummary",
      entityId: summary.id,
      details: { modelVersion, usedFallback },
    });

    return ok({ ...summary, usedFallback }, 201);
  } catch (e) {
    return serverErr(e);
  }
}

// GET /api/summaries?patientId= — get latest summary for a patient
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const patientId = req.nextUrl.searchParams.get("patientId");
  if (!patientId) return err("patientId is required");

  try {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return err("Patient not found", 404);
    if (auth.user.role !== "admin" && patient.createdBy !== auth.user.id) {
      return err("Access denied", 403);
    }

    const summary = await prisma.aISummary.findFirst({
      where: { patientId },
      orderBy: { generatedAt: "desc" },
    });

    return ok(summary);
  } catch (e) {
    return serverErr(e);
  }
}
