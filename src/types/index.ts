export interface AnalysisResult {
  score: number;
  durationSeconds: number;
  fillerWordsCount: number;
  wpm: number;
  transcription: string;
  textFeedback: string[];
}

export interface Attempt {
  id: string;
  date: string;
  score: number;
  duration: number;
  fillerWordsCount?: number;
  wpm?: number;
  transcription?: string;
  textFeedback?: string[];
}
