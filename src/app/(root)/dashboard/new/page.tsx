"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

const JOB_ROLES = [
  "Software Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "Full Stack Engineer",
  "Mobile Engineer",
  "iOS Engineer",
  "Android Engineer",
  "DevOps Engineer",
  "Site Reliability Engineer",
  "Data Engineer",
  "Data Scientist",
  "Data Analyst",
  "Machine Learning Engineer",
  "AI Engineer",
  "Cloud Engineer",
  "Security Engineer",
  "QA Engineer",
  "Test Engineer",
  "Embedded Systems Engineer",
  "Systems Engineer",
  "Platform Engineer",
  "Infrastructure Engineer",
  "Product Manager",
  "Project Manager",
  "Engineering Manager",
  "Tech Lead",
  "Solutions Architect",
  "UI/UX Designer",
  "Blockchain Developer",
  "Game Developer",
];

const TECH_STACKS = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C++",
  "C#",
  "Go",
  "Rust",
  "Ruby",
  "PHP",
  "Swift",
  "Kotlin",
  "React",
  "Next.js",
  "Vue.js",
  "Angular",
  "Svelte",
  "Node.js",
  "Express.js",
  "NestJS",
  "Django",
  "FastAPI",
  "Flask",
  "Spring Boot",
  "Laravel",
  "Ruby on Rails",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "SQLite",
  "Firebase",
  "Supabase",
  "GraphQL",
  "REST API",
  "Docker",
  "Kubernetes",
  "AWS",
  "Google Cloud",
  "Azure",
  "Terraform",
  "Git",
  "Linux",
  "Nginx",
  "React Native",
  "Flutter",
  "TailwindCSS",
  "Bootstrap",
  "Three.js",
  "Socket.io",
  "Prisma",
  "Drizzle ORM",
];

const EXPERIENCE_LEVELS = ["Junior", "Mid-level", "Senior", "Lead", "Manager"];

interface DropdownProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
}

function SearchableDropdown({ value, onChange, options, placeholder }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(value.toLowerCase())
  );

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full bg-[#111114] border border-white/[0.08] text-[#f0ede8] placeholder:text-[#3a3a3a] text-sm px-5 py-4 outline-none focus:border-[#d4a03a]/50 transition-colors"
      />
      {isOpen && filtered.length > 0 && (
        <ul className="absolute z-20 w-full top-full mt-px bg-[#111114] border border-white/[0.08] max-h-[220px] overflow-y-auto">
          {filtered.map((option) => (
            <li key={option}>
              <button
                type="button"
                onMouseDown={() => { onChange(option); setIsOpen(false); }}
                className={`w-full text-left px-5 py-3 text-sm transition-colors hover:bg-[#18181c] hover:text-[#f0ede8] ${
                  value === option ? "text-[#d4a03a]" : "text-[#7a7870]"
                }`}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function NewInterviewPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    jobRole: "",
    techStack: "",
    experienceLevel: "Mid-level",
    numberOfQuestions: 5,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.jobRole.trim() || !form.techStack.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/interviews/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      router.push(`/dashboard/interview/${data.interviewId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-[#f0ede8]">

      {/* NAV */}
      <nav className="flex items-center justify-between px-4 sm:px-8 md:px-16 py-5 border-b border-white/[0.06]">
        <Link href="/" className="font-playfair text-2xl font-bold tracking-tight cursor-pointer hover:opacity-80 transition-opacity">
          Whisp<span className="text-[#d4a03a] italic">r</span>
        </Link>
        <Link
          href="/dashboard"
          className="text-xs tracking-[0.06em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors"
        >
          ← Back to dashboard
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs tracking-[0.06em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20">

        {/* HEADER */}
        <div className="mb-14">
          <div className="text-[0.7rem] font-medium tracking-[0.2em] uppercase text-[#d4a03a] mb-3">
            New interview
          </div>
          <h1 className="font-playfair text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.1] tracking-[-0.02em]">
            Set up your <em className="italic text-[#d4a03a]">session.</em>
          </h1>
          <p className="text-sm text-[#7a7870] mt-3 leading-relaxed">
            Tell us about the role and we&apos;ll generate tailored interview questions using AI.
          </p>
        </div>

        {/* FORM */}
        <div className="space-y-8">

          {/* Job Role */}
          <div>
            <label className="block text-xs font-medium tracking-[0.12em] uppercase text-[#7a7870] mb-3">
              Job role
            </label>
            <SearchableDropdown
              value={form.jobRole}
              onChange={(val) => setForm({ ...form, jobRole: val })}
              options={JOB_ROLES}
              placeholder="e.g. Frontend Engineer, Product Manager, Data Scientist"
            />
          </div>

          {/* Tech Stack */}
          <div>
            <label className="block text-xs font-medium tracking-[0.12em] uppercase text-[#7a7870] mb-3">
              Tech stack
            </label>
            <SearchableDropdown
              value={form.techStack}
              onChange={(val) => setForm({ ...form, techStack: val })}
              options={TECH_STACKS}
              placeholder="e.g. React, Node.js, PostgreSQL, AWS"
            />
            <p className="text-xs text-[#4a4a4a] mt-2">
              Separate technologies with commas.
            </p>
          </div>

          {/* Number of Questions */}
          <div>
            <label className="block text-xs font-medium tracking-[0.12em] uppercase text-[#7a7870] mb-3">
              Number of Questions{" "}
              <span className="text-[#d4a03a] font-bold normal-case text-sm ml-1">
                {form.numberOfQuestions}
              </span>
            </label>
            <input
              type="range"
              min={1}
              max={20}
              value={form.numberOfQuestions}
              onChange={(e) => setForm({ ...form, numberOfQuestions: Number(e.target.value) })}
              className="w-full accent-[#d4a03a] cursor-pointer"
            />
            <div className="flex justify-between text-[0.65rem] text-[#4a4a4a] mt-2">
              <span>1</span>
              <span>20</span>
            </div>
          </div>

          {/* Experience Level */}
          <div>
            <label className="block text-xs font-medium tracking-[0.12em] uppercase text-[#7a7870] mb-3">
              Experience level
            </label>
            <div className="flex flex-wrap gap-3">
              {EXPERIENCE_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => setForm({ ...form, experienceLevel: level })}
                  className={`px-5 py-2.5 text-xs font-medium tracking-[0.08em] uppercase border transition-all ${
                    form.experienceLevel === level
                      ? "bg-[#d4a03a] text-[#0a0a0b] border-[#d4a03a]"
                      : "bg-transparent text-[#7a7870] border-white/[0.08] hover:border-white/20 hover:text-[#f0ede8]"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 tracking-wide">{error}</p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#d4a03a] text-[#0a0a0b] text-sm font-medium tracking-[0.1em] uppercase py-4 hover:bg-[#f0c060] transition-all hover:shadow-[0_8px_30px_rgba(212,160,58,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#d4a03a] disabled:hover:shadow-none"
          >
            {loading ? "Generating questions..." : "Generate interview →"}
          </button>

        </div>
      </div>
    </main>
  );
}
