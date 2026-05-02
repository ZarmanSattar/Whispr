import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { education } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [entry] = await db
    .select()
    .from(education)
    .where(eq(education.id, id))
    .limit(1);

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (entry.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { degree, fieldOfStudy, institution, graduationYear, gpa } = body;

  const [updated] = await db
    .update(education)
    .set({
      ...(degree !== undefined && { degree }),
      ...(fieldOfStudy !== undefined && { fieldOfStudy }),
      ...(institution !== undefined && { institution }),
      graduationYear: graduationYear ? Number(graduationYear) : null,
      gpa: gpa || null,
    })
    .where(eq(education.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [entry] = await db
    .select()
    .from(education)
    .where(eq(education.id, id))
    .limit(1);

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (entry.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(education).where(eq(education.id, id));

  return NextResponse.json({ success: true });
}
