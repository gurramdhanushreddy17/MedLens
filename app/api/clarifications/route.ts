import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ClarificationAnswerSchema } from "@/lib/schemas";
import { logAudit } from "@/lib/audit";
import { ok, err, zodErr, serverErr } from "@/lib/api";

// POST /api/clarifications — save a clinician's answer to a clarification question
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("Request body must be valid JSON");
  }

  const parsed = ClarificationAnswerSchema.safeParse(body);
  if (!parsed.success) return zodErr(parsed.error);

  const { patientId, question, answer } = parsed.data;

  try {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return err("Patient not found", 404);
    if (auth.user.role !== "admin" && patient.createdBy !== auth.user.id) {
      return err("Access denied", 403);
    }

    const entry = await prisma.patientProfileEntry.create({
      data: {
        patientId,
        category: "other",
        value: answer,
        notes: `Clarification answer for: "${question}"`,
        source: "user-entered",
        enteredBy: auth.user.id,
      },
    });

    await logAudit({
      patientId,
      actorId: auth.user.id,
      action: "answer_clarification",
      entityType: "PatientProfileEntry",
      entityId: entry.id,
      details: { question, answer },
    });

    return ok(entry, 201);
  } catch (e) {
    return serverErr(e);
  }
}
