import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { mockInterviews, questions, userAnswers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function AccountPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const firstName = user?.firstName || "";
  const lastName = user?.lastName || "";
  const email = user?.emailAddresses?.[0]?.emailAddress || "—";
  const joined = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  // Stats
  const interviews = await db
    .select()
    .from(mockInterviews)
    .where(eq(mockInterviews.userId, userId!));

  const allQuestions = await db
    .select()
    .from(questions)
    .innerJoin(mockInterviews, eq(questions.interviewId, mockInterviews.id));

  const userQuestions = allQuestions.filter(
    (q) => q.mock_interviews.userId === userId
  );

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

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-[#f0ede8]">

      {/* NAV */}
      <nav className="flex items-center justify-between px-4 sm:px-8 md:px-16 py-5 border-b border-white/[0.06]">
        <Link href="/" className="font-playfair text-2xl font-bold tracking-tight cursor-pointer hover:opacity-80 transition-opacity">
          Whisp<span className="text-[#d4a03a] italic">r</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-xs tracking-[0.06em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors"
          >
            ← Dashboard
          </Link>
          <Link
            href="/sign-out"
            className="text-xs tracking-[0.06em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors"
          >
            Sign out
          </Link>
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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

        {/* HEADER */}
        <div className="mb-16">
          <div className="text-[0.7rem] font-medium tracking-[0.2em] uppercase text-[#d4a03a] mb-3">
            Account
          </div>
          <h1 className="font-playfair text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.1] tracking-[-0.02em]">
            Your <em className="italic text-[#d4a03a]">profile.</em>
          </h1>
        </div>

        {/* PROFILE CARD */}
        <div className="bg-[#111114] border border-white/[0.06] p-8 mb-px">
          <div className="flex items-center gap-6 mb-8">
            {/* Avatar */}
            <div className="w-16 h-16 bg-[#d4a03a] flex items-center justify-center flex-shrink-0">
              <span className="font-playfair text-2xl font-bold text-[#0a0a0b]">
                {firstName?.[0] || email[0].toUpperCase()}
              </span>
            </div>
            <div>
              <div className="text-lg font-medium text-[#f0ede8]">
                {firstName} {lastName}
              </div>
              <div className="text-sm text-[#7a7870] mt-0.5">{email}</div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-px">
            {[
              { label: "First name", value: firstName || "—" },
              { label: "Last name", value: lastName || "—" },
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

        {/* STATS */}
        <div className="grid grid-cols-3 gap-px bg-white/[0.06] mb-12">
          {[
            { label: "Total sessions", value: interviews.length.toString() },
            { label: "Avg. score", value: avgScore !== null ? avgScore.toString() : "—" },
            { label: "Best score", value: bestScore !== null ? bestScore.toString() : "—" },
          ].map((s) => (
            <div key={s.label} className="bg-[#111114] px-4 sm:px-6 py-5 sm:py-6">
              <div className="font-playfair text-3xl font-bold text-[#d4a03a]">
                {s.value}
              </div>
              <div className="text-xs tracking-[0.1em] uppercase text-[#7a7870] mt-1">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* DANGER ZONE */}
        <div className="border border-red-900/30 p-8">
          <div className="text-xs tracking-[0.1em] uppercase text-red-400/70 mb-4">
            Account actions
          </div>
          <p className="text-sm text-[#7a7870] leading-relaxed mb-6">
            To update your name, email, or password, visit your Clerk account settings.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/dashboard/new"
              className="bg-[#d4a03a] text-[#0a0a0b] text-xs font-medium tracking-[0.1em] uppercase px-6 py-3 hover:bg-[#f0c060] transition-all"
            >
              + New interview
            </Link>
            <Link
              href="/sign-out"
              className="border border-white/[0.08] text-[#7a7870] text-xs font-medium tracking-[0.1em] uppercase px-6 py-3 hover:text-[#f0ede8] hover:border-white/20 transition-all"
            >
              Sign out
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}