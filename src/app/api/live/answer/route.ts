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

    const systemPrompt = `You are an expert technical interview coach providing real-time assistance.
The candidate is interviewing for: ${session.jobRole}${session.targetCompany ? ` at ${session.targetCompany}` : ""}.
${session.resumeText ? `Candidate background:\n${session.resumeText}\n` : ""}

CRITICAL RULES:
- If the question is a coding or algorithm problem:
  1. First explain the approach in 2-3 bullet points (what technique, why, edge cases)
  2. Then provide the time and space complexity
  3. Then provide clean working code with comments
  Use Python by default unless the role strongly suggests another language.
- If the question is system design: give a concrete architecture with specific technologies, components, and tradeoffs. No vague concepts.
- If the question is behavioral: give a specific STAR format answer (Situation, Task, Action, Result) in 4 bullet points. Be specific, not generic.
- If the question is conceptual or theoretical: give a precise technical definition, then a real-world example, then common pitfalls.
- NEVER give generic motivational answers.
- NEVER say things like "great question", "I would leverage my skills", or "I am passionate about".
- NEVER recommend the interviewer to "refer to documentation".
- Be direct, specific, and technically accurate.
- Format code with proper indentation.
- Keep behavioral answers under 120 words. Keep coding answers concise but complete.`;

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