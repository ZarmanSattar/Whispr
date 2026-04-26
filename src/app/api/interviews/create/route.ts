import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mockInterviews, questions } from "@/lib/schema";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobRole, techStack, experienceLevel } = await req.json();

    if (!jobRole || !techStack || !experienceLevel) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const prompt = `You are an expert technical interviewer. Generate exactly 5 interview questions for a ${experienceLevel} ${jobRole} position. The candidate's tech stack is: ${techStack}.

Return ONLY a valid JSON array with no markdown, no explanation, no code blocks. Just the raw JSON array like this:
[
  {
    "question": "Your interview question here?",
    "idealAnswer": "A detailed ideal answer here."
  }
]

Make questions realistic, specific to the tech stack, and progressively harder.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const text = completion.choices[0]?.message?.content?.trim() || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    const [interview] = await db
      .insert(mockInterviews)
      .values({ userId, jobRole, techStack, experienceLevel })
      .returning();

    const questionRows = parsed.map((q: { question: string; idealAnswer: string }) => ({
      interviewId: interview.id,
      questionText: q.question,
      aiAnswer: q.idealAnswer,
    }));

    await db.insert(questions).values(questionRows);

    return NextResponse.json({ interviewId: interview.id });
  } catch (err) {
    console.error("Create interview error:", err);
    return NextResponse.json({ error: "Failed to create interview" }, { status: 500 });
  }
}