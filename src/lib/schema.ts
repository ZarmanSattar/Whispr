import { pgTable, text, timestamp, integer, uuid, boolean, numeric } from "drizzle-orm/pg-core";

export const mockInterviews = pgTable("mock_interviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  jobRole: text("job_role").notNull(),
  techStack: text("tech_stack").notNull(),
  experienceLevel: text("experience_level").notNull(),
  interviewType: text("interview_type").default("mixed"),
  targetCompany: text("target_company"),
  status: text("status").default("not_started").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  interviewId: uuid("interview_id").references(() => mockInterviews.id),
  questionText: text("question_text").notNull(),
  aiAnswer: text("ai_answer").notNull(),
  difficulty: text("difficulty").notNull().default("Medium"),
  questionType: text("question_type"),
  topic: text("topic"),
  orderIndex: integer("order_index"),
});

export const userAnswers = pgTable("user_answers", {
  id: uuid("id").defaultRandom().primaryKey(),
  questionId: uuid("question_id").references(() => questions.id),
  userAnswerText: text("user_answer_text").notNull(),
  aiFeedback: text("ai_feedback").notNull(),
  score: integer("score").notNull(),
  technicalScore: integer("technical_score"),
  clarityScore: integer("clarity_score"),
  depthScore: integer("depth_score"),
  confidenceScore: integer("confidence_score"),
  skipped: boolean("skipped").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const education = pgTable("education", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  degree: text("degree").notNull(),
  fieldOfStudy: text("field_of_study").notNull(),
  institution: text("institution").notNull(),
  startYear: integer("start_year"),
  endYear: integer("end_year"),
  gpa: text("gpa"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userProgress = pgTable("user_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  interviewId: uuid("interview_id").references(() => mockInterviews.id),
  totalQuestions: integer("total_questions").notNull(),
  answeredQuestions: integer("answered_questions").notNull(),
  skippedQuestions: integer("skipped_questions").default(0),
  avgScore: numeric("avg_score", { precision: 4, scale: 2 }),
  avgTechnicalScore: numeric("avg_technical_score", { precision: 4, scale: 2 }),
  avgClarityScore: numeric("avg_clarity_score", { precision: 4, scale: 2 }),
  avgDepthScore: numeric("avg_depth_score", { precision: 4, scale: 2 }),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
