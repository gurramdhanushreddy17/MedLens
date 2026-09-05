import { describe, it, expect } from "vitest";
import {
  computeFlag,
  isQualitative,
  flagLabel,
  flagColorClass,
  flagBgClass,
} from "../lib/referenceRangeFlag";
import { detectInconsistencies, type LabResultWithReport } from "../lib/conflictDetection";

describe("Clinical Laboratory Edge Cases & Rule Engine", () => {
  describe("computeFlag with critical and boundary values", () => {
    it("flags critical high potassium (> 6.0 mEq/L)", () => {
      const result = computeFlag("6.8", 3.5, 5.0);
      expect(result.flag).toBe("high");
      expect(result.reason).toContain("6.8 > reference high (5)");
    });

    it("flags critical low glucose (< 55 mg/dL)", () => {
      const result = computeFlag("42", 70, 99);
      expect(result.flag).toBe("low");
      expect(result.reason).toContain("42 < reference low (70)");
    });

    it("flags values right at the boundary as normal", () => {
      expect(computeFlag("70", 70, 99).flag).toBe("normal");
      expect(computeFlag("99", 70, 99).flag).toBe("normal");
    });

    it("parses numbers formatted with commas (e.g. Platelets 150,000)", () => {
      const normalPlatelets = computeFlag("250,000", 150000, 450000);
      expect(normalPlatelets.flag).toBe("normal");

      const lowPlatelets = computeFlag("85,000", 150000, 450000);
      expect(lowPlatelets.flag).toBe("low");
    });

    it("returns unknown flag for qualitative results", () => {
      const pos = computeFlag("Positive", 0, 1);
      expect(pos.flag).toBe("unknown");
      expect(pos.reason).toContain("Qualitative result");
    });

    it("returns unknown flag when no reference range exists in source document", () => {
      const res = computeFlag("14.2", null, null);
      expect(res.flag).toBe("unknown");
      expect(res.reason).toContain("No reference range provided in source document");
    });
  });

  describe("isQualitative clinical pattern detector", () => {
    it("recognizes positive and reactive medical terms", () => {
      expect(isQualitative("Positive")).toBe(true);
      expect(isQualitative("reactive")).toBe(true);
      expect(isQualitative("Detected")).toBe(true);
      expect(isQualitative("Abnormal")).toBe(true);
    });

    it("recognizes negative and normal medical terms", () => {
      expect(isQualitative("Negative")).toBe(true);
      expect(isQualitative("non-reactive")).toBe(true);
      expect(isQualitative("Not Detected")).toBe(true);
      expect(isQualitative("Normal")).toBe(true);
    });

    it("returns false for numeric values", () => {
      expect(isQualitative("14.5")).toBe(false);
      expect(isQualitative("120/80")).toBe(false);
    });
  });

  describe("flag UI display helpers", () => {
    it("returns appropriate human-readable labels", () => {
      expect(flagLabel("low")).toBe("Low");
      expect(flagLabel("high")).toBe("High");
      expect(flagLabel("normal")).toBe("Normal");
      expect(flagLabel("unknown")).toBe("No range provided");
    });

    it("returns correct color classes", () => {
      expect(flagColorClass("low")).toBe("text-flag-low");
      expect(flagColorClass("high")).toBe("text-flag-high");
      expect(flagColorClass("normal")).toBe("text-flag-normal");
      expect(flagColorClass("unknown")).toBe("text-ink/40");
    });

    it("returns correct background and border classes", () => {
      expect(flagBgClass("low")).toContain("bg-flag-low/10");
      expect(flagBgClass("high")).toContain("bg-flag-high/10");
      expect(flagBgClass("normal")).toContain("bg-flag-normal/10");
      expect(flagBgClass("unknown")).toContain("bg-ink/5");
    });
  });

  describe("detectInconsistencies advanced clinical rules", () => {
    it("detects value conflict when identical test has different values on the same date", () => {
      const results: LabResultWithReport[] = [
        {
          id: "r1",
          testName: "Glucose Fasting",
          value: "60",
          flag: "low",
          report: { reportDate: new Date("2025-05-10T08:00:00Z") },
        },
        {
          id: "r2",
          testName: "Glucose Fasting",
          value: "140",
          flag: "high",
          report: { reportDate: new Date("2025-05-10T14:00:00Z") },
        },
      ];

      const conflicts = detectInconsistencies(results);
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts.some((c) => c.type === "value_conflict")).toBe(true);
      expect(conflicts[0].relatedLabResultIds).toContain("r1");
      expect(conflicts[0].relatedLabResultIds).toContain("r2");
    });

    it("does not report conflict for consistent normal readings across time", () => {
      const results: LabResultWithReport[] = [
        {
          id: "r1",
          testName: "Creatinine",
          value: "0.9",
          flag: "normal",
          report: { reportDate: new Date("2025-01-10T00:00:00Z") },
        },
        {
          id: "r2",
          testName: "Creatinine",
          value: "1.0",
          flag: "normal",
          report: { reportDate: new Date("2025-04-10T00:00:00Z") },
        },
      ];

      const conflicts = detectInconsistencies(results);
      expect(conflicts.length).toBe(0);
    });
  });
});
