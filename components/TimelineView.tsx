"use client";

import { formatDateTime } from "@/lib/utils";
import { Clock, Plus, Edit3, CheckCircle, Upload, FileText, Trash2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string;
  timestamp: Date | string;
  details?: Record<string, unknown> | null;
}

interface ReportEntry {
  id: string;
  originalFilename: string;
  uploadedAt: Date | string;
  reportDate: Date | string | null;
  processingStatus: string;
}

interface TimelineViewProps {
  auditLogs: AuditEntry[];
  reports: ReportEntry[];
}

interface TimelineItem {
  id: string;
  type: "audit" | "report";
  date: Date;
  label: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
}

const ACTION_ICONS: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  create_patient: { icon: Plus, color: "text-flag-normal", label: "Patient created" },
  update_patient: { icon: Edit3, color: "text-accent", label: "Patient info updated" },
  upload_report: { icon: Upload, color: "text-accent", label: "Report uploaded" },
  process_report: { icon: FileText, color: "text-accent", label: "Report processed" },
  verify_lab_result: { icon: CheckCircle, color: "text-flag-normal", label: "Lab result verified" },
  edit_and_verify_lab_result: { icon: CheckCircle, color: "text-flag-normal", label: "Lab result edited & verified" },
  reject_lab_result: { icon: Trash2, color: "text-flag-low", label: "Lab result rejected" },
  generate_summary: { icon: Sparkles, color: "text-ai-generated", label: "AI summary generated" },
  answer_clarification: { icon: CheckCircle, color: "text-accent", label: "Clarification answered" },
};

export function TimelineView({ auditLogs }: TimelineViewProps) {
  const items: TimelineItem[] = [];

  // Add audit log entries
  for (const log of auditLogs) {
    const config = ACTION_ICONS[log.action] ?? {
      icon: Clock,
      color: "text-ink/40",
      label: log.action.replace(/_/g, " "),
    };

    const details = log.details as Record<string, unknown> | null;

    items.push({
      id: `audit-${log.id}`,
      type: "audit",
      date: new Date(log.timestamp),
      label: config.label,
      description: details?.name
        ? `${String(details.name)}`
        : details?.filename
        ? `${String(details.filename)}`
        : details?.testName
        ? `${String(details.testName)}`
        : `${log.entityType} ${log.entityId.slice(-6)}`,
      icon: config.icon,
      iconColor: config.color,
    });
  }

  // Sort by date descending
  items.sort((a, b) => b.date.getTime() - a.date.getTime());

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-ink/50">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
        No activity recorded yet
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div
        className="absolute left-3.5 top-0 bottom-0 w-px bg-line"
        aria-hidden="true"
      />

      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="flex items-start gap-3 pl-0 py-2 relative">
              {/* Icon node */}
              <div
                className={cn(
                  "shrink-0 w-7 h-7 rounded-full bg-surface border border-line",
                  "flex items-center justify-center z-10"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", item.iconColor)} aria-hidden="true" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <span className="text-sm font-medium text-ink">{item.label}</span>
                  <time
                    dateTime={item.date.toISOString()}
                    className="text-2xs text-ink/40 shrink-0 font-mono"
                  >
                    {formatDateTime(item.date)}
                  </time>
                </div>
                {item.description && (
                  <p className="text-xs text-ink/60 mt-0.5 truncate">{item.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
