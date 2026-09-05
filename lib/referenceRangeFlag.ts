/**
 * Pure, unit-tested reference-range flagging function.
 * Never fabricates a range. Never uses external medical knowledge.
 */

export type Flag = "low" | "normal" | "high" | "unknown";

export interface FlagResult {
  flag: Flag;
  reason: string;
}

const QUALITATIVE_POSITIVE_PATTERNS = [
  /^positive$/i,
  /^reactive$/i,
  /^detected$/i,
  /^present$/i,
  /^abnormal$/i,
];

const QUALITATIVE_NEGATIVE_PATTERNS = [
  /^negative$/i,
  /^non-reactive$/i,
  /^non reactive$/i,
  /^not detected$/i,
  /^absent$/i,
  /^normal$/i,
];

/**
 * Determines whether a value is qualitative (non-numeric text like Positive/Negative).
 */
export function isQualitative(value: string): boolean {
  const trimmed = value.trim();
  return (
    QUALITATIVE_POSITIVE_PATTERNS.some((p) => p.test(trimmed)) ||
    QUALITATIVE_NEGATIVE_PATTERNS.some((p) => p.test(trimmed))
  );
}

/**
 * Computes the flag for a lab result.
 *
 * Rules:
 * - If value is qualitative, return unknown (qualitative results need clinical interpretation)
 * - If numeric range is present AND value is numeric → compare and return low/normal/high
 * - If no range is present → return unknown (NEVER fabricate a range)
 * - If value is non-numeric and not qualitative → return unknown
 */
export function computeFlag(
  value: string,
  referenceRangeLow: number | null,
  referenceRangeHigh: number | null
): FlagResult {
  const trimmed = value.trim();

  // Qualitative results: distinct handling path, not numeric casting
  if (isQualitative(trimmed)) {
    return {
      flag: "unknown",
      reason: "Qualitative result — flag not applicable for positive/negative values",
    };
  }

  // Try to parse numeric value
  const numericStr = trimmed.replace(/[,\s]/g, "");
  const numericValue = parseFloat(numericStr);
  const isNumeric = !isNaN(numericValue) && isFinite(numericValue);

  if (!isNumeric) {
    return {
      flag: "unknown",
      reason: "Non-numeric value — cannot compute range-based flag",
    };
  }

  // No range provided in source document — NEVER fabricate
  if (referenceRangeLow === null && referenceRangeHigh === null) {
    return {
      flag: "unknown",
      reason: "No reference range provided in source document",
    };
  }

  // Range comparison
  if (referenceRangeLow !== null && numericValue < referenceRangeLow) {
    return { flag: "low", reason: `${numericValue} < reference low (${referenceRangeLow})` };
  }

  if (referenceRangeHigh !== null && numericValue > referenceRangeHigh) {
    return { flag: "high", reason: `${numericValue} > reference high (${referenceRangeHigh})` };
  }

  return {
    flag: "normal",
    reason: `${numericValue} within reference range (${referenceRangeLow ?? "—"} – ${referenceRangeHigh ?? "—"})`,
  };
}

/**
 * Human-readable description of a flag for UI display.
 */
export function flagLabel(flag: Flag): string {
  switch (flag) {
    case "low":
      return "Low";
    case "high":
      return "High";
    case "normal":
      return "Normal";
    case "unknown":
      return "No range provided";
  }
}

/**
 * Tailwind CSS class name for the flag dot color.
 */
export function flagColorClass(flag: Flag): string {
  switch (flag) {
    case "low":
      return "text-flag-low";
    case "high":
      return "text-flag-high";
    case "normal":
      return "text-flag-normal";
    case "unknown":
      return "text-ink/40";
  }
}

/**
 * Tailwind CSS class name for flag background.
 */
export function flagBgClass(flag: Flag): string {
  switch (flag) {
    case "low":
      return "bg-flag-low/10 border-flag-low/30";
    case "high":
      return "bg-flag-high/10 border-flag-high/30";
    case "normal":
      return "bg-flag-normal/10 border-flag-normal/30";
    case "unknown":
      return "bg-ink/5 border-ink/10";
  }
}
