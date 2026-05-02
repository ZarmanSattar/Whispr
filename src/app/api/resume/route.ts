import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("resume") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  const isPdf =
    name.endsWith(".pdf") || file.type === "application/pdf";
  const isDocx =
    name.endsWith(".docx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  if (!isPdf && !isDocx) {
    return NextResponse.json(
      { error: "Only PDF and DOCX files are accepted" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let extractedText = "";

  if (isPdf) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = (await import("pdf-parse")) as any;
    const pdfParse = mod.default ?? mod;
    const data = await pdfParse(buffer);
    extractedText = data.text.slice(0, 4000);
  } else {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    extractedText = result.value.slice(0, 4000);
  }

  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { resumeText: extractedText },
  });

  return NextResponse.json({ success: true, charCount: extractedText.length });
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { resumeText: null },
  });

  return NextResponse.json({ success: true });
}
