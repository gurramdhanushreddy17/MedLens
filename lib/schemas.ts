import { z } from "zod";

// ─── Source Values ────────────────────────────────────────────────────────────
export const SOURCE_VALUES = ["user-entered", "ai-extracted", "ai-generated"] as const;
export type Source = (typeof SOURCE_VALUES)[number];

// ─── Flag Values ──────────────────────────────────────────────────────────────
export const FLAG_VALUES = ["low", "normal", "high", "unknown"] as const;
export type Flag = (typeof FLAG_VALUES)[number];

// ─── Role Values ──────────────────────────────────────────────────────────────
export const ROLE_VALUES = ["clinician", "admin"] as const;
export type Role = (typeof ROLE_VALUES)[number];

// ─── Processing Status Values ─────────────────────────────────────────────────
export const PROCESSING_STATUS_VALUES = [
  "pending",
  "processing",
  "processed",
  "failed",
  "needs_review",
] as const;
export type ProcessingStatus = (typeof PROCESSING_STATUS_VALUES)[number];

// ─── Inconsistency Type Values ────────────────────────────────────────────────
export const INCONSISTENCY_TYPE_VALUES = [
  "value_conflict",
  "date_conflict",
  "missing_range",
  "duplicate_test",
] as const;

// ─── Profile Entry Category Values ───────────────────────────────────────────
export const PROFILE_CATEGORY_VALUES = [
  "symptom",
  "existing_condition",
  "allergy",
  "medication",
  "other",
] as const;

// ─── Patient Schemas ──────────────────────────────────────────────────────────
export const PatientCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  age: z.number().int().min(0).max(150),
  sex: z.string().min(1, "Sex is required").max(50),
  dateOfBirth: z.string().optional().nullable(),
  contactInfo: z.string().max(500).optional().nullable(),
});

export type PatientCreateInput = z.infer<typeof PatientCreateSchema>;

export const PatientUpdateSchema = PatientCreateSchema.partial();
export type PatientUpdateInput = z.infer<typeof PatientUpdateSchema>;

// ─── Profile Entry Schemas ────────────────────────────────────────────────────
export const ProfileEntrySchema = z.object({
  category: z.enum(PROFILE_CATEGORY_VALUES),
  value: z.string().min(1).max(500),
  notes: z.string().max(1000).optional().nullable(),
});
export type ProfileEntryInput = z.infer<typeof ProfileEntrySchema>;

export const PatientIntakeSchema = z.object({
  patient: PatientCreateSchema,
  symptoms: z.array(z.string().min(1)).default([]),
  existingConditions: z.array(z.string().min(1)).default([]),
  allergies: z
    .array(z.string().min(1))
    .default([])
    .refine(
      (a) =>
        a.length === 0 ||
        a.includes("No known allergies") ||
        a.every((s) => s.trim().length > 0),
      "Allergies must be specified or explicitly marked as none"
    ),
  noKnownAllergies: z.boolean().default(false),
  medications: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        dose: z.string().max(100).optional().nullable(),
        frequency: z.string().max(100).optional().nullable(),
      })
    )
    .default([]),
  notes: z.string().max(2000).optional().nullable(),
});
export type PatientIntakeInput = z.infer<typeof PatientIntakeSchema>;

// ─── Lab Result Schemas ───────────────────────────────────────────────────────
export const LabResultExtractedSchema = z.object({
  test_name: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().nullable(),
  reference_range_low: z.number().nullable(),
  reference_range_high: z.number().nullable(),
  reference_range_raw: z.string().nullable(),
  observation_note: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});
export type LabResultExtracted = z.infer<typeof LabResultExtractedSchema>;

export const LabResultExtractedArraySchema = z.array(LabResultExtractedSchema);

export const LabResultVerifySchema = z.object({
  action: z.enum(["verify", "edit", "reject"]),
  testName: z.string().min(1).optional(),
  value: z.string().min(1).optional(),
  unit: z.string().optional().nullable(),
  referenceRangeLow: z.number().optional().nullable(),
  referenceRangeHigh: z.number().optional().nullable(),
  referenceRangeRaw: z.string().optional().nullable(),
  observationNote: z.string().optional().nullable(),
  flag: z.enum(FLAG_VALUES).optional(),
});
export type LabResultVerifyInput = z.infer<typeof LabResultVerifySchema>;

// ─── Report Schemas ───────────────────────────────────────────────────────────
export const ReportUploadSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  reportDate: z.string().datetime({ offset: true }).optional().nullable(),
});
export type ReportUploadInput = z.infer<typeof ReportUploadSchema>;

// ─── Summary Schemas ──────────────────────────────────────────────────────────
export const SummaryGenerateSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
});
export type SummaryGenerateInput = z.infer<typeof SummaryGenerateSchema>;

// ─── Clarification Answer Schema ──────────────────────────────────────────────
export const ClarificationAnswerSchema = z.object({
  patientId: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1).max(1000),
});
export type ClarificationAnswerInput = z.infer<typeof ClarificationAnswerSchema>;

// ─── Search/Filter Schema ─────────────────────────────────────────────────────
export const LabResultFilterSchema = z.object({
  testName: z.string().optional(),
  flag: z.enum(FLAG_VALUES).optional(),
  source: z.enum(SOURCE_VALUES).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  patientId: z.string().optional(),
});
export type LabResultFilter = z.infer<typeof LabResultFilterSchema>;

export const PatientSearchSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PatientSearch = z.infer<typeof PatientSearchSchema>;
