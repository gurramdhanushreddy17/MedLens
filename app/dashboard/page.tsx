"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { EditPatientModal } from "@/components/EditPatientModal";
import { Users, Plus, Search, AlertTriangle, ChevronRight, FileText, Edit3, Shield } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface PatientSummary {
  id: string;
  name: string;
  age: number;
  sex: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    labResults: number;
    reports: number;
    inconsistencies: number;
  };
  summaries: Array<{ id: string; generatedAt: string }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [editingPatient, setEditingPatient] = useState<{
    id: string;
    name: string;
    age: number;
    sex: string;
    dateOfBirth: string | null;
    contactInfo: string | null;
  } | null>(null);

  const fetchPatients = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      params.set("page", String(page));
      params.set("limit", "20");
      const res = await fetch(`/api/patients?${params}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Failed to load patients");
      setPatients(data.data.patients);
      setTotal(data.data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load patients");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(patients.length === 0);
    }, search ? 200 : 0);
    return () => clearTimeout(timer);
  }, [fetchPatients, search, patients.length]);

  return (
    <div className="min-h-screen bg-paper">
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink tracking-tight">Patient Records</h1>
            <p className="text-sm text-ink/60 mt-1">
              {loading ? "Loading…" : `${total} patient${total !== 1 ? "s" : ""} on record`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              prefetch={true}
              className={cn(
                "inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-line bg-surface text-ink text-sm font-semibold shadow-2xs",
                "hover:bg-cream-100 hover:border-accent/40 transition-all active:scale-95",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              )}
            >
              <Shield className="h-4 w-4 text-accent" aria-hidden="true" />
              <span>Admin Console</span>
            </Link>
            <Link
              href="/patients/new"
              prefetch={true}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl",
                "bg-accent text-white text-sm font-semibold shadow-xs",
                "hover:bg-accent-hover hover:shadow-sm transition-all active:scale-95",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              )}
            >
              <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
              <span>New Patient</span>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/40" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search patients by name…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={cn(
              "w-full pl-10 pr-4 py-2.5 text-sm border border-line rounded-xl",
              "bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent",
              "placeholder:text-ink/35 transition-all shadow-2xs"
            )}
            aria-label="Search patients"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-flag-high/10 border border-flag-high/30 rounded text-sm text-flag-high" role="alert">
            {error}
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && patients.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-full flex items-center justify-between gap-4 p-4 sm:px-5 sm:py-4 rounded-xl bg-white border border-line/60 shadow-xs animate-pulse"
              >
                <div className="flex items-center gap-3.5 flex-1">
                  <div className="w-11 h-11 rounded-xl bg-cream-200/80" />
                  <div className="space-y-2 flex-1 max-w-sm">
                    <div className="h-4 bg-cream-200/80 rounded w-1/3" />
                    <div className="h-3 bg-cream-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="w-24 h-8 bg-cream-100 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && patients.length === 0 && (
          <div className="text-center py-16 bg-surface border border-line rounded-lg">
            <Users className="h-12 w-12 text-ink/20 mx-auto mb-3" aria-hidden="true" />
            <h2 className="font-serif text-lg font-semibold text-ink mb-1">
              {search ? "No patients found" : "No patients yet"}
            </h2>
            <p className="text-sm text-ink/60 mb-4">
              {search
                ? `No patients match "${search}". Try a different name.`
                : "Start by creating your first patient record."}
            </p>
            {!search && (
              <Link
                href="/patients/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create first patient
              </Link>
            )}
          </div>
        )}

        {/* Patient list */}
        {!loading && patients.length > 0 && (
          <div className="space-y-3">
            {patients.map((patient) => (
              <div
                key={patient.id}
                onMouseEnter={() => router.prefetch(`/patients/${patient.id}`)}
                className={cn(
                  "w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:px-5 sm:py-4 rounded-xl",
                  "bg-white border border-line/80 shadow-xs hover:shadow-sm hover:border-accent/40",
                  "transition-all duration-150 group cursor-pointer"
                )}
                onClick={() => router.push(`/patients/${patient.id}`)}
              >
                {/* Left section: Avatar & Details */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Avatar initial */}
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-accent-50 border border-accent/15 flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors duration-150">
                    <span className="text-sm font-serif font-bold text-accent group-hover:text-white transition-colors duration-150">
                      {patient.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Name & demographics */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-semibold text-ink group-hover:text-accent transition-colors duration-150">
                        {patient.name}
                      </span>
                      <span className="text-xs font-medium text-ink/50 bg-cream-100 px-2 py-0.5 rounded-md border border-line/60">
                        {patient.age} yrs · {patient.sex}
                      </span>
                      {patient._count.inconsistencies > 0 && (
                        <span className="inline-flex items-center gap-1 text-2xs text-flag-low border border-flag-low/25 bg-flag-low/8 rounded-md px-2 py-0.5 font-medium">
                          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                          {patient._count.inconsistencies} conflict{patient._count.inconsistencies === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3.5 mt-1 text-xs text-ink/55 flex-wrap">
                      <span className="flex items-center gap-1.5 font-medium">
                        <FileText className="h-3.5 w-3.5 text-accent/80" aria-hidden="true" />
                        {patient._count.reports} report{patient._count.reports !== 1 ? "s" : ""}
                      </span>
                      <span className="text-ink/30">•</span>
                      <span>
                        {patient._count.labResults} lab result{patient._count.labResults !== 1 ? "s" : ""}
                      </span>
                      <span className="text-ink/30">•</span>
                      <span className="text-ink/45">
                        Updated {formatDate(patient.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right section: Actions */}
                <div
                  className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-line/40 w-full sm:w-auto justify-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setEditingPatient({
                      id: patient.id,
                      name: patient.name,
                      age: patient.age,
                      sex: patient.sex,
                      dateOfBirth: null,
                      contactInfo: null,
                    })}
                    className="p-2 rounded-lg text-ink/45 hover:text-accent hover:bg-accent-50 active:scale-95 transition-all"
                    title="Edit patient"
                    aria-label={`Edit ${patient.name}`}
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>

                  <Link
                    href={`/patients/${patient.id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-accent bg-accent-50/70 border border-accent/20 hover:bg-accent hover:text-white hover:border-accent active:scale-95 transition-all shadow-2xs"
                  >
                    <span>View Record</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal on Dashboard */}
        {editingPatient && (
          <EditPatientModal
            patient={editingPatient}
            isOpen={!!editingPatient}
            onClose={() => setEditingPatient(null)}
            onUpdated={() => fetchPatients(false)}
            onDeleted={() => {
              const deletedId = editingPatient.id;
              setPatients((prev) => prev.filter((p) => p.id !== deletedId));
              setTotal((prev) => Math.max(0, prev - 1));
              fetchPatients(false);
            }}
          />
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-line rounded text-ink/60 hover:bg-ink/5 disabled:opacity-30 transition-colors"
            >
              Previous
            </button>
            <span className="text-ink/50">
              Page {page} of {Math.ceil(total / 20)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / 20)}
              className="px-3 py-1.5 border border-line rounded text-ink/60 hover:bg-ink/5 disabled:opacity-30 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
