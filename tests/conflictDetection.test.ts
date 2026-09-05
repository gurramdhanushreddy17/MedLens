import { describe, it, expect } from "vitest";
import { detectInconsistencies } from "../lib/conflictDetection";

// Minimal shape that detectInconsistencies accepts
function makeResult(overrides: {
  id: string;
  testName: string;
  value: string;
  flag?: string;
  reportDate?: Date | null;
  reportId?: string;
}) {
  return {
    id: overrides.id,
    testName: overrides.testName,
    value: overrides.value,
    flag: overrides.flag ?? "normal",
    report: {
      reportDate: overrides.reportDate ?? new Date("2025-01-15"),
    },
    reportId: overrides.reportId ?? "report-a",
  };
}

describe("detectInconsistencies", () => {
  it("returns empty array when no results", () => {
    expect(detectInconsistencies([])).toHaveLength(0);
  });

  it("returns empty array for a single result", () => {
    const results = [makeResult({ id: "r1", testName: "Glucose", value: "100" })];
    expect(detectInconsistencies(results)).toHaveLength(0);
  });

  it("detects value_conflict for same test, same date, different values", () => {
    const results = [
      makeResult({ id: "r1", testName: "LDL Cholesterol", value: "88", flag: "normal", reportDate: new Date("2025-02-10"), reportId: "rpt-a" }),
      makeResult({ id: "r2", testName: "LDL Cholesterol", value: "112", flag: "high", reportDate: new Date("2025-02-10"), reportId: "rpt-b" }),
    ];
    const flags = detectInconsistencies(results);
    expect(flags).toHaveLength(1);
    expect(flags[0].type).toBe("value_conflict");
    expect(flags[0].relatedLabResultIds).toContain("r1");
    expect(flags[0].relatedLabResultIds).toContain("r2");
  });

  it("detects duplicate_test for same test, same date, same value from different reports", () => {
    const results = [
      makeResult({ id: "r1", testName: "Creatinine", value: "0.9", reportDate: new Date("2025-03-01"), reportId: "rpt-a" }),
      makeResult({ id: "r2", testName: "Creatinine", value: "0.9", reportDate: new Date("2025-03-01"), reportId: "rpt-b" }),
    ];
    const flags = detectInconsistencies(results);
    expect(flags).toHaveLength(1);
    expect(flags[0].type).toBe("duplicate_test");
  });

  it("does not flag same test on different dates", () => {
    const results = [
      makeResult({ id: "r1", testName: "Glucose", value: "142", reportDate: new Date("2025-01-15") }),
      makeResult({ id: "r2", testName: "Glucose", value: "128", reportDate: new Date("2025-03-20") }),
    ];
    expect(detectInconsistencies(results)).toHaveLength(0);
  });

  it("does not cross-contaminate different test names", () => {
    const results = [
      makeResult({ id: "r1", testName: "Glucose", value: "142", reportDate: new Date("2025-01-15") }),
      makeResult({ id: "r2", testName: "HbA1c", value: "7.8", reportDate: new Date("2025-01-15") }),
    ];
    expect(detectInconsistencies(results)).toHaveLength(0);
  });

  it("deduplicates flags — same pair of results produces only one flag", () => {
    const r1 = makeResult({ id: "r1", testName: "LDL Cholesterol", value: "88", reportDate: new Date("2025-02-10"), reportId: "rpt-a" });
    const r2 = makeResult({ id: "r2", testName: "LDL Cholesterol", value: "112", reportDate: new Date("2025-02-10"), reportId: "rpt-b" });
    // Pass them twice — deduplication should still give 1 flag
    const flags = detectInconsistencies([r1, r2, r1, r2]);
    const valueConflicts = flags.filter(f => f.type === "value_conflict");
    expect(valueConflicts).toHaveLength(1);
  });

  it("handles tests with null report dates gracefully (skips comparison)", () => {
    const results = [
      makeResult({ id: "r1", testName: "Glucose", value: "100", reportDate: null }),
      makeResult({ id: "r2", testName: "Glucose", value: "200", reportDate: null }),
    ];
    // No date means no comparison possible — should not throw
    expect(() => detectInconsistencies(results)).not.toThrow();
  });

  it("detects value_conflict within 7-day window with different flags", () => {
    const results = [
      makeResult({ id: "r1", testName: "Hemoglobin", value: "9.5", flag: "low", reportDate: new Date("2025-01-10") }),
      makeResult({ id: "r2", testName: "Hemoglobin", value: "13.2", flag: "normal", reportDate: new Date("2025-01-14") }),
    ];
    const flags = detectInconsistencies(results);
    const conflicts = flags.filter(f => f.type === "value_conflict");
    expect(conflicts.length).toBeGreaterThan(0);
  });
});
