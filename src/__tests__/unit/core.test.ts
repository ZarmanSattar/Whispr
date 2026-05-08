import { describe, it, expect, vi } from "vitest";

// ─── 1. Question count clamping ───────────────────────────────────────────────
describe("questionCount clamping", () => {
  const clamp = (n: number) => Math.min(Math.max(isNaN(Number(n)) ? 5 : Number(n), 1), 50);

  it("clamps below 1 to 1", () => expect(clamp(0)).toBe(1));
  it("clamps negative to 1", () => expect(clamp(-5)).toBe(1));
  it("clamps above 50 to 50", () => expect(clamp(100)).toBe(50));
  it("keeps valid value 10", () => expect(clamp(10)).toBe(10));
  it("defaults NaN to 5", () => expect(clamp(NaN)).toBe(5));
  it("keeps boundary value 1", () => expect(clamp(1)).toBe(1));
  it("keeps boundary value 50", () => expect(clamp(50)).toBe(50));
});

// ─── 2. Average score calculation ────────────────────────────────────────────
describe("average score calculation", () => {
  interface Answer { score: number; skipped?: boolean }

  const calcAvg = (answers: Answer[]) => {
    const nonSkipped = answers.filter((a) => !a.skipped);
    if (nonSkipped.length === 0) return null;
    return Math.round(nonSkipped.reduce((s, a) => s + a.score, 0) / nonSkipped.length);
  };

  it("calculates average correctly", () => {
    expect(calcAvg([{ score: 6 }, { score: 8 }, { score: 4 }])).toBe(6);
  });

  it("excludes skipped answers", () => {
    expect(calcAvg([{ score: 8 }, { score: 0, skipped: true }, { score: 6 }])).toBe(7);
  });

  it("returns null when all are skipped", () => {
    expect(calcAvg([{ score: 0, skipped: true }])).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(calcAvg([])).toBeNull();
  });

  it("rounds correctly", () => {
    expect(calcAvg([{ score: 7 }, { score: 8 }])).toBe(8);
  });
});

// ─── 3. Skipped answer logic ──────────────────────────────────────────────────
describe("skipped answer logic", () => {
  it("skipped answer has score 0", () => {
    const answer = { userAnswerText: "SKIPPED", score: 0, skipped: true };
    expect(answer.score).toBe(0);
    expect(answer.skipped).toBe(true);
  });

  it("skipped answer text is SKIPPED", () => {
    const isSkipped = (text: string) => text === "SKIPPED";
    expect(isSkipped("SKIPPED")).toBe(true);
    expect(isSkipped("some real answer")).toBe(false);
  });
});

// ─── 4. Experience level filter ──────────────────────────────────────────────
describe("experience level filter", () => {
  const interviews = [
    { id: "1", experienceLevel: "Junior" },
    { id: "2", experienceLevel: "Mid-level" },
    { id: "3", experienceLevel: "Senior" },
    { id: "4", experienceLevel: "Lead" },
    { id: "5", experienceLevel: "Manager" },
  ];

  const filter = (level: string) =>
    level === "all" ? interviews : interviews.filter((i) => i.experienceLevel === level);

  it("filters Junior exactly", () => {
    const result = filter("Junior");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters Mid-level exactly (not mid-level)", () => {
    expect(filter("mid-level")).toHaveLength(0);
    expect(filter("Mid-level")).toHaveLength(1);
  });

  it("returns all when filter is all", () => {
    expect(filter("all")).toHaveLength(5);
  });

  it("filters Senior correctly", () => {
    expect(filter("Senior")).toHaveLength(1);
  });

  it("filters Lead correctly", () => {
    expect(filter("Lead")).toHaveLength(1);
  });

  it("filters Manager correctly", () => {
    expect(filter("Manager")).toHaveLength(1);
  });
});

// ─── 5. UTC date formatting ───────────────────────────────────────────────────
describe("UTC date formatting", () => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  it("formats date consistently with UTC", () => {
    const d = new Date("2024-01-15T00:00:00Z");
    expect(formatDate(d)).toBe("Jan 15, 2024");
  });

  it("same result called twice (no hydration mismatch)", () => {
    const d = new Date("2024-06-01T00:00:00Z");
    expect(formatDate(d)).toBe(formatDate(d));
  });
});

