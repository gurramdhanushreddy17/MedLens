import { describe, it, expect } from "vitest";
import { hasDiagnosticLanguage } from "../lib/gemini";
import { computeFlag } from "../lib/referenceRangeFlag";

describe("Safety & Extraction Tests", () => {
  it("detects diagnostic or prescriptive language correctly", () => {
    expect(hasDiagnosticLanguage("You have diabetes")).toBe(true);
    expect(hasDiagnosticLanguage("You should take metformin")).toBe(true);
    expect(hasDiagnosticLanguage("I recommend consulting a specialist")).toBe(true);
    expect(hasDiagnosticLanguage("The blood glucose test is 115 mg/dL, which is high.")).toBe(false);
  });

  it("computes flags correctly for extracted values", () => {
    expect(computeFlag("115", 70, 99).flag).toBe("high");
    expect(computeFlag("85", 70, 99).flag).toBe("normal");
    expect(computeFlag("55", 70, 99).flag).toBe("low");
  });
});
