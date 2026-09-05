"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { NavBar } from "@/components/NavBar";
import { EditPatientModal } from "@/components/EditPatientModal";
import { Shield, Users, Loader2, AlertTriangle, Edit3, ChevronRight } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import Link from "next/link";

interface Patient {
  id: string; name: string; age: number; sex: string;
  createdAt: string; updatedAt: string;
  _count: { labResults: number; reports: number; inconsistencies: number };
}

export default function AdminPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPatient, setEditingPatient] = useState<{
    id: string;
    name: string;
    age: number;
    sex: string;
    dateOfBirth: string | null;
    contactInfo: string | null;
  } | null>(null);

  const fetchPatients = useCallback(() => {
    setLoading(true);
    fetch("/api/patients?limit=100")
      .then(r => r.json())
      .then(data => {
        if (data.success) { setPatients(data.data.patients); setTotal(data.data.total); }
        else setError(data.error);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return (
    <div className="min-h-screen bg-paper">
      <NavBar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="h-5 w-5 text-accent" />
          <h1 className="font-serif text-2xl font-semibold text-ink">Admin Panel</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total patients", value: total },
            { label: "Total reports", value: patients.reduce((s, p) => s + p._count.reports, 0) },
            { label: "Lab results", value: patients.reduce((s, p) => s + p._count.labResults, 0) },
            { label: "Inconsistencies", value: patients.reduce((s, p) => s + p._count.inconsistencies, 0) },
          ].map(stat => (
            <div key={stat.label} className="bg-surface border border-line rounded-xl p-4 shadow-xs">
              <p className="text-xs text-ink/50 mb-1">{stat.label}</p>
              <p className="font-mono text-2xl font-semibold text-ink">{loading ? "…" : stat.value}</p>
            </div>
          ))}
        </div>

        {/* All patients table */}
        <div className="bg-surface border border-line rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-line flex items-center justify-between bg-cream-50/50">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" />
              <h2 className="font-serif text-base font-semibold text-ink">All Patients System Registry</h2>
            </div>
            <span className="text-xs font-mono text-ink/50">{total} total</span>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12 text-ink/40">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          )}

          {error && (
            <div className="p-4 text-sm text-flag-high flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}

          {!loading && !error && (
            <div className="divide-y divide-line">
              {patients.map(p => (
                <div
                  key={p.id}
                  className={cn(
                    "flex items-center justify-between gap-4 px-5 py-3.5",
                    "hover:bg-cream-50/60 transition-colors group"
                  )}
                >
                  <Link
                    href={`/patients/${p.id}`}
                    className="flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-ink group-hover:text-accent transition-colors">{p.name}</span>
                      <span className="text-xs text-ink/50 font-mono">{p.age} · {p.sex}</span>
                      {p._count.inconsistencies > 0 && (
                        <span className="text-2xs text-flag-low border border-flag-low/30 rounded-full px-2 py-0.5 bg-flag-low/5 font-medium">
                          {p._count.inconsistencies} conflict{p._count.inconsistencies > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink/45 mt-0.5">
                      {p._count.reports} reports · {p._count.labResults} results · Updated {formatDate(p.updatedAt)}
                    </p>
                  </Link>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setEditingPatient({
                        id: p.id,
                        name: p.name,
                        age: p.age,
                        sex: p.sex,
                        dateOfBirth: null,
                        contactInfo: null,
                      })}
                      className="p-1.5 rounded-lg text-ink/40 hover:text-accent hover:bg-accent/10 transition-colors"
                      title="Edit or Delete Patient"
                      aria-label={`Edit ${p.name}`}
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <Link
                      href={`/patients/${p.id}`}
                      className="inline-flex items-center gap-1 text-xs text-accent font-medium px-2.5 py-1.5 rounded-lg bg-accent/5 hover:bg-accent/10 transition-colors"
                    >
                      <span>View</span>
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
              {patients.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-ink/50">No patients found</div>
              )}
            </div>
          )}
        </div>

        {/* Edit Modal in Admin */}
        {editingPatient && (
          <EditPatientModal
            patient={editingPatient}
            isOpen={!!editingPatient}
            onClose={() => setEditingPatient(null)}
            onUpdated={fetchPatients}
            onDeleted={fetchPatients}
          />
        )}
      </main>
    </div>
  );
}
