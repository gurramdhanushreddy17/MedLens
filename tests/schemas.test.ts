import { describe, it, expect } from "vitest";
import {
  PatientCreateSchema,
  PatientUpdateSchema,
  ProfileEntrySchema,
  PatientIntakeSchema,
  LabResultExtractedSchema,
  LabResultVerifySchema,
  ReportUploadSchema,
  SummaryGenerateSchema,
  ClarificationAnswerSchema,
  LabResultFilterSchema,
  PatientSearchSchema,
  FLAG_VALUES,
  SOURCE_VALUES,
  ROLE_VALUES,
  PROCESSING_STATUS_VALUES,
} from "../lib/schemas";

describe("PatientCreateSchema", () => {
  it("validates a valid patient record", () => {
    const valid = {
      name: "John Doe",
      age: 45,
      sex: "Male",
      dateOfBirth: "1979-05-12",
      contactInfo: "555-0199",
    };
    const result = PatientCreateSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("fails when name is empty", () => {
    const result = PatientCreateSchema.safeParse({
      name: "",
      age: 45,
      sex: "Male",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Name is required");
    }
  });

  it("fails when age is negative or exceeds maximum limit", () => {
    expect(PatientCreateSchema.safeParse({ name: "A", age: -1, sex: "F" }).success).toBe(false);
    expect(PatientCreateSchema.safeParse({ name: "A", age: 151, sex: "F" }).success).toBe(false);
    expect(PatientCreateSchema.safeParse({ name: "A", age: 0, sex: "F" }).success).toBe(true);
    expect(PatientCreateSchema.safeParse({ name: "A", age: 150, sex: "F" }).success).toBe(true);
  });

  it("allows optional nullable dateOfBirth and contactInfo", () => {
    const res = PatientCreateSchema.safeParse({
      name: "Jane Smith",
      age: 30,
      sex: "Female",
      dateOfBirth: null,
      contactInfo: null,
    });
    expect(res.success).toBe(true);
  });
});

describe("PatientUpdateSchema", () => {
  it("allows partial updates", () => {
    expect(PatientUpdateSchema.safeParse({ name: "Updated Name" }).success).toBe(true);
    expect(PatientUpdateSchema.safeParse({ age: 35 }).success).toBe(true);
    expect(PatientUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("validates types on provided fields", () => {
    expect(PatientUpdateSchema.safeParse({ age: -5 }).success).toBe(false);
  });
});

describe("ProfileEntrySchema", () => {
  it("accepts valid medical profile categories", () => {
    const categories = ["symptom", "existing_condition", "allergy", "medication", "other"] as const;
    for (const category of categories) {
      const result = ProfileEntrySchema.safeParse({
        category,
        value: "Hypertension",
        notes: "Managed with lisinopril",
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid categories", () => {
    const result = ProfileEntrySchema.safeParse({
      category: "unsupported_category",
      value: "Test",
    });
    expect(result.success).toBe(false);
  });
});

describe("PatientIntakeSchema", () => {
  it("validates full intake with medications and symptoms", () => {
    const intake = {
      patient: {
        name: "Alice Johnson",
        age: 62,
        sex: "Female",
      },
      symptoms: ["Fatigue", "Dizziness"],
      existingConditions: ["Type 2 Diabetes"],
      allergies: ["Penicillin"],
      noKnownAllergies: false,
      medications: [
        { name: "Metformin", dose: "500mg", frequency: "twice daily" },
      ],
      notes: "Patient prefers morning appointments",
    };
    const result = PatientIntakeSchema.safeParse(intake);
    expect(result.success).toBe(true);
  });

  it("validates noKnownAllergies boolean flag", () => {
    const intake = {
      patient: { name: "Bob", age: 40, sex: "Male" },
      noKnownAllergies: true,
      allergies: [],
    };
    expect(PatientIntakeSchema.safeParse(intake).success).toBe(true);
  });
});

describe("LabResultExtractedSchema", () => {
  it("validates AI extracted lab test with numeric thresholds", () => {
    const extracted = {
      test_name: "Hemoglobin",
      value: "14.2",
      unit: "g/dL",
      reference_range_low: 12.0,
      reference_range_high: 16.0,
      reference_range_raw: "12.0 - 16.0 g/dL",
      observation_note: null,
      confidence: 0.95,
    };
    const result = LabResultExtractedSchema.safeParse(extracted);
    expect(result.success).toBe(true);
  });

  it("rejects confidence scores outside [0, 1]", () => {
    expect(
      LabResultExtractedSchema.safeParse({
        test_name: "Glucose",
        value: "95",
        unit: "mg/dL",
        reference_range_low: null,
        reference_range_high: null,
        reference_range_raw: null,
        observation_note: null,
        confidence: 1.5,
      }).success
    ).toBe(false);
  });
});

describe("LabResultVerifySchema", () => {
  it("allows verify, edit, and reject actions", () => {
    expect(LabResultVerifySchema.safeParse({ action: "verify" }).success).toBe(true);
    expect(LabResultVerifySchema.safeParse({ action: "reject" }).success).toBe(true);
    expect(
      LabResultVerifySchema.safeParse({
        action: "edit",
        value: "125",
        flag: "high",
      }).success
    ).toBe(true);
  });

  it("rejects unknown actions", () => {
    expect(LabResultVerifySchema.safeParse({ action: "delete" }).success).toBe(false);
  });
});

describe("PatientSearchSchema", () => {
  it("coerces string page and limit parameters to integers", () => {
    const parsed = PatientSearchSchema.parse({
      q: "Sarah",
      page: "2",
      limit: "15",
    });
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(15);
    expect(parsed.q).toBe("Sarah");
  });

  it("applies sensible defaults for empty query", () => {
    const parsed = PatientSearchSchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);
    expect(parsed.q).toBeUndefined();
  });
});

describe("Constants and Enums", () => {
  it("verifies expected medical flags and statuses", () => {
    expect(FLAG_VALUES).toContain("low");
    expect(FLAG_VALUES).toContain("normal");
    expect(FLAG_VALUES).toContain("high");
    expect(FLAG_VALUES).toContain("unknown");
    expect(SOURCE_VALUES).toContain("user-entered");
    expect(SOURCE_VALUES).toContain("ai-extracted");
    expect(ROLE_VALUES).toContain("admin");
    expect(PROCESSING_STATUS_VALUES).toContain("processed");
  });
});
