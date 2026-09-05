"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { NavBar } from "@/components/NavBar";
import { LabResultRow } from "@/components/LabResultRow";
import { SummaryCard } from "@/components/SummaryCard";
import { ConflictBanner } from "@/components/ConflictBanner";
import { TimelineView } from "@/components/TimelineView";
import { ClarificationPrompt } from "@/components/ClarificationPrompt";
import { ReportUpload } from "@/components/ReportUpload";
import { SourceBorder } from "@/components/SourceBorder";

const TrendChart = dynamic(
  () => import("@/components/TrendChart").then((mod) => mod.TrendChart),
  {
    loading: () => (
      <div className="h-40 rounded-xl bg-surface/50 border border-line/50 flex items-center justify-center text-xs text-ink/40 animate-pulse">
        Loading clinical trend chart…
      </div>
    ),
    ssr: false,
  }
);

const EditPatientModal = dynamic(
  () => import("@/components/EditPatientModal").then((mod) => mod.EditPatientModal),
  { ssr: false }
);
import {
  ArrowLeft, Download, User, AlertTriangle, Activity,
  Clock, Eye, EyeOff, Loader2, FileText, Plus, Edit3
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

type Tab = "record" | "timeline" | "trends" | "upload";

interface Patient {
  id: string;
  name: string;
  age: number;
  sex: string;
  dateOfBirth: string | null;
  contactInfo: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  profileEntries: Array<{
    id: string; category: string; value: string; notes: string | null; source: string; enteredAt: string;
  }>;
  reports: Array<{
    id: string; originalFilename: string; reportDate: string | null;
    uploadedAt: string; processingStatus: string;
    labResults: LabResult[];
  }>;
  labResults: LabResult[];
  summaries: Array<{
    id: string; summaryText: string; generatedAt: string; modelVersion: string;
    source: string; disclaimerShown: boolean;
  }>;
  inconsistencies: Array<{
    id: string; type: string; description: string;
    relatedLabResultIds: string[]; resolved: boolean;
  }>;
  auditLogs: Array<{
    id: string; action: string; entityType: string; entityId: string;
    actorId: string; timestamp: string; details: Record<string, unknown> | null;
  }>;
}

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
  verifiedAt: string | null;
  reportId: string;
  report?: { reportDate: string | null; originalFilename: string };
}

