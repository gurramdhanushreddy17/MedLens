"use client";

import React, { useState } from "react";
import { cn, formatDate, formatConfidence } from "@/lib/utils";
import { flagLabel, flagColorClass, flagBgClass } from "@/lib/referenceRangeFlag";
import type { Flag } from "@/lib/referenceRangeFlag";
import { CheckCircle, Shield, Edit3, X, AlertCircle } from "lucide-react";
import { ProvenanceBadge } from "./SourceBorder";

interface LabResult {
  id: string;
  testName: string;
  value: string;
  unit: string | null;
  referenceRangeLow: number | null;
  referenceRangeHigh: number | null;
  referenceRangeRaw: string | null;
  flag: string;
  observationNote: string | null;
  source: string;
  confidence: number;
  verifiedByClinician: boolean;
  verifiedBy: string | null;
  verifiedAt: Date | string | null;
  report?: {
    reportDate: Date | string | null;
    originalFilename: string;
  };
}

interface LabResultRowProps {
  result: LabResult;
  onVerify?: (id: string) => Promise<void>;
  onEdit?: (id: string, data: Partial<LabResult>) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  showRawSource?: boolean;
}

export function LabResultRow({
  result,
  onVerify,
  onEdit,
  onReject,
  showRawSource = false,
}: LabResultRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(result.value);
  const [editUnit, setEditUnit] = useState(result.unit ?? "");
  const [editRefLow, setEditRefLow] = useState(result.referenceRangeLow?.toString() ?? "");
  const [editRefHigh, setEditRefHigh] = useState(result.referenceRangeHigh?.toString() ?? "");
  const [editNote, setEditNote] = useState(result.observationNote ?? "");
  const [loading, setLoading] = useState<"verify" | "edit" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const flag = result.flag as Flag;
  const isLowConfidence = result.confidence < 0.7;
  const hasNoRange = result.referenceRangeLow === null && result.referenceRangeHigh === null;

  const handleVerify = async () => {
    if (!onVerify || loading) return;
    setLoading("verify");
    setError(null);
    try {
      await onVerify(result.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!onEdit || loading) return;
    setLoading("edit");
    setError(null);
    try {
      await onEdit(result.id, {
        value: editValue,
        unit: editUnit || null,
        referenceRangeLow: editRefLow ? parseFloat(editRefLow) : null,
        referenceRangeHigh: editRefHigh ? parseFloat(editRefHigh) : null,
        observationNote: editNote || null,
      });
      setIsEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Edit failed");
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    if (!onReject || loading) return;
    setLoading("reject");
    setError(null);
    try {
      await onReject(result.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setLoading(null);
    }
  };

  const flagColor = flagColorClass(flag);
  const flagBg = flagBgClass(flag);

  return (
    <div
      className={cn(
        "group relative",
        "border-l-2 pl-3",
        result.source === "ai-extracted"
          ? "border-l-accent"
          : "border-l-transparent",
        "py-2.5 transition-colors hover:bg-ink/2"
      )}
      role="row"
    >
      {/* Main row */}
      <div className="flex flex-wrap items-start gap-x-4 gap-y-1 min-w-0">
        {/* Test name */}
        <div className="flex-1 min-w-32">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-ink text-sm">{result.testName}</span>
            {result.verifiedByClinician && (
              <span
                className="inline-flex items-center gap-0.5 text-2xs text-flag-normal font-medium"
                title="Verified by clinician"
              >
                <CheckCircle className="h-3 w-3" aria-hidden="true" />
                Verified
              </span>
            )}
            {isLowConfidence && !result.verifiedByClinician && (
              <span
                className="inline-flex items-center gap-0.5 text-2xs text-flag-low font-medium"
                title={`Extraction confidence: ${formatConfidence(result.confidence)}`}
              >
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                Low confidence
              </span>
            )}
          </div>
          {result.report?.reportDate && (
            <div className="text-2xs text-ink/50 mt-0.5">
              {formatDate(result.report.reportDate)}
              {result.report.originalFilename && (
                <span className="ml-1">· {result.report.originalFilename}</span>
              )}
            </div>
          )}
        </div>

        {/* Value */}
        <div className="flex items-center gap-2 shrink-0">
          {isEditing ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="font-mono text-sm w-20 border border-line rounded px-1.5 py-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              aria-label="Edit value"
            />
          ) : (
            <span className="font-mono text-sm text-ink lab-value">{result.value}</span>
          )}

          {isEditing ? (
            <input
              type="text"
              value={editUnit}
              onChange={(e) => setEditUnit(e.target.value)}
              className="font-mono text-xs w-14 border border-line rounded px-1.5 py-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent text-ink/60"
              placeholder="unit"
              aria-label="Edit unit"
            />
          ) : (
            result.unit && (
              <span className="font-mono text-xs text-ink/60">{result.unit}</span>
            )
          )}
        </div>

        {/* Flag + Reference Range */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-medium",
              flagBg,
              flagColor
            )}
            aria-label={`Flag: ${flagLabel(flag)}`}
          >
            <span
              className={cn("flag-dot shrink-0", `flag-dot-${flag}`)}
              aria-hidden="true"
            />
            <span>{flagLabel(flag)}</span>
          </div>

          {/* Reference range */}
          <span className="text-xs text-ink/50 font-mono">
            {hasNoRange
              ? "No range provided"
              : result.referenceRangeRaw
              ? result.referenceRangeRaw
              : result.referenceRangeLow !== null && result.referenceRangeHigh !== null
              ? `${result.referenceRangeLow}–${result.referenceRangeHigh}${result.unit ? ` ${result.unit}` : ""}`
              : null}
          </span>
        </div>

        {/* Confidence */}
        <div className="text-xs text-ink/40 shrink-0 font-mono" title="Extraction confidence">
          {formatConfidence(result.confidence)}
        </div>

        {/* Source badge */}
        <div className="shrink-0">
          <ProvenanceBadge source={result.source as "ai-extracted" | "user-entered" | "ai-generated"} />
        </div>

        {/* Actions — visible in edit mode or on hover for non-verified */}
        {(isEditing || (!result.verifiedByClinician && (onVerify || onEdit))) && (
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  disabled={loading === "edit"}
                  className="text-xs px-2 py-0.5 rounded bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
                  aria-label="Save edits"
                >
                  {loading === "edit" ? "Saving…" : "Save & Verify"}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-xs px-2 py-0.5 rounded border border-line text-ink/60 hover:bg-ink/5 transition-colors"
                  aria-label="Cancel edit"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {onVerify && (
                  <button
                    onClick={handleVerify}
                    disabled={!!loading}
                    className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-flag-normal text-flag-normal hover:bg-flag-normal/10 disabled:opacity-30 transition-all"
                    aria-label={`Verify ${result.testName}`}
                  >
                    <Shield className="h-3 w-3" aria-hidden="true" />
                    {loading === "verify" ? "Verifying…" : "Verify"}
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-line text-ink/60 hover:bg-ink/5 transition-all"
                    aria-label={`Edit ${result.testName}`}
                  >
                    <Edit3 className="h-3 w-3" aria-hidden="true" />
                    Edit
                  </button>
                )}
                {onReject && (
                  <button
                    onClick={handleReject}
                    disabled={!!loading}
                    className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-flag-high/30 text-flag-high hover:bg-flag-high/10 disabled:opacity-30 transition-all"
                    aria-label={`Reject ${result.testName}`}
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                    {loading === "reject" ? "Rejecting…" : "Reject"}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Edit mode: reference range fields */}
      {isEditing && (
        <div className="mt-2 flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-ink/60">Ref low:</label>
            <input
              type="number"
              value={editRefLow}
              onChange={(e) => setEditRefLow(e.target.value)}
              className="font-mono text-xs w-16 border border-line rounded px-1.5 py-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              placeholder="—"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-ink/60">Ref high:</label>
            <input
              type="number"
              value={editRefHigh}
              onChange={(e) => setEditRefHigh(e.target.value)}
              className="font-mono text-xs w-16 border border-line rounded px-1.5 py-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              placeholder="—"
            />
          </div>
          <div className="flex-1 flex items-center gap-1.5 min-w-32">
            <label className="text-xs text-ink/60">Note:</label>
            <input
              type="text"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              className="flex-1 text-xs border border-line rounded px-1.5 py-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              placeholder="Observation note (optional)"
            />
          </div>
        </div>
      )}

      {/* Observation note */}
      {!isEditing && result.observationNote && (
        <div className="mt-1 text-xs text-ink/60 italic">
          Note: {result.observationNote}
        </div>
      )}

      {/* Raw source view (provenance toggle) */}
      {showRawSource && (
        <div className="mt-2 p-2 bg-ink/3 rounded border border-line text-xs font-mono text-ink/60">
          <span className="text-accent font-medium not-italic">Raw source: </span>
          {result.testName} — {result.value}
          {result.unit ? ` ${result.unit}` : ""}
          {result.referenceRangeRaw ? ` [${result.referenceRangeRaw}]` : ""}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-1 text-xs text-flag-high" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
