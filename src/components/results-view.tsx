"use client";

import { ArrowLeft, FileText, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreRing } from "@/components/score-ring";
import type { AnalysisResult } from "@/types";

interface ResultsViewProps {
  result: AnalysisResult;
  onBack: () => void;
  onRetry: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ResultsView({ result, onBack, onRetry }: ResultsViewProps) {
  const hasTranscription = result.transcription?.trim().length > 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col items-center gap-6">
        <p className="text-muted-foreground text-sm uppercase tracking-wider">
          Twój wynik
        </p>
        <ScoreRing score={result.score} size={280} strokeWidth={16} />
        <p className="text-muted-foreground text-sm">/ 100</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="glass-panel relative overflow-hidden rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Czas mówienia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-50">
              {formatDuration(result.durationSeconds)}
            </p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden rounded-2xl border-zinc-800/60 bg-card/80 shadow-soft backdrop-blur-sm card-accent-edge">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Zapychacze
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-50">{result.fillerWordsCount}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden rounded-2xl border-zinc-800/60 bg-card/80 shadow-soft backdrop-blur-sm card-accent-edge">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Prędkość (WPM)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-50">{result.wpm}</p>
          </CardContent>
        </Card>
      </div>

      {hasTranscription && (
        <Card className="glass-panel overflow-hidden rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-100">
              <FileText className="size-4 text-zinc-500" />
              Twoja Transkrypcja
            </CardTitle>
            <p className="text-zinc-500 text-sm">
              Surowy zapis tego, co powiedziałeś – dowód bez retuszu.
            </p>
          </CardHeader>
          <CardContent>
            <div className="max-h-52 overflow-y-auto rounded-xl border border-zinc-800/80 bg-black/40 px-4 py-3.5 font-mono text-sm leading-relaxed text-zinc-400 shadow-inner">
              {result.transcription}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass-panel overflow-hidden rounded-2xl">
        <CardHeader>
          <CardTitle className="text-zinc-100">Bezlitosny Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {result.textFeedback.map((feedback, i) => (
              <li
                key={i}
                className="flex gap-3 text-muted-foreground"
              >
                <span className="text-primary font-medium">{i + 1}.</span>
                <span>{feedback}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-center gap-3">
        <Button
          variant="ghost"
          onClick={onBack}
          className="btn-frosted gap-2 rounded-xl border-0 text-white hover:bg-transparent"
        >
          <ArrowLeft className="size-4" />
          Wróć do Dashboardu
        </Button>
        <Button
          variant="ghost"
          onClick={onRetry}
          className="btn-cta-glass gap-2 rounded-xl border-0 font-semibold text-white hover:bg-transparent"
        >
          <RotateCcw className="size-4" />
          Spróbuj ponownie
        </Button>
      </div>
    </div>
  );
}
