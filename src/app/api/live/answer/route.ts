import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { liveSessions, liveAnswers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const { code, questionText } = await req.json();

    if (!code || !questionText) {
      return NextResponse.json({ error: "Code and question required" }, { status: 400 });
    }

    const [session] = await db.select().from(liveSessions).where(eq(liveSessions.code, code));

    if (!session) return NextResponse.json({ error: "Invalid code" }, { status: 404 });

    if (new Date() > session.expiresAt) {
      return NextResponse.json({ error: "Session expired" }, { status: 410 });
    }

    const systemPrompt = `You are an expert interview coach helping a candidate answer interview questions in real time.
The candidate is interviewing for: ${session.jobRole}${session.targetCompany ? ` at ${session.targetCompany}` : ""}.
${session.resumeText ? `Here is their resume context:\n${session.resumeText}\n` : ""}
Generate a concise, confident, interview-ready answer in bullet points.
Keep it under 120 words. Be specific, structured, and natural to speak aloud.
Do not include any preamble or explanation — just the answer bullet points.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Interview question: ${questionText}` },
      ],
      temperature: 0.4,
      max_tokens: 300,
    });

    const answerText = completion.choices[0]?.message?.content || "";

    await db.insert(liveAnswers).values({
      sessionId: session.id,
      questionText,
      answerText,
    });

    return NextResponse.json({ answer: answerText });
  } catch (err) {
    console.error("Live answer error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}