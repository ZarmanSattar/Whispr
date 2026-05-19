import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { liveSessions } from "@/lib/schema";
import { eq } from "drizzle-orm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { jobRole, targetCompany, resumeText } = await req.json();

    if (!jobRole) return NextResponse.json({ error: "Job role required" }, { status: 400 });

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 4); // 4 hours

    const [session] = await db.insert(liveSessions).values({
      userId,
      code,
      jobRole,
      targetCompany: targetCompany || null,
      resumeText: resumeText || null,
      status: "active",
      expiresAt,
    }).returning();

    return NextResponse.json({ code: session.code, sessionId: session.id, expiresAt });
  } catch (err) {
    console.error("Live session error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

    const [session] = await db.select().from(liveSessions).where(eq(liveSessions.code, code));

    if (!session || new Date() > session.expiresAt) {
      return NextResponse.json({ valid: false }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json(
      { valid: true, jobRole: session.jobRole, targetCompany: session.targetCompany },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Live session fetch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}