import { describe, it, expect } from "vitest";
import { cn, formatDate, formatDateTime, formatConfidence, titleCase } from "../lib/utils";

describe("cn (Tailwind class merger)", () => {
  it("merges class names correctly", () => {
    expect(cn("bg-white", "text-black")).toBe("bg-white text-black");
  });

  it("handles conditional falsy expressions", () => {
    expect(cn("p-4", false && "hidden", null, undefined, "m-2")).toBe("p-4 m-2");
  });

  it("resolves Tailwind conflicts cleanly", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });
});

describe("formatDate", () => {
  it("formats date strings and Date instances into readable dates", () => {
    const formatted = formatDate("2025-09-15T12:00:00Z");
    expect(formatted).toContain("Sep");
    expect(formatted).toContain("2025");
  });

  it("returns dash fallback for null or undefined", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("formats timestamp with date and time", () => {
    const formatted = formatDateTime("2025-09-15T14:30:00Z");
    expect(formatted).toContain("Sep");
    expect(formatted).toContain("2025");
  });

  it("returns dash fallback for empty values", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
  });
});

describe("formatConfidence", () => {
  it("converts 0-1 scale to percentage", () => {
    expect(formatConfidence(0.95)).toBe("95%");
    expect(formatConfidence(0.5)).toBe("50%");
    expect(formatConfidence(1.0)).toBe("100%");
    expect(formatConfidence(0)).toBe("0%");
  });
});

describe("titleCase", () => {
  it("capitalizes first letters of words", () => {
    expect(titleCase("medical record")).toBe("Medical Record");
    expect(titleCase("blood glucose level")).toBe("Blood Glucose Level");
  });
});
