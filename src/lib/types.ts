export interface NewsSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}

export interface ScrapedArticle {
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  snippet: string;
  content: string;
}

export interface Claim {
  id: string;
  text: string;
  status: 'verified' | 'disputed' | 'unverified';
  confidence: number; // 0-100
  sources: { sourceName: string; excerpt: string }[];
  explanation: string;
}

export interface FactCheckReport {
  topic: string;
  summary: string;
  claims: Claim[];
  sourceComparison: {
    sourceName: string;
    perspective: string;
    keyPoints: string[];
  }[];
  generatedAt: string;
}

export interface DailyTheme {
  id: string;
  headline: string;
  summary: string;
  sourceAnalysis: {
    sourceName: string;
    stance: string;
    keyQuotes: string[];
    biasIndicators: string[];
    articleUrl?: string;
  }[];
  criticalCommentary: string;
  significance: 'high' | 'medium' | 'low';
}

export interface DailyNewsReport {
  title: string;
  generatedAt: string;
  introduction: string;
  themes: DailyTheme[];
  conclusion: string;
  sourcesAnalyzed: string[];
}
