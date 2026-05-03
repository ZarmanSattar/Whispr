import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { mockInterviews, questions } from "@/lib/schema";
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

const CreateInterviewSchema = z.object({
  jobRole: z.string().min(1, "jobRole is required"),
  techStack: z.string().min(1, "techStack is required"),
  experienceLevel: z.string().min(1, "experienceLevel is required"),
  numberOfQuestions: z.number().int().min(1).max(20).default(5),
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
    const parsed = CreateInterviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { jobRole, techStack, experienceLevel } = parsed.data;

    const completion = await withRetry(() =>
      groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: `You are a senior technical interviewer at a top-tier technology company. You conduct real, high-signal interviews that assess both technical depth and practical thinking. Your questions are conversational, specific, and never sound like they came from a textbook or quiz.

You generate a mix of three question types:
1. Technical — specific to the candidate's stack and role. Ask about tradeoffs, internals, real implementation decisions. Not definitions.
2. Behavioral — framed as 'Tell me about a time...' or 'Walk me through a situation where...'. Must be relevant to the role level.
3. Scenario-based — present a realistic situation the candidate could face on the job. Ask what they would do and why.

Rules:
- Never ask questions that can be answered in one sentence
- Never ask textbook definitions ('What is a closure?', 'What is a promise?')
- Questions must feel like they come from a real interviewer who has read the job description
- Difficulty must match the experience level precisely
- For Junior: focus on fundamentals applied in context, avoid system design
- For Mid-level: mix of applied technical, some system design, behavioral
- For Senior: system design, architectural tradeoffs, leadership scenarios, deep technical
- For Lead/Manager: org design, technical vision, cross-team scenarios, people decisions
- Distribute question types: 2 technical, 1 behavioral, 1 scenario-based, 1 wildcard (any type that fits best)
- Each ideal answer must be 150-250 words, written as bullet points a strong candidate would cover, not a paragraph`,
          },
          {
            role: "user",
            content: `Generate exactly 5 interview questions for a ${experienceLevel} ${jobRole}. Tech stack: ${techStack}.

Return ONLY a valid JSON array. No markdown, no explanation, no code blocks. Raw JSON only:
[
  {
    "question": "Question text here?",
    "idealAnswer": "Bullet point answer covering key points a strong candidate would hit.",
    "type": "technical" | "behavioral" | "scenario"
  }
]`,
          },
        ],
        temperature: 0.8,
      })
    );

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed2 = JSON.parse(clean) as Array<{ question: string; idealAnswer: string; type?: string }>;

    const [interview] = await db
      .insert(mockInterviews)
      .values({ userId, jobRole, techStack, experienceLevel })
      .returning();

    const questionRows = parsed2.map((q) => ({
      interviewId: interview.id,
      questionText: q.question,
      aiAnswer: q.idealAnswer,
      difficulty: "Medium" as const,
    }));

    await db.insert(questions).values(questionRows);

    return NextResponse.json({ interviewId: interview.id });
  } catch (err) {
    console.error("Create interview error:", err);
    return NextResponse.json({ error: "Failed to create interview" }, { status: 500 });
  }
}
