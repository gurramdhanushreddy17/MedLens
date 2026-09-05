import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ReportUploadSchema } from "@/lib/schemas";
import { saveFile, validateFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";
import { ok, err, serverErr } from "@/lib/api";

// POST /api/reports — upload a medical report
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return err("Request must be multipart/form-data with a file attached");
  }

  const file = formData.get("file") as File | null;
  const patientId = formData.get("patientId") as string | null;
  const reportDateRaw = formData.get("reportDate") as string | null;

  if (!file) return err("No file was provided. Please attach a PDF or image.");
  if (!patientId) return err("Patient ID is required");

  const metaParsed = ReportUploadSchema.safeParse({
    patientId,
    reportDate: reportDateRaw || null,
  });
  if (!metaParsed.success) {
    return err("Invalid report metadata: " + metaParsed.error.message);
  }

  // Validate file type & size
  try {
    validateFile(file.name, file.type, file.size);
  } catch (e) {
    return err(e instanceof Error ? e.message : "File validation failed");
  }

  // Verify patient exists and access is allowed
  try {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return err("Patient not found", 404);
    if (auth.user.role !== "admin" && patient.createdBy !== auth.user.id) {
      return err("Access denied", 403);
    }
  } catch (e) {
    return serverErr(e);
  }

  // Save file to disk
  let savedFile: Awaited<ReturnType<typeof saveFile>>;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    savedFile = await saveFile(buffer, file.name, file.type);
  } catch (e) {
    return err(
      e instanceof Error
        ? e.message
        : "This file couldn't be saved — try re-uploading"
    );
  }

  try {
    const report = await prisma.medicalReport.create({
      data: {
        patientId,
        filePath: savedFile.filePath,
        fileType: savedFile.fileType,
        originalFilename: savedFile.originalFilename,
        reportDate: metaParsed.data.reportDate
          ? new Date(metaParsed.data.reportDate)
          : null,
        uploadedBy: auth.user.id,
        processingStatus: "pending",
      },
    });

    await logAudit({
      patientId,
      actorId: auth.user.id,
      action: "upload_report",
      entityType: "MedicalReport",
      entityId: report.id,
      details: { filename: file.name, fileType: file.type },
    });

    return ok(report, 201);
  } catch (e) {
    return serverErr(e);
  }
}

// GET /api/reports — list reports for a patient
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = req.nextUrl;
  const patientId = searchParams.get("patientId");
  if (!patientId) return err("patientId query parameter is required");

  try {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return err("Patient not found", 404);
    if (auth.user.role !== "admin" && patient.createdBy !== auth.user.id) {
      return err("Access denied", 403);
    }

    const reports = await prisma.medicalReport.findMany({
      where: { patientId },
      orderBy: { uploadedAt: "desc" },
      include: {
        labResults: {
          orderBy: { testName: "asc" },
        },
      },
    });

    return ok(reports);
  } catch (e) {
    return serverErr(e);
  }
}
