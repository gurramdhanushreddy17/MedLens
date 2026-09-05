import { describe, it, expect } from "vitest";
import {
  computeFlag,
  isQualitative,
  flagLabel,
} from "../lib/referenceRangeFlag";

describe("computeFlag", () => {
  // Numeric — high
  it("flags high when value exceeds referenceRangeHigh", () => {
    expect(computeFlag("142", 70, 99).flag).toBe("high");
  });

  it("flags high when value is exactly at referenceRangeHigh boundary + 1", () => {
    expect(computeFlag("101", null, 100).flag).toBe("high");
  });

  // Numeric — low
  it("flags low when value is below referenceRangeLow", () => {
    expect(computeFlag("42", 50, null).flag).toBe("low");
  });

  it("flags low for value below both bounds", () => {
    expect(computeFlag("3.2", 3.5, 5.0).flag).toBe("low");
  });

  // Numeric — normal
  it("flags normal when value is within range", () => {
    expect(computeFlag("0.9", 0.6, 1.1).flag).toBe("normal");
  });

  it("flags normal when value equals lower bound exactly", () => {
    expect(computeFlag("0.6", 0.6, 1.1).flag).toBe("normal");
  });

  it("flags normal when value equals upper bound exactly", () => {
    expect(computeFlag("1.1", 0.6, 1.1).flag).toBe("normal");
  });

  // Missing range → unknown (NEVER fabricate)
  it("returns unknown when both range values are null", () => {
    const result = computeFlag("4.8", null, null);
    expect(result.flag).toBe("unknown");
    expect(result.reason).toContain("No reference range");
  });

  it("returns unknown for one-sided missing range where value is ambiguous", () => {
    // Only high bound given, value is within it
    expect(computeFlag("88", null, 100).flag).toBe("normal");
  });

  // Qualitative → unknown (distinct handling, not numeric casting)
  it("returns unknown for Positive (qualitative)", () => {
    expect(computeFlag("Positive", null, null).flag).toBe("unknown");
  });

  it("returns unknown for Negative (qualitative)", () => {
    expect(computeFlag("Negative", 0, 0).flag).toBe("unknown");
  });

  it("returns unknown for Reactive (qualitative)", () => {
    expect(computeFlag("Reactive", null, null).flag).toBe("unknown");
  });

  it("returns unknown for Non-Reactive (qualitative)", () => {
    expect(computeFlag("Non-Reactive", null, null).flag).toBe("unknown");
  });

  it("returns unknown for Detected (qualitative)", () => {
    expect(computeFlag("Detected", null, null).flag).toBe("unknown");
  });

  // Non-numeric, non-qualitative → unknown
  it("returns unknown for non-numeric text that is not qualitative", () => {
    expect(computeFlag("Pending", null, null).flag).toBe("unknown");
  });

  it("returns unknown for empty string", () => {
    expect(computeFlag("", null, null).flag).toBe("unknown");
  });

  // Comma-formatted numbers
  it("handles comma-formatted numeric values", () => {
    expect(computeFlag("1,200", 1000, 1500).flag).toBe("normal");
  });

  // Decimals
  it("handles decimal values correctly", () => {
    expect(computeFlag("7.8", 4.0, 5.6).flag).toBe("high");
    expect(computeFlag("5.0", 4.0, 5.6).flag).toBe("normal");
  });
});

describe("isQualitative", () => {
  it("identifies Positive as qualitative", () => {
    expect(isQualitative("Positive")).toBe(true);
  });

  it("identifies Negative as qualitative", () => {
    expect(isQualitative("Negative")).toBe(true);
  });

  it("identifies Reactive as qualitative", () => {
    expect(isQualitative("Reactive")).toBe(true);
  });

  it("identifies Non-reactive as qualitative (case insensitive)", () => {
    expect(isQualitative("non-reactive")).toBe(true);
  });

  it("does not flag a numeric value as qualitative", () => {
    expect(isQualitative("142")).toBe(false);
  });

  it("does not flag an arbitrary string as qualitative", () => {
    expect(isQualitative("Borderline")).toBe(false);
  });
});

describe("flagLabel", () => {
  it("returns correct label for high", () => {
    expect(flagLabel("high")).toBe("High");
  });

  it("returns correct label for low", () => {
    expect(flagLabel("low")).toBe("Low");
  });

  it("returns correct label for normal", () => {
    expect(flagLabel("normal")).toBe("Normal");
  });

  it("returns 'No range provided' for unknown", () => {
    expect(flagLabel("unknown")).toBe("No range provided");
  });
});
