import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { mockInterviews, questions, userAnswers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";

export default async function AccountPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const firstName = user?.firstName || "";
  const lastName = user?.lastName || "";
  const email = user?.emailAddresses?.[0]?.emailAddress || "--";
  const joined = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "--";

  // Fetch all interviews
  const interviews = await db
    .select()
    .from(mockInterviews)
    .where(eq(mockInterviews.userId, userId!));

  // Fetch all questions for user's interviews
  const allQuestions = await db
    .select()
    .from(questions)
    .innerJoin(mockInterviews, eq(questions.interviewId, mockInterviews.id));

  const userQuestions = allQuestions.filter(
    (q) => q.mock_interviews.userId === userId
  );

  // Fetch all answers
  const allAnswers = await Promise.all(
    userQuestions.map((q) =>
      db
        .select()
        .from(userAnswers)
        .where(eq(userAnswers.questionId, q.questions.id))
        .limit(1)
    )
  );

  const flatAnswers = allAnswers.flat();
  const totalAnswered = flatAnswers.length;
  const totalQuestions = userQuestions.length;

  const avgScore =
    totalAnswered > 0
      ? Math.round(
          flatAnswers.reduce((sum, a) => sum + a.score, 0) / totalAnswered
        )
      : null;

  const bestScore =
    flatAnswers.length > 0
      ? Math.max(...flatAnswers.map((a) => a.score))
      : null;

  const worstScore =
    flatAnswers.length > 0
      ? Math.min(...flatAnswers.map((a) => a.score))
      : null;

  const completedSessions = interviews.filter((interview) => {
    const interviewQuestions = userQuestions.filter(
      (q) => q.mock_interviews.id === interview.id
    );
    const interviewAnswers = flatAnswers.filter((a) =>
      interviewQuestions.some((q) => q.questions.id === a.questionId)
    );
    return (
      interviewQuestions.length > 0 &&
      interviewAnswers.length === interviewQuestions.length
    );
  });

  const completionRate =
    interviews.length > 0
      ? Math.round((completedSessions.length / interviews.length) * 100)
      : 0;

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-[#7a7870]";
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-[#d4a03a]";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getScoreLabel = (score: number | null) => {
    if (score === null) return "--";
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs work";
  };

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
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-xs tracking-[0.06em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors"
          >
            Dashboard
          </Link>
          <SignOutButton redirectUrl="/">
            <button className="text-xs tracking-[0.06em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors">
              Sign out
            </button>
          </SignOutButton>
        </div>
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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-12">

        {/* HEADER */}
        <div>
          <div className="text-[0.7rem] font-medium tracking-[0.2em] uppercase text-[#d4a03a] mb-3">
            Account
          </div>
          <h1 className="font-playfair text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.1] tracking-[-0.02em]">
            Your <em className="italic text-[#d4a03a]">profile.</em>
          </h1>
        </div>

        {/* PROFILE CARD */}
        <div className="bg-[#111114] border border-white/[0.06] p-8">
          <div className="flex items-center gap-6 mb-8">
            {/* Avatar */}
            <div className="w-16 h-16 bg-[#d4a03a] flex items-center justify-center flex-shrink-0">
              <span className="font-playfair text-2xl font-bold text-[#0a0a0b]">
                {firstName?.[0] || email[0]?.toUpperCase() || "?"}
              </span>
            </div>
            <div>
              <div className="text-lg font-medium text-[#f0ede8]">
                {firstName} {lastName}
              </div>
              <div className="text-sm text-[#7a7870] mt-0.5">{email}</div>
              <div className="text-xs text-[#4a4a4a] mt-1">
                Member since {joined}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-px">
            {[
              { label: "First name", value: firstName || "--" },
              { label: "Last name", value: lastName || "--" },
              { label: "Email address", value: email },
              { label: "Member since", value: joined },
            ].map((field) => (
              <div
                key={field.label}
                className="flex items-center justify-between py-4 border-b border-white/[0.04] flex-wrap gap-x-4 gap-y-1"
              >
                <span className="text-xs tracking-[0.1em] uppercase text-[#7a7870]">
                  {field.label}
                </span>
                <span className="text-sm text-[#f0ede8]">{field.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* PERFORMANCE OVERVIEW */}
        <div>
          <h2 className="font-playfair text-xl font-bold tracking-tight mb-6">
            Performance overview
          </h2>

          {/* PRIMARY STATS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.06] mb-px">
            {[
              {
                label: "Total sessions",
                value: interviews.length.toString(),
                color: "text-[#f0ede8]",
              },
              {
                label: "Questions answered",
                value: totalAnswered.toString(),
                color: "text-[#f0ede8]",
              },
              {
                label: "Avg. score",
                value: avgScore !== null ? avgScore.toString() : "--",
                color: getScoreColor(avgScore),
              },
              {
                label: "Completion rate",
                value: interviews.length > 0 ? `${completionRate}%` : "--",
                color: "text-[#f0ede8]",
              },
            ].map((s) => (
              <div key={s.label} className="bg-[#111114] px-4 sm:px-6 py-5 sm:py-6">
                <div className={`font-playfair text-3xl font-bold mb-1 ${s.color}`}>
                  {s.value}
                </div>
                <div className="text-xs tracking-[0.1em] uppercase text-[#7a7870]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* SECONDARY STATS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-white/[0.06]">
            {[
              {
                label: "Best score",
                value: bestScore !== null ? bestScore.toString() : "--",
                color: getScoreColor(bestScore),
              },
              {
                label: "Worst score",
                value: worstScore !== null ? worstScore.toString() : "--",
                color: worstScore !== null ? "text-red-400" : "text-[#7a7870]",
              },
              {
                label: "Performance",
                value: getScoreLabel(avgScore),
                color: getScoreColor(avgScore),
              },
            ].map((s) => (
              <div key={s.label} className="bg-[#111114] px-4 sm:px-6 py-5 sm:py-6">
                <div className={`font-playfair text-2xl font-bold mb-1 ${s.color}`}>
                  {s.value}
                </div>
                <div className="text-xs tracking-[0.1em] uppercase text-[#7a7870]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PROGRESS BAR */}
        {totalQuestions > 0 && (
          <div className="bg-[#111114] border border-white/[0.06] p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs tracking-[0.1em] uppercase text-[#7a7870]">
                Overall completion
              </span>
              <span className="text-xs text-[#d4a03a]">
                {totalAnswered} / {totalQuestions} questions
              </span>
            </div>
            <div className="h-1.5 bg-[#18181c] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#d4a03a] rounded-full"
                style={{
                  width: `${Math.round((totalAnswered / totalQuestions) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* ACCOUNT ACTIONS */}
        <div className="border border-white/[0.06] p-8">
          <div className="text-xs tracking-[0.1em] uppercase text-[#7a7870] mb-4">
            Account actions
          </div>
          <p className="text-sm text-[#7a7870] leading-relaxed mb-6">
            To update your name, email, or password, visit your Clerk account
            settings. Your data is securely stored and never shared.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/dashboard/new"
              className="bg-[#d4a03a] text-[#0a0a0b] text-xs font-medium tracking-[0.1em] uppercase px-6 py-3 hover:bg-[#f0c060] transition-all hover:-translate-y-px hover:shadow-[0_8px_30px_rgba(212,160,58,0.3)]"
            >
              + New interview
            </Link>
            <Link
              href="/dashboard"
              className="border border-white/[0.08] text-[#7a7870] text-xs font-medium tracking-[0.1em] uppercase px-6 py-3 hover:text-[#f0ede8] hover:border-white/20 transition-all"
            >
              Dashboard
            </Link>
            <SignOutButton redirectUrl="/">
              <button className="border border-red-900/30 text-red-400/70 text-xs font-medium tracking-[0.1em] uppercase px-6 py-3 hover:border-red-900/60 hover:text-red-400 transition-all">
                Sign out
              </button>
            </SignOutButton>
          </div>
        </div>

      </div>
    </main>
  );
}