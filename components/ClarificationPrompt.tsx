"use client";

import { useState } from "react";
import { HelpCircle, Send, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClarificationPromptProps {
  questions: string[];
  patientId: string;
  onAnswered?: (question: string, answer: string) => void;
}

export function ClarificationPrompt({
  questions,
  patientId,
  onAnswered,
}: ClarificationPromptProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});

  if (questions.length === 0) return null;

  const handleSubmit = async (index: number, question: string) => {
    const answer = answers[index]?.trim();
    if (!answer) {
      setErrors((e) => ({ ...e, [index]: "Please enter an answer before submitting" }));
      return;
    }

    setLoading((l) => ({ ...l, [index]: true }));
    setErrors((e) => ({ ...e, [index]: "" }));

    try {
      const res = await fetch("/api/clarifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, question, answer }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Failed to save answer");
      }

      setSubmitted((s) => ({ ...s, [index]: true }));
      onAnswered?.(question, answer);
    } catch (e) {
      setErrors((err) => ({
        ...err,
        [index]: e instanceof Error ? e.message : "Failed to save answer",
      }));
    } finally {
      setLoading((l) => ({ ...l, [index]: false }));
    }
  };

  return (
    <div className="border border-accent/30 bg-accent/5 rounded">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-accent/20">
        <HelpCircle className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
        <div>
          <h4 className="text-sm font-medium text-ink">
            Clarification needed
          </h4>
          <p className="text-xs text-ink/60 mt-0.5">
            Answer these questions to complete the record. Answers are saved as user-entered information.
          </p>
        </div>
      </div>

      {/* Questions */}
      <div className="divide-y divide-accent/10">
        {questions.map((question, i) => (
          <div key={i} className="px-4 py-3">
            <label
              htmlFor={`clarification-${i}`}
              className="text-sm text-ink mb-2 block"
            >
              {i + 1}. {question}
            </label>

            {submitted[i] ? (
              <div className="flex items-center gap-1.5 text-sm text-flag-normal">
                <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Answer saved: &ldquo;{answers[i]}&rdquo;</span>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  id={`clarification-${i}`}
                  type="text"
                  value={answers[i] ?? ""}
                  onChange={(e) =>
                    setAnswers((a) => ({ ...a, [i]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit(i, question);
                  }}
                  placeholder="Enter your answer…"
                  className={cn(
                    "flex-1 text-sm border rounded px-3 py-1.5",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
                    errors[i] ? "border-flag-high" : "border-line"
                  )}
                  aria-invalid={!!errors[i]}
                  aria-describedby={errors[i] ? `clarification-error-${i}` : undefined}
                />
                <button
                  onClick={() => handleSubmit(i, question)}
                  disabled={loading[i]}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent text-white text-sm hover:bg-accent/90 disabled:opacity-40 transition-colors shrink-0"
                  aria-label={`Submit answer for question ${i + 1}`}
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  {loading[i] ? "Saving…" : "Save"}
                </button>
              </div>
            )}

            {errors[i] && (
              <p
                id={`clarification-error-${i}`}
                className="mt-1 text-xs text-flag-high"
                role="alert"
              >
                {errors[i]}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
