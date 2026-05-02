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

function getExperienceGuidance(level: string): string {
  const l = level.toLowerCase();
  if (l.includes("junior")) {
    return "Focus on fundamental concepts, basic syntax, and simple real-world scenarios. Avoid architecture or system design questions.";
  }
  if (l.includes("mid")) {
    return "Focus on practical experience, problem-solving ability, and common design patterns. Include scenario-based questions.";
  }
  if (l.includes("senior")) {
    return "Focus on architecture decisions, performance trade-offs, system design, and technical leadership experience.";
  }
  if (l.includes("lead")) {
    return "Focus on team management, technical strategy, cross-team collaboration, and driving engineering excellence.";
  }
  if (l.includes("manager")) {
    return "Focus on people management, roadmap planning, stakeholder communication, and balancing technical and business goals.";
  }
  return "Focus on practical experience and problem-solving ability.";
}

function getDifficultyDistribution(
  level: string,
  total: number
): { easy: number; medium: number; hard: number } {
  const l = level.toLowerCase();
  let easy = 0, medium = 0, hard = 0;
  if (l.includes("junior")) {
    easy = Math.round(total * 0.7);
    medium = total - easy;
  } else if (l.includes("mid")) {
    easy = Math.round(total * 0.3);
    hard = Math.round(total * 0.2);
    medium = total - easy - hard;
  } else if (l.includes("senior")) {
    hard = Math.round(total * 0.5);
    medium = Math.round(total * 0.4);
    easy = total - medium - hard;
  } else if (l.includes("lead") || l.includes("manager")) {
    hard = Math.round(total * 0.8);
    medium = total - hard;
  } else {
    easy = Math.round(total * 0.3);
    hard = Math.round(total * 0.2);
    medium = total - easy - hard;
  }
  return { easy: Math.max(0, easy), medium: Math.max(0, medium), hard: Math.max(0, hard) };
}

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

    const { jobRole, techStack, experienceLevel, numberOfQuestions } = parsed.data;
    const guidance = getExperienceGuidance(experienceLevel);
    const dist = getDifficultyDistribution(experienceLevel, numberOfQuestions);

    const difficultyInstruction = [
      dist.easy > 0 ? `${dist.easy} question(s) labeled "Easy"` : "",
      dist.medium > 0 ? `${dist.medium} question(s) labeled "Medium"` : "",
      dist.hard > 0 ? `${dist.hard} question(s) labeled "Hard"` : "",
    ]
      .filter(Boolean)
      .join(", ");

    const prompt = `You are an expert technical interviewer. Generate exactly ${numberOfQuestions} interview questions for a ${experienceLevel} ${jobRole} position using this tech stack: ${techStack}.

Experience level guidance: ${guidance}

Difficulty distribution (follow precisely): ${difficultyInstruction}.

Return ONLY a valid JSON object with no markdown, no code blocks, and no text outside the JSON. The structure must be exactly:
{
  "questions": [
    {
      "questionText": "the interview question",
      "aiAnswer": "a thorough model answer demonstrating expert knowledge",
      "difficulty": "Easy"
    }
  ]
}

Rules:
- difficulty must be exactly one of: "Easy", "Medium", or "Hard"
- Follow the difficulty distribution above precisely
- Make questions specific to the tech stack and appropriate for the experience level
- aiAnswer must be detailed and demonstrate expert-level knowledge
- Do not include any text, explanation, or formatting outside the JSON object`;

    const completion = await withRetry(() =>
      groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      })
    );

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed2 = JSON.parse(clean);

    const [interview] = await db
      .insert(mockInterviews)
      .values({ userId, jobRole, techStack, experienceLevel })
      .returning();

    const validDifficulties = ["Easy", "Medium", "Hard"];
    const questionRows = (
      parsed2.questions as Array<{ questionText: string; aiAnswer: string; difficulty?: string }>
    ).map((q) => ({
      interviewId: interview.id,
      questionText: q.questionText,
      aiAnswer: q.aiAnswer,
      difficulty: validDifficulties.includes(q.difficulty ?? "") ? q.difficulty! : "Medium",
    }));

    await db.insert(questions).values(questionRows);

    return NextResponse.json({ interviewId: interview.id });
  } catch (err) {
    console.error("Create interview error:", err);
    return NextResponse.json({ error: "Failed to create interview" }, { status: 500 });
  }
}
