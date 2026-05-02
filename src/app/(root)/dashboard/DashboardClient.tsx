"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { deleteInterview } from "./actions/deleteInterview";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import SignOutConfirm from "./account/SignOutConfirm";

interface Interview {
  id: string;
  jobRole: string;
  techStack: string;
  experienceLevel: string;
  createdAt: Date | null;
  avgScore: number | null;
  totalQuestions: number;
  answeredQuestions: number;
}

interface Props {
  interviews: Interview[];
  firstName: string;
  totalSessions: number;
  totalAnswered: number;
  avgScore: number | null;
}

type SortKey = "date" | "score" | "role";
type FilterLevel = "all" | "Junior" | "Mid-level" | "Senior" | "Lead" | "Manager";

// ─── Animated counter ────────────────────────────────────────────────────────
function useCountUp(target: number | null, duration = 1000) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) return;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.round(progress * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return target === null ? null : value;
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-[#111114] animate-pulse">
      {/* mobile */}
      <div className="sm:hidden px-4 py-4">
        <div className="flex items-start gap-2 mb-3">
          <div className="h-4 w-32 bg-white/[0.06] rounded" />
          <div className="h-4 w-16 bg-white/[0.06] rounded" />
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-3 w-48 bg-white/[0.06] rounded" />
          <div className="h-3 w-24 bg-white/[0.06] rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-12 bg-white/[0.06] rounded" />
          <div className="h-6 w-12 bg-white/[0.06] rounded" />
          <div className="h-6 w-12 bg-white/[0.06] rounded" />
        </div>
      </div>
      {/* desktop */}
      <div className="hidden sm:flex items-center justify-between px-8 py-6 gap-4">
        <div className="flex items-center gap-8 flex-1">
          <div className="flex-shrink-0 text-center w-12 space-y-1.5">
            <div className="h-7 w-8 mx-auto bg-white/[0.06] rounded" />
            <div className="h-2.5 w-8 mx-auto bg-white/[0.06] rounded" />
            <div className="h-2.5 w-8 mx-auto bg-white/[0.06] rounded" />
          </div>
          <div className="w-px h-10 bg-white/[0.06]" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-3 items-center">
              <div className="h-4 w-40 bg-white/[0.06] rounded" />
              <div className="h-4 w-16 bg-white/[0.06] rounded" />
            </div>
            <div className="flex gap-3 items-center">
              <div className="h-3 w-56 bg-white/[0.06] rounded" />
              <div className="h-3 w-20 bg-white/[0.06] rounded" />
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="h-7 w-12 bg-white/[0.06] rounded" />
          <div className="h-7 w-14 bg-white/[0.06] rounded" />
          <div className="h-7 w-12 bg-white/[0.06] rounded" />
        </div>
      </div>
    </div>
  );
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111114] border border-white/[0.08] px-3 py-2 text-xs text-[#f0ede8]">
      <div className="text-[#7a7870] mb-0.5">{label}</div>
      <div className="text-[#d4a03a] font-bold">{payload[0].value}/100</div>
    </div>
  );
}

