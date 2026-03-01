"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Home as HomeIcon, LayoutList, Mic, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RecordingModal } from "@/components/recording-modal";
import { ResultsView } from "@/components/results-view";
import type { AnalysisResult, Attempt } from "@/types";

function Spotlights() {
  return (
    <>
      {/* Warstwa 1 – szerokie, bardzo miękkie otoczenie (ambient) */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 z-0"
        style={{
          width: "1400px",
          height: "90vh",
          transform: "translateX(-50%)",
          background:
            "radial-gradient(ellipse 55% 80% at 50% 0%, rgba(180,205,235,0.07) 0%, transparent 70%)",
          filter: "blur(8px)",
        }}
      />
      {/* Warstwa 2 – szeroki, jasny rdzeń snopa (beam core) */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 z-0"
        style={{
          width: "380px",
          height: "84vh",
          transform: "translateX(-50%)",
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(210,225,248,0.04) 30%, rgba(215,228,250,0.11) 70%, rgba(220,232,252,0.18) 100%)",
          filter: "blur(70px)",
        }}
      />
      {/* Warstwa 3 – podłoga (floor glow), wychodzi spod tabeli */}
      <div
        className="pointer-events-none fixed left-1/2 z-0"
        style={{
          top: "71vh",
          width: "860px",
          height: "90px",
          transform: "translateX(-50%)",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(215,228,252,0.52) 0%, rgba(215,228,252,0.16) 45%, transparent 70%)",
          filter: "blur(38px)",
        }}
      />
      {/* Warstwa 4 – jasny środek podłogi (hot spot) */}
      <div
        className="pointer-events-none fixed left-1/2 z-0"
        style={{
          top: "72.5vh",
          width: "340px",
          height: "30px",
          transform: "translateX(-50%)",
          borderRadius: "50%",
          background: "rgba(230,240,255,0.28)",
          filter: "blur(20px)",
        }}
      />
    </>
  );
}

function getScoreColor(score: number): string {
  if (score <= 40) return "text-red-500";
  if (score <= 70) return "text-yellow-500";
  return "text-green-500";
}

function getScoreBorderColor(score: number): string {
  if (score <= 40) return "rgba(239,68,68,0.20)";
  if (score <= 70) return "rgba(234,179,8,0.20)";
  return "rgba(34,197,94,0.20)";
}

function getScoreGlow(score: number): string {
  if (score <= 40) return "0 0 16px rgba(239,68,68,0.05)";
  if (score <= 70) return "0 0 16px rgba(234,179,8,0.05)";
  return "0 0 16px rgba(34,197,94,0.05)";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const STORAGE_KEY = "speech-ai-attempts";

function loadAttempts(): Attempt[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is Attempt =>
        a &&
        typeof a === "object" &&
        typeof a.id === "string" &&
        typeof a.date === "string" &&
        typeof a.score === "number" &&
        typeof a.duration === "number"
    );
  } catch {
    return [];
  }
}

function saveAttempts(attempts: Attempt[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
  } catch {
    // quota exceeded or private mode
  }
}

