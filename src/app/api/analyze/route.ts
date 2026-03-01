import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ANALYSIS_PROMPT = `Jesteś bezlitosnym trenerem wystąpień publicznych. Oceniasz wyłącznie mechanikę i dynamikę mowy. ZAKAZ cytowania fragmentów wypowiedzi użytkownika. Zamiast tego wygeneruj 3 krótkie, czyste i brutalnie szczere rady, co konkretnie poprawić. Żadnego lania wody, tylko czysta akcja do wdrożenia na scenie.

ZASADY WPM (bezwzględne):
- Przedział 80-120 WPM to IDEALNE, profesjonalne tempo sceniczne. Jeśli wynik WPM mieści się w tym przedziale, KATEGORYCZNIE ZABRANIAM CI sugerować jakichkolwiek zmian tempa (nie każ zwalniać ani przyspieszać).
- Jeśli WPM < 80, wygeneruj radę, by użytkownik przyspieszył, bo usypia widownię.
- Jeśli WPM > 130, wygeneruj radę, by zwolnił, przestał panikować i zaczął stosować pauzy.

Transkrypcja:
"""
{transcription}
"""

Czas trwania: {durationSeconds} sekund.
WPM (oblicz): słowa / (durationSeconds/60).

Zwróć TYLKO poprawny JSON (bez markdown, bez \`\`\`) w tym formacie:
{
  "score": <liczba 0-100>,
  "wpm": <słowa na minutę>,
  "textFeedback": [<dokładnie 3 krótkie, brutalnie szczere rady po polsku - bez cytowania użytkownika>]
}`;

/** Twardy licznik zapychaczy – Regex, case-insensitive, dopasowanie jako oddzielne słowa */
function countFillerWords(transcription: string): number {
  const fillerRegex = /\b(eee|yyy|no|prawda|jakby|wiesz)\b/gi;
  const matches = transcription.match(fillerRegex);
  return matches ? matches.length : 0;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const durationSeconds = formData.get("durationSeconds") as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured" },
        { status: 500 }
      );
    }

    // 1. Transcribe with Whisper (temperature: 0 blokuje halucynacje przy jąkaniu)
    const transcriptionResponse = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "pl",
      response_format: "text",
      temperature: 0,
      prompt:
        "Umm, uhh, eee, yyy, wiesz, po prostu, prawda, jakby",
    });

    const transcription =
      typeof transcriptionResponse === "string"
        ? transcriptionResponse
        : (transcriptionResponse as { text?: string }).text ?? "";

    const duration = durationSeconds ? parseFloat(durationSeconds) : 0;

    if (!transcription.trim()) {
      return NextResponse.json(
        {
          score: 0,
          durationSeconds: duration,
          fillerWordsCount: 0,
          wpm: 0,
          transcription: "",
          textFeedback: [
            "Nie udało się rozpoznać mowy. Upewnij się, że mówisz wyraźnie i mikrofon działa.",
          ],
        },
        { status: 200 }
      );
    }

    // 2. Analyze with GPT-4o
    const promptContent = ANALYSIS_PROMPT.replace(
      "{transcription}",
      transcription
    ).replace("{durationSeconds}", duration.toString());

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: promptContent,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from GPT");
    }

    const analysis = JSON.parse(content) as {
      score?: number;
      wpm?: number;
      textFeedback?: string[];
    };

    const wordCount = transcription.trim().split(/\s+/).filter(Boolean).length;
    const calculatedWpm =
      duration > 0 ? Math.round((wordCount / duration) * 60) : analysis.wpm ?? 0;

    const result = {
      score: Math.min(100, Math.max(0, analysis.score ?? 50)),
      durationSeconds: duration,
      fillerWordsCount: countFillerWords(transcription),
      wpm: analysis.wpm ?? calculatedWpm,
      transcription,
      textFeedback: Array.isArray(analysis.textFeedback)
        ? analysis.textFeedback
        : [
            "Analiza zakończona. Brak szczegółowego feedbacku.",
          ],
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to analyze speech",
      },
      { status: 500 }
    );
  }
}
