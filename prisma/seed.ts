import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DISCLAIMER =
  "This summary is for informational purposes only and organizes existing record data. It is not a medical diagnosis. Please consult a qualified healthcare professional.";

async function main() {
  console.log("🌱  Seeding MedLens demo data…");

  // ── Users ──────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("Admin2025!", 12);
  const clinicianHash = await bcrypt.hash("MedLens2025!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@medlens.dev" },
    update: {},
    create: {
      name: "Dr. Admin",
      email: "admin@medlens.dev",
      passwordHash: adminHash,
      role: "admin",
    },
  });

  const clinician = await prisma.user.upsert({
    where: { email: "dr.chen@medlens.dev" },
    update: {},
    create: {
      name: "Dr. Wei Chen",
      email: "dr.chen@medlens.dev",
      passwordHash: clinicianHash,
      role: "clinician",
    },
  });

  console.log("  ✓ Users created");

  // ── Patient 1: Sarah Mitchell ──────────────────────────────────────────────
  const patient1 = await prisma.patient.create({
    data: {
      name: "Sarah Mitchell",
      age: 47,
      sex: "Female",
      dateOfBirth: new Date("1977-03-14"),
      contactInfo: "sarah.mitchell@email.com · 555-0142",
      createdBy: clinician.id,
      profileEntries: {
        create: [
          { category: "symptom", value: "Fatigue", source: "user-entered", enteredBy: clinician.id },
          { category: "symptom", value: "Increased thirst", source: "user-entered", enteredBy: clinician.id },
          { category: "symptom", value: "Frequent urination", source: "user-entered", enteredBy: clinician.id },
          { category: "existing_condition", value: "Type 2 diabetes mellitus", source: "user-entered", enteredBy: clinician.id },
          { category: "existing_condition", value: "Hypertension", source: "user-entered", enteredBy: clinician.id },
          { category: "allergy", value: "Penicillin", notes: "Causes rash and hives", source: "user-entered", enteredBy: clinician.id },
          { category: "allergy", value: "Sulfonamides", source: "user-entered", enteredBy: clinician.id },
          { category: "medication", value: "Metformin", notes: "500 mg | Twice daily with meals", source: "user-entered", enteredBy: clinician.id },
          { category: "medication", value: "Lisinopril", notes: "10 mg | Once daily", source: "user-entered", enteredBy: clinician.id },
          { category: "medication", value: "Atorvastatin", notes: "20 mg | At bedtime", source: "user-entered", enteredBy: clinician.id },
        ],
      },
    },
  });

  // Report 1A — with full reference ranges (Jan)
  const report1a = await prisma.medicalReport.create({
    data: {
      patientId: patient1.id,
      filePath: "/uploads/demo-report-1a.pdf",
      fileType: "application/pdf",
      originalFilename: "CBC_Metabolic_Panel_Jan2025.pdf",
      reportDate: new Date("2025-01-15"),
      uploadedBy: clinician.id,
      processingStatus: "processed",
      rawExtractedText: "PATIENT: Sarah Mitchell DOB: 03/14/1977\nLAB REPORT - COMPREHENSIVE METABOLIC PANEL\nDate: 01/15/2025\n\nGlucose: 142 mg/dL  Reference: 70-99 mg/dL  HIGH\nHbA1c: 7.8 %  Reference: 4.0-5.6 %  HIGH\nCreatinine: 0.9 mg/dL  Reference: 0.6-1.1 mg/dL  Normal\nSodium: 138 mEq/L  Reference: 136-145 mEq/L  Normal\nPotassium: 4.1 mEq/L  Reference: 3.5-5.0 mEq/L  Normal\nTotal Cholesterol: 218 mg/dL  Reference: <200 mg/dL  HIGH\nLDL: 145 mg/dL  Reference: <100 mg/dL  HIGH\nHDL: 42 mg/dL  Reference: >50 mg/dL  LOW\nTriglycerides: 210 mg/dL  Reference: <150 mg/dL  HIGH",
    },
  });

  const labResults1a = await prisma.labResult.createMany({
    data: [
      { reportId: report1a.id, patientId: patient1.id, testName: "Glucose", value: "142", unit: "mg/dL", referenceRangeLow: 70, referenceRangeHigh: 99, referenceRangeRaw: "70-99 mg/dL", flag: "high", source: "ai-extracted", confidence: 0.97, verifiedByClinician: true, verifiedBy: clinician.id, verifiedAt: new Date("2025-01-16") },
      { reportId: report1a.id, patientId: patient1.id, testName: "HbA1c", value: "7.8", unit: "%", referenceRangeLow: 4.0, referenceRangeHigh: 5.6, referenceRangeRaw: "4.0-5.6 %", flag: "high", source: "ai-extracted", confidence: 0.98, verifiedByClinician: true, verifiedBy: clinician.id, verifiedAt: new Date("2025-01-16") },
      { reportId: report1a.id, patientId: patient1.id, testName: "Creatinine", value: "0.9", unit: "mg/dL", referenceRangeLow: 0.6, referenceRangeHigh: 1.1, referenceRangeRaw: "0.6-1.1 mg/dL", flag: "normal", source: "ai-extracted", confidence: 0.96, verifiedByClinician: true, verifiedBy: clinician.id, verifiedAt: new Date("2025-01-16") },
      { reportId: report1a.id, patientId: patient1.id, testName: "Sodium", value: "138", unit: "mEq/L", referenceRangeLow: 136, referenceRangeHigh: 145, referenceRangeRaw: "136-145 mEq/L", flag: "normal", source: "ai-extracted", confidence: 0.95, verifiedByClinician: false },
      { reportId: report1a.id, patientId: patient1.id, testName: "Total Cholesterol", value: "218", unit: "mg/dL", referenceRangeLow: null, referenceRangeHigh: 200, referenceRangeRaw: "<200 mg/dL", flag: "high", source: "ai-extracted", confidence: 0.94, verifiedByClinician: false },
      { reportId: report1a.id, patientId: patient1.id, testName: "LDL Cholesterol", value: "145", unit: "mg/dL", referenceRangeLow: null, referenceRangeHigh: 100, referenceRangeRaw: "<100 mg/dL", flag: "high", source: "ai-extracted", confidence: 0.93, verifiedByClinician: false },
      { reportId: report1a.id, patientId: patient1.id, testName: "HDL Cholesterol", value: "42", unit: "mg/dL", referenceRangeLow: 50, referenceRangeHigh: null, referenceRangeRaw: ">50 mg/dL", flag: "low", source: "ai-extracted", confidence: 0.92, verifiedByClinician: false },
      { reportId: report1a.id, patientId: patient1.id, testName: "Triglycerides", value: "210", unit: "mg/dL", referenceRangeLow: null, referenceRangeHigh: 150, referenceRangeRaw: "<150 mg/dL", flag: "high", source: "ai-extracted", confidence: 0.95, verifiedByClinician: false },
    ],
  });

  // Report 1B — March follow-up (demonstrating trends)
  const report1b = await prisma.medicalReport.create({
    data: {
      patientId: patient1.id,
      filePath: "/uploads/demo-report-1b.pdf",
      fileType: "application/pdf",
      originalFilename: "Metabolic_Panel_Mar2025.pdf",
      reportDate: new Date("2025-03-20"),
      uploadedBy: clinician.id,
      processingStatus: "processed",
      rawExtractedText: "PATIENT: Sarah Mitchell\nDate: 03/20/2025\n\nGlucose: 128 mg/dL  Reference: 70-99 mg/dL  HIGH\nHbA1c: 7.2 %  Reference: 4.0-5.6 %  HIGH\nCreatinine: 1.0 mg/dL  Reference: 0.6-1.1 mg/dL  Normal\nTotal Cholesterol: 195 mg/dL  Reference: <200 mg/dL  Normal",
    },
  });

  await prisma.labResult.createMany({
    data: [
      { reportId: report1b.id, patientId: patient1.id, testName: "Glucose", value: "128", unit: "mg/dL", referenceRangeLow: 70, referenceRangeHigh: 99, referenceRangeRaw: "70-99 mg/dL", flag: "high", source: "ai-extracted", confidence: 0.96, verifiedByClinician: false },
      { reportId: report1b.id, patientId: patient1.id, testName: "HbA1c", value: "7.2", unit: "%", referenceRangeLow: 4.0, referenceRangeHigh: 5.6, referenceRangeRaw: "4.0-5.6 %", flag: "high", source: "ai-extracted", confidence: 0.97, verifiedByClinician: false },
      { reportId: report1b.id, patientId: patient1.id, testName: "Creatinine", value: "1.0", unit: "mg/dL", referenceRangeLow: 0.6, referenceRangeHigh: 1.1, referenceRangeRaw: "0.6-1.1 mg/dL", flag: "normal", source: "ai-extracted", confidence: 0.95, verifiedByClinician: false },
      { reportId: report1b.id, patientId: patient1.id, testName: "Total Cholesterol", value: "195", unit: "mg/dL", referenceRangeLow: null, referenceRangeHigh: 200, referenceRangeRaw: "<200 mg/dL", flag: "normal", source: "ai-extracted", confidence: 0.94, verifiedByClinician: false },
    ],
  });

  // Report 1C — missing reference ranges demo
  const report1c = await prisma.medicalReport.create({
    data: {
      patientId: patient1.id,
      filePath: "/uploads/demo-report-1c.pdf",
      fileType: "application/pdf",
      originalFilename: "Thyroid_Panel_Apr2025.pdf",
      reportDate: new Date("2025-04-05"),
      uploadedBy: clinician.id,
      processingStatus: "needs_review",
      rawExtractedText: "Thyroid Panel - Sarah Mitchell\n04/05/2025\nTSH: 4.8 mIU/L\nFree T4: 0.9 ng/dL\nNote: Reference ranges not included in this report printout.",
    },
  });

  await prisma.labResult.createMany({
    data: [
      // No reference ranges — flag must be "unknown"
      { reportId: report1c.id, patientId: patient1.id, testName: "TSH", value: "4.8", unit: "mIU/L", referenceRangeLow: null, referenceRangeHigh: null, referenceRangeRaw: null, flag: "unknown", observationNote: "Reference range not provided in source document", source: "ai-extracted", confidence: 0.88, verifiedByClinician: false },
      { reportId: report1c.id, patientId: patient1.id, testName: "Free T4", value: "0.9", unit: "ng/dL", referenceRangeLow: null, referenceRangeHigh: null, referenceRangeRaw: null, flag: "unknown", observationNote: "Reference range not provided in source document", source: "ai-extracted", confidence: 0.85, verifiedByClinician: false },
    ],
  });

  // AI Summary for patient 1
  const allReportIds1 = [report1a.id, report1b.id, report1c.id];
  await prisma.aISummary.create({
    data: {
      patientId: patient1.id,
      summaryText: `The record for Sarah Mitchell (47 years old, Female) currently includes the following information. Reported symptoms include fatigue, increased thirst, and frequent urination. Existing conditions on record include Type 2 diabetes mellitus and hypertension. Current medications listed include Metformin, Lisinopril, and Atorvastatin. Allergies noted include Penicillin and Sulfonamides. 14 lab results across three reports are on record. The following results are flagged outside normal range from the January and March panels: Glucose (flagged high), HbA1c (flagged high), Total Cholesterol (flagged high in January, normal in March), LDL Cholesterol (flagged high), HDL Cholesterol (flagged low), and Triglycerides (flagged high). TSH and Free T4 values from April have no reference range provided in the source document. ${DISCLAIMER}`,
      modelVersion: "gemini-2.5-flash",
      source: "ai-generated",
      basedOnReportIds: allReportIds1,
      disclaimerShown: true,
    },
  });

  // Audit logs for patient 1
  await prisma.auditLog.createMany({
    data: [
      { patientId: patient1.id, actorId: clinician.id, action: "create_patient", entityType: "Patient", entityId: patient1.id, timestamp: new Date("2025-01-14"), details: { name: "Sarah Mitchell" } },
      { patientId: patient1.id, actorId: clinician.id, action: "upload_report", entityType: "MedicalReport", entityId: report1a.id, timestamp: new Date("2025-01-15"), details: { filename: "CBC_Metabolic_Panel_Jan2025.pdf" } },
      { patientId: patient1.id, actorId: clinician.id, action: "process_report", entityType: "MedicalReport", entityId: report1a.id, timestamp: new Date("2025-01-15"), details: { labResultCount: 8, status: "processed" } },
      { patientId: patient1.id, actorId: clinician.id, action: "verify_lab_result", entityType: "LabResult", entityId: "auto", timestamp: new Date("2025-01-16"), details: { testName: "Glucose", flag: "high" } },
      { patientId: patient1.id, actorId: clinician.id, action: "upload_report", entityType: "MedicalReport", entityId: report1b.id, timestamp: new Date("2025-03-20"), details: { filename: "Metabolic_Panel_Mar2025.pdf" } },
      { patientId: patient1.id, actorId: clinician.id, action: "upload_report", entityType: "MedicalReport", entityId: report1c.id, timestamp: new Date("2025-04-05"), details: { filename: "Thyroid_Panel_Apr2025.pdf" } },
      { patientId: patient1.id, actorId: clinician.id, action: "generate_summary", entityType: "AISummary", entityId: "auto", timestamp: new Date("2025-04-05"), details: { modelVersion: "claude-opus-4-5-20250514" } },
    ],
  });

  console.log("  ✓ Patient 1 (Sarah Mitchell) created with 3 reports, 14 lab results, 1 summary");

  // ── Patient 2: James Okafor — with intentional inconsistency ─────────────
  const patient2 = await prisma.patient.create({
    data: {
      name: "James Okafor",
      age: 62,
      sex: "Male",
      dateOfBirth: new Date("1963-08-22"),
      contactInfo: "555-0187",
      createdBy: clinician.id,
      profileEntries: {
        create: [
          { category: "symptom", value: "Chest tightness", source: "user-entered", enteredBy: clinician.id },
          { category: "symptom", value: "Shortness of breath on exertion", source: "user-entered", enteredBy: clinician.id },
          { category: "existing_condition", value: "Coronary artery disease", source: "user-entered", enteredBy: clinician.id },
          { category: "existing_condition", value: "Hyperlipidemia", source: "user-entered", enteredBy: clinician.id },
          { category: "allergy", value: "No known allergies", notes: "Explicitly confirmed by patient/clinician", source: "user-entered", enteredBy: clinician.id },
          { category: "medication", value: "Aspirin", notes: "81 mg | Once daily", source: "user-entered", enteredBy: clinician.id },
          { category: "medication", value: "Rosuvastatin", notes: "40 mg | At bedtime", source: "user-entered", enteredBy: clinician.id },
          { category: "medication", value: "Metoprolol", notes: "50 mg | Twice daily", source: "user-entered", enteredBy: clinician.id },
        ],
      },
    },
  });

  const report2a = await prisma.medicalReport.create({
    data: {
      patientId: patient2.id,
      filePath: "/uploads/demo-report-2a.pdf",
      fileType: "application/pdf",
      originalFilename: "Lipid_Panel_LabCorp_Feb2025.pdf",
      reportDate: new Date("2025-02-10"),
      uploadedBy: clinician.id,
      processingStatus: "processed",
      rawExtractedText: "Patient: James Okafor | DOB: 08/22/1963\nLipid Panel - LabCorp - 02/10/2025\nLDL Cholesterol: 88 mg/dL Ref: <100 mg/dL NORMAL\nHDL Cholesterol: 51 mg/dL Ref: >40 mg/dL NORMAL\nTriglycerides: 135 mg/dL Ref: <150 mg/dL NORMAL\nTotal Cholesterol: 165 mg/dL Ref: <200 mg/dL NORMAL",
    },
  });

  await prisma.labResult.createMany({
    data: [
      { reportId: report2a.id, patientId: patient2.id, testName: "LDL Cholesterol", value: "88", unit: "mg/dL", referenceRangeLow: null, referenceRangeHigh: 100, referenceRangeRaw: "<100 mg/dL", flag: "normal", source: "ai-extracted", confidence: 0.96, verifiedByClinician: false },
      { reportId: report2a.id, patientId: patient2.id, testName: "HDL Cholesterol", value: "51", unit: "mg/dL", referenceRangeLow: 40, referenceRangeHigh: null, referenceRangeRaw: ">40 mg/dL", flag: "normal", source: "ai-extracted", confidence: 0.95, verifiedByClinician: false },
      { reportId: report2a.id, patientId: patient2.id, testName: "Triglycerides", value: "135", unit: "mg/dL", referenceRangeLow: null, referenceRangeHigh: 150, referenceRangeRaw: "<150 mg/dL", flag: "normal", source: "ai-extracted", confidence: 0.94, verifiedByClinician: false },
    ],
  });

  // Report 2B — same date, conflicting LDL value (intentional inconsistency)
  const report2b = await prisma.medicalReport.create({
    data: {
      patientId: patient2.id,
      filePath: "/uploads/demo-report-2b.pdf",
      fileType: "application/pdf",
      originalFilename: "Lipid_Panel_QuestDx_Feb2025.pdf",
      reportDate: new Date("2025-02-10"),
      uploadedBy: clinician.id,
      processingStatus: "processed",
      rawExtractedText: "Patient: James Okafor\nQuest Diagnostics - 02/10/2025\nLDL: 112 mg/dL Ref: <100 mg/dL HIGH",
    },
  });

  const lr2b = await prisma.labResult.create({
    data: {
      reportId: report2b.id,
      patientId: patient2.id,
      testName: "LDL Cholesterol",
      value: "112",
      unit: "mg/dL",
      referenceRangeLow: null,
      referenceRangeHigh: 100,
      referenceRangeRaw: "<100 mg/dL",
      flag: "high",
      source: "ai-extracted",
      confidence: 0.91,
      verifiedByClinician: false,
    },
  });

  // Get the first LDL result from report 2a for conflict
  const lr2a = await prisma.labResult.findFirst({
    where: { reportId: report2a.id, testName: "LDL Cholesterol" },
  });

  // Create inconsistency flag — value conflict
  await prisma.inconsistencyFlag.create({
    data: {
      patientId: patient2.id,
      type: "value_conflict",
      description: `"LDL Cholesterol" has 2 results on 2025-02-10 with different values: 88 mg/dL (LabCorp, Normal) vs. 112 mg/dL (Quest Diagnostics, High). Please verify which result is correct and from which laboratory.`,
      relatedLabResultIds: [lr2a?.id ?? "", lr2b.id].filter(Boolean),
      resolved: false,
    },
  });

  // Clarification question for James
  await prisma.patientProfileEntry.create({
    data: {
      patientId: patient2.id,
      category: "other",
      value: "The February 10 lipid panel was drawn at LabCorp as part of the annual wellness visit.",
      notes: `Clarification answer for: "There are two LDL results from the same date but from different laboratories — can you confirm which one was the primary test ordered by the treating physician?"`,
      source: "user-entered",
      enteredBy: clinician.id,
    },
  });

  await prisma.aISummary.create({
    data: {
      patientId: patient2.id,
      summaryText: `The record for James Okafor (62 years old, Male) currently includes the following information. Reported symptoms include chest tightness and shortness of breath on exertion. Existing conditions on record include coronary artery disease and hyperlipidemia. Current medications listed include Aspirin, Rosuvastatin, and Metoprolol. No known allergies have been confirmed. 4 lab results across two lipid panels are on record from February 2025. An inconsistency has been flagged: LDL Cholesterol shows different values (88 mg/dL and 112 mg/dL) from two reports on the same date from different laboratories — one flagged normal and one flagged high. ${DISCLAIMER}`,
      modelVersion: "gemini-2.5-flash",
      source: "ai-generated",
      basedOnReportIds: [report2a.id, report2b.id],
      disclaimerShown: true,
    },
  });

  await prisma.auditLog.createMany({
    data: [
      { patientId: patient2.id, actorId: clinician.id, action: "create_patient", entityType: "Patient", entityId: patient2.id, timestamp: new Date("2025-02-08"), details: { name: "James Okafor" } },
      { patientId: patient2.id, actorId: clinician.id, action: "upload_report", entityType: "MedicalReport", entityId: report2a.id, timestamp: new Date("2025-02-11"), details: { filename: "Lipid_Panel_LabCorp_Feb2025.pdf" } },
      { patientId: patient2.id, actorId: clinician.id, action: "upload_report", entityType: "MedicalReport", entityId: report2b.id, timestamp: new Date("2025-02-11"), details: { filename: "Lipid_Panel_QuestDx_Feb2025.pdf" } },
      { patientId: patient2.id, actorId: clinician.id, action: "generate_summary", entityType: "AISummary", entityId: "auto", timestamp: new Date("2025-02-12"), details: {} },
    ],
  });

  console.log("  ✓ Patient 2 (James Okafor) created with inconsistency flag");

  // ── Patient 3: Elena Vasquez — qualitative results + incomplete ────────────
  const patient3 = await prisma.patient.create({
    data: {
      name: "Elena Vasquez",
      age: 34,
      sex: "Female",
      dateOfBirth: new Date("1990-11-30"),
      contactInfo: "elena.v@email.com",
      createdBy: admin.id,
      profileEntries: {
        create: [
          { category: "symptom", value: "Pelvic pain", source: "user-entered", enteredBy: admin.id },
          { category: "symptom", value: "Irregular menstrual cycle", source: "user-entered", enteredBy: admin.id },
          { category: "existing_condition", value: "Polycystic ovary syndrome (PCOS)", source: "user-entered", enteredBy: admin.id },
          { category: "allergy", value: "No known allergies", notes: "Explicitly confirmed", source: "user-entered", enteredBy: admin.id },
          { category: "medication", value: "Inositol", notes: "2 g | Daily", source: "user-entered", enteredBy: admin.id },
        ],
      },
    },
  });

  const report3a = await prisma.medicalReport.create({
    data: {
      patientId: patient3.id,
      filePath: "/uploads/demo-report-3a.pdf",
      fileType: "application/pdf",
      originalFilename: "Hormone_Infectious_Panel_Mar2025.pdf",
      reportDate: new Date("2025-03-05"),
      uploadedBy: admin.id,
      processingStatus: "needs_review",
      rawExtractedText: "Elena Vasquez DOB 11/30/1990\nPanel Date: 03/05/2025\n\nFSH: 6.2 mIU/mL\nLH: 8.4 mIU/mL\nEstradiol: 112 pg/mL\nProgesterone: 0.8 ng/mL\nHIV Antibody: Negative\nHepatitis B Surface Antigen: Negative\nRubella IgG: Reactive",
    },
  });

  await prisma.labResult.createMany({
    data: [
      // No reference ranges for hormones — flag must be unknown
      { reportId: report3a.id, patientId: patient3.id, testName: "FSH", value: "6.2", unit: "mIU/mL", referenceRangeLow: null, referenceRangeHigh: null, referenceRangeRaw: null, flag: "unknown", observationNote: "Reference range not provided in source document", source: "ai-extracted", confidence: 0.87, verifiedByClinician: false },
      { reportId: report3a.id, patientId: patient3.id, testName: "LH", value: "8.4", unit: "mIU/mL", referenceRangeLow: null, referenceRangeHigh: null, referenceRangeRaw: null, flag: "unknown", observationNote: "Reference range not provided in source document", source: "ai-extracted", confidence: 0.86, verifiedByClinician: false },
      { reportId: report3a.id, patientId: patient3.id, testName: "Estradiol", value: "112", unit: "pg/mL", referenceRangeLow: null, referenceRangeHigh: null, referenceRangeRaw: null, flag: "unknown", observationNote: "Reference range not provided in source document", source: "ai-extracted", confidence: 0.85, verifiedByClinician: false },
      { reportId: report3a.id, patientId: patient3.id, testName: "Progesterone", value: "0.8", unit: "ng/mL", referenceRangeLow: null, referenceRangeHigh: null, referenceRangeRaw: null, flag: "unknown", observationNote: "Reference range not provided in source document", source: "ai-extracted", confidence: 0.84, verifiedByClinician: false },
      // Qualitative results — must use distinct handling (flag = unknown)
      { reportId: report3a.id, patientId: patient3.id, testName: "HIV Antibody", value: "Negative", unit: null, referenceRangeLow: null, referenceRangeHigh: null, referenceRangeRaw: null, flag: "unknown", observationNote: "Qualitative result — Negative", source: "ai-extracted", confidence: 0.99, verifiedByClinician: false },
      { reportId: report3a.id, patientId: patient3.id, testName: "Hepatitis B Surface Antigen", value: "Negative", unit: null, referenceRangeLow: null, referenceRangeHigh: null, referenceRangeRaw: null, flag: "unknown", observationNote: "Qualitative result — Negative", source: "ai-extracted", confidence: 0.99, verifiedByClinician: false },
      { reportId: report3a.id, patientId: patient3.id, testName: "Rubella IgG", value: "Reactive", unit: null, referenceRangeLow: null, referenceRangeHigh: null, referenceRangeRaw: null, flag: "unknown", observationNote: "Qualitative result — Reactive (immune)", source: "ai-extracted", confidence: 0.97, verifiedByClinician: false },
    ],
  });

  await prisma.aISummary.create({
    data: {
      patientId: patient3.id,
      summaryText: `The record for Elena Vasquez (34 years old, Female) currently includes the following information. Reported symptoms include pelvic pain and irregular menstrual cycle. Existing conditions on record include polycystic ovary syndrome (PCOS). Current medications listed include Inositol. No known allergies have been confirmed. 7 lab results from a hormone and infectious panel dated March 5, 2025 are on record. Hormone values for FSH, LH, Estradiol, and Progesterone have no reference ranges provided in the source document and are marked accordingly. Qualitative results for HIV Antibody and Hepatitis B Surface Antigen are Negative; Rubella IgG is Reactive. Qualitative results have no applicable numeric flag. ${DISCLAIMER}`,
      modelVersion: "gemini-2.5-flash",
      source: "ai-generated",
      basedOnReportIds: [report3a.id],
      disclaimerShown: true,
    },
  });

  await prisma.auditLog.createMany({
    data: [
      { patientId: patient3.id, actorId: admin.id, action: "create_patient", entityType: "Patient", entityId: patient3.id, timestamp: new Date("2025-03-04"), details: { name: "Elena Vasquez" } },
      { patientId: patient3.id, actorId: admin.id, action: "upload_report", entityType: "MedicalReport", entityId: report3a.id, timestamp: new Date("2025-03-05"), details: { filename: "Hormone_Infectious_Panel_Mar2025.pdf" } },
      { patientId: patient3.id, actorId: admin.id, action: "generate_summary", entityType: "AISummary", entityId: "auto", timestamp: new Date("2025-03-06"), details: {} },
    ],
  });

  // ── Patient 4: Harsha Teja ────────────────────────────────────────────────
  const existingHarsha = await prisma.patient.findFirst({ where: { name: "Harsha Teja" } });
  if (!existingHarsha) {
    const harsha = await prisma.patient.create({
      data: {
        name: "Harsha Teja",
        age: 32,
        sex: "Male",
        dateOfBirth: new Date("1993-06-18"),
        contactInfo: "harsha.teja@clinical.dev · +91 98480 22334",
        createdBy: admin.id,
        profileEntries: {
          create: [
            { category: "symptom", value: "Occasional dizziness after workout", source: "user-entered", enteredBy: admin.id },
            { category: "symptom", value: "Mild afternoon fatigue", source: "user-entered", enteredBy: admin.id },
            { category: "existing_condition", value: "Pre-hypertension", source: "user-entered", enteredBy: admin.id },
            { category: "allergy", value: "No known allergies", source: "user-entered", enteredBy: admin.id },
            { category: "medication", value: "Vitamin D3", notes: "60,000 IU | Weekly once", source: "user-entered", enteredBy: admin.id },
            { category: "medication", value: "Omega-3", notes: "1000 mg | Daily after dinner", source: "user-entered", enteredBy: admin.id },
          ],
        },
      },
    });

    const harshaRep1 = await prisma.medicalReport.create({
      data: {
        patientId: harsha.id,
        filePath: "/uploads/harsha-lipid-jan2025.pdf",
        fileType: "application/pdf",
        originalFilename: "Lipid_Profile_Jan2025.pdf",
        reportDate: new Date("2025-01-10"),
        uploadedBy: admin.id,
        processingStatus: "processed",
        rawExtractedText: "PATIENT: Harsha Teja\nTotal Cholesterol: 215 mg/dL (<200)\nLDL: 138 mg/dL (<100)\nHDL: 48 mg/dL (>40)\nTriglycerides: 165 mg/dL (<150)",
      },
    });

    await prisma.labResult.createMany({
      data: [
        { reportId: harshaRep1.id, patientId: harsha.id, testName: "Total Cholesterol", value: "215", unit: "mg/dL", referenceRangeLow: null, referenceRangeHigh: 200, referenceRangeRaw: "<200 mg/dL", flag: "high", source: "ai-extracted", confidence: 0.98, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2025-01-11") },
        { reportId: harshaRep1.id, patientId: harsha.id, testName: "LDL Cholesterol", value: "138", unit: "mg/dL", referenceRangeLow: null, referenceRangeHigh: 100, referenceRangeRaw: "<100 mg/dL", flag: "high", source: "ai-extracted", confidence: 0.97, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2025-01-11") },
        { reportId: harshaRep1.id, patientId: harsha.id, testName: "HDL Cholesterol", value: "48", unit: "mg/dL", referenceRangeLow: 40, referenceRangeHigh: null, referenceRangeRaw: ">40 mg/dL", flag: "normal", source: "ai-extracted", confidence: 0.96, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2025-01-11") },
        { reportId: harshaRep1.id, patientId: harsha.id, testName: "Triglycerides", value: "165", unit: "mg/dL", referenceRangeLow: null, referenceRangeHigh: 150, referenceRangeRaw: "<150 mg/dL", flag: "high", source: "ai-extracted", confidence: 0.95, verifiedByClinician: false },
      ],
    });

    const harshaRep2 = await prisma.medicalReport.create({
      data: {
        patientId: harsha.id,
        filePath: "/uploads/harsha-lipid-feb2025.pdf",
        fileType: "application/pdf",
        originalFilename: "Lipid_Profile_Feb2025.pdf",
        reportDate: new Date("2025-02-25"),
        uploadedBy: admin.id,
        processingStatus: "processed",
        rawExtractedText: "PATIENT: Harsha Teja\nTotal Cholesterol: 195 mg/dL (<200)\nLDL: 118 mg/dL (<100)\nHDL: 52 mg/dL (>40)\nTriglycerides: 142 mg/dL (<150)",
      },
    });

    await prisma.labResult.createMany({
      data: [
        { reportId: harshaRep2.id, patientId: harsha.id, testName: "Total Cholesterol", value: "195", unit: "mg/dL", referenceRangeLow: null, referenceRangeHigh: 200, referenceRangeRaw: "<200 mg/dL", flag: "normal", source: "ai-extracted", confidence: 0.98, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2025-02-26") },
        { reportId: harshaRep2.id, patientId: harsha.id, testName: "LDL Cholesterol", value: "118", unit: "mg/dL", referenceRangeLow: null, referenceRangeHigh: 100, referenceRangeRaw: "<100 mg/dL", flag: "high", source: "ai-extracted", confidence: 0.96, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2025-02-26") },
        { reportId: harshaRep2.id, patientId: harsha.id, testName: "HDL Cholesterol", value: "52", unit: "mg/dL", referenceRangeLow: 40, referenceRangeHigh: null, referenceRangeRaw: ">40 mg/dL", flag: "normal", source: "ai-extracted", confidence: 0.97, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2025-02-26") },
        { reportId: harshaRep2.id, patientId: harsha.id, testName: "Triglycerides", value: "142", unit: "mg/dL", referenceRangeLow: null, referenceRangeHigh: 150, referenceRangeRaw: "<150 mg/dL", flag: "normal", source: "ai-extracted", confidence: 0.95, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2025-02-26") },
      ],
    });

    await prisma.aISummary.create({
      data: {
        patientId: harsha.id,
        summaryText: `Harsha Teja is a 32-year-old male with pre-hypertension and mild dyslipidemia. Longitudinal trend analysis shows rapid improvement: Total Cholesterol decreased from 215 mg/dL to 195 mg/dL (normalized), LDL reduced from 138 to 118 mg/dL, and Triglycerides improved to 142 mg/dL. HDL is healthy at 52 mg/dL. ${DISCLAIMER}`,
        modelVersion: "gemini-2.5-flash",
        source: "ai-generated",
        disclaimerShown: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        patientId: harsha.id,
        actorId: admin.id,
        action: "create_patient",
        entityType: "Patient",
        entityId: harsha.id,
        timestamp: new Date("2025-01-10"),
        details: { patientName: "Harsha Teja" },
      },
    });
  }

  // ── Patient 5: Emmanuel ───────────────────────────────────────────────────
  const existingEmmanuel = await prisma.patient.findFirst({ where: { name: "Emmanuel" } });
  if (!existingEmmanuel) {
    const emmanuel = await prisma.patient.create({
      data: {
        name: "Emmanuel",
        age: 41,
        sex: "Male",
        dateOfBirth: new Date("1984-11-04"),
        contactInfo: "emmanuel.k@healthnet.org · +1 (555) 789-2314",
        createdBy: admin.id,
        profileEntries: {
          create: [
            { category: "symptom", value: "Lower back soreness", source: "user-entered", enteredBy: admin.id },
            { category: "existing_condition", value: "Hyperuricemia", source: "user-entered", enteredBy: admin.id },
            { category: "existing_condition", value: "Lumbar Disc Bulge", source: "user-entered", enteredBy: admin.id },
            { category: "allergy", value: "Ibuprofen", notes: "Severe stomach cramps", source: "user-entered", enteredBy: admin.id },
            { category: "medication", value: "Febuxostat", notes: "40 mg | Daily morning", source: "user-entered", enteredBy: admin.id },
          ],
        },
      },
    });

    const emmRep1 = await prisma.medicalReport.create({
      data: {
        patientId: emmanuel.id,
        filePath: "/uploads/emmanuel-renal-dec2024.pdf",
        fileType: "application/pdf",
        originalFilename: "Renal_Metabolic_Dec2024.pdf",
        reportDate: new Date("2024-12-14"),
        uploadedBy: admin.id,
        processingStatus: "processed",
        rawExtractedText: "PATIENT: Emmanuel\nUric Acid: 8.4 mg/dL (3.5-7.2)\nSerum Creatinine: 1.1 mg/dL (0.7-1.3)\nBUN: 18 mg/dL (7-20)",
      },
    });

    await prisma.labResult.createMany({
      data: [
        { reportId: emmRep1.id, patientId: emmanuel.id, testName: "Uric Acid", value: "8.4", unit: "mg/dL", referenceRangeLow: 3.5, referenceRangeHigh: 7.2, referenceRangeRaw: "3.5-7.2 mg/dL", flag: "high", source: "ai-extracted", confidence: 0.98, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2024-12-15") },
        { reportId: emmRep1.id, patientId: emmanuel.id, testName: "Serum Creatinine", value: "1.1", unit: "mg/dL", referenceRangeLow: 0.7, referenceRangeHigh: 1.3, referenceRangeRaw: "0.7-1.3 mg/dL", flag: "normal", source: "ai-extracted", confidence: 0.97, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2024-12-15") },
        { reportId: emmRep1.id, patientId: emmanuel.id, testName: "Blood Urea Nitrogen", value: "18", unit: "mg/dL", referenceRangeLow: 7, referenceRangeHigh: 20, referenceRangeRaw: "7-20 mg/dL", flag: "normal", source: "ai-extracted", confidence: 0.96, verifiedByClinician: false },
      ],
    });

    const emmRep2 = await prisma.medicalReport.create({
      data: {
        patientId: emmanuel.id,
        filePath: "/uploads/emmanuel-renal-feb2025.pdf",
        fileType: "application/pdf",
        originalFilename: "Renal_Metabolic_Feb2025.pdf",
        reportDate: new Date("2025-02-18"),
        uploadedBy: admin.id,
        processingStatus: "processed",
        rawExtractedText: "PATIENT: Emmanuel\nUric Acid: 6.1 mg/dL (3.5-7.2)\nSerum Creatinine: 1.0 mg/dL (0.7-1.3)\nBUN: 16 mg/dL (7-20)",
      },
    });

    await prisma.labResult.createMany({
      data: [
        { reportId: emmRep2.id, patientId: emmanuel.id, testName: "Uric Acid", value: "6.1", unit: "mg/dL", referenceRangeLow: 3.5, referenceRangeHigh: 7.2, referenceRangeRaw: "3.5-7.2 mg/dL", flag: "normal", source: "ai-extracted", confidence: 0.99, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2025-02-19") },
        { reportId: emmRep2.id, patientId: emmanuel.id, testName: "Serum Creatinine", value: "1.0", unit: "mg/dL", referenceRangeLow: 0.7, referenceRangeHigh: 1.3, referenceRangeRaw: "0.7-1.3 mg/dL", flag: "normal", source: "ai-extracted", confidence: 0.98, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2025-02-19") },
        { reportId: emmRep2.id, patientId: emmanuel.id, testName: "Blood Urea Nitrogen", value: "16", unit: "mg/dL", referenceRangeLow: 7, referenceRangeHigh: 20, referenceRangeRaw: "7-20 mg/dL", flag: "normal", source: "ai-extracted", confidence: 0.97, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2025-02-19") },
      ],
    });

    await prisma.aISummary.create({
      data: {
        patientId: emmanuel.id,
        summaryText: `Emmanuel (41-year-old male) demonstrates normalized uric acid levels dropping from 8.4 mg/dL to 6.1 mg/dL on Febuxostat therapy. Renal markers remain completely stable with Creatinine at 1.0 mg/dL. Strict avoidance of Ibuprofen is maintained due to reported hypersensitivity. ${DISCLAIMER}`,
        modelVersion: "gemini-2.5-flash",
        source: "ai-generated",
        disclaimerShown: true,
      },
    });
  }

  // ── Patient 6: Raju ───────────────────────────────────────────────────────
  const existingRaju = await prisma.patient.findFirst({ where: { name: "Raju" } });
  if (!existingRaju) {
    const raju = await prisma.patient.create({
      data: {
        name: "Raju",
        age: 55,
        sex: "Male",
        dateOfBirth: new Date("1970-08-22"),
        contactInfo: "raju.verma@apexmed.in · +91 97110 55421",
        createdBy: admin.id,
        profileEntries: {
          create: [
            { category: "symptom", value: "Mild shortness of breath on stairs", source: "user-entered", enteredBy: admin.id },
            { category: "existing_condition", value: "Hypertension Stage 2", source: "user-entered", enteredBy: admin.id },
            { category: "existing_condition", value: "Coronary Artery Disease", source: "user-entered", enteredBy: admin.id },
            { category: "allergy", value: "Aspirin (Bronchospasm)", source: "user-entered", enteredBy: admin.id },
            { category: "medication", value: "Clopidogrel", notes: "75 mg | Daily", source: "user-entered", enteredBy: admin.id },
            { category: "medication", value: "Telmisartan", notes: "40 mg | Daily morning", source: "user-entered", enteredBy: admin.id },
          ],
        },
      },
    });

    const rajuRep1 = await prisma.medicalReport.create({
      data: {
        patientId: raju.id,
        filePath: "/uploads/raju-cardiac-dec2024.pdf",
        fileType: "application/pdf",
        originalFilename: "Cardiac_Panel_Dec2024.pdf",
        reportDate: new Date("2024-12-05"),
        uploadedBy: admin.id,
        processingStatus: "processed",
        rawExtractedText: "PATIENT: Raju\nNT-proBNP: 840 pg/mL (<125)\nPotassium: 4.8 mEq/L (3.5-5.0)\nSerum Creatinine: 1.2 mg/dL (0.7-1.3)",
      },
    });

    await prisma.labResult.createMany({
      data: [
        { reportId: rajuRep1.id, patientId: raju.id, testName: "NT-proBNP", value: "840", unit: "pg/mL", referenceRangeLow: null, referenceRangeHigh: 125, referenceRangeRaw: "<125 pg/mL", flag: "high", source: "ai-extracted", confidence: 0.98, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2024-12-06") },
        { reportId: rajuRep1.id, patientId: raju.id, testName: "Potassium", value: "4.8", unit: "mEq/L", referenceRangeLow: 3.5, referenceRangeHigh: 5.0, referenceRangeRaw: "3.5-5.0 mEq/L", flag: "normal", source: "ai-extracted", confidence: 0.96, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2024-12-06") },
        { reportId: rajuRep1.id, patientId: raju.id, testName: "Serum Creatinine", value: "1.2", unit: "mg/dL", referenceRangeLow: 0.7, referenceRangeHigh: 1.3, referenceRangeRaw: "0.7-1.3 mg/dL", flag: "normal", source: "ai-extracted", confidence: 0.95, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2024-12-06") },
      ],
    });

    const rajuRep2 = await prisma.medicalReport.create({
      data: {
        patientId: raju.id,
        filePath: "/uploads/raju-cardiac-feb2025.pdf",
        fileType: "application/pdf",
        originalFilename: "Cardiac_Panel_Feb2025.pdf",
        reportDate: new Date("2025-02-12"),
        uploadedBy: admin.id,
        processingStatus: "processed",
        rawExtractedText: "PATIENT: Raju\nNT-proBNP: 410 pg/mL (<125)\nPotassium: 4.4 mEq/L (3.5-5.0)\nSerum Creatinine: 1.1 mg/dL (0.7-1.3)",
      },
    });

    await prisma.labResult.createMany({
      data: [
        { reportId: rajuRep2.id, patientId: raju.id, testName: "NT-proBNP", value: "410", unit: "pg/mL", referenceRangeLow: null, referenceRangeHigh: 125, referenceRangeRaw: "<125 pg/mL", flag: "high", source: "ai-extracted", confidence: 0.99, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2025-02-13") },
        { reportId: rajuRep2.id, patientId: raju.id, testName: "Potassium", value: "4.4", unit: "mEq/L", referenceRangeLow: 3.5, referenceRangeHigh: 5.0, referenceRangeRaw: "3.5-5.0 mEq/L", flag: "normal", source: "ai-extracted", confidence: 0.97, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2025-02-13") },
        { reportId: rajuRep2.id, patientId: raju.id, testName: "Serum Creatinine", value: "1.1", unit: "mg/dL", referenceRangeLow: 0.7, referenceRangeHigh: 1.3, referenceRangeRaw: "0.7-1.3 mg/dL", flag: "normal", source: "ai-extracted", confidence: 0.98, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2025-02-13") },
      ],
    });

    await prisma.aISummary.create({
      data: {
        patientId: raju.id,
        summaryText: `Raju (55 years old, male) shows notable cardiovascular improvement following pharmacological therapy. Cardiac biomarker NT-proBNP has decreased significantly from 840 pg/mL to 410 pg/mL, indicating improved ventricular wall stress. Serum Potassium is balanced at 4.4 mEq/L and renal function is preserved. ${DISCLAIMER}`,
        modelVersion: "gemini-2.5-flash",
        source: "ai-generated",
        disclaimerShown: true,
      },
    });
  }

  // ── Patient 7: Lakshmi ────────────────────────────────────────────────────
  const existingLakshmi = await prisma.patient.findFirst({ where: { name: "Lakshmi" } });
  if (!existingLakshmi) {
    const lakshmi = await prisma.patient.create({
      data: {
        name: "Lakshmi",
        age: 48,
        sex: "Female",
        dateOfBirth: new Date("1977-12-09"),
        contactInfo: "lakshmi.devi@healthcare.org · +91 94401 88992",
        createdBy: admin.id,
        profileEntries: {
          create: [
            { category: "symptom", value: "Cold sensitivity and lethargy", source: "user-entered", enteredBy: admin.id },
            { category: "existing_condition", value: "Primary Hypothyroidism", source: "user-entered", enteredBy: admin.id },
            { category: "allergy", value: "Sulfa drugs", notes: "Skin rash", source: "user-entered", enteredBy: admin.id },
            { category: "medication", value: "Levothyroxine", notes: "75 mcg | Early morning empty stomach", source: "user-entered", enteredBy: admin.id },
          ],
        },
      },
    });

    const lakshmiRep1 = await prisma.medicalReport.create({
      data: {
        patientId: lakshmi.id,
        filePath: "/uploads/lakshmi-thyroid-nov2024.pdf",
        fileType: "application/pdf",
        originalFilename: "Thyroid_Panel_Nov2024.pdf",
        reportDate: new Date("2024-11-20"),
        uploadedBy: admin.id,
        processingStatus: "processed",
        rawExtractedText: "PATIENT: Lakshmi\nTSH: 9.4 uIU/mL (0.4-4.2) HIGH\nFree T4: 0.72 ng/dL (0.8-1.8) LOW\nFree T3: 2.1 pg/mL (2.3-4.2) LOW",
      },
    });

    await prisma.labResult.createMany({
      data: [
        { reportId: lakshmiRep1.id, patientId: lakshmi.id, testName: "TSH", value: "9.4", unit: "uIU/mL", referenceRangeLow: 0.4, referenceRangeHigh: 4.2, referenceRangeRaw: "0.4-4.2 uIU/mL", flag: "high", source: "ai-extracted", confidence: 0.98, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2024-11-21") },
        { reportId: lakshmiRep1.id, patientId: lakshmi.id, testName: "Free T4", value: "0.72", unit: "ng/dL", referenceRangeLow: 0.8, referenceRangeHigh: 1.8, referenceRangeRaw: "0.8-1.8 ng/dL", flag: "low", source: "ai-extracted", confidence: 0.97, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2024-11-21") },
        { reportId: lakshmiRep1.id, patientId: lakshmi.id, testName: "Free T3", value: "2.1", unit: "pg/mL", referenceRangeLow: 2.3, referenceRangeHigh: 4.2, referenceRangeRaw: "2.3-4.2 pg/mL", flag: "low", source: "ai-extracted", confidence: 0.95, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2024-11-21") },
      ],
    });

    const lakshmiRep2 = await prisma.medicalReport.create({
      data: {
        patientId: lakshmi.id,
        filePath: "/uploads/lakshmi-thyroid-jan2025.pdf",
        fileType: "application/pdf",
        originalFilename: "Thyroid_Panel_Jan2025.pdf",
        reportDate: new Date("2025-01-28"),
        uploadedBy: admin.id,
        processingStatus: "processed",
        rawExtractedText: "PATIENT: Lakshmi\nTSH: 2.8 uIU/mL (0.4-4.2) Normal\nFree T4: 1.25 ng/dL (0.8-1.8) Normal\nFree T3: 3.1 pg/mL (2.3-4.2) Normal",
      },
    });

    await prisma.labResult.createMany({
      data: [
        { reportId: lakshmiRep2.id, patientId: lakshmi.id, testName: "TSH", value: "2.8", unit: "uIU/mL", referenceRangeLow: 0.4, referenceRangeHigh: 4.2, referenceRangeRaw: "0.4-4.2 uIU/mL", flag: "normal", source: "ai-extracted", confidence: 0.99, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2025-01-29") },
        { reportId: lakshmiRep2.id, patientId: lakshmi.id, testName: "Free T4", value: "1.25", unit: "ng/dL", referenceRangeLow: 0.8, referenceRangeHigh: 1.8, referenceRangeRaw: "0.8-1.8 ng/dL", flag: "normal", source: "ai-extracted", confidence: 0.98, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2025-01-29") },
        { reportId: lakshmiRep2.id, patientId: lakshmi.id, testName: "Free T3", value: "3.1", unit: "pg/mL", referenceRangeLow: 2.3, referenceRangeHigh: 4.2, referenceRangeRaw: "2.3-4.2 pg/mL", flag: "normal", source: "ai-extracted", confidence: 0.96, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2025-01-29") },
      ],
    });

    await prisma.aISummary.create({
      data: {
        patientId: lakshmi.id,
        summaryText: `Lakshmi (48-year-old female) with primary hypothyroidism shows complete biochemical normalization under Levothyroxine 75 mcg. TSH normalized from 9.4 uIU/mL down to 2.8 uIU/mL, and Free T4 reached 1.25 ng/dL. Symptoms of lethargy and cold intolerance have resolved. ${DISCLAIMER}`,
        modelVersion: "gemini-2.5-flash",
        source: "ai-generated",
        disclaimerShown: true,
      },
    });
  }

  // ── Patient 8: Shreya ─────────────────────────────────────────────────────
  const existingShreya = await prisma.patient.findFirst({ where: { name: "Shreya" } });
  if (!existingShreya) {
    const shreya = await prisma.patient.create({
      data: {
        name: "Shreya",
        age: 26,
        sex: "Female",
        dateOfBirth: new Date("1999-04-12"),
        contactInfo: "shreya.sharma@collegemed.edu · +91 91234 56789",
        createdBy: admin.id,
        profileEntries: {
          create: [
            { category: "symptom", value: "Dizziness and fatigue upon standing", source: "user-entered", enteredBy: admin.id },
            { category: "existing_condition", value: "Iron Deficiency Anemia", source: "user-entered", enteredBy: admin.id },
            { category: "allergy", value: "No known allergies", source: "user-entered", enteredBy: admin.id },
            { category: "medication", value: "Ferrous Ascorbate", notes: "100 mg elemental iron | Daily with vitamin C", source: "user-entered", enteredBy: admin.id },
          ],
        },
      },
    });

    const shreyaRep1 = await prisma.medicalReport.create({
      data: {
        patientId: shreya.id,
        filePath: "/uploads/shreya-cbc-dec2024.pdf",
        fileType: "application/pdf",
        originalFilename: "CBC_Dec2024.pdf",
        reportDate: new Date("2024-12-10"),
        uploadedBy: admin.id,
        processingStatus: "processed",
        rawExtractedText: "PATIENT: Shreya\nHemoglobin: 9.1 g/dL (12.0-15.5) LOW\nSerum Ferritin: 8.5 ng/mL (15-150) LOW\nMCV: 72 fL (80-100) LOW",
      },
    });

    await prisma.labResult.createMany({
      data: [
        { reportId: shreyaRep1.id, patientId: shreya.id, testName: "Hemoglobin", value: "9.1", unit: "g/dL", referenceRangeLow: 12.0, referenceRangeHigh: 15.5, referenceRangeRaw: "12.0-15.5 g/dL", flag: "low", source: "ai-extracted", confidence: 0.99, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2024-12-11") },
        { reportId: shreyaRep1.id, patientId: shreya.id, testName: "Serum Ferritin", value: "8.5", unit: "ng/mL", referenceRangeLow: 15, referenceRangeHigh: 150, referenceRangeRaw: "15-150 ng/mL", flag: "low", source: "ai-extracted", confidence: 0.97, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2024-12-11") },
        { reportId: shreyaRep1.id, patientId: shreya.id, testName: "MCV", value: "72", unit: "fL", referenceRangeLow: 80, referenceRangeHigh: 100, referenceRangeRaw: "80-100 fL", flag: "low", source: "ai-extracted", confidence: 0.95, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2024-12-11") },
      ],
    });

    const shreyaRep2 = await prisma.medicalReport.create({
      data: {
        patientId: shreya.id,
        filePath: "/uploads/shreya-cbc-feb2025.pdf",
        fileType: "application/pdf",
        originalFilename: "CBC_Feb2025.pdf",
        reportDate: new Date("2025-02-22"),
        uploadedBy: admin.id,
        processingStatus: "processed",
        rawExtractedText: "PATIENT: Shreya\nHemoglobin: 12.4 g/dL (12.0-15.5) Normal\nSerum Ferritin: 38.0 ng/mL (15-150) Normal\nMCV: 85 fL (80-100) Normal",
      },
    });

    await prisma.labResult.createMany({
      data: [
        { reportId: shreyaRep2.id, patientId: shreya.id, testName: "Hemoglobin", value: "12.4", unit: "g/dL", referenceRangeLow: 12.0, referenceRangeHigh: 15.5, referenceRangeRaw: "12.0-15.5 g/dL", flag: "normal", source: "ai-extracted", confidence: 0.99, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2025-02-23") },
        { reportId: shreyaRep2.id, patientId: shreya.id, testName: "Serum Ferritin", value: "38.0", unit: "ng/mL", referenceRangeLow: 15, referenceRangeHigh: 150, referenceRangeRaw: "15-150 ng/mL", flag: "normal", source: "ai-extracted", confidence: 0.98, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2025-02-23") },
        { reportId: shreyaRep2.id, patientId: shreya.id, testName: "MCV", value: "85", unit: "fL", referenceRangeLow: 80, referenceRangeHigh: 100, referenceRangeRaw: "80-100 fL", flag: "normal", source: "ai-extracted", confidence: 0.97, verifiedByClinician: true, verifiedBy: admin.id, verifiedAt: new Date("2025-02-23") },
      ],
    });

    await prisma.aISummary.create({
      data: {
        patientId: shreya.id,
        summaryText: `Shreya (26-year-old female) exhibits successful recovery from iron deficiency anemia following 10 weeks of iron supplementation. Hemoglobin normalized from 9.1 g/dL to 12.4 g/dL, Ferritin improved from 8.5 ng/mL to 38.0 ng/mL, and MCV rose from 72 fL to 85 fL. ${DISCLAIMER}`,
        modelVersion: "gemini-2.5-flash",
        source: "ai-generated",
        disclaimerShown: true,
      },
    });
  }
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