export default function Home() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [recordingOpen, setRecordingOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"home" | "history">("home");
  const [historySubTab, setHistorySubTab] = useState<"recordings" | "stats">("recordings");
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    setAttempts(loadAttempts());
    hasLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (hasLoadedRef.current) {
      saveAttempts(attempts);
    }
  }, [attempts]);

  const handleComplete = useCallback((result: AnalysisResult) => {
    const attempt: Attempt = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      score: result.score,
      duration: result.durationSeconds,
      fillerWordsCount: result.fillerWordsCount,
      wpm: result.wpm,
      transcription: result.transcription,
      textFeedback: result.textFeedback,
    };
    setAttempts((prev) => [attempt, ...prev]);
    setLastResult(result);
  }, []);

  const handleBack = useCallback(() => {
    setLastResult(null);
  }, []);

  const handleRetry = useCallback(() => {
    setLastResult(null);
    setRecordingOpen(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setAttempts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const avgScore =
    attempts.length > 0
      ? Math.round(
        attempts.reduce((a, b) => a + b.score, 0) / attempts.length
      )
      : 0;
  const bestScore =
    attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : 0;

  if (lastResult) {
    return (
      <main className="relative min-h-screen bg-[#030303] px-4 py-12 md:px-6">
        <Spotlights />
        <div className="relative z-10">
          <ResultsView
            result={lastResult}
            onBack={handleBack}
            onRetry={handleRetry}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[#030303]">
      {/* Spotlights tylko na desktop */}
      <div className="hidden md:block">
        <Spotlights />
      </div>

      {/* ── MOBILE layout (< md) ── */}
      <div
        className="relative z-10 flex min-h-[100dvh] flex-col md:hidden"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          background: `
            radial-gradient(ellipse 130% 90% at 20% 5%, rgba(205,210,225,0.28) 0%, rgba(150,155,175,0.11) 38%, rgba(80,85,105,0.03) 62%, transparent 75%),
            radial-gradient(ellipse 70% 55% at 10% 2%, rgba(240,242,250,0.10) 0%, transparent 50%),
            #06060a
          `.replace(/\s+/g, " ").trim(),
        }}
      >

        {/* ── TAB: HOME ── */}
        {mobileTab === "home" && (
          <div className="flex flex-1 flex-col px-7 pt-10 pb-36">
            {/* Tytuł + podtytuł */}
            <div className="mb-7">
              <h1
                className="text-4xl font-bold tracking-tight text-white"
                style={{ textShadow: "0 0 20px rgba(255,255,255,0.25)" }}
              >
                AI Pitch Coach
              </h1>
              <p className="mt-2 text-sm font-light text-white/80 leading-snug">
                Ile sekund zanim stracisz uwagę słuchacza?
              </p>
            </div>

            {/* Kafelek glass – średni wynik */}
            <div
              className="rounded-2xl px-5 py-4"
              style={{
                background: "rgba(28,28,32,0.55)",
                backdropFilter: "blur(40px) saturate(180%)",
                WebkitBackdropFilter: "blur(40px) saturate(180%)",
                border: `1px solid ${getScoreBorderColor(avgScore)}`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.4), ${getScoreGlow(avgScore)}`,
              }}
            >
              <div className="flex items-center gap-5">
                <span
                  className="text-6xl font-bold leading-none tracking-tight text-white"
                  style={{ textShadow: "0 0 20px rgba(255,255,255,0.25)" }}
                >
                  {avgScore}
                </span>
                <div className="flex flex-col">
                  <span className="text-[14px] font-medium uppercase tracking-widest leading-tight text-white/80">
                    Średni wynik
                  </span>
                  <button
                    onClick={() => { setHistorySubTab("stats"); setMobileTab("history"); }}
                    className="mt-1 self-start text-[11px] font-light text-white/40 transition-colors hover:text-white/65"
                  >
                    Twoje statystyki →
                  </button>
                </div>
              </div>
            </div>

            {/* Skrócona historia */}
            {attempts.length > 0 && (
              <div className="mt-8 flex flex-col gap-2">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-widest text-white/40">
                  Ostatnie nagrania
                </p>
                {attempts.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{
                      background: "rgba(28,28,32,0.45)",
                      backdropFilter: "blur(40px) saturate(180%)",
                      WebkitBackdropFilter: "blur(40px) saturate(180%)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      >
                        <Mic className="size-3.5 text-white/40" />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${getScoreColor(a.score)}`}>
                          {a.score} pkt
                        </p>
                        <p className="text-[10px] text-white/35">{formatDate(a.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/40">{formatDuration(a.duration)}</span>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-white/25 transition-colors hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Link – pełna historia (tylko gdy są nagrania) */}
            {attempts.length > 0 && (
              <button
                onClick={() => setMobileTab("history")}
                className="mt-5 w-full text-center text-[11px] font-light tracking-wide text-white/40 transition-colors hover:text-white/65"
              >
                Pełna historia nagrań →
              </button>
            )}

            {/* CTA – spróbuj / sprawdź się */}
            <button
              onClick={() => setRecordingOpen(true)}
              className="mt-8 flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 transition-all duration-300 active:scale-[0.98]"
              style={{
                background: "rgba(28,28,32,0.45)",
                backdropFilter: "blur(40px) saturate(180%)",
                WebkitBackdropFilter: "blur(40px) saturate(180%)",
                border: "1px solid rgba(255,255,255,0.30)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 0 14px rgba(255,255,255,0.08), 0 0 28px rgba(255,255,255,0.04)",
              }}
            >
              <span className="text-xs font-light tracking-wide text-white/90">
                {attempts.length === 0 ? "Sprawdź się!" : "Gotowy spróbować ponownie?"}
              </span>
              <Mic className="size-3.5 text-white/60" />
            </button>
          </div>
        )}

        {/* ── TAB: HISTORY ── */}
        {mobileTab === "history" && (
          <div className="flex flex-1 flex-col px-7 pt-8 pb-36">
            <h1 className="mb-1 text-4xl font-bold tracking-tight text-white" style={{ textShadow: "0 0 20px rgba(255,255,255,0.25)" }}>
              {historySubTab === "recordings" ? "Historia nagrań" : "Statystyki"}
            </h1>
            <p className="mb-5 text-sm font-light text-white/60">{attempts.length} sesji · Średnia {avgScore} pkt</p>

            {/* Segmented control */}
            <div
              className="mb-6 flex rounded-xl p-1"
              style={{
                background: "rgba(28,28,32,0.55)",
                backdropFilter: "blur(40px) saturate(180%)",
                WebkitBackdropFilter: "blur(40px) saturate(180%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.2)",
              }}
            >
              {(["recordings", "stats"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setHistorySubTab(tab)}
                  className="flex-1 rounded-lg py-2 text-xs font-medium tracking-wide transition-all duration-200"
                  style={{
                    background: historySubTab === tab
                      ? "rgba(255,255,255,0.12)"
                      : "transparent",
                    color: historySubTab === tab
                      ? "rgba(255,255,255,0.95)"
                      : "rgba(255,255,255,0.35)",
                    boxShadow: historySubTab === tab
                      ? "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 4px rgba(0,0,0,0.3)"
                      : "none",
                  }}
                >
                  {tab === "recordings" ? "Historia nagrań" : "Statystyki"}
                </button>
              ))}
            </div>

            {/* Sub-tab: Historia nagrań */}
            {historySubTab === "recordings" && (
              attempts.length === 0 ? (
                <p className="py-16 text-center text-xs text-white/40">
                  Brak nagrań. Wróć i nagraj swój pierwszy pitch.
                </p>
              ) : (
                <div className="space-y-2">
                  {attempts.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-xl px-4 py-3"
                      style={{
                        background: "rgba(28,28,32,0.45)",
                        backdropFilter: "blur(40px) saturate(180%)",
                        WebkitBackdropFilter: "blur(40px) saturate(180%)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-lg"
                          style={{ background: "rgba(255,255,255,0.06)" }}
                        >
                          <Mic className="size-3.5 text-white/40" />
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${getScoreColor(a.score)}`}>{a.score} pkt</p>
                          <p className="text-[10px] text-white/40">{formatDate(a.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40">{formatDuration(a.duration)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-white/30 transition-colors hover:bg-destructive/15 hover:text-destructive"
                          onClick={() => handleDelete(a.id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Sub-tab: Statystyki */}
            {historySubTab === "stats" && (() => {
              const n = attempts.length;
              if (n === 0) return (
                <p className="py-16 text-center text-xs text-white/40">
                  Nagraj swój pierwszy pitch, żeby zobaczyć statystyki.
                </p>
              );
              const best = Math.max(...attempts.map(a => a.score));
              const worst = Math.min(...attempts.map(a => a.score));
              const avgDur = Math.round(attempts.reduce((s, a) => s + a.duration, 0) / n);
              const wpmArr = attempts.filter(a => a.wpm != null).map(a => a.wpm as number);
              const avgWpm = wpmArr.length ? Math.round(wpmArr.reduce((s, v) => s + v, 0) / wpmArr.length) : null;
              const fillerArr = attempts.filter(a => a.fillerWordsCount != null).map(a => a.fillerWordsCount as number);
              const avgFiller = fillerArr.length ? Math.round(fillerArr.reduce((s, v) => s + v, 0) / fillerArr.length) : null;
              const trend = n >= 2 ? attempts[0].score - attempts[n - 1].score : null;

              const statCard = (label: string, value: string, sub?: string) => (
                <div
                  className="flex flex-col gap-1 rounded-2xl px-5 py-4"
                  style={{
                    background: "rgba(28,28,32,0.45)",
                    backdropFilter: "blur(40px) saturate(180%)",
                    WebkitBackdropFilter: "blur(40px) saturate(180%)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}
                >
                  <span className="text-[10px] font-medium uppercase tracking-widest text-white/35">{label}</span>
                  <span className="text-3xl font-bold tracking-tight text-white">{value}</span>
                  {sub && <span className="text-[11px] text-white/40">{sub}</span>}
                </div>
              );

              return (
                <div className="flex flex-col gap-3">
                  {/* Średni wynik – duży */}
                  <div
                    className="flex items-center gap-5 rounded-2xl px-5 py-5"
                    style={{
                      background: "rgba(28,28,32,0.55)",
                      backdropFilter: "blur(40px) saturate(180%)",
                      WebkitBackdropFilter: "blur(40px) saturate(180%)",
                      border: `1px solid ${getScoreBorderColor(avgScore)}`,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10), ${getScoreGlow(avgScore)}`,
                    }}
                  >
                    <span className={`text-6xl font-bold leading-none ${getScoreColor(avgScore)}`}
                      style={{ textShadow: "0 0 20px currentColor" }}>
                      {avgScore}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-medium uppercase tracking-widest text-white/50">Średni wynik</span>
                      <span className="mt-0.5 text-xs text-white/30">{n} {n === 1 ? "sesja" : n < 5 ? "sesje" : "sesji"}</span>
                      {trend !== null && (
                        <span className={`mt-1 text-[11px] font-medium ${trend > 0 ? "text-green-400" : trend < 0 ? "text-red-400" : "text-white/40"}`}>
                          {trend > 0 ? `↑ +${trend} pkt` : trend < 0 ? `↓ ${trend} pkt` : "→ bez zmian"} vs. start
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dwa kafelki: najlepszy / najgorszy */}
                  <div className="grid grid-cols-2 gap-3">
                    {statCard("Najlepszy", `${best} pkt`)}
                    {statCard("Najgorszy", `${worst} pkt`)}
                  </div>

                  {/* Czas + WPM */}
                  <div className="grid grid-cols-2 gap-3">
                    {statCard("Śr. czas", formatDuration(avgDur))}
                    {avgWpm !== null
                      ? statCard("Śr. WPM", `${avgWpm}`, "słów / min")
                      : statCard("Sesje", `${n}`)}
                  </div>

                  {/* Zapychacze */}
                  {avgFiller !== null && statCard("Śr. zapychacze", `${avgFiller}`, "na sesję")}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── BOTTOM NAV ── */}
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-10" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}>
          <div
            className="flex items-center gap-4 rounded-full px-3 py-2.5"
            style={{
              background: "rgba(30, 30, 32, 0.55)",
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            {/* Home */}
            <button
              onClick={() => setMobileTab("home")}
              className="flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95"
              style={{
                padding: "8px 22px",
                borderRadius: 50,
                background: mobileTab === "home"
                  ? "rgba(255,255,255,0.13)"
                  : "transparent",
                boxShadow: mobileTab === "home"
                  ? "inset 0 1px 0 rgba(255,255,255,0.15)"
                  : "none",
              }}
            >
              <HomeIcon className="size-[18px]" style={{ color: mobileTab === "home" ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.35)" }} />
              <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: "0.04em", color: mobileTab === "home" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)" }}>
                Home
              </span>
            </button>

            {/* Record – center button */}
            <button
              onClick={() => setRecordingOpen(true)}
              className="flex items-center justify-center transition-all duration-200 active:scale-95"
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.92)",
                boxShadow: "0 0 20px rgba(255,255,255,0.18), inset 0 1px 0 rgba(255,255,255,1), 0 2px 6px rgba(0,0,0,0.35)",
                margin: "0 4px",
              }}
            >
              <Mic className="size-[18px] text-black" />
            </button>

            {/* History */}
            <button
              onClick={() => setMobileTab("history")}
              className="flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95"
              style={{
                padding: "8px 22px",
                borderRadius: 50,
                background: mobileTab === "history"
                  ? "rgba(255,255,255,0.13)"
                  : "transparent",
                boxShadow: mobileTab === "history"
                  ? "inset 0 1px 0 rgba(255,255,255,0.15)"
                  : "none",
              }}
            >
              <LayoutList className="size-[18px]" style={{ color: mobileTab === "history" ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.35)" }} />
              <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: "0.04em", color: mobileTab === "history" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)" }}>
                Historia
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── DESKTOP layout (>= md) ── */}
      <div className="relative z-10 mx-auto hidden max-w-4xl space-y-12 px-6 py-12 md:block">
        <header className="text-center">
          <h1 className="text-white/90 text-3xl font-bold tracking-tight md:text-4xl">
            AI Pitch Coach
          </h1>
          <p className="text-white/60 mt-2">
            Ile sekund zanim stracisz uwagę słuchacza?
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.05] border-t-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md">
            <p className="text-white/90 text-sm font-medium tracking-tight">
              Przeanalizowane nagrania
            </p>
            <p className="text-4xl font-bold text-white">{attempts.length}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.05] border-t-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md">
            <p className="text-white/90 text-sm font-medium tracking-tight">
              Średni wynik
            </p>
            <p className="text-4xl font-bold text-white">{avgScore}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.05] border-t-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md">
            <p className="text-white/90 text-sm font-medium tracking-tight">
              Najlepszy wynik
            </p>
            <p className="text-4xl font-bold text-white">{bestScore}</p>
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="lg"
            className="gap-3 rounded-xl border border-white/10 border-t-white/20 bg-white/[0.03] px-32 py-6 text-base font-medium tracking-tight text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.10)] backdrop-blur-2xl transition-all duration-300 ease-out hover:bg-white/[0.07] hover:border-white/20 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_0_20px_rgba(255,255,255,0.05)] active:scale-[0.985]"
            onClick={() => setRecordingOpen(true)}
          >
            <Mic className="size-5" />
            Rozpocznij Nagrywanie
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/[0.05] border-t-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md">
          <h2 className="text-white/90 mb-4 text-lg font-semibold tracking-tight">
            Historia nagrań
          </h2>
          {attempts.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/50">
              Brak nagrań. Kliknij przycisk powyżej, aby rozpocząć.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/[0.05]">
                  <TableHead className="text-white/90">Data</TableHead>
                  <TableHead className="text-white/90">Wynik</TableHead>
                  <TableHead className="text-white/90">Czas</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((a) => (
                  <TableRow
                    key={a.id}
                    className="border-b border-white/[0.05] hover:bg-white/[0.02]"
                  >
                    <TableCell className="text-white/80">
                      {formatDate(a.date)}
                    </TableCell>
                    <TableCell>
                      <span className={`font-semibold ${getScoreColor(a.score)}`}>
                        {a.score}
                      </span>
                    </TableCell>
                    <TableCell className="text-white/80">
                      {formatDuration(a.duration)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl text-white/60 transition-colors hover:bg-destructive/15 hover:text-destructive"
                        onClick={() => handleDelete(a.id)}
                        title="Usuń nagranie"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <RecordingModal
        open={recordingOpen}
        onClose={() => setRecordingOpen(false)}
        onComplete={handleComplete}
      />
    </main>
  );
}
