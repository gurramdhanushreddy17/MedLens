"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { NavBar } from "@/components/NavBar";
import { TagInput } from "@/components/TagInput";
import { PatientIntakeSchema, type PatientIntakeInput } from "@/lib/schemas";
import { Plus, Trash2, ArrowLeft, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface FormValues {
  patient: {
    name: string;
    age: number;
    sex: string;
    dateOfBirth?: string | null;
    contactInfo?: string | null;
  };
  symptoms?: string[];
  existingConditions?: string[];
  allergies?: string[];
  noKnownAllergies?: boolean;
  medications?: Array<{
    name: string;
    dose?: string | null;
    frequency?: string | null;
  }>;
  notes?: string | null;
}

export default function NewPatientPage() {
  const router = useRouter();
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [noKnownAllergies, setNoKnownAllergies] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(PatientIntakeSchema) as any,
    defaultValues: {
      patient: { name: "", age: undefined, sex: "" },
      symptoms: [],
      existingConditions: [],
      allergies: [],
      noKnownAllergies: false,
      medications: [],
      notes: "",
    },
  });

  const { fields: medFields, append: addMed, remove: removeMed } = useFieldArray({
    control,
    name: "medications",
  });

  const onSubmit = async (formData: FormValues) => {
    setSubmitError(null);
    const payload: PatientIntakeInput = {
      patient: formData.patient,
      symptoms,
      existingConditions: conditions,
      allergies: noKnownAllergies ? [] : allergies,
      noKnownAllergies,
      medications: (formData.medications ?? []).map((m) => ({
        name: m.name,
        dose: m.dose ?? null,
        frequency: m.frequency ?? null,
      })),
      notes: formData.notes ?? null,
    };

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Failed to create patient");
      }
      setSuccess(true);
      setTimeout(() => router.push(`/patients/${data.data.id}`), 800);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to create patient. Please try again.");
    }
  };

  const inputClass = (hasError?: boolean) =>
    cn(
      "w-full text-sm border rounded px-3 py-2 bg-paper",
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
      "placeholder:text-ink/30",
      hasError ? "border-flag-high" : "border-line"
    );

  return (
    <div className="min-h-screen bg-paper">
      <NavBar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to dashboard
        </Link>

        <h1 className="font-serif text-2xl font-semibold text-ink mb-1">New Patient</h1>
        <p className="text-sm text-ink/60 mb-6">
          All information entered here is tagged as{" "}
          <span className="text-accent font-medium">user-entered</span> and can be edited at any time.
        </p>

        {success && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-flag-normal/10 border border-flag-normal/30 rounded text-sm text-flag-normal" role="status">
            <CheckCircle className="h-4 w-4 shrink-0" />
            Patient created — redirecting to record…
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          {/* ── Demographics ── */}
          <section className="bg-surface border border-line rounded-lg p-5">
            <h2 className="font-serif text-base font-semibold text-ink mb-4">Demographics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="sm:col-span-2">
                <label htmlFor="name" className="text-xs font-medium text-ink/70 block mb-1">
                  Full name <span className="text-flag-high" aria-label="required">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  {...register("patient.name")}
                  className={inputClass(!!errors.patient?.name)}
                  placeholder="e.g. Sarah Mitchell"
                />
                {errors.patient?.name && (
                  <p className="mt-1 text-xs text-flag-high" role="alert">{errors.patient.name.message}</p>
                )}
              </div>

              {/* Age */}
              <div>
                <label htmlFor="age" className="text-xs font-medium text-ink/70 block mb-1">
                  Age <span className="text-flag-high" aria-label="required">*</span>
                </label>
                <input
                  id="age"
                  type="number"
                  min={0}
                  max={150}
                  {...register("patient.age", { valueAsNumber: true })}
                  className={inputClass(!!errors.patient?.age)}
                  placeholder="42"
                />
                {errors.patient?.age && (
                  <p className="mt-1 text-xs text-flag-high" role="alert">{errors.patient.age.message}</p>
                )}
              </div>

              {/* Sex */}
              <div>
                <label htmlFor="sex" className="text-xs font-medium text-ink/70 block mb-1">
                  Sex <span className="text-flag-high" aria-label="required">*</span>
                </label>
                <select
                  id="sex"
                  {...register("patient.sex")}
                  className={cn(inputClass(!!errors.patient?.sex), "cursor-pointer")}
                >
                  <option value="">Select…</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
                {errors.patient?.sex && (
                  <p className="mt-1 text-xs text-flag-high" role="alert">{errors.patient.sex.message}</p>
                )}
              </div>

              {/* Date of birth */}
              <div>
                <label htmlFor="dob" className="text-xs font-medium text-ink/70 block mb-1">Date of birth</label>
                <input
                  id="dob"
                  type="date"
                  {...register("patient.dateOfBirth")}
                  className={inputClass()}
                />
              </div>

              {/* Contact info */}
              <div>
                <label htmlFor="contact" className="text-xs font-medium text-ink/70 block mb-1">Contact info</label>
                <input
                  id="contact"
                  type="text"
                  {...register("patient.contactInfo")}
                  className={inputClass()}
                  placeholder="Phone or email (optional)"
                />
              </div>
            </div>
          </section>

          {/* ── Clinical Info ── */}
          <section className="bg-surface border border-line rounded-lg p-5 space-y-4">
            <h2 className="font-serif text-base font-semibold text-ink">Clinical Information</h2>

            <TagInput
              label="Chief complaints / symptoms"
              placeholder="Type symptom and press Enter…"
              tags={symptoms}
              onChange={setSymptoms}
            />

            <TagInput
              label="Existing conditions"
              placeholder="e.g. Type 2 diabetes, hypertension…"
              tags={conditions}
              onChange={setConditions}
            />

            {/* Allergies — never ambiguous */}
            <TagInput
              label="Allergies"
              placeholder="e.g. Penicillin, shellfish…"
              tags={allergies}
              onChange={setAllergies}
              noneOption="No known allergies (explicitly confirmed)"
              noneSelected={noKnownAllergies}
              onNoneChange={setNoKnownAllergies}
            />
          </section>

          {/* ── Medications ── */}
          <section className="bg-surface border border-line rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-base font-semibold text-ink">Current Medications</h2>
              <button
                type="button"
                onClick={() => addMed({ name: "", dose: "", frequency: "" })}
                className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add medication
              </button>
            </div>

            {medFields.length === 0 && (
              <p className="text-sm text-ink/50 italic">No medications added — click &ldquo;Add medication&rdquo; to add one.</p>
            )}

            <div className="space-y-3">
              {medFields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-3 gap-2 items-start">
                  <div>
                    <label htmlFor={`med-name-${i}`} className="text-xs text-ink/60 block mb-1">Name *</label>
                    <input
                      id={`med-name-${i}`}
                      type="text"
                      {...register(`medications.${i}.name`)}
                      className={inputClass(!!errors.medications?.[i]?.name)}
                      placeholder="Metformin"
                    />
                  </div>
                  <div>
                    <label htmlFor={`med-dose-${i}`} className="text-xs text-ink/60 block mb-1">Dose</label>
                    <input
                      id={`med-dose-${i}`}
                      type="text"
                      {...register(`medications.${i}.dose`)}
                      className={inputClass()}
                      placeholder="500 mg"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label htmlFor={`med-freq-${i}`} className="text-xs text-ink/60 block mb-1">Frequency</label>
                      <input
                        id={`med-freq-${i}`}
                        type="text"
                        {...register(`medications.${i}.frequency`)}
                        className={inputClass()}
                        placeholder="Twice daily"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMed(i)}
                      className="mt-5 text-ink/30 hover:text-flag-high transition-colors"
                      aria-label={`Remove medication ${i + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Notes ── */}
          <section className="bg-surface border border-line rounded-lg p-5">
            <label htmlFor="notes" className="font-serif text-base font-semibold text-ink block mb-3">
              Additional notes
            </label>
            <textarea
              id="notes"
              {...register("notes")}
              rows={3}
              className={cn(inputClass(), "resize-none")}
              placeholder="Any other relevant clinical context…"
            />
          </section>

          {/* Submit error */}
          {submitError && (
            <div className="flex items-start gap-2 p-3 bg-flag-high/10 border border-flag-high/30 rounded text-sm text-flag-high" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="text-sm text-ink/60 hover:text-ink transition-colors">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || success}
              className={cn(
                "inline-flex items-center gap-2 px-5 py-2.5 rounded font-medium text-sm",
                "bg-accent text-white hover:bg-accent/90 transition-colors",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isSubmitting ? "Creating…" : "Create Patient Record"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
