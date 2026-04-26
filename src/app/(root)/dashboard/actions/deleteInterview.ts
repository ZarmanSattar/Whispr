"use server";

import { db } from "@/lib/db";
import { mockInterviews, questions, userAnswers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function deleteInterview(interviewId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Get all questions for this interview
  const interviewQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.interviewId, interviewId));

  // Delete all answers for each question
  for (const q of interviewQuestions) {
    await db.delete(userAnswers).where(eq(userAnswers.questionId, q.id));
  }

  // Delete all questions
  await db.delete(questions).where(eq(questions.interviewId, interviewId));

  // Delete the interview itself
  await db
    .delete(mockInterviews)
    .where(eq(mockInterviews.id, interviewId));

  revalidatePath("/dashboard");
}