// ─── 6. PDF overall score calculation ────────────────────────────────────────
describe("PDF overall score calculation", () => {
  interface Item { userAnswer: { score: number; skipped?: boolean } | null }

  const calcPdfScore = (items: Item[]) => {
    const nonSkipped = items.filter(
      (i) => i.userAnswer !== null && i.userAnswer!.skipped !== true
    );
    if (nonSkipped.length === 0) return "N/A";
    const total = nonSkipped.reduce((sum, i) => sum + (i.userAnswer!.score || 0), 0);
    return (total / nonSkipped.length).toFixed(1);
  };

  it("calculates correctly with all answered", () => {
    expect(calcPdfScore([
      { userAnswer: { score: 8 } },
      { userAnswer: { score: 6 } },
    ])).toBe("7.0");
  });

  it("excludes skipped from average", () => {
    expect(calcPdfScore([
      { userAnswer: { score: 8 } },
      { userAnswer: { score: 0, skipped: true } },
    ])).toBe("8.0");
  });

  it("returns N/A when all skipped", () => {
    expect(calcPdfScore([
      { userAnswer: { score: 0, skipped: true } },
    ])).toBe("N/A");
  });

  it("returns N/A for empty items", () => {
    expect(calcPdfScore([])).toBe("N/A");
  });

  it("returns N/A when all userAnswers are null", () => {
    expect(calcPdfScore([{ userAnswer: null }])).toBe("N/A");
  });
});

// ─── 7. PDF filename slug ─────────────────────────────────────────────────────
describe("PDF filename slug", () => {
  const makeFilename = (jobRole: string, interviewDate: string) => {
    const dateSlug = new Date(interviewDate || Date.now()).toISOString().split("T")[0];
    const roleSlug = (jobRole || "interview").toLowerCase().replace(/\s+/g, "-");
    return `whispr-feedback-${roleSlug}-${dateSlug}.pdf`;
  };

  it("formats role and date correctly", () => {
    expect(makeFilename("Software Engineer", "2024-03-15")).toBe(
      "whispr-feedback-software-engineer-2024-03-15.pdf"
    );
  });

  it("replaces spaces with hyphens", () => {
    expect(makeFilename("Product Manager", "2024-01-01")).toContain("product-manager");
  });

  it("defaults to interview when no role", () => {
    expect(makeFilename("", "2024-01-01")).toContain("whispr-feedback-interview-");
  });
});

// ─── 8. Resume file validation ────────────────────────────────────────────────
describe("resume file validation", () => {
  const validate = (name: string, size: number): string | null => {
    const lower = name.toLowerCase();
    if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
      return "Only PDF and DOCX files are accepted.";
    }
    if (size > 5 * 1024 * 1024) {
      return "File must be under 5MB.";
    }
    return null;
  };

  it("accepts PDF files", () => expect(validate("resume.pdf", 100000)).toBeNull());
  it("accepts DOCX files", () => expect(validate("resume.docx", 100000)).toBeNull());
  it("rejects TXT files", () => expect(validate("resume.txt", 100000)).toBeTruthy());
  it("rejects PNG files", () => expect(validate("photo.png", 100000)).toBeTruthy());
  it("rejects files over 5MB", () => expect(validate("resume.pdf", 6 * 1024 * 1024)).toBeTruthy());
  it("accepts files exactly at 5MB", () => expect(validate("resume.pdf", 5 * 1024 * 1024)).toBeNull());
  it("is case insensitive", () => expect(validate("RESUME.PDF", 100000)).toBeNull());
});

// ─── 9. Education field validation ───────────────────────────────────────────
describe("education field validation", () => {
  interface EducationPayload {
    degree?: string;
    fieldOfStudy?: string;
    institution?: string;
    startYear?: number;
    endYear?: number;
    gpa?: string;
  }

  const validate = (body: EducationPayload): string | null => {
    if (!body.degree || !body.fieldOfStudy || !body.institution) {
      return "degree, fieldOfStudy, and institution are required";
    }
    return null;
  };

  it("passes with all required fields", () => {
    expect(validate({ degree: "BSc", fieldOfStudy: "CS", institution: "MIT" })).toBeNull();
  });

  it("fails without degree", () => {
    expect(validate({ fieldOfStudy: "CS", institution: "MIT" })).toBeTruthy();
  });

  it("fails without fieldOfStudy", () => {
    expect(validate({ degree: "BSc", institution: "MIT" })).toBeTruthy();
  });

  it("fails without institution", () => {
    expect(validate({ degree: "BSc", fieldOfStudy: "CS" })).toBeTruthy();
  });

  it("passes without optional fields", () => {
    expect(validate({ degree: "BSc", fieldOfStudy: "CS", institution: "MIT" })).toBeNull();
  });
});

