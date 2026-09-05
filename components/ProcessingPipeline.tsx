"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Clock, AlertCircle, Upload, Brain, Flag, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type PipelineStep =
  | "upload"
  | "ocr"
  | "extract"
  | "flag"
  | "ready"
  | "failed";

interface PipelineState {
  currentStep: PipelineStep;
  error?: string;
  resultCount?: number;
}

const STEPS: Array<{
  id: PipelineStep;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "upload",
    label: "Upload",
    description: "Saving file to storage",
    icon: Upload,
  },
  {
    id: "ocr",
    label: "Extract Text",
    description: "Reading PDF or running OCR",
    icon: Brain,
  },
  {
    id: "extract",
    label: "AI Extraction",
    description: "Identifying lab results with Claude",
    icon: Brain,
  },
  {
    id: "flag",
    label: "Flagging",
    description: "Computing reference-range flags",
    icon: Flag,
  },
  {
    id: "ready",
    label: "Ready",
    description: "Results stored and ready for review",
    icon: CheckCircle,
  },
];

function getStepStatus(
  stepId: PipelineStep,
  currentStep: PipelineStep,
  failed: boolean
): "completed" | "active" | "pending" | "failed" {
  const stepOrder = STEPS.map((s) => s.id);
  const currentIdx = stepOrder.indexOf(currentStep === "failed" ? "upload" : currentStep);
  const stepIdx = stepOrder.indexOf(stepId);

  if (failed && stepId === currentStep) return "failed";
  if (stepIdx < currentIdx) return "completed";
  if (stepIdx === currentIdx) return "active";
  return "pending";
}

interface ProcessingPipelineProps {
  state: PipelineState;
  className?: string;
}

export function ProcessingPipeline({ state, className }: ProcessingPipelineProps) {
  const isFailed = state.currentStep === "failed";
  const isReady = state.currentStep === "ready";

  return (
    <div
      className={cn("p-4 bg-surface border border-line rounded", className)}
      role="status"
      aria-label="Report processing status"
      aria-live="polite"
    >
      <div className="flex items-center gap-1 mb-4">
        <span className="text-sm font-medium text-ink">Processing report</span>
        {!isReady && !isFailed && (
          <Loader2 className="h-4 w-4 text-accent animate-spin ml-1" aria-hidden="true" />
        )}
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const status = getStepStatus(step.id, state.currentStep, isFailed);

          return (
            <div key={step.id} className="flex items-center min-w-0 flex-1">
              {/* Step node */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${step.id}-${status}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center shrink-0"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                      status === "completed" &&
                        "bg-flag-normal/10 border-flag-normal text-flag-normal",
                      status === "active" &&
                        "bg-accent/10 border-accent text-accent",
                      status === "pending" &&
                        "bg-surface border-line text-ink/30",
                      status === "failed" &&
                        "bg-flag-high/10 border-flag-high text-flag-high"
                    )}
                    aria-label={`${step.label}: ${status}`}
                  >
                    {status === "completed" ? (
                      <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    ) : status === "active" ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : status === "failed" ? (
                      <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Clock className="h-4 w-4" aria-hidden="true" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-2xs mt-1 text-center max-w-14 leading-tight",
                      status === "active" && "text-accent font-medium",
                      status === "completed" && "text-flag-normal",
                      status === "failed" && "text-flag-high",
                      status === "pending" && "text-ink/40"
                    )}
                  >
                    {step.label}
                  </span>
                </motion.div>
              </AnimatePresence>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1 mt-[-12px] transition-colors duration-300",
                    getStepStatus(STEPS[i + 1].id, state.currentStep, isFailed) !==
                      "pending"
                      ? "bg-flag-normal"
                      : "bg-line"
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Status message */}
      <div className="mt-3 text-xs text-ink/60">
        {isFailed && state.error && (
          <div className="flex items-center gap-1.5 text-flag-high">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {state.error}
          </div>
        )}
        {isReady && state.resultCount !== undefined && (
          <div className="flex items-center gap-1.5 text-flag-normal">
            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
            {state.resultCount} result{state.resultCount !== 1 ? "s" : ""} extracted and ready for review
          </div>
        )}
        {!isFailed && !isReady && (
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-accent" />
            {STEPS.find((s) => s.id === state.currentStep)?.description ?? "Processing…"}
          </div>
        )}
      </div>
    </div>
  );
}
