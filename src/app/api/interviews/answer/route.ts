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

    const { questionId, questionText, aiAnswer, userAnswerText } = parsed.data;

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

    const prompt = `You are an expert technical interviewer grading a candidate's answer using a strict rubric.

Question: ${questionText}

Model Answer: ${aiAnswer}

Candidate's Answer: ${userAnswerText}

Grade the candidate's answer using this rubric (total 100 points):
- Technical accuracy (40 points): Is the answer technically correct and factually sound?
- Depth and detail (25 points): Does the answer go beyond surface level with examples or reasoning?
- Clarity and structure (20 points): Is the answer well organized, coherent, and easy to follow?
- Relevance (15 points): Does the answer directly address what was asked without going off-topic?

Return ONLY a valid JSON object with no markdown, no code blocks, and no text outside the JSON. The structure must be exactly:
{
  "score": 0,
  "feedback": "specific constructive feedback paragraph here"
}

Rules:
- score must be an integer between 0 and 100
- feedback must be specific to this candidate's answer — reference what they actually said
- feedback should acknowledge what was done well, identify what was missing or incorrect, and suggest concrete improvements
- Do not use generic phrases like "good job" or "needs improvement" without specifics
- Do not include any text, explanation, or formatting outside the JSON object`;

    const completion = await withRetry(() =>
      groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      })
    );

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const result = JSON.parse(clean);

    await db.insert(userAnswers).values({
      questionId,
      userAnswerText,
      aiFeedback: result.feedback,
      score: result.score,
    });

    return NextResponse.json({ feedback: result.feedback, score: result.score });
  } catch (err) {
    console.error("Answer evaluation error:", err);
    return NextResponse.json({ error: "Failed to evaluate answer" }, { status: 500 });
  }
}
