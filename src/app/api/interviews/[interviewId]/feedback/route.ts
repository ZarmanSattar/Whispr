import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { questions, mockInterviews, userAnswers } from "@/lib/schema";
import { eq } from "drizzle-orm";

const ParamsSchema = z.object({
  interviewId: z.string().uuid("interviewId must be a valid UUID"),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawParams = await params;
    const parsed = ParamsSchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid interviewId", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { interviewId } = parsed.data;

    // Verify interview ownership
    const [interview] = await db
      .select()
      .from(mockInterviews)
      .where(eq(mockInterviews.id, interviewId))
      .limit(1);

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }
    if (interview.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

   return NextResponse.json({ 
  items,
  jobRole: interview.jobRole,
  techStack: interview.techStack,
});
  } catch (err) {
    console.error("Fetch feedback error:", err);
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}
