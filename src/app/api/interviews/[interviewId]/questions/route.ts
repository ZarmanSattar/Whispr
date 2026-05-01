import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { questions, mockInterviews } from "@/lib/schema";
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

    const rows = await db
      .select()
      .from(questions)
      .where(eq(questions.interviewId, interviewId));

    return NextResponse.json({ questions: rows });
  } catch (err) {
    console.error("Fetch questions error:", err);
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}
