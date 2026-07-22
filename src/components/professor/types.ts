export interface Demographics {
  careers: Record<string, number>;
  years: Record<string, number>;
  genders: Record<string, number>;
  avg_duration: number | null;
}

export interface AnalysisResult {
  summary: string;
  recommendations?: string;
  sessionCount: number;
  demographics: Demographics;
}
