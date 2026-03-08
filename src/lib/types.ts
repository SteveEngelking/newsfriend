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
