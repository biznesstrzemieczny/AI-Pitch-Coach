"use client";

import { useCallback, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
    onClose();
  }, [status, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="glass-panel overflow-hidden rounded-none p-0 sm:rounded-2xl sm:max-w-2xl md:p-6 max-w-full h-[100dvh] sm:h-auto flex flex-col"
        showCloseButton={status !== "recording"}
        onPointerDownOutside={(e) =>
          status === "recording" && e.preventDefault()
        }
      >
        {/* Header – ukryty na mobile podczas nagrywania */}
        <DialogHeader className="px-5 pt-5 sm:px-0 sm:pt-0">
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
              {/* Kamera – fullscreen na mobile */}
              <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black sm:aspect-video sm:flex-none">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
                {status === "idle" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 px-6">
                    <p className="text-center text-sm text-white/50">
                      Kliknij &quot;Rozpocznij nagrywanie&quot;, aby włączyć kamerę
                    </p>
                  </div>
                )}
                {status === "recording" && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-red-500/90 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    REC
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-3">
                {status === "idle" ? (
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={startRecording}
                    className="btn-cta-glass gap-2 rounded-xl border-0 px-8 font-semibold text-white hover:bg-transparent"
                  >
                    <Mic className="size-5" />
                    Rozpocznij nagrywanie
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={stopRecording}
                    className="gap-2 rounded-xl px-8"
                  >
                    <Square className="size-5 fill-current" />
                    Zakończ nagrywanie
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
