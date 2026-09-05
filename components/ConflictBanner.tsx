"use client";

import { AlertTriangle, ChevronDown, ChevronRight, CheckCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface InconsistencyFlag {
  id: string;
  type: string;
  description: string;
  relatedLabResultIds: string[];
  resolved: boolean;
}

interface ConflictBannerProps {
  flags: InconsistencyFlag[];
  onResolve?: (id: string) => Promise<void>;
}

const TYPE_LABELS: Record<string, string> = {
  value_conflict: "Value Conflict",
  date_conflict: "Date Conflict",
  missing_range: "Missing Range",
  duplicate_test: "Duplicate Test",
};

export function ConflictBanner({ flags, onResolve }: ConflictBannerProps) {
  const [expanded, setExpanded] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  if (flags.length === 0) return null;

  const handleResolve = async (id: string) => {
    if (!onResolve || resolvingId) return;
    setResolvingId(id);
    try {
      await onResolve(id);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div
      className="border border-flag-low/40 bg-flag-low/5 rounded"
      role="alert"
      aria-live="polite"
    >
      {/* Banner header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-flag-low/8 transition-colors"
        aria-expanded={expanded}
        aria-controls="conflict-list"
      >
        <div className="flex items-center gap-2.5">
          <AlertTriangle
            className="h-4 w-4 text-flag-low shrink-0"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-ink">
            {flags.length} record inconsistenc{flags.length === 1 ? "y" : "ies"} detected
          </span>
          <span className="text-xs text-ink/60">— clinician review recommended</span>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-ink/40" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-4 w-4 text-ink/40" aria-hidden="true" />
        )}
      </button>

      {/* Expanded flags list */}
      {expanded && (
        <div id="conflict-list" className="border-t border-flag-low/20">
          {flags.map((flag, i) => (
            <div
              key={flag.id}
              className={cn(
                "px-4 py-3 flex items-start justify-between gap-3",
                i > 0 && "border-t border-flag-low/10"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-flag-low border border-flag-low/30 rounded px-1.5 py-0.5">
                    {TYPE_LABELS[flag.type] ?? flag.type}
                  </span>
                  <span className="text-xs text-ink/40">
                    {flag.relatedLabResultIds.length} result
                    {flag.relatedLabResultIds.length !== 1 ? "s" : ""} affected
                  </span>
                </div>
                <p className="text-sm text-ink/80">{flag.description}</p>
              </div>

              {onResolve && (
                <button
                  onClick={() => handleResolve(flag.id)}
                  disabled={resolvingId === flag.id}
                  className="shrink-0 inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-flag-normal/40 text-flag-normal hover:bg-flag-normal/10 disabled:opacity-40 transition-colors"
                  aria-label="Mark this inconsistency as resolved"
                >
                  <CheckCircle className="h-3 w-3" aria-hidden="true" />
                  {resolvingId === flag.id ? "Resolving…" : "Resolve"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
