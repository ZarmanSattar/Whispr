"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Question {
  id: string;
  questionText: string;
  aiAnswer: string;
}

type Phase = "intro" | "listening" | "stopped" | "processing" | "feedback";

export default function InterviewPage() {
  const { interviewId } = useParams();
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [waveHeights, setWaveHeights] = useState<number[]>(Array(24).fill(3));
  const [silenceSeconds, setSilenceSeconds] = useState(0);
  const [useTextMode, setUseTextMode] = useState(false);
  const [textAnswer, setTextAnswer] = useState("");

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const waveIntervalRef = useRef<any>(null);
  const lastTranscriptRef = useRef("");
  const silenceCountRef = useRef(0);

  useEffect(() => {
    const fetchQuestions = async () => {
      const res = await fetch(`/api/interviews/${interviewId}/questions`);
      const data = await res.json();
      setQuestions(data.questions || []);
      setLoading(false);
    };
    fetchQuestions();
  }, [interviewId]);

  const stopWave = () => {
    clearInterval(waveIntervalRef.current);
    setWaveHeights(Array(24).fill(3));
  };

  const startWave = () => {
    waveIntervalRef.current = setInterval(() => {
      setWaveHeights(
        Array(24).fill(0).map(() => Math.random() * 28 + 4)
      );
    }, 80);
  };

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    stopWave();
    clearInterval(silenceTimerRef.current);
    setSilenceSeconds(0);
    silenceCountRef.current = 0;
    setPhase("stopped");
  }, []);

  const startRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setUseTextMode(true);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let full = "";
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0].transcript;
      }
      setTranscript(full);
      lastTranscriptRef.current = full;
      silenceCountRef.current = 0;
      setSilenceSeconds(0);
    };

    recognition.onerror = () => {
      stopRecording();
    };

    recognition.onend = () => {
      if (isRecording) {
        stopRecording();
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
    setPhase("listening");
    setTranscript("");
    lastTranscriptRef.current = "";
    silenceCountRef.current = 0;
    setSilenceSeconds(0);
    startWave();

    // Auto-stop after 8 seconds of silence
    silenceTimerRef.current = setInterval(() => {
      silenceCountRef.current += 1;
      setSilenceSeconds(silenceCountRef.current);
      if (silenceCountRef.current >= 8) {
        stopRecording();
      }
    }, 1000);
  };

  const reRecord = () => {
    setTranscript("");
    setTextAnswer("");
    lastTranscriptRef.current = "";
    setPhase("intro");
  };

  const submitAnswer = async () => {
    const answerText = useTextMode ? textAnswer.trim() : transcript.trim();
    if (!answerText) return;
    setPhase("processing");

    const current = questions[currentIndex];
    const res = await fetch("/api/interviews/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: current.id,
        questionText: current.questionText,
        aiAnswer: current.aiAnswer,
        userAnswerText: answerText,
      }),
    });

    const data = await res.json();
    setFeedback(data.feedback);
    setScore(data.score);
    setPhase("feedback");
  };

  const nextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      router.push(`/dashboard/interview/${interviewId}/feedback`);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setPhase("intro");
    setTranscript("");
    setTextAnswer("");
    setFeedback("");
    setScore(null);
    setSilenceSeconds(0);
    silenceCountRef.current = 0;
  };

  const current = questions[currentIndex];
  const progress = questions.length > 0 ? (currentIndex / questions.length) * 100 : 0;
  const activeAnswer = useTextMode ? textAnswer.trim() : transcript.trim();

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0b] text-[#f0ede8] flex items-center justify-center">
        <div className="text-center">
          <div className="font-playfair text-4xl font-bold text-[#d4a03a] mb-4 animate-pulse">
            Whisp<em>r</em>
          </div>
          <p className="text-xs tracking-[0.2em] uppercase text-[#7a7870]">Loading your session...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-[#f0ede8]">

      {/* NAV */}
      <nav className="flex items-center justify-between px-4 sm:px-8 md:px-16 py-5 border-b border-white/[0.06]">
        <span className="font-playfair text-2xl font-bold tracking-tight">
          Whisp<span className="text-[#d4a03a] italic">r</span>
        </span>
        <div className="flex items-center gap-6">
          <span className="text-xs tracking-[0.1em] uppercase text-[#7a7870]">
            Question{" "}
            <span className="text-[#f0ede8]">{currentIndex + 1}</span>
            {" "}of{" "}
            <span className="text-[#f0ede8]">{questions.length}</span>
          </span>
          <Link
            href="/dashboard"
            className="text-xs tracking-[0.06em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors"
          >
            Exit
          </Link>
        </div>
      </nav>

      {/* PROGRESS BAR */}
      <div className="h-px bg-white/[0.06]">
        <div
          className="h-full bg-[#d4a03a] transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

        {/* QUESTION LABEL */}
        <div className="text-[0.7rem] font-medium tracking-[0.2em] uppercase text-[#d4a03a] mb-6">
          Question {currentIndex + 1}
        </div>

        {/* QUESTION TEXT */}
        <h1 className="font-playfair text-[clamp(1.5rem,3vw,2.2rem)] font-bold leading-[1.3] tracking-[-0.01em] mb-12">
          {current?.questionText}
        </h1>

        {/* PHASE: INTRO */}
        {phase === "intro" && (
          <div className="space-y-8">
            <p className="text-sm text-[#7a7870] leading-relaxed max-w-lg">
              Take a moment to gather your thoughts, then record your answer. Recording stops automatically after 8 seconds of silence.
            </p>

            {!useTextMode ? (
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={startRecording}
                  className="flex items-center gap-3 bg-[#d4a03a] text-[#0a0a0b] text-xs font-medium tracking-[0.1em] uppercase px-8 py-4 hover:bg-[#f0c060] transition-all hover:-translate-y-px hover:shadow-[0_8px_30px_rgba(212,160,58,0.3)]"
                >
                  <span className="w-2 h-2 rounded-full bg-[#0a0a0b]" />
                  Start recording
                </button>
                <button
                  onClick={() => setUseTextMode(true)}
                  className="text-xs tracking-[0.06em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors px-4 py-4 border border-white/[0.06] hover:border-white/20"
                >
                  Type instead
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  rows={6}
                  className="w-full bg-[#111114] border border-white/[0.08] focus:border-[#d4a03a]/50 text-sm text-[#f0ede8] placeholder-[#3a3a3a] p-5 resize-none outline-none transition-colors leading-relaxed"
                />
                <div className="flex gap-4">
                  <button
                    onClick={submitAnswer}
                    disabled={!textAnswer.trim()}
                    className="bg-[#d4a03a] text-[#0a0a0b] text-xs font-medium tracking-[0.1em] uppercase px-8 py-3.5 hover:bg-[#f0c060] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Submit answer
                  </button>
                  <button
                    onClick={() => setUseTextMode(false)}
                    className="text-xs tracking-[0.06em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors"
                  >
                    Use voice instead
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PHASE: LISTENING */}
        {phase === "listening" && (
          <div className="space-y-8">

            {/* Recording header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                <span className="text-xs tracking-[0.1em] uppercase text-red-400">Recording</span>
              </div>
              {silenceSeconds > 0 && (
                <span className="text-xs text-[#4a4a4a] tracking-wide">
                  Silence: {silenceSeconds}s / 8s
                </span>
              )}
            </div>

            {/* Waveform */}
            <div className="flex items-center justify-center gap-[3px] h-12 bg-[#111114] border border-white/[0.06] px-6">
              {waveHeights.map((h, i) => (
                <div
                  key={i}
                  className="w-[3px] bg-[#d4a03a] rounded-full transition-all duration-75"
                  style={{ height: `${h}px`, opacity: 0.6 + (h / 32) * 0.4 }}
                />
              ))}
            </div>

            {/* Live transcript */}
            <div className="min-h-[100px] bg-[#111114] border border-white/[0.06] p-6">
              {transcript ? (
                <p className="text-sm text-[#f0ede8] leading-relaxed">{transcript}</p>
              ) : (
                <p className="text-sm text-[#3a3a3a] italic">Listening... start speaking.</p>
              )}
            </div>

            <button
              onClick={stopRecording}
              className="flex items-center gap-3 border border-white/[0.12] text-[#7a7870] text-xs font-medium tracking-[0.1em] uppercase px-6 py-3.5 hover:text-[#f0ede8] hover:border-white/20 transition-all"
            >
              <span className="w-2 h-2 bg-[#7a7870]" />
              Stop recording
            </button>
          </div>
        )}

        {/* PHASE: STOPPED */}
        {phase === "stopped" && (
          <div className="space-y-8">
            <div className="flex items-center gap-2 text-xs tracking-[0.1em] uppercase text-[#7a7870]">
              <span className="w-2 h-2 bg-[#3a3a3a] rounded-full" />
              Recording stopped
            </div>

            {/* Transcript review */}
            <div className="bg-[#111114] border border-white/[0.06] p-6">
              <div className="text-xs tracking-[0.1em] uppercase text-[#7a7870] mb-3">Your answer</div>
              {transcript ? (
                <p className="text-sm text-[#f0ede8] leading-relaxed">{transcript}</p>
              ) : (
                <p className="text-sm text-[#3a3a3a] italic">No speech detected.</p>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              {transcript && (
                <button
                  onClick={submitAnswer}
                  className="bg-[#d4a03a] text-[#0a0a0b] text-xs font-medium tracking-[0.1em] uppercase px-8 py-3.5 hover:bg-[#f0c060] transition-all hover:-translate-y-px hover:shadow-[0_8px_30px_rgba(212,160,58,0.3)]"
                >
                  Submit answer
                </button>
              )}
              <button
                onClick={reRecord}
                className="border border-white/[0.12] text-[#7a7870] text-xs font-medium tracking-[0.1em] uppercase px-6 py-3.5 hover:text-[#f0ede8] hover:border-white/20 transition-all"
              >
                Re-record
              </button>
              {!transcript && (
                <button
                  onClick={() => { setUseTextMode(true); setPhase("intro"); }}
                  className="text-xs tracking-[0.06em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors"
                >
                  Type instead
                </button>
              )}
            </div>
          </div>
        )}

        {/* PHASE: PROCESSING */}
        {phase === "processing" && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-5 h-5 border border-[#d4a03a] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#7a7870] tracking-wide">Evaluating your answer...</p>
            </div>
            <div className="bg-[#111114] border border-white/[0.06] p-6 opacity-50">
              <div className="text-xs tracking-[0.1em] uppercase text-[#7a7870] mb-3">Your answer</div>
              <p className="text-sm text-[#f0ede8] leading-relaxed">{activeAnswer}</p>
            </div>
          </div>
        )}

        {/* PHASE: FEEDBACK */}
        {phase === "feedback" && (
          <div className="space-y-8">

            {/* Score */}
            <div className="flex items-center gap-6">
              <div className="relative w-20 h-20 flex items-center justify-center border border-[rgba(212,160,58,0.18)]">
                <span className="font-playfair text-3xl font-bold text-[#d4a03a]">{score}</span>
                <span className="absolute bottom-2 right-2 text-[0.6rem] text-[#7a7870] uppercase tracking-wider">/100</span>
              </div>
              <div>
                <div className="text-xs tracking-[0.1em] uppercase text-[#7a7870] mb-1">Your score</div>
                <div className="text-sm text-[#f0ede8] font-medium">
                  {score! >= 80 ? "Excellent answer" : score! >= 60 ? "Good effort" : score! >= 40 ? "Needs improvement" : "Keep practicing"}
                </div>
              </div>
            </div>

            {/* Your answer */}
            <div className="bg-[#111114] border border-white/[0.06] p-6">
              <div className="text-xs tracking-[0.1em] uppercase text-[#7a7870] mb-3">Your answer</div>
              <p className="text-sm text-[#7a7870] leading-relaxed">{activeAnswer}</p>
            </div>

            {/* AI Feedback */}
            <div className="border-l-2 border-[#d4a03a]/40 pl-6">
              <div className="text-xs tracking-[0.1em] uppercase text-[#7a7870] mb-3">AI Feedback</div>
              <p className="text-sm text-[#f0ede8] leading-relaxed">{feedback}</p>
            </div>

            {/* Ideal answer */}
            <div className="bg-[#111114] border border-white/[0.06] p-6">
              <div className="text-xs tracking-[0.1em] uppercase text-[#7a7870] mb-3">Ideal answer</div>
              <p className="text-sm text-[#7a7870] leading-relaxed">{current?.aiAnswer}</p>
            </div>

            {/* Next */}
            <button
              onClick={nextQuestion}
              className="bg-[#d4a03a] text-[#0a0a0b] text-xs font-medium tracking-[0.1em] uppercase px-8 py-4 hover:bg-[#f0c060] transition-all hover:-translate-y-px hover:shadow-[0_8px_30px_rgba(212,160,58,0.3)]"
            >
              {currentIndex + 1 >= questions.length ? "View results" : "Next question"}
            </button>

          </div>
        )}

      </div>
    </main>
  );
}