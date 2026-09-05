import { describe, it, expect } from "vitest";
import { cleanJsonText, hasDiagnosticLanguage, buildFallbackSummary } from "../lib/gemini";

describe("cleanJsonText", () => {
  it("removes markdown code fences from JSON output", () => {
    const raw = "```json\n[{\"test_name\": \"Glucose\", \"value\": \"100\"}]\n```";
    expect(cleanJsonText(raw)).toBe("[{\"test_name\": \"Glucose\", \"value\": \"100\"}]");
  });

  it("handles code fences without json label", () => {
    const raw = "```\n{\"status\": \"ok\"}\n```";
    expect(cleanJsonText(raw)).toBe("{\"status\": \"ok\"}");
  });

  it("leaves clean JSON string untouched", () => {
    const raw = "{\"patientId\": \"123\"}";
    expect(cleanJsonText(raw)).toBe(raw);
  });
});

describe("hasDiagnosticLanguage", () => {
  it("detects forbidden diagnostic and prescriptive phrases", () => {
    expect(hasDiagnosticLanguage("You have severe anemia.")).toBe(true);
    expect(hasDiagnosticLanguage("This suggests acute infection.")).toBe(true);
    expect(hasDiagnosticLanguage("You should stop taking your medication.")).toBe(true);
    expect(hasDiagnosticLanguage("I recommend starting antibiotics.")).toBe(true);
    expect(hasDiagnosticLanguage("Consult your doctor about changing dose.")).toBe(true);
    expect(hasDiagnosticLanguage("Diagnosed with diabetes.")).toBe(true);
  });

  it("passes safe, neutral and descriptive summaries", () => {
    expect(
      hasDiagnosticLanguage(
        "The patient record contains 3 lab results. Glucose is flagged high at 145 mg/dL."
      )
    ).toBe(false);

    expect(
      hasDiagnosticLanguage(
        "Current medications listed include Lisinopril. No known allergies are recorded."
      )
    ).toBe(false);
  });
});

describe("buildFallbackSummary", () => {
  it("generates structured neutral summary with legal disclaimer", () => {
    const summary = buildFallbackSummary({
      patientName: "Robert Taylor",
      age: 58,
      sex: "Male",
      symptoms: ["Shortness of breath"],
      conditions: ["Asthma"],
      medications: [{ name: "Albuterol" }],
      allergies: ["Pollen"],
      labResults: [
        {
          testName: "WBC",
          value: "12.5",
          unit: "10^3/uL",
          flag: "high",
          referenceRangeRaw: "4.0 - 11.0",
        },
      ],
    });

    expect(summary).toContain("Robert Taylor");
    expect(summary).toContain("Shortness of breath");
    expect(summary).toContain("Asthma");
    expect(summary).toContain("Albuterol");
    const bodyWithoutDisclaimer = summary.replace(
      "This summary is for informational purposes only and organizes existing record data. It is not a medical diagnosis. Please consult a qualified healthcare professional.",
      ""
    );
    expect(hasDiagnosticLanguage(bodyWithoutDisclaimer)).toBe(false);
  });
});
