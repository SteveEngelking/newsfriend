export interface SpecialEditionSourceAnalysis {
  sourceName: string;
  stance: string;
  keyQuotes: string[];
  biasIndicators: string[];
  articleUrl: string;
}

export interface SpecialEditionReport {
  topic: string;
  title: string;
  generatedAt: string;
  language: 'en' | 'de';
  headline: string;
  summary: string;
  sourceAnalysis: SpecialEditionSourceAnalysis[];
  discussion: string;
  criticalCommentary: string;
  mondcivitanReflection: string | null;
  actionSteps: string[];
  conclusion: string;
  sourcesAnalyzed: string[];
  bannerImageUrl?: string;
}

export interface SpecialEditionRecord {
  id: string;
  topic: string;
  language: string;
  status: 'processing' | 'draft' | 'approved' | 'failed';
  report_data: SpecialEditionReport & { error?: string; processing?: boolean; details?: string };
  created_at: string;
  approved_at: string | null;
  notified_at: string | null;
  notified_count: number;
}
