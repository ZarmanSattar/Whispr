import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { questions, mockInterviews, userAnswers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import Groq from "groq-sdk";

const GROQ_MODEL = "llama-3.3-70b-versatile";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("Unreachable");
}

const AnswerSchema = z.object({
  questionId: z.string().uuid("questionId must be a valid UUID"),
  questionText: z.string().min(1, "questionText is required"),
  aiAnswer: z.string().min(1, "aiAnswer is required"),
  userAnswerText: z.string().min(1, "userAnswerText is required"),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!checkRateLimit(userId)) {
      return NextResponse.json({ error: "Too many requests, please slow down" }, { status: 429 });
    }

    const body = await req.json();
    const parsed = AnswerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { questionId, questionText, userAnswerText } = parsed.data;

    // Verify the question exists and belongs to an interview owned by this user
    const [question] = await db
      .select()
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1);

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const [interview] = await db
      .select()
      .from(mockInterviews)
      .where(eq(mockInterviews.id, question.interviewId!))
      .limit(1);

    if (!interview || interview.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (userAnswerText === "SKIPPED") {
      await db.insert(userAnswers).values({
        questionId,
        userAnswerText: "SKIPPED",
        aiFeedback: "This question was skipped.",
        score: 0,
        skipped: true,
        technicalScore: null,
        clarityScore: null,
        depthScore: null,
        confidenceScore: null,
      });
      await db.update(mockInterviews).set({ status: "in_progress" }).where(eq(mockInterviews.id, interview.id));
      return NextResponse.json({ feedback: "This question was skipped.", score: 0 });
    }

    const completion = await withRetry(() =>
      groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: `You are a senior technical interviewer giving structured, honest feedback on a candidate's interview answer. You are balanced — you acknowledge what was good before calling out gaps. You are specific and direct, never vague. You never give empty praise. You always tell the candidate exactly what was missing and what a strong answer would have included.

Scoring rubric (score out of 10):
- 9-10: Answer is complete, technically accurate, well-structured, shows depth and real experience
- 7-8: Covers most key points, minor gaps, good communication
- 5-6: Hits some points but misses important concepts or lacks depth
- 3-4: Partial answer, significant gaps, unclear communication
- 1-2: Off-topic, incorrect, or essentially no answer

Feedback must always follow this exact JSON structure — no exceptions:
{
  "score": number (1-10),
  "summary": "2-3 sentence overall assessment. Acknowledge what was good first, then what was missing.",
  "strengths": ["specific strength 1", "specific strength 2"],
  "gaps": ["specific gap 1", "specific gap 2"],
  "improvements": "One concrete, actionable thing they should do differently next time. Be specific.",
  "modelAnswer": "A strong 150-200 word answer to this question written as if a senior candidate is speaking. Cover all key points the user missed. Write it in first person, conversational tone."
}`,
          },
          {
            role: "user",
            content: `Question: ${questionText}

Candidate's answer: ${userAnswerText}

Evaluate this answer and return ONLY the JSON object described. No markdown, no explanation, no code blocks. Raw JSON only.`,
          },
        ],
        temperature: 0.3,
      })
    );

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const result = JSON.parse(clean);

    await db.insert(userAnswers).values({
      questionId,
      userAnswerText,
      aiFeedback: result.summary,
      score: result.score,
      skipped: userAnswerText === "SKIPPED",
      technicalScore: result.technicalScore ?? null,
      clarityScore: result.clarityScore ?? null,
      depthScore: result.depthScore ?? null,
      confidenceScore: result.confidenceScore ?? null,
    });

    await db.update(mockInterviews).set({ status: "in_progress" }).where(eq(mockInterviews.id, interview.id));

    return NextResponse.json(result);
  } catch (err) {
    console.error("Answer evaluation error:", err);
    return NextResponse.json({ error: "Failed to evaluate answer" }, { status: 500 });
  }
}
