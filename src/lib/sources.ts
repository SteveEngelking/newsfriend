import { NewsSource } from './types';

const STORAGE_KEY = 'news-factcheck-sources';

export const DEFAULT_SOURCES: NewsSource[] = [
  { id: 'reuters', name: 'Reuters', url: 'https://www.reuters.com', enabled: true },
  { id: 'apnews', name: 'AP News', url: 'https://apnews.com', enabled: true },
  { id: 'bbc', name: 'BBC News', url: 'https://www.bbc.com/news', enabled: true },
  { id: 'cnn', name: 'CNN', url: 'https://www.cnn.com', enabled: true },
  { id: 'aljazeera', name: 'Al Jazeera', url: 'https://www.aljazeera.com', enabled: true },
  { id: 'npr', name: 'NPR', url: 'https://www.npr.org', enabled: false },
  { id: 'guardian', name: 'The Guardian', url: 'https://www.theguardian.com', enabled: false },
  { id: 'foxnews', name: 'Fox News', url: 'https://www.foxnews.com', enabled: false },
];

export function loadSources(): NewsSource[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_SOURCES;
}

export function saveSources(sources: NewsSource[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
}
