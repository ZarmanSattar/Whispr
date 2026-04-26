"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Question {
  id: string;
  questionText: string;
  aiAnswer: string;
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

export default function FeedbackPage() {
  const { interviewId } = useParams();
  const router = useRouter();

  const [items, setItems] = useState<QuestionWithAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      const res = await fetch(`/api/interviews/${interviewId}/feedback`);
      const data = await res.json();
      setItems(data.items || []);
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
      <nav className="flex items-center justify-between px-16 py-5 border-b border-white/[0.06]">
        <span className="font-playfair text-2xl font-bold tracking-tight">
          Whisp<span className="text-[#d4a03a] italic">r</span>
        </span>
        <Link
          href="/dashboard"
          className="text-xs tracking-[0.06em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors"
        >
          ← Dashboard
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* HEADER */}
        <div className="mb-16">
          <div className="text-[0.7rem] font-medium tracking-[0.2em] uppercase text-[#d4a03a] mb-3">
            Session complete
          </div>
          <h1 className="font-playfair text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.1] tracking-[-0.02em] mb-8">
            Your <em className="italic text-[#d4a03a]">results.</em>
          </h1>

          {/* SCORE CARD */}
          <div className="grid grid-cols-3 gap-px bg-white/[0.06]">
            <div className="bg-[#0a0a0b] px-8 py-8">
              <div className={`font-playfair text-5xl font-bold mb-1 ${getScoreColor(avgScore)}`}>
                {avgScore}
              </div>
              <div className="text-xs tracking-[0.1em] uppercase text-[#7a7870]">
                Overall score
              </div>
            </div>
            <div className="bg-[#0a0a0b] px-8 py-8">
              <div className="font-playfair text-5xl font-bold text-[#f0ede8] mb-1">
                {answered.length}
              </div>
              <div className="text-xs tracking-[0.1em] uppercase text-[#7a7870]">
                Questions answered
              </div>
            </div>
            <div className="bg-[#0a0a0b] px-8 py-8">
              <div className={`font-playfair text-5xl font-bold mb-1 ${getScoreColor(avgScore)}`}>
                {getScoreLabel(avgScore)}
              </div>
              <div className="text-xs tracking-[0.1em] uppercase text-[#7a7870]">
                Performance
              </div>
            </div>
          </div>
        </div>

        {/* QUESTION BREAKDOWN */}
        <div className="mb-16">
          <h2 className="font-playfair text-xl font-bold tracking-tight mb-6">
            Question breakdown
          </h2>

          <div className="space-y-px">
            {items.map((item, index) => (
              <div key={item.id} className="bg-[#111114] border border-white/[0.04]">

                {/* QUESTION ROW */}
                <button
                  onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-[#18181c] transition-colors"
                >
                  <div className="flex items-center gap-5 flex-1 min-w-0">
                    <span className="font-playfair text-lg font-bold text-[#d4a03a] flex-shrink-0">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm text-[#f0ede8] leading-relaxed truncate">
                      {item.questionText}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    {item.userAnswer ? (
                      <span className={`font-playfair text-xl font-bold ${getScoreColor(item.userAnswer.score)}`}>
                        {item.userAnswer.score}
                      </span>
                    ) : (
                      <span className="text-xs text-[#4a4a4a] uppercase tracking-wider">Skipped</span>
                    )}
                    <svg
                      viewBox="0 0 24 24"
                      className={`w-4 h-4 stroke-[#7a7870] fill-none stroke-2 transition-transform duration-200 ${expanded === item.id ? "rotate-180" : ""}`}
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
                        {/* User answer */}
                        <div>
                          <div className="text-[0.65rem] tracking-[0.15em] uppercase text-[#7a7870] mb-2">
                            Your answer
                          </div>
                          <p className="text-sm text-[#f0ede8] leading-relaxed">
                            {item.userAnswer.userAnswerText}
                          </p>
                        </div>

                        {/* AI Feedback */}
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

                    {/* Ideal answer */}
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
        <div className="flex gap-4">
          <Link
            href="/dashboard/new"
            className="bg-[#d4a03a] text-[#0a0a0b] text-xs font-medium tracking-[0.1em] uppercase px-8 py-4 hover:bg-[#f0c060] transition-all hover:-translate-y-px hover:shadow-[0_8px_30px_rgba(212,160,58,0.3)]"
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