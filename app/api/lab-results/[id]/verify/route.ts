import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { LabResultVerifySchema } from "@/lib/schemas";
import { computeFlag } from "@/lib/referenceRangeFlag";
import { logAudit } from "@/lib/audit";
import { ok, err, zodErr, serverErr } from "@/lib/api";

interface Params {
  params: { id: string };
}

// PATCH /api/lab-results/[id]/verify — clinician verifies/edits/rejects a lab result
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("Request body must be valid JSON");
  }

  const parsed = LabResultVerifySchema.safeParse(body);
  if (!parsed.success) return zodErr(parsed.error);

  try {
    const labResult = await prisma.labResult.findUnique({
      where: { id: params.id },
      include: { patient: true },
    });

    if (!labResult) return err("Lab result not found", 404);

    const lr = labResult as typeof labResult & { patient: { createdBy: string } };
    if (auth.user.role !== "admin" && lr.patient.createdBy !== auth.user.id) {
      return err("Access denied", 403);
    }

    const { action, ...editFields } = parsed.data;

    if (action === "reject") {
      // Mark as needs_review, unverify
      const updated = await prisma.labResult.update({
        where: { id: params.id },
        data: {
          verifiedByClinician: false,
          verifiedBy: null,
          verifiedAt: null,
        },
      });

      await logAudit({
        patientId: labResult.patientId,
        actorId: auth.user.id,
        action: "reject_lab_result",
        entityType: "LabResult",
        entityId: params.id,
        details: { testName: labResult.testName },
      });

      return ok(updated);
    }

    // For verify or edit: compute updated flag if values changed
    const newValue = editFields.testName !== undefined ? (editFields as { value?: string }).value ?? labResult.value : labResult.value;
    const newRefLow =
      editFields.referenceRangeLow !== undefined
        ? editFields.referenceRangeLow
        : labResult.referenceRangeLow;
    const newRefHigh =
      editFields.referenceRangeHigh !== undefined
        ? editFields.referenceRangeHigh
        : labResult.referenceRangeHigh;

    const flagResult = computeFlag(newValue, newRefLow ?? null, newRefHigh ?? null);
    const computedFlag = editFields.flag ?? flagResult.flag;

    const updated = await prisma.labResult.update({
      where: { id: params.id },
      data: {
        ...(editFields.testName && { testName: editFields.testName }),
        ...((editFields as { value?: string }).value && { value: (editFields as { value?: string }).value }),
        ...(editFields.unit !== undefined && { unit: editFields.unit }),
        ...(editFields.referenceRangeLow !== undefined && {
          referenceRangeLow: editFields.referenceRangeLow,
        }),
        ...(editFields.referenceRangeHigh !== undefined && {
          referenceRangeHigh: editFields.referenceRangeHigh,
        }),
        ...(editFields.referenceRangeRaw !== undefined && {
          referenceRangeRaw: editFields.referenceRangeRaw,
        }),
        ...(editFields.observationNote !== undefined && {
          observationNote: editFields.observationNote,
        }),
        flag: computedFlag,
        verifiedByClinician: true,
        verifiedBy: auth.user.id,
        verifiedAt: new Date(),
      },
    });

    await logAudit({
      patientId: labResult.patientId,
      actorId: auth.user.id,
      action: action === "edit" ? "edit_and_verify_lab_result" : "verify_lab_result",
      entityType: "LabResult",
      entityId: params.id,
      details: { testName: updated.testName, flag: updated.flag, action },
    });

    return ok(updated);
  } catch (e) {
    return serverErr(e);
  }
}
