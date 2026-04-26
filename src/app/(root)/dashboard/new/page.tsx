"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const experienceLevels = ["Junior", "Mid-level", "Senior", "Lead", "Manager"];

export default function NewInterviewPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    jobRole: "",
    techStack: "",
    experienceLevel: "Mid-level",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.jobRole.trim() || !form.techStack.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/interviews/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      router.push(`/dashboard/interview/${data.interviewId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-[#f0ede8]">

      {/* NAV */}
      <nav className="flex items-center justify-between px-16 py-5 border-b border-white/[0.06]">
        <span className="font-playfair text-2xl font-bold tracking-tight">
          Whisp<span className="text-[#d4a03a] italic">r</span>
        </span>
        <Link
          href="/dashboard"
          className="text-xs tracking-[0.06em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors"
        >
          ← Back to dashboard
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-20">

        {/* HEADER */}
        <div className="mb-14">
          <div className="text-[0.7rem] font-medium tracking-[0.2em] uppercase text-[#d4a03a] mb-3">
            New interview
          </div>
          <h1 className="font-playfair text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.1] tracking-[-0.02em]">
            Set up your <em className="italic text-[#d4a03a]">session.</em>
          </h1>
          <p className="text-sm text-[#7a7870] mt-3 leading-relaxed">
            Tell us about the role and we&apos;ll generate tailored interview questions using AI.
          </p>
        </div>

        {/* FORM */}
        <div className="space-y-8">

          {/* Job Role */}
          <div>
            <label className="block text-xs font-medium tracking-[0.12em] uppercase text-[#7a7870] mb-3">
              Job role
            </label>
            <input
              type="text"
              placeholder="e.g. Frontend Engineer, Product Manager, Data Scientist"
              value={form.jobRole}
              onChange={(e) => setForm({ ...form, jobRole: e.target.value })}
              className="w-full bg-[#111114] border border-white/[0.08] text-[#f0ede8] placeholder:text-[#3a3a3a] text-sm px-5 py-4 outline-none focus:border-[#d4a03a]/50 transition-colors"
            />
          </div>

          {/* Tech Stack */}
          <div>
            <label className="block text-xs font-medium tracking-[0.12em] uppercase text-[#7a7870] mb-3">
              Tech stack
            </label>
            <input
              type="text"
              placeholder="e.g. React, Node.js, PostgreSQL, AWS"
              value={form.techStack}
              onChange={(e) => setForm({ ...form, techStack: e.target.value })}
              className="w-full bg-[#111114] border border-white/[0.08] text-[#f0ede8] placeholder:text-[#3a3a3a] text-sm px-5 py-4 outline-none focus:border-[#d4a03a]/50 transition-colors"
            />
            <p className="text-xs text-[#4a4a4a] mt-2">
              Separate technologies with commas.
            </p>
          </div>

          {/* Experience Level */}
          <div>
            <label className="block text-xs font-medium tracking-[0.12em] uppercase text-[#7a7870] mb-3">
              Experience level
            </label>
            <div className="flex flex-wrap gap-3">
              {experienceLevels.map((level) => (
                <button
                  key={level}
                  onClick={() => setForm({ ...form, experienceLevel: level })}
                  className={`px-5 py-2.5 text-xs font-medium tracking-[0.08em] uppercase border transition-all ${
                    form.experienceLevel === level
                      ? "bg-[#d4a03a] text-[#0a0a0b] border-[#d4a03a]"
                      : "bg-transparent text-[#7a7870] border-white/[0.08] hover:border-white/20 hover:text-[#f0ede8]"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 tracking-wide">{error}</p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#d4a03a] text-[#0a0a0b] text-sm font-medium tracking-[0.1em] uppercase py-4 hover:bg-[#f0c060] transition-all hover:shadow-[0_8px_30px_rgba(212,160,58,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#d4a03a] disabled:hover:shadow-none"
          >
            {loading ? "Generating questions..." : "Generate interview →"}
          </button>

        </div>
      </div>
    </main>
  );
}