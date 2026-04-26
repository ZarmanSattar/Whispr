import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userAnswers } from "@/lib/schema";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionId, questionText, aiAnswer, userAnswerText } = await req.json();

    if (!questionId || !questionText || !aiAnswer || !userAnswerText) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
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
    const parsed = JSON.parse(clean);

    await db.insert(userAnswers).values({
      questionId,
      userAnswerText,
      aiFeedback: parsed.feedback,
      score: parsed.score,
    });

    return NextResponse.json({ feedback: parsed.feedback, score: parsed.score });
  } catch (err) {
    console.error("Answer evaluation error:", err);
    return NextResponse.json({ error: "Failed to evaluate answer" }, { status: 500 });
  }
}