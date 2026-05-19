"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

const MEETING_SUGGESTIONS = [
  "Software Engineer Interview",
  "Frontend Engineer Interview",
  "Backend Engineer Interview",
  "Full Stack Engineer Interview",
  "Product Manager Interview",
  "Data Scientist Interview",
  "DevOps Engineer Interview",
  "Client Sales Call",
  "Team Standup",
  "Sprint Planning",
  "Performance Review",
  "Investor Meeting",
  "General Meeting",
];

export default function LiveModePage() {
  const { user } = useUser();
  const router = useRouter();

  const [jobRole, setJobRole] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const resumeText = (user?.publicMetadata?.resumeText as string) || "";

  const filteredSuggestions = MEETING_SUGGESTIONS.filter((s) =>
    s.toLowerCase().includes(jobRole.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleStart() {
    setError("");
    setLoading(true);
    const roleToSend = jobRole.trim() || "General Meeting";
    try {
      const res = await fetch("/api/live/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobRole: roleToSend, targetCompany, resumeText }),
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

  async function handleEndSession() {
    if (!sessionCode) return;
    try {
      await fetch("/api/live/session", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sessionCode }),
      });
    } catch {
      // ignore — reset UI regardless
    }
    handleReset();
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
            <span className="text-xs text-[#d4a03a] uppercase tracking-[0.12em]">Meeting Assistant</span>
          </div>
          <h1 className="font-playfair text-4xl text-[#f0ede8] mb-3">
            Your AI Meeting Assistant
          </h1>
          <p className="text-[#7a7870] text-sm leading-relaxed">
            Start a session before any meeting -- interview, client call, standup, or sales call. Enter the code into the Whispr desktop app and get real-time AI answers only you can see.
          </p>
        </div>

        {!sessionCode ? (
          <div className="space-y-6">
            {/* Resume status */}
            <div className={`px-4 py-3 rounded-lg border text-sm ${resumeText ? "border-[#d4a03a]/20 bg-[#d4a03a]/5 text-[#d4a03a]" : "border-white/[0.06] bg-[#111114] text-[#7a7870]"}`}>
              {resumeText
                ? "Resume loaded -- responses will be tailored to your background."
                : "No resume found. Responses will be generic. Add your resume in Account settings."}
            </div>

            {/* What is this meeting about */}
            <div ref={dropdownRef} className="relative">
              <label className="block text-xs text-[#7a7870] uppercase tracking-[0.1em] mb-2">
                What is this meeting about? <span className="text-[#7a7870] normal-case tracking-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={jobRole}
                onChange={(e) => {
                  setJobRole(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                placeholder="e.g. Frontend Engineer interview, Client sales call, Team standup"
                className="w-full bg-[#111114] border border-white/[0.08] focus:border-[#d4a03a]/50 rounded-lg px-4 py-3 text-sm text-[#f0ede8] placeholder-[#7a7870]/50 outline-none transition-colors"
              />
              {dropdownOpen && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-[#111114] border border-white/[0.08] rounded-lg overflow-hidden shadow-lg">
                  {filteredSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onMouseDown={() => {
                        setJobRole(suggestion);
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#f0ede8] hover:bg-white/[0.04] transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Company or Context */}
            <div>
              <label className="block text-xs text-[#7a7870] uppercase tracking-[0.1em] mb-2">
                Company or Context <span className="text-[#7a7870] normal-case tracking-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                placeholder="e.g. Google, Q3 Sales Review, Sprint planning"
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
              {loading ? "Generating Session..." : "Start Session"}
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
              <button
                onClick={handleEndSession}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-500/30 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                End Session
              </button>
            </div>

            {/* Instructions */}
            <div className="border border-white/[0.06] rounded-xl bg-[#111114] p-6 space-y-4">
              <p className="text-xs text-[#7a7870] uppercase tracking-[0.1em]">How to use</p>
              {[
                "Open the Whispr desktop app on your Windows machine.",
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
                <p className="text-sm text-[#f0ede8] mt-0.5">{jobRole || "General Meeting"}</p>
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
