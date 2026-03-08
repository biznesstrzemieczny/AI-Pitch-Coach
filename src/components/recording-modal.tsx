"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "@/types";

interface RecordingModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (result: AnalysisResult) => void;
}

export function RecordingModal({
  open,
  onClose,
  onComplete,
}: RecordingModalProps) {
  const [status, setStatus] = useState<"idle" | "recording" | "analyzing">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(3);
  const [countdown, setCountdown] = useState<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Use audio-only for smaller payload - extract audio track
      const audioStream = new MediaStream(
        stream.getAudioTracks().length > 0
          ? stream.getAudioTracks()
          : stream.getTracks()
      );

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const mediaRecorder = new MediaRecorder(audioStream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recordingStartRef.current = Date.now();
      mediaRecorder.start(1000);
      setStatus("recording");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nie udało się uzyskać dostępu do kamery/mikrofonu"
      );
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    recorder.stop();
    setStatus("analyzing");

    // Stop camera/mic
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      const durationSeconds = (
        (Date.now() - recordingStartRef.current) /
        1000
      ).toFixed(1);

      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("durationSeconds", durationSeconds);

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            typeof data?.error === "string" ? data.error : "Błąd analizy"
          );
        }
        onComplete(data as AnalysisResult);
        onClose();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Błąd analizy. Spróbuj ponownie."
        );
        setStatus("idle");
      }
    };
  }, [onComplete, onClose]);

  const handleClose = useCallback(() => {
    if (status === "recording") {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current?.state === "recording" &&
        mediaRecorderRef.current?.stop();
    }
    setStatus("idle");
    setError(null);
    setCountdown(null);
    onClose();
  }, [status, onClose]);

  const handleStartClick = useCallback(() => {
    if (countdown !== null) return;
    if (cooldownSeconds <= 0) {
      startRecording();
    } else {
      setCountdown(cooldownSeconds);
    }
  }, [cooldownSeconds, countdown, startRecording]);

  useEffect(() => {
    if (countdown === null || countdown > 0) return;
    startRecording();
    setCountdown(null);
  }, [countdown, startRecording]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    if (status === "recording" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [status]);

  const isMobileIdle = status === "idle";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="glass-panel overflow-hidden rounded-none p-0 sm:rounded-2xl sm:max-w-2xl md:p-6 max-w-full h-[100dvh] sm:h-auto flex flex-col"
        showCloseButton={status !== "recording" && !isMobileIdle}
        onPointerDownOutside={(e) =>
          status === "recording" && e.preventDefault()
        }
      >
        {/* Header – ukryty tylko na mobile idle (jest w kafelku) */}
        <DialogHeader className={`px-5 pt-5 sm:px-0 sm:pt-0 ${isMobileIdle ? "hidden sm:flex" : ""}`}>
          <DialogTitle>
            {status === "idle" && "Nagrywanie pitcha"}
            {status === "recording" && "Nagrywanie w toku..."}
            {status === "analyzing" && "Sprawdźmy jak Ci poszło"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-4 px-5 pb-8 sm:px-0 sm:pb-0">
          {error && (
            <div className="rounded-lg bg-destructive/15 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {status === "analyzing" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-600 border-t-teal-400" />
              <p className="text-muted-foreground text-lg">
                AI Ocenia Twój Pitch...
              </p>
            </div>
          )}

          {(status === "idle" || status === "recording") && (
            <>
              {/* Idle: mobile tile LUB desktop layout */}
              {isMobileIdle ? (
                <>
                {/* Mobile: wszystko w jednym kafelku – glass, odstep od krawedzi */}
                <div
                  className="mx-4 mt-8 mb-6 flex flex-1 flex-col rounded-2xl sm:hidden"
                  style={{
                    background: "rgba(28,28,32,0.55)",
                    backdropFilter: "blur(40px) saturate(180%)",
                    WebkitBackdropFilter: "blur(40px) saturate(180%)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderTop: "1px solid rgba(255,255,255,0.12)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.4)",
                  }}
                >
                  {/* Nagłówek wewnątrz kafelka */}
                  <div className="relative flex items-center justify-center px-5 pt-6 pb-2">
                    <h2 className="text-lg font-bold tracking-tight text-white" style={{ textShadow: "0 0 20px rgba(255,255,255,0.2)" }}>
                      Nagrywanie pitcha
                    </h2>
                    <DialogClose
                      asChild
                      className="absolute right-4 top-6"
                    >
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
                        onClick={handleClose}
                      >
                        <X className="size-5" />
                        <span className="sr-only">Zamknij</span>
                      </button>
                    </DialogClose>
                  </div>

                  {/* Tekst instrukcji */}
                  <div className="flex flex-1 flex-col items-center justify-center px-8 py-6">
                    <p className="text-center text-sm text-white/60" style={{ padding: "1rem 1.25rem" }}>
                      Kliknij &quot;Rozpocznij nagrywanie&quot;, aby włączyć kamerę
                    </p>

                    {/* Przycisk */}
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={handleStartClick}
                      disabled={countdown !== null}
                      className="btn-cta-glass mt-4 gap-2 rounded-xl px-8 font-semibold text-white hover:bg-transparent disabled:opacity-90"
                      style={{
                        border: "1px solid rgba(255,255,255,0.25)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 0 14px rgba(255,255,255,0.06), 0 0 28px rgba(255,255,255,0.03)",
                      }}
                    >
                      {countdown !== null ? (
                        <span className="text-2xl font-bold tabular-nums">{countdown}</span>
                      ) : (
                        <>
                          <Mic className="size-5" />
                          Rozpocznij nagrywanie
                        </>
                      )}
                    </Button>

                    {/* Suwak cooldown */}
                    <div className="mt-6 w-full max-w-[280px] px-2">
                      <label className="mb-2 block text-center text-[11px] font-medium uppercase tracking-widest text-white/40">
                        Odliczanie przed startem: {cooldownSeconds} s
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={10}
                        step={1}
                        value={cooldownSeconds}
                        onChange={(e) => setCooldownSeconds(Number(e.target.value))}
                        disabled={countdown !== null}
                        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>

                {/* Desktop idle: kamera + przycisk */}
                <div className="hidden flex-1 flex-col gap-4 sm:flex">
                  <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black">
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 px-8 py-6">
                      <p className="text-center text-sm text-white/50" style={{ padding: "1rem 1.25rem" }}>
                        Kliknij &quot;Rozpocznij nagrywanie&quot;, aby włączyć kamerę
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-4">
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={handleStartClick}
                      disabled={countdown !== null}
                      className="btn-cta-glass gap-2 rounded-xl border-0 px-8 font-semibold text-white hover:bg-transparent"
                    >
                      {countdown !== null ? (
                        <span className="text-2xl font-bold tabular-nums">{countdown}</span>
                      ) : (
                        <>
                          <Mic className="size-5" />
                          Rozpocznij nagrywanie
                        </>
                      )}
                    </Button>
                    <div className="w-full max-w-[200px]">
                      <label className="mb-1 block text-center text-[11px] font-medium uppercase tracking-wider text-white/40">
                        Odliczanie: {cooldownSeconds} s
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={10}
                        step={1}
                        value={cooldownSeconds}
                        onChange={(e) => setCooldownSeconds(Number(e.target.value))}
                        disabled={countdown !== null}
                        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>
                </>
              ) : (
                <>
                  {/* Kamera / video – jeden element, różne layouty */}
                  <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black sm:aspect-video sm:flex-none">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                    {status === "recording" && (
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-red-500/90 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                        REC
                      </div>
                    )}
                  </div>

                  <div className="hidden flex-col items-center gap-4 sm:flex">
                    <Button
                      size="lg"
                      variant="destructive"
                      onClick={stopRecording}
                      className="gap-2 rounded-xl px-8"
                    >
                      <Square className="size-5 fill-current" />
                      Zakończ nagrywanie
                    </Button>
                  </div>
                </>
              )}

              {/* Mobile recording: przycisk stop – pod kamerą */}
              {status === "recording" && (
                <div className="flex justify-center gap-3 px-4 pb-4 sm:hidden">
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={stopRecording}
                    className="gap-2 rounded-xl px-8"
                  >
                    <Square className="size-5 fill-current" />
                    Zakończ nagrywanie
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
