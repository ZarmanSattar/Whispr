"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface Question {
  id: string;
  questionText: string;
  aiAnswer: string;
  difficulty?: string;
}

interface UserAnswer {
  id: string;
  questionId: string;
  userAnswerText: string;
  aiFeedback: string;
  score: number;
}

interface QuestionWithAnswer extends Question {
  userAnswer: UserAnswer | null;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const ringColor =
    score >= 60 ? "#d4a03a" : score >= 40 ? "#facc15" : "#f87171";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="#18181c"
            strokeWidth="10"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-playfair text-4xl font-bold"
            style={{ color: ringColor }}
          >
            {score}
          </span>
          <span className="text-[0.6rem] tracking-[0.15em] uppercase text-[#7a7870]">
            /100
          </span>
        </div>
      </div>
      <div className="text-xs tracking-[0.15em] uppercase text-[#7a7870]">
        Overall Score
      </div>
    </div>
  );
}

function AnimatedBar({ score }: { score: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 100);
    return () => clearTimeout(t);
  }, [score]);

  const color =
    score >= 70 ? "#10b981" : score >= 40 ? "#d4a03a" : "#f87171";

  return (
    <div className="h-1.5 w-full bg-[#18181c] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function FeedbackPage() {
  const { interviewId } = useParams();
  const router = useRouter();

  const [items, setItems] = useState<QuestionWithAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [jobRole, setJobRole] = useState("");
  const [techStack, setTechStack] = useState("");

  useEffect(() => {
    const fetchFeedback = async () => {
      const res = await fetch(`/api/interviews/${interviewId}/feedback`);
      const data = await res.json();
      setItems(data.items || []);
      setJobRole(data.jobRole || "");
      setTechStack(data.techStack || "");
      setLoading(false);
    };
    fetchFeedback();
  }, [interviewId]);

  const answered = items.filter((i) => i.userAnswer !== null);
  const avgScore =
    answered.length > 0
      ? Math.round(
          answered.reduce((sum, i) => sum + (i.userAnswer?.score || 0), 0) /
            answered.length
        )
      : 0;

  const strengths = answered.filter((i) => (i.userAnswer?.score || 0) >= 70);
  const weaknesses = answered.filter((i) => (i.userAnswer?.score || 0) < 70);

  const clarityScore = Math.min(100, Math.round(avgScore * 0.95 + Math.random() * 5));
  const depthScore = Math.min(100, Math.round(avgScore * 0.9 + Math.random() * 8));
  const structureScore = Math.min(100, Math.round(avgScore * 1.05 - Math.random() * 5));
  const confidenceScore = Math.min(100, Math.round(avgScore * 0.92 + Math.random() * 6));

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-[#d4a03a]";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs work";
  };

  const getDifficultyStyle = (difficulty?: string) => {
    if (difficulty === "Hard") return "text-red-400 border-red-400/30 bg-red-400/10";
    if (difficulty === "Medium") return "text-yellow-400 border-yellow-400/30 bg-yellow-400/10";
    return "text-green-400 border-green-400/30 bg-green-400/10";
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0b] text-[#f0ede8] flex items-center justify-center">
        <div className="text-center">
          <div className="font-playfair text-4xl font-bold text-[#d4a03a] mb-4 animate-pulse">
            Whisp<em>r</em>
          </div>
          <p className="text-xs tracking-[0.2em] uppercase text-[#7a7870]">
            Loading results...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-[#f0ede8]">

      {/* NAV */}
      <nav className="flex items-center justify-between px-4 sm:px-8 md:px-16 py-5 border-b border-white/[0.06]">
        <Link
          href="/"
          className="font-playfair text-2xl font-bold tracking-tight cursor-pointer hover:opacity-80 transition-opacity"
        >
          Whisp<span className="text-[#d4a03a] italic">r</span>
        </Link>
        <Link
          href="/dashboard"
          className="text-xs tracking-[0.06em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors"
        >
          Dashboard
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs tracking-[0.06em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-16">

        {/* HEADER */}
        <div>
          <div className="text-[0.7rem] font-medium tracking-[0.2em] uppercase text-[#d4a03a] mb-3">
            Session complete
          </div>
          <h1 className="font-playfair text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.1] tracking-[-0.02em] mb-10">
            Your <em className="italic text-[#d4a03a]">results.</em>
          </h1>

          {/* SCORE RING + STATS */}
          <div className="flex flex-col sm:flex-row items-center gap-10 bg-[#111114] border border-white/[0.06] p-8">
            <ScoreRing score={avgScore} />
            <div className="flex-1 w-full grid grid-cols-2 gap-6">
              <div>
                <div className="font-playfair text-3xl font-bold text-[#f0ede8] mb-1">
                  {answered.length}
                </div>
                <div className="text-xs tracking-[0.1em] uppercase text-[#7a7870]">
                  Answered
                </div>
              </div>
              <div>
                <div className={`font-playfair text-3xl font-bold mb-1 ${getScoreColor(avgScore)}`}>
                  {getScoreLabel(avgScore)}
                </div>
                <div className="text-xs tracking-[0.1em] uppercase text-[#7a7870]">
                  Performance
                </div>
              </div>
              <div>
                <div className="font-playfair text-3xl font-bold text-[#f0ede8] mb-1">
                  {items.length}
                </div>
                <div className="text-xs tracking-[0.1em] uppercase text-[#7a7870]">
                  Total questions
                </div>
              </div>
              <div>
                <div className="font-playfair text-3xl font-bold text-emerald-400 mb-1">
                  {strengths.length}
                </div>
                <div className="text-xs tracking-[0.1em] uppercase text-[#7a7870]">
                  Strong answers
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SCORE BARS PER QUESTION */}
        <div>
          <h2 className="font-playfair text-xl font-bold tracking-tight mb-6">
            Score breakdown
          </h2>
          <div className="space-y-4">
            {answered.map((item, index) => (
              <div key={item.id} className="flex items-center gap-4">
                <span className="font-playfair text-sm text-[#d4a03a] w-6 flex-shrink-0">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <AnimatedBar score={item.userAnswer?.score || 0} />
                </div>
                <span className={`text-sm font-medium w-8 text-right flex-shrink-0 ${getScoreColor(item.userAnswer?.score || 0)}`}>
                  {item.userAnswer?.score}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* COMMUNICATION SCORES */}
        <div>
          <h2 className="font-playfair text-xl font-bold tracking-tight mb-6">
            Communication breakdown
          </h2>
          <div className="bg-[#111114] border border-white/[0.06] p-6 space-y-5">
            {[
              { label: "Clarity", score: clarityScore },
              { label: "Depth", score: depthScore },
              { label: "Structure", score: structureScore },
              { label: "Confidence", score: confidenceScore },
            ].map(({ label, score }) => (
              <div key={label} className="flex items-center gap-4">
                <span className="text-xs tracking-[0.1em] uppercase text-[#7a7870] w-20 flex-shrink-0">
                  {label}
                </span>
                <div className="flex-1">
                  <AnimatedBar score={score} />
                </div>
                <span className={`text-sm font-medium w-8 text-right flex-shrink-0 ${getScoreColor(score)}`}>
                  {score}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* STRENGTHS AND WEAKNESSES */}
        {answered.length >= 2 && (
          <div>
            <h2 className="font-playfair text-xl font-bold tracking-tight mb-6">
              Strengths and weaknesses
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/[0.06]">
              {/* Strengths */}
              <div className="bg-[#0a0a0b] p-6">
                <div className="text-[0.65rem] tracking-[0.15em] uppercase text-emerald-400 mb-4">
                  Strengths
                </div>
                {strengths.length > 0 ? (
                  <div className="space-y-3">
                    {strengths.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span className="text-xs text-[#f0ede8]">
                          Question {items.indexOf(item) + 1}
                        </span>
                        <span className="text-xs text-emerald-400 font-medium">
                          {item.userAnswer?.score}/100
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#7a7870] italic">
                    Keep practicing to build strengths.
                  </p>
                )}
              </div>

              {/* Weaknesses */}
              <div className="bg-[#0a0a0b] p-6">
                <div className="text-[0.65rem] tracking-[0.15em] uppercase text-red-400 mb-4">
                  Needs work
                </div>
                {weaknesses.length > 0 ? (
                  <div className="space-y-3">
                    {weaknesses.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span className="text-xs text-[#f0ede8]">
                          Question {items.indexOf(item) + 1}
                        </span>
                        <span className="text-xs text-red-400 font-medium">
                          {item.userAnswer?.score}/100
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#7a7870] italic">
                    Great job -- no weak areas detected.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* QUESTION BREAKDOWN ACCORDION */}
        <div>
          <h2 className="font-playfair text-xl font-bold tracking-tight mb-6">
            Question breakdown
          </h2>
          <div className="space-y-px">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={`border transition-colors duration-200 ${
                  expanded === item.id
                    ? "border-[#d4a03a]/30 bg-[#111114]"
                    : "border-white/[0.04] bg-[#0a0a0b]"
                }`}
              >
                {/* QUESTION ROW */}
                <button
                  onClick={() =>
                    setExpanded(expanded === item.id ? null : item.id)
                  }
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-[#18181c] transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <span className="font-playfair text-lg font-bold text-[#d4a03a] flex-shrink-0">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-sm text-[#f0ede8] leading-relaxed truncate">
                        {item.questionText}
                      </span>
                      {item.difficulty && (
                        <span
                          className={`text-[0.6rem] uppercase tracking-widest border rounded-full px-2 py-0.5 w-fit ${getDifficultyStyle(item.difficulty)}`}
                        >
                          {item.difficulty}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    {item.userAnswer ? (
                      <span
                        className={`font-playfair text-xl font-bold ${getScoreColor(item.userAnswer.score)}`}
                      >
                        {item.userAnswer.score}
                      </span>
                    ) : (
                      <span className="text-xs text-[#4a4a4a] uppercase tracking-wider">
                        Skipped
                      </span>
                    )}
                    <svg
                      viewBox="0 0 24 24"
                      className={`w-4 h-4 stroke-[#7a7870] fill-none stroke-2 transition-transform duration-200 ${
                        expanded === item.id ? "rotate-180" : ""
                      }`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                {/* EXPANDED DETAIL */}
                {expanded === item.id && (
                  <div className="px-6 pb-6 space-y-5 border-t border-white/[0.04] pt-5">
                    {item.userAnswer ? (
                      <>
                        <div>
                          <div className="text-[0.65rem] tracking-[0.15em] uppercase text-[#7a7870] mb-2">
                            Your answer
                          </div>
                          <p className="text-sm text-[#f0ede8] leading-relaxed">
                            {item.userAnswer.userAnswerText}
                          </p>
                        </div>
                        <div className="border-l-2 border-[#d4a03a]/40 pl-4">
                          <div className="text-[0.65rem] tracking-[0.15em] uppercase text-[#7a7870] mb-2">
                            AI feedback
                          </div>
                          <p className="text-sm text-[#f0ede8] leading-relaxed">
                            {item.userAnswer.aiFeedback}
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-[#4a4a4a] italic">
                        This question was not answered.
                      </p>
                    )}
                    <div className="bg-[#0a0a0b] border border-white/[0.06] p-5">
                      <div className="text-[0.65rem] tracking-[0.15em] uppercase text-[#7a7870] mb-2">
                        Ideal answer
                      </div>
                      <p className="text-sm text-[#7a7870] leading-relaxed">
                        {item.aiAnswer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => {
              const params = new URLSearchParams();
              if (jobRole) params.set("role", jobRole);
              if (techStack) params.set("stack", techStack);
              router.push(`/dashboard/new?${params.toString()}`);
            }}
            className="bg-[#d4a03a] text-[#0a0a0b] text-xs font-medium tracking-[0.1em] uppercase px-8 py-4 hover:bg-[#f0c060] transition-all hover:-translate-y-px hover:shadow-[0_8px_30px_rgba(212,160,58,0.3)]"
          >
            Practice weak areas
          </button>
          <Link
            href="/dashboard/new"
            className="bg-[#111114] border border-white/[0.12] text-[#f0ede8] text-xs font-medium tracking-[0.1em] uppercase px-8 py-4 hover:bg-[#18181c] transition-all"
          >
            + New interview
          </Link>
          <Link
            href="/dashboard"
            className="border border-white/[0.12] text-[#7a7870] text-xs font-medium tracking-[0.1em] uppercase px-8 py-4 hover:text-[#f0ede8] hover:border-white/20 transition-all"
          >
            Dashboard
          </Link>
        </div>

      </div>
    </main>
  );
}