export default function PatientDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("record");
  const [showRawSource, setShowRawSource] = useState(false);
  const [clarificationQuestions, setClarificationQuestions] = useState<string[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [filterFlag, setFilterFlag] = useState<string>("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);

  const fetchPatient = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${id}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Patient not found");
      setPatient(data.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load patient");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchPatient(); }, [fetchPatient]);

  const handleVerify = async (labResultId: string) => {
    setPatient((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        labResults: prev.labResults.map((lr) =>
          lr.id === labResultId ? { ...lr, verifiedByClinician: true } : lr
        ),
        reports: prev.reports.map((r) => ({
          ...r,
          labResults: r.labResults.map((lr) =>
            lr.id === labResultId ? { ...lr, verifiedByClinician: true } : lr
          ),
        })),
      };
    });

    try {
      await fetch(`/api/lab-results/${labResultId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify" }),
      });
    } catch {
      fetchPatient();
    }
  };

  const handleEdit = async (labResultId: string, data: Record<string, unknown>) => {
    setPatient((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        labResults: prev.labResults.map((lr) =>
          lr.id === labResultId ? ({ ...lr, ...data, verifiedByClinician: true } as LabResult) : lr
        ),
        reports: prev.reports.map((r) => ({
          ...r,
          labResults: r.labResults.map((lr) =>
            lr.id === labResultId ? ({ ...lr, ...data, verifiedByClinician: true } as LabResult) : lr
          ),
        })),
      };
    });

    const res = await fetch(`/api/lab-results/${labResultId}/verify`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "edit", ...data }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      fetchPatient();
      throw new Error(json.error ?? "Edit failed");
    }
  };

  const handleReject = async (labResultId: string) => {
    setPatient((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        labResults: prev.labResults.map((lr) =>
          lr.id === labResultId ? { ...lr, verifiedByClinician: false } : lr
        ),
        reports: prev.reports.map((r) => ({
          ...r,
          labResults: r.labResults.map((lr) =>
            lr.id === labResultId ? { ...lr, verifiedByClinician: false } : lr
          ),
        })),
      };
    });

    await fetch(`/api/lab-results/${labResultId}/verify`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" }),
    });
  };

  const handleResolveInconsistency = async (flagId: string) => {
    setPatient((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        inconsistencies: prev.inconsistencies.filter((f) => f.id !== flagId),
      };
    });

    try {
      await fetch(`/api/inconsistencies/${flagId}/resolve`, { method: "PATCH" });
    } catch {
      fetchPatient();
    }
  };

  const handleGenerateSummary = async () => {
    const res = await fetch("/api/summaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: id }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error ?? "Summary generation failed");
    fetchPatient();
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const res = await fetch(`/api/export/${id}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `medlens-${patient?.name?.replace(/\s+/g, "-").toLowerCase() ?? "record"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Export failed. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  const handleUploadSuccess = (data: {
    report: { id: string; originalFilename: string };
    clarificationQuestions?: string[];
  }) => {
    if (data.clarificationQuestions?.length) {
      setClarificationQuestions(data.clarificationQuestions);
    }
    fetchPatient();
    setActiveTab("record");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper">
        <NavBar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-pulse">
          <div className="h-4 bg-cream-200 rounded w-24 mb-4" />
          <div className="flex gap-6 items-start">
            <aside className="w-56 shrink-0 space-y-3 hidden lg:block">
              <div className="bg-surface border border-line rounded-lg p-4 space-y-3">
                <div className="w-12 h-12 rounded-full bg-cream-200" />
                <div className="h-5 bg-cream-200 rounded w-3/4" />
                <div className="h-3 bg-cream-100 rounded w-1/2" />
              </div>
              <div className="bg-surface border border-line rounded-lg p-3 h-24" />
              <div className="h-10 bg-cream-200 rounded-xl" />
            </aside>
            <div className="flex-1 space-y-4">
              <div className="h-11 bg-cream-200/80 rounded-xl w-72" />
              <div className="bg-surface border border-line rounded-xl p-6 h-64 space-y-4">
                <div className="h-5 bg-cream-200 rounded w-1/3" />
                <div className="h-4 bg-cream-100 rounded w-full" />
                <div className="h-4 bg-cream-100 rounded w-5/6" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-paper">
        <NavBar />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <AlertTriangle className="h-10 w-10 text-flag-high mx-auto mb-3" />
          <h1 className="font-serif text-xl font-semibold text-ink mb-2">Patient not found</h1>
          <p className="text-sm text-ink/60 mb-4">{error ?? "This patient record does not exist or you do not have access."}</p>
          <Link href="/dashboard" className="text-sm text-accent hover:text-accent/80">← Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const symptoms = patient.profileEntries.filter(e => e.category === "symptom");
  const conditions = patient.profileEntries.filter(e => e.category === "existing_condition");
  const allergies = patient.profileEntries.filter(e => e.category === "allergy");
  const medications = patient.profileEntries.filter(e => e.category === "medication");
  const otherEntries = patient.profileEntries.filter(e => e.category === "other");

  // Filter lab results
  const filteredLabResults = patient.labResults.filter(lr => {
    if (filterFlag !== "all" && lr.flag !== filterFlag) return false;
    if (filterSearch && !lr.testName.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  // Group lab results by report date for trend charts
  const testGroups = new Map<string, LabResult[]>();
  for (const lr of patient.labResults) {
    const key = lr.testName.toLowerCase();
    const group = testGroups.get(key) ?? [];
    group.push(lr);
    testGroups.set(key, group);
  }
  const repeatedTests = Array.from(testGroups.entries()).filter(([, r]) => r.length >= 2);

  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: "record", label: "Record", icon: FileText },
    { id: "trends", label: "Trends", icon: Activity },
    { id: "timeline", label: "Timeline", icon: Clock },
    { id: "upload", label: "Upload Report", icon: Plus },
  ];

  return (
    <div className="min-h-screen bg-paper">
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>

        {/* ── Two-column layout ── */}
        <div className="flex gap-6 items-start">
          {/* ── Left rail — patient snapshot ── */}
          <aside className="w-56 shrink-0 sticky top-20 space-y-3 hidden lg:block">
            {/* Identity */}
            <div className="bg-surface border border-line rounded-lg p-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-3">
                <User className="h-6 w-6 text-accent" aria-hidden="true" />
              </div>
              <h1 className="font-serif text-base font-semibold text-ink leading-tight">{patient.name}</h1>
              <p className="text-sm text-ink/60 font-mono mt-0.5">{patient.age} · {patient.sex}</p>
              {patient.dateOfBirth && (
                <p className="text-xs text-ink/40 mt-0.5">DOB: {formatDate(patient.dateOfBirth)}</p>
              )}
              {patient.contactInfo && (
                <p className="text-xs text-ink/50 mt-2 break-words">{patient.contactInfo}</p>
              )}
            </div>

            {/* Allergies — safety critical, pinned */}
            <div className={cn(
              "rounded-lg p-3 border",
              allergies.length > 0 && !allergies.some(a => a.value === "No known allergies")
                ? "bg-flag-high/5 border-flag-high/30"
                : "bg-surface border-line"
            )}>
              <p className="text-xs font-medium text-ink mb-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-flag-high shrink-0" aria-hidden="true" />
                Allergies
              </p>
              {allergies.length === 0 ? (
                <p className="text-xs text-ink/40 italic">Not recorded</p>
              ) : (
                <ul className="space-y-0.5">
                  {allergies.map(a => (
                    <li key={a.id} className="text-xs text-ink/80">{a.value}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Stats */}
            <div className="bg-surface border border-line rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-ink/50">Reports</span>
                <span className="font-mono text-ink">{patient.reports.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-ink/50">Lab results</span>
                <span className="font-mono text-ink">{patient.labResults.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-ink/50">Verified</span>
                <span className="font-mono text-flag-normal">
                  {patient.labResults.filter(lr => lr.verifiedByClinician).length}
                </span>
              </div>
              {patient.inconsistencies.length > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-flag-low">Inconsistencies</span>
                  <span className="font-mono text-flag-low">{patient.inconsistencies.length}</span>
                </div>
              )}
            </div>

              {/* Export */}
              <button
                onClick={handleExport}
                disabled={exportLoading}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-line bg-surface",
                  "text-sm font-semibold text-ink hover:bg-cream-50 hover:border-line/90 active:scale-98 transition-all shadow-xs",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
                  "disabled:opacity-40"
                )}
              >
                {exportLoading
                  ? <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  : <Download className="h-4 w-4 text-accent" />}
                {exportLoading ? "Generating…" : "Export PDF"}
              </button>

              {/* Edit / Manage Patient Record */}
              <button
                onClick={() => setEditModalOpen(true)}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-accent/25 bg-accent-50/60",
                  "text-sm font-semibold text-accent hover:bg-accent-50 hover:border-accent/40 active:scale-98 transition-all shadow-2xs",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                )}
              >
                <Edit3 className="h-4 w-4" />
                Edit Patient Record
              </button>
            </aside>

            {/* Edit Patient Modal */}
            {patient && (
              <EditPatientModal
                patient={patient}
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                onUpdated={fetchPatient}
                onDeleted={() => router.push("/dashboard")}
              />
            )}

          {/* ── Right panel ── */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Inconsistency banner */}
            {patient.inconsistencies.length > 0 && (
              <ConflictBanner
                flags={patient.inconsistencies}
                onResolve={handleResolveInconsistency}
              />
            )}

            {/* Clarification questions */}
            {clarificationQuestions.length > 0 && (
              <ClarificationPrompt
                questions={clarificationQuestions}
                patientId={patient.id}
                onAnswered={() => {
                  setClarificationQuestions([]);
                  fetchPatient();
                }}
              />
            )}

            {/* Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-cream-200/60 border border-line/80 rounded-xl">
              {tabs.map(({ id: tabId, label, icon: Icon }) => (
                <button
                  key={tabId}
                  onClick={() => setActiveTab(tabId)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all active:scale-95",
                    activeTab === tabId
                      ? "bg-surface text-accent shadow-xs font-semibold"
                      : "text-ink/65 hover:text-ink hover:bg-surface/60 font-medium"
                  )}
                  aria-selected={activeTab === tabId}
                  role="tab"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>

            {/* ── Record Tab ── */}
            {activeTab === "record" && (
              <div className="space-y-6">
                {/* Patient-Provided Information */}
                <section>
                  <h2 className="font-serif text-lg font-semibold text-ink mb-3">Patient-Provided Information</h2>
                  <div className="bg-surface border border-line rounded-lg divide-y divide-line">
                    {[
                      { label: "Chief complaints / Symptoms", items: symptoms },
                      { label: "Existing conditions", items: conditions },
                      { label: "Medications", items: medications },
                      { label: "Other notes", items: otherEntries },
                    ].map(({ label, items }) => (
                      items.length > 0 && (
                        <div key={label} className="px-4 py-3">
                          <p className="text-xs font-medium text-ink/50 mb-2">{label}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {items.map(item => (
                              <SourceBorder key={item.id} source="user-entered">
                                <span className="text-sm text-ink">
                                  {item.value}
                                  {item.notes && (
                                    <span className="text-ink/50 ml-1">({item.notes})</span>
                                  )}
                                </span>
                              </SourceBorder>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                    {patient.profileEntries.length === 0 && (
                      <div className="px-4 py-6 text-sm text-ink/50 text-center">
                        No patient-provided information on record.
                      </div>
                    )}
                  </div>
                </section>

                {/* Lab Results */}
                <section>
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h2 className="font-serif text-lg font-semibold text-ink">Lab Results</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Source toggle */}
                      <button
                        onClick={() => setShowRawSource(v => !v)}
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border border-line text-ink/60 hover:bg-ink/5 transition-colors"
                        aria-pressed={showRawSource}
                      >
                        {showRawSource ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        {showRawSource ? "Hide" : "Show"} source
                      </button>
                      {/* Flag filter */}
                      <select
                        value={filterFlag}
                        onChange={e => setFilterFlag(e.target.value)}
                        className="text-xs border border-line rounded px-2 py-1.5 bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                        aria-label="Filter by flag"
                      >
                        <option value="all">All flags</option>
                        <option value="high">High</option>
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="unknown">No range</option>
                      </select>
                      {/* Search */}
                      <input
                        type="search"
                        placeholder="Filter by test name…"
                        value={filterSearch}
                        onChange={e => setFilterSearch(e.target.value)}
                        className="text-xs border border-line rounded px-2.5 py-1.5 bg-surface w-36 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent placeholder:text-ink/30"
                        aria-label="Filter lab results by test name"
                      />
                    </div>
                  </div>

                  {filteredLabResults.length === 0 ? (
                    <div className="bg-surface border border-line rounded-lg px-4 py-8 text-center">
                      <FileText className="h-10 w-10 text-ink/20 mx-auto mb-2" />
                      <p className="text-sm text-ink/60 mb-1">
                        {patient.labResults.length === 0
                          ? "No lab results yet."
                          : "No results match your filters."}
                      </p>
                      {patient.labResults.length === 0 && (
                        <button
                          onClick={() => setActiveTab("upload")}
                          className="text-sm text-accent hover:text-accent/80 mt-1"
                        >
                          Upload a report to begin building this patient&apos;s record →
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="bg-surface border border-line rounded-lg divide-y divide-line">
                      {/* Group by report */}
                      {patient.reports
                        .filter(r => r.labResults.some(lr =>
                          filteredLabResults.find(f => f.id === lr.id)
                        ))
                        .map(report => (
                          <div key={report.id}>
                            <div className="px-4 py-2 bg-ink/2 border-b border-line flex items-center gap-2">
                              <FileText className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                              <span className="text-xs font-medium text-ink/70">{report.originalFilename}</span>
                              {report.reportDate && (
                                <span className="text-xs text-ink/40 font-mono">{formatDate(report.reportDate)}</span>
                              )}
                              <span className={cn(
                                "text-2xs px-1.5 py-0.5 rounded border ml-auto",
                                report.processingStatus === "processed" && "text-flag-normal border-flag-normal/30 bg-flag-normal/8",
                                report.processingStatus === "needs_review" && "text-flag-low border-flag-low/30 bg-flag-low/8",
                                report.processingStatus === "failed" && "text-flag-high border-flag-high/30 bg-flag-high/8",
                              )}>
                                {report.processingStatus}
                              </span>
                            </div>
                            <div className="divide-y divide-line">
                              {report.labResults
                                .filter(lr => filteredLabResults.find(f => f.id === lr.id))
                                .map(lr => (
                                  <div key={lr.id} className="px-4">
                                    <LabResultRow
                                      result={{ ...lr, report: { reportDate: report.reportDate, originalFilename: report.originalFilename } }}
                                      onVerify={handleVerify}
                                      onEdit={handleEdit}
                                      onReject={handleReject}
                                      showRawSource={showRawSource}
                                    />
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </section>

                {/* AI Summary */}
                <section>
                  <h2 className="font-serif text-lg font-semibold text-ink mb-3">AI Summary</h2>
                  <SummaryCard
                    summary={patient.summaries[0] ?? null}
                    patientId={patient.id}
                    onRegenerate={handleGenerateSummary}
                  />
                </section>
              </div>
            )}

            {/* ── Trends Tab ── */}
            {activeTab === "trends" && (
              <div className="space-y-4">
                <h2 className="font-serif text-lg font-semibold text-ink">Lab Result Trends</h2>
                {repeatedTests.length === 0 ? (
                  <div className="bg-surface border border-line rounded-lg p-8 text-center">
                    <Activity className="h-10 w-10 text-ink/20 mx-auto mb-2" />
                    <p className="text-sm text-ink/60">
                      Trends appear when the same test has results across multiple reports.
                      Upload additional reports to see trend charts.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {repeatedTests.map(([, results]) => (
                      <TrendChart
                        key={results[0].testName}
                        testName={results[0].testName}
                        results={results.map((lr: LabResult) => ({
                          ...lr,
                          report: patient.reports.find(r => r.id === lr.reportId) ?? { reportDate: null, originalFilename: "" },
                        }))}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Timeline Tab ── */}
            {activeTab === "timeline" && (
              <div className="space-y-3">
                <h2 className="font-serif text-lg font-semibold text-ink">Activity Timeline</h2>
                <div className="bg-surface border border-line rounded-lg p-4">
                  <TimelineView
                    auditLogs={patient.auditLogs}
                    reports={patient.reports}
                  />
                </div>
              </div>
            )}

            {/* ── Upload Tab ── */}
            {activeTab === "upload" && (
              <div className="space-y-3">
                <h2 className="font-serif text-lg font-semibold text-ink">Upload Report</h2>
                <p className="text-sm text-ink/60">
                  Upload a PDF or image lab report. Text will be extracted automatically and lab results
                  identified with AI. All extracted data is tagged as <span className="text-accent font-medium">ai-extracted</span> until
                  a clinician verifies it.
                </p>
                <div className="bg-surface border border-line rounded-lg p-5">
                  <ReportUpload patientId={patient.id} onSuccess={handleUploadSuccess} />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
