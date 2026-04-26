import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { questions, userAnswers } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { interviewId } = await params;

    const qs = await db
      .select()
      .from(questions)
      .where(eq(questions.interviewId, interviewId));

    const items = await Promise.all(
      qs.map(async (q) => {
        const answers = await db
          .select()
          .from(userAnswers)
          .where(eq(userAnswers.questionId, q.id))
          .limit(1);

        return {
          ...q,
          userAnswer: answers[0] || null,
        };
      })
    );

    return NextResponse.json({ items });
  } catch (err) {
    console.error("Fetch feedback error:", err);
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}