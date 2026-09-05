export interface DetectedInconsistency {
  type: "value_conflict" | "date_conflict" | "missing_range" | "duplicate_test";
  description: string;
  relatedLabResultIds: string[];
}

export interface LabResultWithReport {
  id: string;
  testName: string;
  value: string;
  flag: string;
  report?: {
    reportDate: Date | null;
  } | null;
  reportId?: string;
}

/**
 * Deterministic rule-based inconsistency detection.
 * Returns an array of inconsistencies found across all lab results for a patient.
 * These are pure rule checks — no AI guessing.
 */
export function detectInconsistencies(
  labResults: LabResultWithReport[]
): DetectedInconsistency[] {
  const inconsistencies: DetectedInconsistency[] = [];

  // Group by test name (case-insensitive, trimmed)
  const grouped = new Map<string, LabResultWithReport[]>();
  for (const lr of labResults) {
    const key = lr.testName.toLowerCase().trim();
    const existing = grouped.get(key) ?? [];
    existing.push(lr);
    grouped.set(key, existing);
  }

  for (const [testName, results] of Array.from(grouped.entries())) {
    if (results.length < 2) continue;

    // Rule 1: Duplicate tests on the same date with different values
    const byDate = new Map<string, LabResultWithReport[]>();
    for (const lr of results) {
      const dateVal = lr.report?.reportDate;
      const dateKey = dateVal
        ? dateVal.toISOString().split("T")[0]
        : "unknown";
      const existing = byDate.get(dateKey) ?? [];
      existing.push(lr);
      byDate.set(dateKey, existing);
    }

    for (const [dateKey, sameDate] of Array.from(byDate.entries())) {
      if (sameDate.length > 1) {
        // Check if values differ
        const uniqueValues = new Set(sameDate.map((r: LabResultWithReport) => r.value.trim().toLowerCase()));
        if (uniqueValues.size > 1) {
          inconsistencies.push({
            type: "value_conflict",
            description: `"${titleCase(testName)}" has ${sameDate.length} results on ${dateKey} with different values: ${Array.from(uniqueValues).join(", ")}. Please verify which result is correct.`,
            relatedLabResultIds: sameDate.map((r: LabResultWithReport) => r.id),
          });
        } else {
          // Same value, same date — duplicate test
          inconsistencies.push({
            type: "duplicate_test",
            description: `"${titleCase(testName)}" appears ${sameDate.length} times for the same date (${dateKey}) across different reports.`,
            relatedLabResultIds: sameDate.map((r: LabResultWithReport) => r.id),
          });
        }
      }
    }

    // Rule 2: Value conflicts across different reports on different dates
    if (results.length >= 2) {
      // Check for flag conflicts (same test flagged differently on similar dates within 7 days)
      const sorted = [...results].sort((a, b) => {
        const aDate = a.report?.reportDate?.getTime() ?? 0;
        const bDate = b.report?.reportDate?.getTime() ?? 0;
        return aDate - bDate;
      });

      for (let i = 0; i < sorted.length - 1; i++) {
        const curr = sorted[i];
        const next = sorted[i + 1];
        const currDate = curr.report?.reportDate;
        const nextDate = next.report?.reportDate;

        if (currDate && nextDate) {
          const diffMs = Math.abs(nextDate.getTime() - currDate.getTime());
          const diffDays = diffMs / (1000 * 60 * 60 * 24);

          if (
            diffDays <= 7 &&
            curr.flag !== "unknown" &&
            next.flag !== "unknown" &&
            curr.flag !== next.flag
          ) {
            const cDate = currDate.toISOString().split("T")[0];
            const nDate = nextDate.toISOString().split("T")[0];
            inconsistencies.push({
              type: "value_conflict",
              description: `"${titleCase(testName)}" was flagged "${curr.flag}" on ${cDate} and "${next.flag}" on ${nDate} (${Math.round(diffDays)} days apart). Review both reports.`,
              relatedLabResultIds: [curr.id, next.id],
            });
          }
        }
      }
    }
  }

  return deduplicateByResultIds(inconsistencies);
}

/**
 * Remove duplicate inconsistency entries that share the same set of lab result IDs.
 */
function deduplicateByResultIds(
  inconsistencies: DetectedInconsistency[]
): DetectedInconsistency[] {
  const seen = new Set<string>();
  return inconsistencies.filter((inc) => {
    const key = [...inc.relatedLabResultIds].sort().join(",");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}
