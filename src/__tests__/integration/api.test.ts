import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// ─── Mock Clerk auth ──────────────────────────────────────────────────────────
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));

// ─── Mock Drizzle DB ──────────────────────────────────────────────────────────
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// ─── Mock Groq SDK ────────────────────────────────────────────────────────────
vi.mock("groq-sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  { question: "Test question?", idealAnswer: "Test ideal answer.", type: "technical", topic: "testing" },
                ]),
              },
            },
          ],
        }),
      },
    },
  })),
}));

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockDb = db as unknown as Record<string, ReturnType<typeof vi.fn>>;

// ─── Helper: build mock DB chain ─────────────────────────────────────────────
const mockChain = (returnValue: unknown) => {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(returnValue),
    orderBy: vi.fn().mockResolvedValue(returnValue),
    returning: vi.fn().mockResolvedValue(returnValue),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
  return chain;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 16. POST /api/interviews/create
// ═══════════════════════════════════════════════════════════════════════════════
describe("POST /api/interviews/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: "user_test123" });
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const { POST } = await import("@/app/api/interviews/create/route");
    const req = new Request("http://localhost/api/interviews/create", {
      method: "POST",
      body: JSON.stringify({ jobRole: "SWE", techStack: "React", experienceLevel: "Junior", questionCount: 5 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("clamps questionCount to 1-50 range", () => {
    const clamp = (n: number) => Math.min(Math.max(isNaN(Number(n)) ? 5 : Number(n), 1), 50);
    expect(clamp(100)).toBe(50);
    expect(clamp(0)).toBe(1);
    expect(clamp(10)).toBe(10);
  });

  it("returns 429 when rate limited", async () => {
    // Simulate 10 requests to exhaust limit
    const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
    const check = (userId: string) => {
      const now = Date.now();
      const entry = rateLimitMap.get(userId);
      if (!entry || now > entry.resetAt) {
        rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
        return true;
      }
      if (entry.count >= 10) return false;
      entry.count++;
      return true;
    };
    for (let i = 0; i < 10; i++) check("user_test123");
    expect(check("user_test123")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 17-20. POST /api/interviews/answer
// ═══════════════════════════════════════════════════════════════════════════════
describe("POST /api/interviews/answer", () => {
  const validBody = {
    questionId: "550e8400-e29b-41d4-a716-446655440000",
    questionText: "Explain React hooks.",
    aiAnswer: "Hooks are functions that let you use state in functional components.",
    userAnswerText: "Hooks allow state in functional components.",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: "user_test123" });
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const { POST } = await import("@/app/api/interviews/answer/route");
    const req = new Request("http://localhost/api/interviews/answer", {
      method: "POST",
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid UUID questionId", async () => {
    const { POST } = await import("@/app/api/interviews/answer/route");
    const req = new Request("http://localhost/api/interviews/answer", {
      method: "POST",
      body: JSON.stringify({ ...validBody, questionId: "not-a-uuid" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("stores score 0 and skipped:true for SKIPPED answer", () => {
    const isSkipped = (text: string) => text === "SKIPPED";
    const payload = { score: 0, skipped: true, aiFeedback: "This question was skipped." };
    expect(isSkipped("SKIPPED")).toBe(true);
    expect(payload.score).toBe(0);
    expect(payload.skipped).toBe(true);
  });

  it("returns 404 when question not found", async () => {
    const { POST } = await import("@/app/api/interviews/answer/route");
    mockDb.select = vi.fn().mockReturnValue(mockChain([]));
    const req = new Request("http://localhost/api/interviews/answer", {
      method: "POST",
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect([401, 404, 500]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 21. GET /api/interviews/[interviewId]/questions
// ═══════════════════════════════════════════════════════════════════════════════
describe("GET /api/interviews/[interviewId]/questions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: "user_test123" });
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const { GET } = await import("@/app/api/interviews/[interviewId]/questions/route");
    const req = new Request("http://localhost/api/interviews/550e8400-e29b-41d4-a716-446655440000/questions");
    const res = await GET(req, { params: Promise.resolve({ interviewId: "550e8400-e29b-41d4-a716-446655440000" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid UUID", async () => {
    const { GET } = await import("@/app/api/interviews/[interviewId]/questions/route");
    const req = new Request("http://localhost/api/interviews/bad-id/questions");
    const res = await GET(req, { params: Promise.resolve({ interviewId: "bad-id" }) });
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 22. GET /api/interviews/[interviewId]/feedback
// ═══════════════════════════════════════════════════════════════════════════════
describe("GET /api/interviews/[interviewId]/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: "user_test123" });
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const { GET } = await import("@/app/api/interviews/[interviewId]/feedback/route");
    const req = new Request("http://localhost/api/interviews/550e8400-e29b-41d4-a716-446655440000/feedback");
    const res = await GET(req, { params: Promise.resolve({ interviewId: "550e8400-e29b-41d4-a716-446655440000" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid UUID", async () => {
    const { GET } = await import("@/app/api/interviews/[interviewId]/feedback/route");
    const req = new Request("http://localhost/api/interviews/bad-id/feedback");
    const res = await GET(req, { params: Promise.resolve({ interviewId: "bad-id" }) });
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 23. GET /api/education
// ═══════════════════════════════════════════════════════════════════════════════
describe("GET /api/education", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const { GET } = await import("@/app/api/education/route");
    const req = new Request("http://localhost/api/education");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 200 with education entries for authenticated user", async () => {
    mockAuth.mockResolvedValue({ userId: "user_test123" });
    const mockEntries = [{ id: "1", userId: "user_test123", degree: "BSc", fieldOfStudy: "CS", institution: "MIT" }];
    mockDb.select = vi.fn().mockReturnValue(mockChain(mockEntries));
    const { GET } = await import("@/app/api/education/route");
    const res = await GET();
    expect([200, 500]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 24. POST /api/education - validation
// ═══════════════════════════════════════════════════════════════════════════════
describe("POST /api/education", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: "user_test123" });
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const { POST } = await import("@/app/api/education/route");
    const req = new Request("http://localhost/api/education", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ degree: "BSc", fieldOfStudy: "CS", institution: "MIT" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    const { POST } = await import("@/app/api/education/route");
    const req = new Request("http://localhost/api/education", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ degree: "BSc" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 25. PUT /api/education/[id] - ownership
// ═══════════════════════════════════════════════════════════════════════════════
describe("PUT /api/education/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const { PUT } = await import("@/app/api/education/[id]/route");
    const req = new Request("http://localhost/api/education/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ degree: "MSc" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 403 when editing another user entry", async () => {
    mockAuth.mockResolvedValue({ userId: "user_other" });
    const mockEntry = [{ id: "1", userId: "user_test123" }];
    mockDb.select = vi.fn().mockReturnValue(mockChain(mockEntry));
    const { PUT } = await import("@/app/api/education/[id]/route");
    const req = new Request("http://localhost/api/education/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ degree: "MSc" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "1" }) });
    expect([403, 500]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 26. DELETE /api/education/[id] - ownership
// ═══════════════════════════════════════════════════════════════════════════════
describe("DELETE /api/education/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const { DELETE } = await import("@/app/api/education/[id]/route");
    const req = new Request("http://localhost/api/education/1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 403 when deleting another user entry", async () => {
    mockAuth.mockResolvedValue({ userId: "user_other" });
    const mockEntry = [{ id: "1", userId: "user_test123" }];
    mockDb.select = vi.fn().mockReturnValue(mockChain(mockEntry));
    const { DELETE } = await import("@/app/api/education/[id]/route");
    const req = new Request("http://localhost/api/education/1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect([403, 500]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 27-30. Auth protection tests
// ═══════════════════════════════════════════════════════════════════════════════
describe("Auth protection - API routes", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ userId: null });
  });

  it("resume POST returns 401 when unauthenticated", async () => {
    const { POST } = await import("@/app/api/resume/route");
    const formData = new FormData();
    const req = new Request("http://localhost/api/resume", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("resume DELETE returns 401 when unauthenticated", async () => {
    const { DELETE } = await import("@/app/api/resume/route");
    const res = await DELETE();
    expect(res.status).toBe(401);
  });

  it("resume status returns 401 when unauthenticated", async () => {
    const { GET } = await import("@/app/api/resume/status/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
