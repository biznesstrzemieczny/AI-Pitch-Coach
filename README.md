# AI Pitch Coach

AI-powered public speaking coach MVP built with Next.js, React, Tailwind CSS, and shadcn/ui.

## Features

- **Dashboard**: Stat cards (Przeanalizowane nagrania, Średni wynik, Najlepszy wynik), primary CTA, and recent attempts table
- **Recording**: Live camera feed with MediaRecorder API; audio-only extraction for smaller payload
- **Analysis API**: Mock `/api/analyze` route ready for OpenAI Whisper + GPT-4o integration
- **Results**: Dynamic score (0–40 red, 41–70 yellow, 71–100 green), stats blocks, and "Bezlitosny Feedback"

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Wiring Real AI

Edit `src/app/api/analyze/route.ts`:

1. **Transcription**: Use OpenAI Whisper on the audio file
2. **Analysis**: Send transcription to GPT-4o with a prompt for pitch evaluation
3. **Response**: Return `{ score, durationSeconds, fillerWordsCount, wpm, textFeedback }`

Add `OPENAI_API_KEY` to your environment.
