import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { mockInterviews, questions, userAnswers } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const firstName = user?.firstName || "there";

  // Fetch only this user's interviews
  const interviews = await db
    .select()
    .from(mockInterviews)
    .where(eq(mockInterviews.userId, userId))
    .orderBy(desc(mockInterviews.createdAt));

  // Build enriched interviews
  const enrichedInterviews = await Promise.all(
    interviews.map(async (interview) => {
      const qs = await db
        .select()
        .from(questions)
        .where(eq(questions.interviewId, interview.id));

      const answers = await Promise.all(
        qs.map((q) =>
          db
            .select()
            .from(userAnswers)
            .where(eq(userAnswers.questionId, q.id))
            .limit(1)
        )
      );

      const flat = answers.flat();
      const avgScore =
        flat.length > 0
          ? Math.round(flat.reduce((sum, a) => sum + a.score, 0) / flat.length)
          : null;

      return {
        id: interview.id,
        jobRole: interview.jobRole,
        techStack: interview.techStack,
        experienceLevel: interview.experienceLevel,
        createdAt: interview.createdAt,
        avgScore,
        totalQuestions: qs.length,
        answeredQuestions: flat.length,
      };
    })
  );

  // Global stats
  const totalAnswered = enrichedInterviews.reduce(
    (sum, i) => sum + i.answeredQuestions,
    0
  );
  const scoredInterviews = enrichedInterviews.filter(
    (i) => i.avgScore !== null
  );
  const globalAvgScore =
    scoredInterviews.length > 0
      ? Math.round(
          scoredInterviews.reduce((sum, i) => sum + i.avgScore!, 0) /
            scoredInterviews.length
        )
      : null;

  return (
    <DashboardClient
      interviews={enrichedInterviews}
      firstName={firstName}
      totalSessions={interviews.length}
      totalAnswered={totalAnswered}
      avgScore={globalAvgScore}
    />
  );
}