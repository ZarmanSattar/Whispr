"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function LiveModePage() {
  const { user } = useUser();
  const router = useRouter();

  const [jobRole, setJobRole] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const resumeText = (user?.publicMetadata?.resumeText as string) || "";

  async function handleStart() {
    if (!jobRole.trim()) {
      setError("Job role is required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/live/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobRole, targetCompany, resumeText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create session");
      setSessionCode(data.code);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!sessionCode) return;
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleReset() {
    setSessionCode(null);
    setJobRole("");
    setTargetCompany("");
    setError("");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#f0ede8]">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
        <span className="font-playfair text-xl text-[#f0ede8] tracking-tight">
          Whispr
        </span>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-[#7a7870] hover:text-[#f0ede8] transition-colors"
        >
          Back to Dashboard
        </button>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#d4a03a]/30 bg-[#d4a03a]/10 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[#d4a03a] animate-pulse" />
            <span className="text-xs text-[#d4a03a] uppercase tracking-[0.12em]">Live Mode</span>
          </div>
          <h1 className="font-playfair text-4xl text-[#f0ede8] mb-3">
            Real-Time Interview Assistant
          </h1>
          <p className="text-[#7a7870] text-sm leading-relaxed">
            Start a live session and enter the code into the Whispr desktop overlay.
            The overlay listens to your interview and generates answers in real time -- only visible to you.
          </p>
        </div>

        {!sessionCode ? (
          <div className="space-y-6">
            {/* Resume status */}
            <div className={`px-4 py-3 rounded-lg border text-sm ${resumeText ? "border-[#d4a03a]/20 bg-[#d4a03a]/5 text-[#d4a03a]" : "border-white/[0.06] bg-[#111114] text-[#7a7870]"}`}>
              {resumeText
                ? "Resume loaded -- answers will be personalized to your background."
                : "No resume uploaded. Answers will be generic. Upload your resume in Account settings."}
            </div>

            {/* Job Role */}
            <div>
              <label className="block text-xs text-[#7a7870] uppercase tracking-[0.1em] mb-2">
                Job Role <span className="text-[#d4a03a]">*</span>
              </label>
              <input
                type="text"
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full bg-[#111114] border border-white/[0.08] focus:border-[#d4a03a]/50 rounded-lg px-4 py-3 text-sm text-[#f0ede8] placeholder-[#7a7870]/50 outline-none transition-colors"
              />
            </div>

            {/* Target Company */}
            <div>
              <label className="block text-xs text-[#7a7870] uppercase tracking-[0.1em] mb-2">
                Target Company <span className="text-[#7a7870] normal-case tracking-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                placeholder="e.g. Google, Meta, Stripe"
                className="w-full bg-[#111114] border border-white/[0.08] focus:border-[#d4a03a]/50 rounded-lg px-4 py-3 text-sm text-[#f0ede8] placeholder-[#7a7870]/50 outline-none transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            {/* Start button */}
            <button
              onClick={handleStart}
              disabled={loading}
              className="w-full bg-[#d4a03a] text-[#0a0a0b] uppercase tracking-[0.1em] text-sm font-medium py-3.5 rounded-lg hover:bg-[#f0c060] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Generating Session..." : "Start Live Session"}
            </button>

            {/* Download section */}
            <div className="border border-white/[0.06] rounded-lg p-5 bg-[#111114]">
              <p className="text-xs text-[#7a7870] uppercase tracking-[0.1em] mb-3">Desktop Overlay</p>
              <p className="text-sm text-[#f0ede8] mb-4">
                Download the Whispr overlay app for Windows. Run it during your interview and enter your session code.
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 px-4 py-2.5 rounded-lg border border-white/[0.06] bg-[#0a0a0b] text-xs text-[#7a7870]">
                  Windows only -- requires Python 3.12
                </div>
                <button
                  disabled
                  className="px-4 py-2.5 rounded-lg border border-white/[0.06] text-xs text-[#7a7870] cursor-not-allowed opacity-50"
                >
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Session code display */}
            <div className="border border-[#d4a03a]/20 rounded-xl bg-[#d4a03a]/5 p-8 text-center">
              <p className="text-xs text-[#7a7870] uppercase tracking-[0.12em] mb-4">Your Session Code</p>
              <div className="font-playfair text-6xl text-[#d4a03a] tracking-[0.2em] mb-6">
                {sessionCode}
              </div>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#d4a03a]/30 text-sm text-[#d4a03a] hover:bg-[#d4a03a]/10 transition-colors"
              >
                {copied ? "Copied!" : "Copy Code"}
              </button>
            </div>

            {/* Instructions */}
            <div className="border border-white/[0.06] rounded-xl bg-[#111114] p-6 space-y-4">
              <p className="text-xs text-[#7a7870] uppercase tracking-[0.1em]">How to use</p>
              {[
                "Download and run the Whispr overlay app on your Windows machine.",
                "Enter the 6-digit code shown above into the overlay.",
                "Join your interview on Zoom, Meet, or Teams.",
                "The overlay will listen and generate answers automatically -- only you can see it.",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="font-playfair text-[#d4a03a] text-sm mt-0.5">{i + 1}</span>
                  <p className="text-sm text-[#7a7870] leading-relaxed">{step}</p>
                </div>
              ))}
            </div>

            {/* Session info */}
            <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-white/[0.06] bg-[#111114]">
              <div>
                <p className="text-xs text-[#7a7870]">Role</p>
                <p className="text-sm text-[#f0ede8] mt-0.5">{jobRole}</p>
              </div>
              {targetCompany && (
                <div>
                  <p className="text-xs text-[#7a7870]">Company</p>
                  <p className="text-sm text-[#f0ede8] mt-0.5">{targetCompany}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-[#7a7870]">Expires in</p>
                <p className="text-sm text-[#f0ede8] mt-0.5">4 hours</p>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-3 rounded-lg border border-white/[0.06] text-sm text-[#7a7870] hover:text-[#f0ede8] transition-colors"
            >
              Start New Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
}