import { pgTable, text, timestamp, integer, uuid } from "drizzle-orm/pg-core";

export const mockInterviews = pgTable("mock_interviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  jobRole: text("job_role").notNull(),
  techStack: text("tech_stack").notNull(),
  experienceLevel: text("experience_level").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  interviewId: uuid("interview_id").references(() => mockInterviews.id),
  questionText: text("question_text").notNull(),
  aiAnswer: text("ai_answer").notNull(),
  difficulty: text("difficulty").notNull().default("Medium"),
});

export const userAnswers = pgTable("user_answers", {
  id: uuid("id").defaultRandom().primaryKey(),
  questionId: uuid("question_id").references(() => questions.id),
  userAnswerText: text("user_answer_text").notNull(),
  aiFeedback: text("ai_feedback").notNull(),
  score: integer("score").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const education = pgTable("education", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  degree: text("degree").notNull(),
  fieldOfStudy: text("field_of_study").notNull(),
  institution: text("institution").notNull(),
  graduationYear: integer("graduation_year"),
  gpa: text("gpa"),
  createdAt: timestamp("created_at").defaultNow(),
});