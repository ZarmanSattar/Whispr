"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const QUESTION_TIME = 120;
const DEEPGRAM_KEY = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY ?? "";

interface Question {
  id: string;
  questionText: string;
  aiAnswer: string;
  difficulty: string | null;
}

type Phase = "intro" | "listening" | "stopped" | "processing" | "feedback";

// Extract the first 1-2 sentences from an aiAnswer for the hint
function extractHint(aiAnswer: string): string {
  let end = 0;
  let count = 0;
  for (let i = 0; i < aiAnswer.length; i++) {
    if (/[.!?]/.test(aiAnswer[i])) {
      count++;
      end = i + 1;
      if (count >= 2) break;
    }
  }
  return end > 0 ? aiAnswer.slice(0, end).trim() : aiAnswer.slice(0, 150);
}

function DifficultyBadge({ difficulty }: { difficulty: string | null }) {
  const d = difficulty ?? "Medium";
  const styles: Record<string, string> = {
    Easy:   "text-green-400  border-green-400/30  bg-green-400/10",
    Medium: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
    Hard:   "text-red-400    border-red-400/30    bg-red-400/10",
  };
  return (
    <span className={`text-xs uppercase tracking-widest border rounded-full px-2 py-0.5 ${styles[d] ?? styles.Medium}`}>
      {d}
    </span>
  );
}

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
  const [showExitModal, setShowExitModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [showHint, setShowHint] = useState(false);

  const socketRef          = useRef<WebSocket | null>(null);
  const mediaRecorderRef   = useRef<MediaRecorder | null>(null);
  const streamRef          = useRef<MediaStream | null>(null);
  const audioContextRef    = useRef<AudioContext | null>(null);
  const animationFrameRef  = useRef<number | null>(null);
  const finalTranscriptRef = useRef("");
  const interimRef         = useRef("");
  const silenceTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceCountRef    = useRef(0);
  const questionTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingAutoSubmitRef = useRef(false);
  const hasAutoSubmittedRef  = useRef(false);

  // ── Unmount cleanup ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      socketRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (animationFrameRef.current != null) cancelAnimationFrame(animationFrameRef.current);
      void audioContextRef.current?.close();
      clearInterval(silenceTimerRef.current ?? undefined);
      clearInterval(questionTimerRef.current ?? undefined);
    };
  }, []);

  // ── Fetch questions ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchQuestions = async () => {
      const res = await fetch(`/api/interviews/${interviewId}/questions`);
      const data = await res.json();
      setQuestions(data.questions || []);
      setLoading(false);
    };
    fetchQuestions();
  }, [interviewId]);

  // ── Core actions (stable refs so effects can depend on them) ─────────────
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    socketRef.current?.close();
    socketRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (animationFrameRef.current != null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    setTranscript(finalTranscriptRef.current.trim());
    setWaveHeights(Array(24).fill(3));
    clearInterval(silenceTimerRef.current ?? undefined);
    setIsRecording(false);
    setSilenceSeconds(0);
    silenceCountRef.current = 0;
    setPhase("stopped");
  }, []);

  const submitAnswer = useCallback(async () => {
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
  }, [useTextMode, textAnswer, transcript, questions, currentIndex]);

  // ── Timer: reset state when question changes ─────────────────────────────
  useEffect(() => {
    setTimeLeft(QUESTION_TIME);
    setShowHint(false);
    hasAutoSubmittedRef.current = false;
    pendingAutoSubmitRef.current = false;
  }, [currentIndex]);

  // ── Timer: start / pause based on phase ──────────────────────────────────
  useEffect(() => {
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }
    if (phase === "processing" || phase === "feedback" || loading) return;

    questionTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (questionTimerRef.current) {
            clearInterval(questionTimerRef.current);
            questionTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
        questionTimerRef.current = null;
      }
    };
  }, [phase, loading, currentIndex]);

  // ── Timer: auto-submit when time runs out ────────────────────────────────
  useEffect(() => {
    if (timeLeft > 0) return;
    if (hasAutoSubmittedRef.current) return;
    if (phase === "processing" || phase === "feedback") return;
    hasAutoSubmittedRef.current = true;

    if (isRecording) {
      pendingAutoSubmitRef.current = true;
      stopRecording();
      return;
    }
    void submitAnswer();
  }, [timeLeft, phase, isRecording, submitAnswer, stopRecording]);

  // ── Timer: submit after recording stops (triggered by timer expiry) ──────
  useEffect(() => {
    if (phase !== "stopped" || !pendingAutoSubmitRef.current) return;
    pendingAutoSubmitRef.current = false;
    void submitAnswer();
  }, [phase, submitAnswer]);

  // ── Speech recording ─────────────────────────────────────────────────────
  const startRecording = async () => {
    if (!DEEPGRAM_KEY) {
      setUseTextMode(true);
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setUseTextMode(true);
      return;
    }

    streamRef.current = stream;
    finalTranscriptRef.current = "";
    interimRef.current = "";

    // AudioContext + AnalyserNode drives the waveform visualizer
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const step = Math.floor(bufferLength / 24);

    const animateWave = () => {
      analyser.getByteFrequencyData(dataArray);
      const heights = Array.from({ length: 24 }, (_, i) => {
        const val = dataArray[i * step] / 255;
        return val * 28 + 4;
      });
      setWaveHeights(heights);
      animationFrameRef.current = requestAnimationFrame(animateWave);
    };
    animationFrameRef.current = requestAnimationFrame(animateWave);

    // Deepgram WebSocket
    const socket = new WebSocket(
      "wss://api.deepgram.com/v1/listen?language=en&model=nova-2&interim_results=true&punctuate=true",
      ["token", DEEPGRAM_KEY]
    );
    socketRef.current = socket;

    socket.onopen = () => {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
        if (socket.readyState === WebSocket.OPEN && e.data.size > 0) {
          socket.send(e.data);
        }
      };
      mediaRecorder.start(250);
    };

    socket.onmessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data as string) as Record<string, unknown>;
        const alts = (data?.channel as Record<string, unknown>)?.alternatives;
        const t: string =
          (Array.isArray(alts) ? (alts[0] as Record<string, unknown>)?.transcript : "") as string ?? "";
        if (!t) return;
        if (data.is_final) {
          finalTranscriptRef.current += t + " ";
          interimRef.current = "";
        } else {
          interimRef.current = t;
        }
        setTranscript((finalTranscriptRef.current + interimRef.current).trimEnd());
        silenceCountRef.current = 0;
        setSilenceSeconds(0);
      } catch {
        // ignore malformed messages
      }
    };

    socket.onerror = () => {
      stopRecording();
    };

    setIsRecording(true);
    setPhase("listening");
    setTranscript("");
    silenceCountRef.current = 0;
    setSilenceSeconds(0);

    // Auto-stop after 8 seconds of silence
    silenceTimerRef.current = setInterval(() => {
      silenceCountRef.current += 1;
      setSilenceSeconds(silenceCountRef.current);
      if (silenceCountRef.current >= 8) stopRecording();
    }, 1000);
  };

  const reRecord = () => {
    setTranscript("");
    setTextAnswer("");
    finalTranscriptRef.current = "";
    interimRef.current = "";
    setPhase("intro");
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

  // ── Derived display values ───────────────────────────────────────────────
  const current      = questions[currentIndex];
  const progress     = questions.length > 0 ? (currentIndex / questions.length) * 100 : 0;
  const activeAnswer = useTextMode ? textAnswer.trim() : transcript.trim();
  const hintText     = current?.aiAnswer ? extractHint(current.aiAnswer) : "";

  const timerVisible = phase !== "processing" && phase !== "feedback";
  const timerMins    = Math.floor(timeLeft / 60);
  const timerSecs    = timeLeft % 60;
  const timerDisplay = `${timerMins}:${String(timerSecs).padStart(2, "0")}`;
  const timerColor   =
    timeLeft <= 10 ? "text-red-400" :
    timeLeft <= 30 ? "text-[#d4a03a]" :
    "text-[#f0ede8]";
  const timerPulse = timeLeft <= 10 ? "animate-pulse" : "";

  // ── Loading state ────────────────────────────────────────────────────────
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

      {/* EXIT CONFIRMATION MODAL */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111114] border border-white/[0.06] p-8 max-w-sm w-full mx-4">
            <h3 className="font-playfair text-xl font-bold mb-3">Leave interview?</h3>
            <p className="text-sm text-[#7a7870] leading-relaxed mb-8">
              Are you sure you want to leave? Your progress on this question will be lost.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="bg-[#d4a03a] text-[#0a0a0b] text-xs font-medium tracking-[0.1em] uppercase px-6 py-3 hover:bg-[#f0c060] transition-all"
              >
                Leave
              </button>
              <button
                onClick={() => setShowExitModal(false)}
                className="border border-white/[0.12] text-[#7a7870] text-xs font-medium tracking-[0.1em] uppercase px-6 py-3 hover:text-[#f0ede8] hover:border-white/20 transition-all"
              >
                Stay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className="flex items-center justify-between px-4 sm:px-8 md:px-16 py-5 border-b border-white/[0.06]">
        <Link href="/" className="font-playfair text-2xl font-bold tracking-tight cursor-pointer hover:opacity-80 transition-opacity">
          Whisp<span className="text-[#d4a03a] italic">r</span>
        </Link>
        <div className="flex items-center gap-6">
          <span className="text-xs tracking-[0.1em] uppercase text-[#7a7870]">
            Question{" "}
            <span className="text-[#f0ede8]">{currentIndex + 1}</span>
            {" "}of{" "}
            <span className="text-[#f0ede8]">{questions.length}</span>
          </span>
          <button
            onClick={() => setShowExitModal(true)}
            className="text-xs tracking-[0.06em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors"
          >
            Exit
          </button>
        </div>
      </nav>

      {/* PROGRESS BAR */}
      <div className="h-0.5 bg-white/[0.06]">
        <div
          className="h-full bg-[#d4a03a] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

        {/* QUESTION HEADER: label + difficulty badge + countdown timer */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="text-[0.7rem] font-medium tracking-[0.2em] uppercase text-[#d4a03a]">
              Question {currentIndex + 1}
            </div>
            <DifficultyBadge difficulty={current?.difficulty ?? null} />
          </div>
          {timerVisible && (
            <div className={`text-sm font-mono font-medium tabular-nums ${timerColor} ${timerPulse}`}>
              {timerDisplay}
            </div>
          )}
        </div>

        {/* QUESTION TEXT */}
        <h1 className="font-playfair text-[clamp(1.5rem,3vw,2.2rem)] font-bold leading-[1.3] tracking-[-0.01em] mb-8">
          {current?.questionText}
        </h1>

        {/* HINT */}
        {(phase === "intro" || phase === "listening") && hintText && (
          <div className="mb-10">
            <button
              onClick={() => setShowHint((v) => !v)}
              className="flex items-center gap-2 text-xs tracking-[0.06em] uppercase text-[#7a7870] hover:text-[#d4a03a] transition-colors mb-3"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-[1.5]">
                <path d="M9 21h6M12 3a6 6 0 0 1 6 6c0 2.22-1.21 4.15-3 5.19V17a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-2.81C7.21 13.15 6 11.22 6 9a6 6 0 0 1 6-6z" />
              </svg>
              {showHint ? "Hide Hint" : "Show Hint"}
            </button>
            {showHint && (
              <div className="bg-[#18181c] border border-[#d4a03a]/20 rounded-lg p-3">
                <p className="text-sm text-[#7a7870] leading-relaxed">{hintText}</p>
                <p className="text-[0.65rem] text-[#4a4a4a] mt-2 tracking-wide">
                  Hint revealed — this question will be marked accordingly
                </p>
              </div>
            )}
          </div>
        )}

        {/* PHASE: INTRO */}
        {phase === "intro" && (
          <div className="space-y-8">
            <p className="text-sm text-[#7a7870] leading-relaxed max-w-lg">
              Take a moment to gather your thoughts, then record your answer. Recording stops automatically after 8 seconds of silence.
            </p>

            {!useTextMode ? (
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => { void startRecording(); }}
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
                    onClick={() => void submitAnswer()}
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
                  onClick={() => void submitAnswer()}
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