// ─── Stat card with count-up ──────────────────────────────────────────────────
function StatCard({ label, value }: { label: string; value: number | null }) {
  const animated = useCountUp(value);
  return (
    <div className="bg-[#0a0a0b] px-4 sm:px-8 py-5 sm:py-6">
      <div className="font-playfair text-3xl font-bold text-[#d4a03a]">
        {value === null ? "--" : animated}
      </div>
      <div className="text-xs tracking-[0.1em] uppercase text-[#7a7870] mt-1">
        {label}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardClient({
  interviews,
  firstName,
  totalSessions,
  totalAnswered,
  avgScore,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [filterLevel, setFilterLevel] = useState<FilterLevel>("all");
  const [clientReady, setClientReady] = useState(false);

  // Defer skeleton → real cards until after hydration
  useEffect(() => {
    setClientReady(true);
  }, []);

  const confirmDelete = (id: string) => setDeleteId(id);
  const cancelDelete = () => setDeleteId(null);

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteInterview(id);
      setDeleteId(null);
    });
  };

  const handleRetry = (interview: Interview) => {
    router.push(
      `/dashboard/new?role=${encodeURIComponent(interview.jobRole)}&stack=${encodeURIComponent(interview.techStack)}&level=${encodeURIComponent(interview.experienceLevel)}`
    );
  };

  const getStatus = (interview: Interview) => {
    if (interview.answeredQuestions === 0) return "not_started";
    if (interview.answeredQuestions >= interview.totalQuestions) return "completed";
    return "in_progress";
  };

  const filtered = interviews
    .filter((i) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        i.jobRole.toLowerCase().includes(q) ||
        i.techStack.toLowerCase().includes(q);
      const matchesLevel =
        filterLevel === "all" || i.experienceLevel === filterLevel;
      return matchesSearch && matchesLevel;
    })
    .sort((a, b) => {
      if (sortKey === "date")
        return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
      if (sortKey === "score")
        return (b.avgScore ?? -1) - (a.avgScore ?? -1);
      if (sortKey === "role")
        return a.jobRole.localeCompare(b.jobRole);
      return 0;
    });

  // ── Chart data: sessions with scores sorted by date ───────────────────────
  const chartData = interviews
    .filter((i) => i.avgScore !== null)
    .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime())
    .map((i) => ({
      date: i.createdAt
        ? new Date(i.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          })
        : "--",
      score: i.avgScore as number,
    }));
  const showChart = chartData.length >= 2;

  // ── Best / worst role analysis ─────────────────────────────────────────────
  const roleScores: Record<string, number[]> = {};
  for (const i of interviews) {
    if (i.avgScore !== null) {
      if (!roleScores[i.jobRole]) roleScores[i.jobRole] = [];
      roleScores[i.jobRole].push(i.avgScore);
    }
  }
  const roleAvgs = Object.entries(roleScores)
    .map(([role, scores]) => ({
      role,
      avg: Math.round(scores.reduce((s, n) => s + n, 0) / scores.length),
    }))
    .sort((a, b) => b.avg - a.avg);
  const showInsights = roleAvgs.length >= 2;
  const bestRole = roleAvgs[0];
  const worstRole = roleAvgs[roleAvgs.length - 1];

  const statusBadge = (interview: Interview) => {
    const status = getStatus(interview);
    if (status === "completed")
      return (
        <span className="whitespace-nowrap text-[0.6rem] tracking-[0.1em] uppercase px-2 py-1 bg-[#d4a03a]/10 text-[#d4a03a] border border-[#d4a03a]/20">
          Completed
        </span>
      );
    if (status === "in_progress")
      return (
        <span className="whitespace-nowrap text-[0.6rem] tracking-[0.1em] uppercase px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20">
          In Progress
        </span>
      );
    return (
      <span className="whitespace-nowrap text-[0.6rem] tracking-[0.1em] uppercase px-2 py-1 bg-white/[0.04] text-[#7a7870] border border-white/[0.06]">
        Not Started
      </span>
    );
  };

  const formatDate = (date: Date | null) => {
    if (!date) return { day: "--", month: "--", time: "--" };
    const d = new Date(date);
    return {
      day: d.getUTCDate().toString(),
      month: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      time: `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`,
    };
  };

  const timeAgo = (date: Date | null) => {
    if (!date) return "";
    const d = new Date(date);
    const diffDays = Math.floor(
      (d.getUTCFullYear() * 365 + d.getUTCMonth() * 30 + d.getUTCDate()) -
        (new Date().getUTCFullYear() * 365 +
          new Date().getUTCMonth() * 30 +
          new Date().getUTCDate())
    );
    const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.abs(diffDays)}d ago`;
  };

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-[#f0ede8]">

      {/* DELETE CONFIRMATION MODAL */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111114] border border-white/[0.08] p-8 max-w-sm w-full mx-4">
            <h3 className="font-playfair text-xl font-bold mb-3">Delete session?</h3>
            <p className="text-sm text-[#7a7870] leading-relaxed mb-8">
              This will permanently remove the interview, all questions, and all answers. This cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={isPending}
                className="bg-red-500/80 text-white text-xs font-medium tracking-[0.1em] uppercase px-6 py-3 hover:bg-red-500 transition-all disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Yes, delete"}
              </button>
              <button
                onClick={cancelDelete}
                className="border border-white/[0.12] text-[#7a7870] text-xs font-medium tracking-[0.1em] uppercase px-6 py-3 hover:text-[#f0ede8] hover:border-white/20 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className="flex items-center justify-between px-4 sm:px-8 md:px-16 py-5 border-b border-white/[0.06]">
        <Link href="/" className="font-playfair text-2xl font-bold tracking-tight cursor-pointer hover:opacity-80 transition-opacity">
          Whisp<span className="text-[#d4a03a] italic">r</span>
        </Link>
        <div className="flex items-center gap-4 md:gap-6">
          <Link
            href="/"
            className="hidden md:flex text-xs font-normal tracking-[0.08em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors"
          >
            Home
          </Link>
          <Link
            href="/dashboard/account"
            className="hidden md:flex text-xs tracking-[0.06em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors"
          >
            Account
          </Link>
          <SignOutConfirm variant="nav" />
          <span className="text-sm text-[#7a7870] whitespace-nowrap">
            Hey,{" "}
            <span className="text-[#f0ede8] font-medium truncate max-w-[100px] inline-block align-bottom">{firstName}</span>
          </span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between mb-10 sm:mb-16 gap-4">
          <div>
            <div className="text-[0.7rem] font-medium tracking-[0.2em] uppercase text-[#d4a03a] mb-3">
              Dashboard
            </div>
            <h1 className="font-playfair text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.1] tracking-[-0.02em]">
              Ready to{" "}
              <em className="italic text-[#d4a03a]">practice?</em>
            </h1>
            <p className="text-sm text-[#7a7870] mt-3 max-w-sm leading-relaxed">
              Start a new mock interview or review your past sessions below.
            </p>
          </div>
          <Link
            href="/dashboard/new"
            className="flex-shrink-0 bg-[#d4a03a] text-[#0a0a0b] text-xs font-medium tracking-[0.1em] uppercase px-8 py-3.5 hover:bg-[#f0c060] transition-all hover:-translate-y-px hover:shadow-[0_8px_30px_rgba(212,160,58,0.3)]"
          >
            + New interview
          </Link>
        </div>

        {/* STATS ROW — animated count-up */}
        <div className="grid grid-cols-3 gap-px bg-white/[0.06] mb-8">
          <StatCard label="Total sessions" value={totalSessions} />
          <StatCard label="Questions answered" value={totalAnswered} />
          <StatCard label="Avg. score" value={avgScore} />
        </div>

        {/* ROLE INSIGHTS */}
        {showInsights && (
          <div className="flex flex-wrap gap-px bg-white/[0.06] mb-8">
            <div className="bg-[#0a0a0b] px-4 sm:px-8 py-4 flex-1 min-w-0">
              <div className="text-[0.65rem] tracking-[0.14em] uppercase text-[#7a7870] mb-1">
                Strongest role
              </div>
              <div className="text-sm font-medium text-[#d4a03a] truncate">
                {bestRole.role}{" "}
                <span className="text-[#7a7870] font-normal text-xs">
                  ({bestRole.avg}/100)
                </span>
              </div>
            </div>
            <div className="bg-[#0a0a0b] px-4 sm:px-8 py-4 flex-1 min-w-0">
              <div className="text-[0.65rem] tracking-[0.14em] uppercase text-[#7a7870] mb-1">
                Needs work
              </div>
              <div className="text-sm font-medium text-[#f0ede8] truncate">
                {worstRole.role}{" "}
                <span className="text-[#7a7870] font-normal text-xs">
                  ({worstRole.avg}/100)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* PROGRESS CHART */}
        {showChart && (
          <div className="bg-[#111114] border border-white/[0.06] p-6 mb-16">
            <div className="text-[0.7rem] font-medium tracking-[0.2em] uppercase text-[#d4a03a] mb-1">
              Progress
            </div>
            <p className="text-xs text-[#7a7870] mb-6">
              Average score per completed session
            </p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#7a7870", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "#7a7870", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickCount={5}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.06)" }} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#d4a03a"
                    strokeWidth={2}
                    dot={{ fill: "#d4a03a", r: 3, strokeWidth: 0 }}
                    activeDot={{ fill: "#f0c060", r: 5, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* PAST INTERVIEWS */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-playfair text-xl font-bold tracking-tight">
              Past interviews
            </h2>
            <span className="text-xs text-[#7a7870]">
              {filtered.length} session{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* SEARCH + FILTERS */}
          {interviews.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-6">
              <input
                type="text"
                placeholder="Search by role or stack..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#111114] border border-white/[0.08] focus:border-[#d4a03a]/50 text-sm text-[#f0ede8] placeholder-[#3a3a3a] px-4 py-2.5 outline-none transition-colors flex-1 min-w-[200px]"
              />
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value as FilterLevel)}
                className="bg-[#111114] border border-white/[0.08] text-sm text-[#7a7870] px-4 py-2.5 outline-none"
              >
                <option value="all">All levels</option>
                <option value="Junior">Junior</option>
                <option value="Mid-level">Mid-level</option>
                <option value="Senior">Senior</option>
                <option value="Lead">Lead</option>
                <option value="Manager">Manager</option>
              </select>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="bg-[#111114] border border-white/[0.08] text-sm text-[#7a7870] px-4 py-2.5 outline-none"
              >
                <option value="date">Sort: Date</option>
                <option value="score">Sort: Score</option>
                <option value="role">Sort: Role</option>
              </select>
            </div>
          )}

          {/* SKELETON while hydrating */}
          {!clientReady && (
            <div className="grid grid-cols-1 gap-px bg-white/[0.06]">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {/* REAL CARDS after hydration */}
          {clientReady && (
            <>
              {interviews.length === 0 ? (
                <div className="border border-white/[0.06] bg-[#111114] flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-12 h-12 border border-[rgba(212,160,58,0.18)] flex items-center justify-center mb-6">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[#d4a03a] fill-none stroke-[1.5]">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                    </svg>
                  </div>
                  <p className="text-sm text-[#7a7870] mb-2 max-w-xs leading-relaxed">
                    No interviews yet.
                  </p>
                  <p className="text-xs text-[#4a4a4a] mb-8 max-w-xs leading-relaxed">
                    Set up your role, answer questions out loud, and get AI feedback. Your sessions will appear here.
                  </p>
                  <Link
                    href="/dashboard/new"
                    className="bg-[#d4a03a] text-[#0a0a0b] text-xs font-medium tracking-[0.1em] uppercase px-8 py-3 hover:bg-[#f0c060] transition-all"
                  >
                    Start first interview
                  </Link>
                </div>
              ) : filtered.length === 0 ? (
                <div className="border border-white/[0.06] bg-[#111114] py-16 text-center">
                  <p className="text-sm text-[#7a7870]">No sessions match your search.</p>
                  <button
                    onClick={() => { setSearchQuery(""); setFilterLevel("all"); }}
                    className="text-xs text-[#d4a03a] mt-3 hover:text-[#f0c060] transition-colors"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-px bg-white/[0.06]">
                  {filtered.map((interview) => {
                    const { day, month, time } = formatDate(interview.createdAt);
                    const status = getStatus(interview);
                    const isInProgress = status === "in_progress";
                    return (
                      <div
                        key={interview.id}
                        className="group bg-[#111114] hover:bg-[#18181c] transition-colors"
                      >
                        {/* MOBILE LAYOUT */}
                        <div className="sm:hidden px-4 py-4">
                          <div className="flex items-start gap-2 flex-wrap mb-2">
                            <span className="text-sm font-medium text-[#f0ede8] leading-snug">
                              {interview.jobRole}
                            </span>
                            <span className="flex-shrink-0">{statusBadge(interview)}</span>
                          </div>
                          <div className="space-y-1 mb-4">
                            <div className="text-xs text-[#7a7870]">{interview.techStack}</div>
                            <div className="text-xs text-[#7a7870] uppercase tracking-wider">{interview.experienceLevel}</div>
                            {interview.avgScore !== null && (
                              <div className="text-xs text-[#d4a03a]">Avg: {interview.avgScore}/100</div>
                            )}
                            <div className="text-xs text-[#4a4a4a]">{timeAgo(interview.createdAt)}</div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {isInProgress && (
                              <Link
                                href={`/dashboard/interview/${interview.id}`}
                                className="text-[0.65rem] tracking-[0.08em] uppercase bg-[#d4a03a] text-[#0a0a0b] font-medium px-3 py-1.5 hover:bg-[#f0c060] transition-colors"
                              >
                                Continue
                              </Link>
                            )}
                            <button
                              onClick={() => handleRetry(interview)}
                              className="text-[0.65rem] tracking-[0.08em] uppercase text-[#7a7870] hover:text-[#d4a03a] transition-colors px-3 py-1.5 border border-white/[0.06] hover:border-[#d4a03a]/30"
                            >
                              Retry
                            </button>
                            <Link
                              href={`/dashboard/interview/${interview.id}/feedback`}
                              className="text-[0.65rem] tracking-[0.08em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors px-3 py-1.5 border border-white/[0.06] hover:border-white/20"
                            >
                              Review
                            </Link>
                            <button
                              onClick={() => confirmDelete(interview.id)}
                              className="text-[0.65rem] tracking-[0.08em] uppercase text-[#7a7870] hover:text-red-400 transition-colors px-3 py-1.5 border border-white/[0.06] hover:border-red-500/30"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {/* DESKTOP LAYOUT */}
                        <div className="hidden sm:flex items-center justify-between px-8 py-6 gap-4">
                          {/* LEFT — date + info */}
                          <div className="flex items-center gap-8 flex-1 min-w-0">
                            {/* Date block */}
                            <div className="flex-shrink-0 text-center w-12">
                              <div className="font-playfair text-2xl font-bold text-[#d4a03a]">
                                {day}
                              </div>
                              <div className="text-[0.6rem] tracking-[0.1em] uppercase text-[#7a7870]">
                                {month}
                              </div>
                              <div className="text-[0.6rem] text-[#4a4a4a] mt-0.5">
                                {time}
                              </div>
                            </div>

                            <div className="w-px h-10 bg-white/[0.06] flex-shrink-0" />

                            {/* Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-3 mb-1 flex-wrap">
                                <span className="text-sm font-medium text-[#f0ede8] truncate">
                                  {interview.jobRole}
                                </span>
                                {statusBadge(interview)}
                              </div>
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-xs text-[#7a7870]">
                                  {interview.techStack}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-[#3a3a3a] flex-shrink-0" />
                                <span className="text-xs text-[#7a7870] uppercase tracking-wider">
                                  {interview.experienceLevel}
                                </span>
                                {interview.avgScore !== null && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-[#3a3a3a] flex-shrink-0" />
                                    <span className="text-xs text-[#d4a03a]">
                                      Avg: {interview.avgScore}/100
                                    </span>
                                  </>
                                )}
                                <span className="text-xs text-[#4a4a4a]">
                                  {timeAgo(interview.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* RIGHT — actions */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {isInProgress && (
                              <Link
                                href={`/dashboard/interview/${interview.id}`}
                                className="text-[0.65rem] tracking-[0.08em] uppercase bg-[#d4a03a] text-[#0a0a0b] font-medium px-3 py-1.5 hover:bg-[#f0c060] transition-colors"
                              >
                                Continue
                              </Link>
                            )}
                            <button
                              onClick={() => handleRetry(interview)}
                              className="text-[0.65rem] tracking-[0.08em] uppercase text-[#7a7870] hover:text-[#d4a03a] transition-colors px-3 py-1.5 border border-white/[0.06] hover:border-[#d4a03a]/30"
                            >
                              Retry
                            </button>
                            <Link
                              href={`/dashboard/interview/${interview.id}/feedback`}
                              className="text-[0.65rem] tracking-[0.08em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors px-3 py-1.5 border border-white/[0.06] hover:border-white/20"
                            >
                              Review
                            </Link>
                            <button
                              onClick={() => confirmDelete(interview.id)}
                              className="text-[0.65rem] tracking-[0.08em] uppercase text-[#7a7870] hover:text-red-400 transition-colors px-3 py-1.5 border border-white/[0.06] hover:border-red-500/30"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
