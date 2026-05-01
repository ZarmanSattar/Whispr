import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { questions, mockInterviews, userAnswers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

    const prompt = `You are an expert technical interviewer evaluating a candidate's answer.

Question: ${questionText}

Ideal Answer: ${aiAnswer}

Candidate's Answer: ${userAnswerText}

Evaluate the candidate's answer and return ONLY a valid JSON object with no markdown, no explanation, no code blocks:
{
  "score": <integer 0-100>,
  "feedback": "<2-3 sentences of specific, constructive feedback>"
}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const text = completion.choices[0]?.message?.content?.trim() || "";
    const clean = text.replace(/```json|```/g, "").trim();
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