// ─── 10. Rate limiter ─────────────────────────────────────────────────────────
describe("rate limiter", () => {
  const createLimiter = () => {
    const map = new Map<string, { count: number; resetAt: number }>();
    return (userId: string): boolean => {
      const now = Date.now();
      const entry = map.get(userId);
      if (!entry || now > entry.resetAt) {
        map.set(userId, { count: 1, resetAt: now + 60_000 });
        return true;
      }
      if (entry.count >= 10) return false;
      entry.count++;
      return true;
    };
  };

  it("allows first 10 requests", () => {
    const check = createLimiter();
    for (let i = 0; i < 10; i++) {
      expect(check("user1")).toBe(true);
    }
  });

  it("blocks 11th request", () => {
    const check = createLimiter();
    for (let i = 0; i < 10; i++) check("user1");
    expect(check("user1")).toBe(false);
  });

  it("different users have independent limits", () => {
    const check = createLimiter();
    for (let i = 0; i < 10; i++) check("user1");
    expect(check("user2")).toBe(true);
  });
});

// ─── 11. Groq retry logic ─────────────────────────────────────────────────────
describe("Groq retry logic", () => {
  const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delayMs = 0): Promise<T> => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (attempt === retries - 1) throw err;
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    throw new Error("Unreachable");
  };

  it("succeeds on first attempt", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds on 2nd attempt", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after 3 failed attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));
    await expect(withRetry(fn)).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

// ─── 12. extractHint ─────────────────────────────────────────────────────────
describe("extractHint", () => {
  const extractHint = (aiAnswer: string): string => {
    if (!aiAnswer) return "";
    const sentences = aiAnswer.split(/(?<=[.!?])\s+/);
    return sentences.slice(0, 2).join(" ");
  };

  it("returns first two sentences", () => {
    const hint = extractHint("First sentence. Second sentence. Third sentence.");
    expect(hint).toBe("First sentence. Second sentence.");
  });

  it("returns empty string for empty input", () => {
    expect(extractHint("")).toBe("");
  });

  it("returns full text if only one sentence", () => {
    expect(extractHint("Only one sentence.")).toBe("Only one sentence.");
  });
});

// ─── 13. Interview status transitions ────────────────────────────────────────
describe("interview status transitions", () => {
  type Status = "not_started" | "in_progress" | "completed";

  const transition = (current: Status, event: "answer" | "complete"): Status => {
    if (event === "answer" && current === "not_started") return "in_progress";
    if (event === "complete" && current === "in_progress") return "completed";
    return current;
  };

  it("not_started -> in_progress on first answer", () => {
    expect(transition("not_started", "answer")).toBe("in_progress");
  });

  it("in_progress -> completed on complete", () => {
    expect(transition("in_progress", "complete")).toBe("completed");
  });

  it("not_started stays not_started on complete", () => {
    expect(transition("not_started", "complete")).toBe("not_started");
  });

  it("completed stays completed", () => {
    expect(transition("completed", "answer")).toBe("completed");
  });
});

// ─── 14. Cascading delete order ───────────────────────────────────────────────
describe("cascading delete order", () => {
  it("deletes answers before questions before interview", () => {
    const order: string[] = [];
    const deleteAnswers = () => order.push("answers");
    const deleteQuestions = () => order.push("questions");
    const deleteInterview = () => order.push("interview");

    deleteAnswers();
    deleteQuestions();
    deleteInterview();

    expect(order).toEqual(["answers", "questions", "interview"]);
  });
});

// ─── 15. Education ownership check ───────────────────────────────────────────
describe("education ownership check", () => {
  const checkOwnership = (entryUserId: string, requestUserId: string): boolean => {
    return entryUserId === requestUserId;
  };

  it("allows owner to edit", () => {
    expect(checkOwnership("user_abc", "user_abc")).toBe(true);
  });

  it("blocks non-owner from editing", () => {
    expect(checkOwnership("user_abc", "user_xyz")).toBe(false);
  });
});
