import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { readFile } from "@/lib/storage";
import {
  extractLabResultsFromBuffer,
  transcribeDocument,
  generateClarificationQuestions,
} from "@/lib/gemini";
import { computeFlag } from "@/lib/referenceRangeFlag";
import { detectInconsistencies } from "@/lib/conflictDetection";
import { logAudit } from "@/lib/audit";
import { ok, err, serverErr } from "@/lib/api";

const LOW_CONFIDENCE_THRESHOLD = 0.7;

interface Params {
  params: { id: string };
}

// POST /api/reports/[id]/process — extract text, run Gemini AI, store lab results
export async function POST(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const reportId = params.id;

  // Load report
  let report: Awaited<ReturnType<typeof prisma.medicalReport.findUnique>>;
  try {
    report = await prisma.medicalReport.findUnique({
      where: { id: reportId },
      include: { patient: true },
    });
  } catch (e) {
    return serverErr(e);
  }

  if (!report) return err("Report not found", 404);

  const reportWithPatient = report as typeof report & { patient: { createdBy: string } };
  if (
    auth.user.role !== "admin" &&
    reportWithPatient.patient.createdBy !== auth.user.id
  ) {
    return err("Access denied", 403);
  }

  if (
    report.processingStatus === "processed" ||
    report.processingStatus === "processing"
  ) {
    return err("Report has already been processed or is currently processing");
  }

  // Mark as processing
  await prisma.medicalReport.update({
    where: { id: reportId },
    data: { processingStatus: "processing" },
  });

  try {
    const fileBuffer = await readFile(report.filePath);
    const extractionMethod = `gemini-multimodal-${report.fileType.includes("pdf") ? "pdf" : "vision"}`;

    // Step 1: Extract lab results directly via Gemini multimodal vision/pdf understanding
    const extracted = await extractLabResultsFromBuffer(fileBuffer, report.fileType);

    // Step 2: Extract text transcription in background for record archiving
    const rawText = await transcribeDocument(fileBuffer, report.fileType);
    await prisma.medicalReport.update({
      where: { id: reportId },
      data: { rawExtractedText: rawText || "Multimodal document processed by Gemini." },
    });

    if (extracted.length === 0) {
      await prisma.medicalReport.update({
        where: { id: reportId },
        data: { processingStatus: "needs_review" },
      });

      return ok({
        labResults: [],
        status: "needs_review",
        message:
          "No lab results were found in this report. Please review the raw text and add results manually if needed.",
        extractionMethod,
      });
    }

    // Step 3: Determine overall status based on confidence
    const hasLowConfidence = extracted.some(
      (r) => r.confidence < LOW_CONFIDENCE_THRESHOLD
    );
    const finalStatus = hasLowConfidence ? "needs_review" : "processed";

    // Step 4: Insert lab results
    const createdResults = await Promise.all(
      extracted.map(async (e) => {
        const flagResult = computeFlag(
          e.value,
          e.reference_range_low,
          e.reference_range_high
        );

        return prisma.labResult.create({
          data: {
            reportId,
            patientId: report!.patientId,
            testName: e.test_name,
            value: e.value,
            unit: e.unit,
            referenceRangeLow: e.reference_range_low,
            referenceRangeHigh: e.reference_range_high,
            referenceRangeRaw: e.reference_range_raw,
            flag: flagResult.flag,
            observationNote: e.observation_note,
            source: "ai-extracted",
            confidence: e.confidence,
            verifiedByClinician: false,
          },
        });
      })
    );

    // Update report status
    await prisma.medicalReport.update({
      where: { id: reportId },
      data: { processingStatus: finalStatus },
    });

    // Step 5: Run conflict detection across all patient lab results
    const allLabResults = await prisma.labResult.findMany({
      where: { patientId: report.patientId },
      include: { report: true },
    });

    const detected = detectInconsistencies(allLabResults);

    // Clear old unresolved flags and insert new ones
    await prisma.inconsistencyFlag.deleteMany({
      where: { patientId: report.patientId, resolved: false },
    });

    if (detected.length > 0) {
      await prisma.inconsistencyFlag.createMany({
        data: detected.map((d) => ({
          patientId: report!.patientId,
          type: d.type,
          description: d.description,
          relatedLabResultIds: d.relatedLabResultIds,
        })),
      });
    }

    // Step 6: Generate clarification questions if needed
    let clarificationQuestions: string[] = [];
    if (hasLowConfidence || !report.reportDate) {
      const contextParts: string[] = [];
      if (!report.reportDate) {
        contextParts.push("The report does not have a collection date.");
      }
      const lowConfItems = extracted.filter(
        (r) => r.confidence < LOW_CONFIDENCE_THRESHOLD
      );
      if (lowConfItems.length > 0) {
        contextParts.push(
          `The following test results have low extraction confidence: ${lowConfItems.map((r) => r.test_name).join(", ")}.`
        );
        const missingUnits = lowConfItems.filter((r) => !r.unit);
        if (missingUnits.length > 0) {
          contextParts.push(
            `Units are missing for: ${missingUnits.map((r) => r.test_name).join(", ")}.`
          );
        }
      }

      if (contextParts.length > 0) {
        try {
          clarificationQuestions = await generateClarificationQuestions(
            contextParts.join(" ")
          );
        } catch {
          // Non-fatal — clarification questions are best-effort
        }
      }
    }

    await logAudit({
      patientId: report.patientId,
      actorId: auth.user.id,
      action: "process_report",
      entityType: "MedicalReport",
      entityId: reportId,
      details: {
        extractionMethod,
        labResultCount: createdResults.length,
        status: finalStatus,
        inconsistenciesFound: detected.length,
      },
    });

    return ok({
      labResults: createdResults,
      status: finalStatus,
      extractionMethod,
      inconsistenciesFound: detected.length,
      clarificationQuestions,
      message:
        finalStatus === "needs_review"
          ? "Report processed with some results requiring clinician review due to low confidence or missing data."
          : "Report processed successfully.",
    });
  } catch (e) {
    await prisma.medicalReport.update({
      where: { id: reportId },
      data: { processingStatus: "failed" },
    }).catch(() => {});

    const message =
      e instanceof Error ? e.message : "Report processing failed";
    return serverErr(new Error(message));
  }
}
