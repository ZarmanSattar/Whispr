"use client";

import { useState, useEffect } from "react";

interface EducationEntry {
  id: string;
  degree: string;
  fieldOfStudy: string;
  institution: string;
  graduationYear: number | null;
  gpa: string | null;
}

interface FormState {
  degree: string;
  fieldOfStudy: string;
  institution: string;
  graduationYear: string;
  gpa: string;
}

const EMPTY_FORM: FormState = {
  degree: "BS",
  fieldOfStudy: "",
  institution: "",
  graduationYear: "",
  gpa: "",
};

const DEGREE_OPTIONS = ["BS", "MS", "PhD", "Associate", "Bootcamp", "Self-taught", "Other"];
const CURRENT_YEAR = new Date().getUTCFullYear();

function entryToForm(e: EducationEntry): FormState {
  return {
    degree: e.degree,
    fieldOfStudy: e.fieldOfStudy,
    institution: e.institution,
    graduationYear: e.graduationYear !== null ? String(e.graduationYear) : "",
    gpa: e.gpa ?? "",
  };
}

function formatYear(year: number | null): string {
  if (year === null) return "";
  return year > CURRENT_YEAR ? `Expected ${year}` : String(year);
}

export default function EducationEditor() {
  const [entries, setEntries] = useState<EducationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/education")
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.education ?? []);
        setLoading(false);
      })
      .catch(() => {
        setFetchError("Failed to load education entries.");
        setLoading(false);
      });
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (entry: EducationEntry) => {
    setEditingId(entry.id);
    setForm(entryToForm(entry));
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormError("");
  };

  const handleSave = async () => {
    if (!form.degree || !form.fieldOfStudy.trim() || !form.institution.trim()) {
      setFormError("Degree, field of study, and institution are required.");
      return;
    }
    setSaving(true);
    setFormError("");

    const payload = {
      degree: form.degree,
      fieldOfStudy: form.fieldOfStudy.trim(),
      institution: form.institution.trim(),
      graduationYear: form.graduationYear ? Number(form.graduationYear) : null,
      gpa: form.gpa.trim() || null,
    };

    try {
      if (editingId) {
        const res = await fetch(`/api/education/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update.");
        const updated: EducationEntry = await res.json();
        setEntries((prev) => prev.map((e) => (e.id === editingId ? updated : e)));
      } else {
        const res = await fetch("/api/education", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to add.");
        const created: EducationEntry = await res.json();
        setEntries((prev) => [...prev, created]);
      }
      closeForm();
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/education/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete.");
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setConfirmDeleteId(null);
      if (editingId === id) closeForm();
    } catch {
      // silently reset — entry stays visible so user can retry
    } finally {
      setDeleting(false);
    }
  };

  const field = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div>
      {/* Section heading */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-playfair text-xl font-bold text-[#f0ede8] border-l-2 border-[#d4a03a] pl-3">
          Education
        </h2>
        {!loading && entries.length < 5 && (
          <button
            onClick={openAdd}
            className="text-xs tracking-[0.1em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors"
          >
            + Add Education
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <p className="text-sm text-[#7a7870]">Loading...</p>
      )}

      {/* Fetch error */}
      {fetchError && (
        <p className="text-sm text-red-400">{fetchError}</p>
      )}

      {/* Empty state */}
      {!loading && !fetchError && entries.length === 0 && (
        <p className="text-sm text-[#7a7870]">No education added yet.</p>
      )}

      {/* Entry list */}
      {!loading && entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id}>
              <div className="bg-[#111114] border border-white/[0.06] p-5 hover:border-white/[0.12] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#f0ede8]">
                      {entry.degree} in {entry.fieldOfStudy}
                    </div>
                    <div className="text-xs text-[#7a7870] mt-0.5">
                      {entry.institution}
                      {entry.graduationYear !== null
                        ? ` - ${formatYear(entry.graduationYear)}`
                        : ""}
                    </div>
                    {entry.gpa && (
                      <span className="inline-block mt-1.5 bg-[#d4a03a]/10 text-[#d4a03a] text-xs px-2 py-0.5">
                        GPA: {entry.gpa}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0 mt-0.5">
                    <button
                      onClick={() => openEdit(entry)}
                      className="text-[#7a7870] hover:text-[#f0ede8] transition-colors"
                      aria-label="Edit"
                    >
                      {/* Pencil icon */}
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-[1.5]">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() =>
                        setConfirmDeleteId(
                          confirmDeleteId === entry.id ? null : entry.id
                        )
                      }
                      className="text-[#7a7870] hover:text-red-400 transition-colors"
                      aria-label="Delete"
                    >
                      {/* Trash icon */}
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-[1.5]">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Inline delete confirmation */}
                {confirmDeleteId === entry.id && (
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.06]">
                    <span className="text-xs text-[#7a7870]">Are you sure?</span>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deleting}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs text-[#7a7870] hover:text-[#f0ede8] transition-colors"
                    >
                      No
                    </button>
                  </div>
                )}
              </div>

              {/* Inline edit form anchored below the entry being edited */}
              {showForm && editingId === entry.id && (
                <InlineForm
                  form={form}
                  onChange={field}
                  onSave={handleSave}
                  onCancel={closeForm}
                  saving={saving}
                  error={formError}
                  isEdit
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add form (shown at the bottom when adding) */}
      {showForm && editingId === null && (
        <InlineForm
          form={form}
          onChange={field}
          onSave={handleSave}
          onCancel={closeForm}
          saving={saving}
          error={formError}
          isEdit={false}
        />
      )}
    </div>
  );
}

// ── Inline form ───────────────────────────────────────────────────────────────

interface InlineFormProps {
  form: FormState;
  onChange: (key: keyof FormState, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string;
  isEdit: boolean;
}

function InlineForm({ form, onChange, onSave, onCancel, saving, error, isEdit }: InlineFormProps) {
  const inputClass =
    "bg-[#111114] border border-white/[0.08] focus:border-[#d4a03a]/50 text-sm text-[#f0ede8] px-3 py-2 outline-none transition-colors w-full";
  const selectClass =
    "bg-[#111114] border border-white/[0.08] focus:border-[#d4a03a]/50 text-sm text-[#7a7870] px-3 py-2 outline-none transition-colors w-full";

  return (
    <div className="bg-[#18181c] border border-white/[0.06] p-6 mt-3">
      <div className="text-xs tracking-[0.1em] uppercase text-[#7a7870] mb-4">
        {isEdit ? "Edit entry" : "New entry"}
      </div>

      <div className="space-y-3">
        {/* Degree */}
        <div>
          <label className="block text-xs tracking-[0.08em] uppercase text-[#7a7870] mb-1">
            Degree
          </label>
          <select
            value={form.degree}
            onChange={(e) => onChange("degree", e.target.value)}
            className={selectClass}
          >
            {DEGREE_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Field of Study */}
        <div>
          <label className="block text-xs tracking-[0.08em] uppercase text-[#7a7870] mb-1">
            Field of Study
          </label>
          <input
            type="text"
            value={form.fieldOfStudy}
            onChange={(e) => onChange("fieldOfStudy", e.target.value)}
            placeholder="e.g. Computer Science"
            className={inputClass}
          />
        </div>

        {/* Institution */}
        <div>
          <label className="block text-xs tracking-[0.08em] uppercase text-[#7a7870] mb-1">
            Institution
          </label>
          <input
            type="text"
            value={form.institution}
            onChange={(e) => onChange("institution", e.target.value)}
            placeholder="e.g. MIT"
            className={inputClass}
          />
        </div>

        {/* Graduation Year + GPA side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs tracking-[0.08em] uppercase text-[#7a7870] mb-1">
              Graduation Year
            </label>
            <input
              type="number"
              value={form.graduationYear}
              onChange={(e) => onChange("graduationYear", e.target.value)}
              placeholder="e.g. 2023"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs tracking-[0.08em] uppercase text-[#7a7870] mb-1">
              GPA
            </label>
            <input
              type="text"
              value={form.gpa}
              onChange={(e) => onChange("gpa", e.target.value)}
              placeholder="e.g. 3.8 / 4.0"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 mt-3">{error}</p>
      )}

      <div className="flex gap-3 mt-5">
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-[#d4a03a] text-[#0a0a0b] text-xs font-medium tracking-[0.1em] uppercase px-6 py-3 hover:bg-[#f0c060] transition-all disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="border border-white/[0.12] text-[#7a7870] text-xs font-medium tracking-[0.1em] uppercase px-6 py-3 hover:text-[#f0ede8] hover:border-white/20 transition-all disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
