import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";

export default async function LandingPage() {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  return (
    <main className="bg-[#0a0a0b] text-[#f0ede8] font-light overflow-x-hidden">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 md:px-16 py-5 bg-[#0a0a0b]/75 backdrop-blur-md border-b border-white/[0.06]">
        <Link href="/" className="font-playfair text-2xl font-bold tracking-tight cursor-pointer hover:opacity-80 transition-opacity">
          Whisp<span className="text-[#d4a03a] italic">r</span>
        </Link>
        <div className="flex items-center gap-3 md:gap-10">
          <a href="#how" className="hidden md:block text-xs font-normal tracking-[0.06em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors">
            How it works
          </a>
          <a href="#features" className="hidden md:block text-xs font-normal tracking-[0.06em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors">
            Features
          </a>
          <a href="#pricing" className="hidden md:block text-xs font-normal tracking-[0.06em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors">
            Pricing
          </a>
          {isSignedIn ? (
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="bg-[#d4a03a] text-[#0a0a0b] text-xs font-medium tracking-[0.08em] uppercase px-5 py-2 hover:bg-[#f0c060] transition-all hover:-translate-y-px"
              >
                Dashboard
              </Link>
              <SignOutButton redirectUrl="/">
                <button className="text-xs font-normal tracking-[0.06em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors">
                  Sign out
                </button>
              </SignOutButton>
            </div>
          ) : (
            <Link
              href="/sign-in"
              className="bg-[#d4a03a] text-[#0a0a0b] text-xs font-medium tracking-[0.08em] uppercase px-5 py-2 hover:bg-[#f0c060] transition-all hover:-translate-y-px"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-32 pb-16 overflow-hidden">
        <div
          className="pointer-events-none absolute top-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(212,160,58,0.12) 0%, transparent 70%)" }}
        />
        <div className="flex items-center gap-3 text-[#d4a03a] text-[0.72rem] font-medium tracking-[0.22em] uppercase mb-8 animate-fadeUp">
          <span className="block w-8 h-px bg-[#8a6520]" />
          AI Interview Preparation
          <span className="block w-8 h-px bg-[#8a6520]" />
        </div>
        <h1 className="font-playfair text-[clamp(3rem,7vw,6.5rem)] font-black leading-[1.05] tracking-[-0.03em] max-w-[900px] mb-1 animate-fadeUp animation-delay-100">
          Prepare like you<br />
          already{" "}
          <em className="italic text-[#d4a03a]">got the job.</em>
        </h1>
        <p className="text-[clamp(1rem,2vw,1.2rem)] font-light text-[#7a7870] max-w-[540px] mt-7 mb-12 leading-[1.65] animate-fadeUp animation-delay-200">
          Whispr generates real interview questions for your exact role, listens to your answers, and gives you honest AI feedback — so you walk in ready.
        </p>
        <div className="flex gap-4 justify-center flex-wrap animate-fadeUp animation-delay-300">
          {isSignedIn ? (
            <Link
              href="/dashboard"
              className="bg-[#d4a03a] text-[#0a0a0b] text-sm font-medium tracking-[0.1em] uppercase px-10 py-4 hover:bg-[#f0c060] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(212,160,58,0.35)]"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/sign-up"
              className="bg-[#d4a03a] text-[#0a0a0b] text-sm font-medium tracking-[0.1em] uppercase px-10 py-4 hover:bg-[#f0c060] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(212,160,58,0.35)]"
            >
              Start for free
            </Link>
          )}
          
            <a href="#how" className="bg-transparent text-[#7a7870] text-sm font-normal px-8 py-4 border border-white/[0.12] hover:text-[#f0ede8] hover:border-white/30 transition-all">See how it works</a>
        </div>
      </section>

      {/* STATS STRIP */}
      <div className="flex justify-center gap-8 sm:gap-16 py-12 border-t border-b border-white/[0.06] flex-wrap px-6">
        {[
          { num: "94%", label: "Confidence increase" },
          { num: "3x",  label: "Faster preparation" },
          { num: "50+", label: "Role categories" },
          { num: "inf", label: "Practice sessions" },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <div className="font-playfair text-[2.4rem] font-bold text-[#d4a03a] leading-none">
              {s.num}
            </div>
            <div className="text-[0.75rem] tracking-[0.12em] uppercase text-[#7a7870] mt-1">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* HOW IT WORKS */}
      <section id="how" className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-[0.7rem] font-medium tracking-[0.2em] uppercase text-[#d4a03a] mb-5">
            Process
          </div>
          <h2 className="font-playfair text-[clamp(2rem,4vw,3.2rem)] font-bold leading-[1.15] tracking-[-0.02em] max-w-[650px] mb-16">
            Three steps to{" "}
            <em className="italic text-[#d4a03a]">interview confidence</em>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 border border-white/[0.06]">
            {[
              {
                n: "01",
                title: "Tell us the role",
                desc: "Enter the job title, your tech stack, and experience level. Whispr tailors every question to your exact position.",
              },
              {
                n: "02",
                title: "Answer out loud",
                desc: "Speak your answers naturally. Whispr transcribes and evaluates your response in real time using advanced AI.",
              },
              {
                n: "03",
                title: "Get your score",
                desc: "Receive a detailed breakdown — what was strong, what to sharpen, and model answers to study from.",
              },
            ].map((step, i) => (
              <div
                key={step.n}
                className={`p-10 hover:bg-[#111114] transition-colors ${
                  i < 2 ? "border-b md:border-b-0 md:border-r border-white/[0.06]" : ""
                }`}
              >
                <div className="font-playfair text-[3.5rem] font-black text-[#d4a03a]/15 leading-none mb-6">
                  {step.n}
                </div>
                <div className="text-base font-medium text-[#f0ede8] mb-3 tracking-wide">
                  {step.title}
                </div>
                <div className="text-sm text-[#7a7870] leading-[1.65]">
                  {step.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIVIDER */}
      <div
        className="max-w-[400px] mx-auto h-px"
        style={{ background: "linear-gradient(90deg, transparent, #8a6520, transparent)" }}
      />

      {/* FEATURES */}
      <section id="features" className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-[0.7rem] font-medium tracking-[0.2em] uppercase text-[#d4a03a] mb-5">
            Features
          </div>
          <h2 className="font-playfair text-[clamp(2rem,4vw,3.2rem)] font-bold leading-[1.15] tracking-[-0.02em] max-w-[650px] mb-16">
            Everything you need.{" "}
            <em className="italic text-[#d4a03a]">Nothing you don&apos;t.</em>
          </h2>
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            style={{ gap: "1.5px", background: "rgba(255,255,255,0.06)" }}
          >
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[#d4a03a] fill-none stroke-[1.5]">
                    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
                  </svg>
                ),
                title: "Role-specific questions",
                desc: "AI generates questions based on your actual job title and tech stack — not generic lists.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[#d4a03a] fill-none stroke-[1.5]">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                  </svg>
                ),
                title: "Voice-to-text answers",
                desc: "Record your answer naturally. No typing. Just talk, exactly as you would in a real interview.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[#d4a03a] fill-none stroke-[1.5]">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                ),
                title: "AI scoring and feedback",
                desc: "Each answer is scored and critiqued on clarity, depth, and technical accuracy with specific suggestions.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[#d4a03a] fill-none stroke-[1.5]">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                ),
                title: "Session history",
                desc: "Every mock interview is saved. Track your progress across sessions and measure improvement over time.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[#d4a03a] fill-none stroke-[1.5]">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                ),
                title: "Model answers",
                desc: "After each question, see what an ideal answer looks like — written by AI, grounded in best practice.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[#d4a03a] fill-none stroke-[1.5]">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                ),
                title: "Secure and private",
                desc: "Your sessions are private to your account. We never sell your data or share your answers.",
              },
            ].map((f) => (
              <div key={f.title} className="bg-[#0a0a0b] p-10 hover:bg-[#111114] transition-colors">
                <div className="w-9 h-9 border border-[rgba(212,160,58,0.18)] flex items-center justify-center mb-6">
                  {f.icon}
                </div>
                <div className="text-base font-medium text-[#f0ede8] mb-2 tracking-wide">
                  {f.title}
                </div>
                <div className="text-sm text-[#7a7870] leading-[1.7]">
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-28 px-6 bg-[#111114] border-t border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <div className="text-[0.7rem] font-medium tracking-[0.2em] uppercase text-[#d4a03a] mb-5">
            What people say
          </div>
          <h2 className="font-playfair text-[clamp(2rem,4vw,3.2rem)] font-bold leading-[1.15] tracking-[-0.02em] max-w-[650px] mb-14">
            Built for <em className="italic text-[#d4a03a]">real candidates</em>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                text: "I used Whispr for three days before my Google interview. The feedback on my system design answers was more useful than anything I had read online.",
                name: "Ayaan Khan",
                role: "SWE · Google L5",
                initials: "AK",
              },
              {
                text: "It knew exactly what questions to ask for a product manager role at a Series B startup. Felt like a real panel interview without the pressure.",
                name: "Sara Reyes",
                role: "Product Manager · Fintech",
                initials: "SR",
              },
              {
                text: "The score breakdown told me exactly where my answers were weak. Fixed those gaps, went back in, and landed the offer. Simple as that.",
                name: "James Liu",
                role: "Data Scientist · Meta",
                initials: "JL",
              },
            ].map((t) => (
              <div key={t.name} className="relative p-8 border border-white/[0.06] bg-[#18181c]">
                <span className="font-playfair text-[4rem] text-[#8a6520]/50 absolute top-4 left-6 leading-none select-none">
                  &ldquo;
                </span>
                <p className="text-sm text-[#7a7870] leading-[1.7] italic pt-8">{t.text}</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#8a6520] flex items-center justify-center text-[0.72rem] font-medium text-[#f0c060] tracking-wide flex-shrink-0">
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#f0ede8]">{t.name}</div>
                    <div className="text-xs text-[#7a7870] mt-px">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32 px-6 text-center overflow-hidden">
        <div
          className="pointer-events-none absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[400px]"
          style={{ background: "radial-gradient(ellipse, rgba(212,160,58,0.10) 0%, transparent 70%)" }}
        />
        <h2 className="font-playfair text-[clamp(2.5rem,5vw,4.5rem)] font-black leading-[1.08] tracking-[-0.03em] mb-6">
          Your next interview<br />
          starts <em className="italic text-[#d4a03a]">here.</em>
        </h2>
        <p className="text-base text-[#7a7870] max-w-[420px] mx-auto mb-12">
          Join candidates who prepare smarter, not harder. Free to start — no credit card required.
        </p>
        {isSignedIn ? (
          <Link
            href="/dashboard"
            className="inline-block bg-[#d4a03a] text-[#0a0a0b] text-sm font-medium tracking-[0.1em] uppercase px-12 py-4 hover:bg-[#f0c060] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(212,160,58,0.35)]"
          >
            Go to Dashboard
          </Link>
        ) : (
          <Link
            href="/sign-up"
            className="inline-block bg-[#d4a03a] text-[#0a0a0b] text-sm font-medium tracking-[0.1em] uppercase px-12 py-4 hover:bg-[#f0c060] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(212,160,58,0.35)]"
          >
            Create free account
          </Link>
        )}
      </section>

      {/* FOOTER */}
      <footer className="px-4 sm:px-8 md:px-16 py-8 border-t border-white/[0.06] flex justify-between items-center flex-wrap gap-4">
        <span className="font-playfair text-lg font-bold text-[#7a7870]">
          Whisp<span className="text-[#d4a03a] italic">r</span>
        </span>
        <span className="text-xs text-[#7a7870] opacity-60">
          © 2025 Whispr. All rights reserved.
        </span>
      </footer>

    </main>
  );
}