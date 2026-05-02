import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { education } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await db
    .select()
    .from(education)
    .where(eq(education.userId, userId))
    .orderBy(desc(education.graduationYear));

  return NextResponse.json({ education: entries });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { degree, fieldOfStudy, institution, graduationYear, gpa } = body;

  if (!degree || !fieldOfStudy || !institution) {
    return NextResponse.json(
      { error: "degree, fieldOfStudy, and institution are required" },
      { status: 400 }
    );
  }

  const [entry] = await db
    .insert(education)
    .values({
      userId,
      degree,
      fieldOfStudy,
      institution,
      graduationYear: graduationYear ? Number(graduationYear) : null,
      gpa: gpa || null,
    })
    .returning();

  return NextResponse.json(entry, { status: 201 });
}
