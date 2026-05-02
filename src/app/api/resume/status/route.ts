import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const resumeText = user.publicMetadata?.resumeText as string | undefined;

  return NextResponse.json({
    hasResume: !!resumeText,
    charCount: resumeText?.length ?? 0,
  });
}
