"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn, formatDateTime } from "@/lib/utils";

interface AISummary {
  id: string;
  summaryText: string;
  generatedAt: Date | string;
  modelVersion: string;
  source: string;
  disclaimerShown: boolean;
}

interface SummaryCardProps {
  summary: AISummary | null;
  patientId: string;
  onRegenerate?: () => Promise<void>;
}

const DISCLAIMER =
  "This summary is for informational purposes only and organizes existing record data. It is not a medical diagnosis. Please consult a qualified healthcare professional.";

export function SummaryCard({ summary, onRegenerate }: SummaryCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegenerate = async () => {
    if (!onRegenerate || loading) return;
    setLoading(true);
    setError(null);
    try {
      await onRegenerate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Summary generation failed");
    } finally {
      setLoading(false);
    }
  };

  // Split the summary text from the disclaimer for separate rendering
  const summaryWithoutDisclaimer = summary?.summaryText
    ?.replace(DISCLAIMER, "")
    .trim() ?? "";

  return (
    <div
      className={cn(
        "relative border-l-2 border-l-ai-generated pl-3",
        "bg-surface rounded border border-line"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-ai-generated" aria-hidden="true" />
          <h3 className="font-serif text-base font-semibold text-ink">AI Summary</h3>
          <span className="text-xs text-ai-generated bg-ai-generated/8 border border-ai-generated/20 rounded px-1.5 py-0.5 font-medium">
            ai-generated
          </span>
        </div>

        {onRegenerate && (
          <button
            onClick={handleRegenerate}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border border-line text-ink/60 hover:bg-ink/5 hover:text-ink disabled:opacity-40 transition-colors"
            aria-label="Regenerate AI summary"
          >
            <RefreshCw
              className={cn("h-3 w-3", loading && "animate-spin")}
              aria-hidden="true"
            />
            {loading ? "Generating…" : "Regenerate"}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-4">
        {error && (
          <div className="mb-3 p-2 rounded bg-flag-high/10 border border-flag-high/30 text-sm text-flag-high" role="alert">
            {error}
          </div>
        )}

        {loading && !summary && (
          <div className="space-y-2">
            <div className="h-4 bg-ink/8 rounded animate-pulse w-full" />
            <div className="h-4 bg-ink/8 rounded animate-pulse w-5/6" />
            <div className="h-4 bg-ink/8 rounded animate-pulse w-4/6" />
          </div>
        )}

        {!loading && !summary && !error && (
          <div className="text-center py-6">
            <Sparkles className="h-8 w-8 text-ai-generated/30 mx-auto mb-2" />
            <p className="text-sm text-ink/60 mb-3">
              No summary has been generated yet. Generate one to get a plain-language overview of this patient record.
            </p>
            {onRegenerate && (
              <button
                onClick={handleRegenerate}
                className="text-sm px-4 py-2 rounded bg-ai-generated/10 border border-ai-generated/30 text-ai-generated hover:bg-ai-generated/20 transition-colors"
              >
                Generate Summary
              </button>
            )}
          </div>
        )}

        {summary && (
          <>
            <p className="text-sm text-ink leading-relaxed mb-4">
              {summaryWithoutDisclaimer}
            </p>

            {/* Disclaimer — always shown */}
            <div className="border-t border-line pt-3">
              <p className="text-xs text-ink/60 leading-relaxed italic">
                {DISCLAIMER}
              </p>
            </div>

            {/* Metadata */}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-2xs text-ink/40">
              <span>Engine: Clinical Intelligence v2.5</span>
              <span>Generated: {formatDateTime(summary.generatedAt)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
