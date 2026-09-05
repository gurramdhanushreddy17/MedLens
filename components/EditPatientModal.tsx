"use client";

import { useState } from "react";
import { X, Loader2, Edit3, Trash2, AlertCircle } from "lucide-react";

interface EditPatientModalProps {
  patient: {
    id: string;
    name: string;
    age: number;
    sex: string;
    dateOfBirth: string | null;
    contactInfo: string | null;
  };
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

export function EditPatientModal({
  patient,
  isOpen,
  onClose,
  onUpdated,
  onDeleted,
}: EditPatientModalProps) {
  const [name, setName] = useState(patient.name);
  const [age, setAge] = useState(String(patient.age));
  const [sex, setSex] = useState(patient.sex);
  const [dateOfBirth, setDateOfBirth] = useState(
    patient.dateOfBirth ? patient.dateOfBirth.split("T")[0] : ""
  );
  const [contactInfo, setContactInfo] = useState(patient.contactInfo ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 150) {
      setError("Please provide a valid age between 0 and 150.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/patients/${patient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          age: parsedAge,
          sex,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
          contactInfo: contactInfo.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Failed to update patient record");
      }

      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patient.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Failed to delete patient record");
      }
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-surface border border-line rounded-xl shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-cream-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <Edit3 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-semibold text-ink">
                Edit Patient Record
              </h2>
              <p className="text-xs text-ink/60">
                Update demographic information or manage record
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink/40 hover:text-ink hover:bg-ink/5 transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-flag-high/10 border border-flag-high/30 rounded-lg text-sm text-flag-high">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-ink/80 block mb-1.5">
              Full Legal Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full text-sm border border-line rounded-lg px-3.5 py-2.5 bg-paper focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-ink/80 block mb-1.5">
                Age
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
                min="0"
                max="150"
                className="w-full text-sm border border-line rounded-lg px-3.5 py-2.5 bg-paper focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink/80 block mb-1.5">
                Sex at Birth
              </label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full text-sm border border-line rounded-lg px-3.5 py-2.5 bg-paper focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-ink/80 block mb-1.5">
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full text-sm border border-line rounded-lg px-3.5 py-2 bg-paper focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink/80 block mb-1.5">
                Contact Details
              </label>
              <input
                type="text"
                placeholder="Email or phone"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                className="w-full text-sm border border-line rounded-lg px-3.5 py-2.5 bg-paper focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
              />
            </div>
          </div>

          {/* Delete Danger Section */}
          <div className="pt-3 border-t border-line">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 text-xs text-flag-high hover:text-red-700 font-medium transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete this patient record…
              </button>
            ) : (
              <div className="p-3.5 bg-flag-high/5 border border-flag-high/30 rounded-lg space-y-2.5 animate-fade-in">
                <p className="text-xs text-ink/80 font-medium">
                  Are you sure you want to permanently delete{" "}
                  <span className="font-semibold text-flag-high">{patient.name}</span>?
                  All associated reports, lab results, and AI summaries will be removed.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-3 py-1.5 rounded-lg bg-flag-high text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 shadow-sm"
                  >
                    {deleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    {deleting ? "Deleting…" : "Yes, permanently delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded-lg border border-line bg-surface text-ink/70 text-xs font-medium hover:bg-paper transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-line bg-surface text-sm font-medium text-ink/70 hover:bg-cream-100 hover:text-ink active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || deleting}
              className="px-5 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover active:scale-95 disabled:opacity-50 transition-all shadow-xs flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving changes…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
