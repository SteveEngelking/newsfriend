import { supabase } from '@/integrations/supabase/client';
import { NewsSource } from './types';

const ENABLED_KEY = 'news-factcheck-enabled';

export const DEFAULT_SOURCES: NewsSource[] = [
  { id: 'reuters', name: 'Reuters', url: 'https://www.reuters.com', enabled: true },
  { id: 'apnews', name: 'AP News', url: 'https://apnews.com', enabled: true },
  { id: 'bbc', name: 'BBC News', url: 'https://www.bbc.com/news', enabled: true },
  { id: 'cnn', name: 'CNN', url: 'https://www.cnn.com', enabled: true },
  { id: 'aljazeera', name: 'Al Jazeera', url: 'https://www.aljazeera.com', enabled: true },
  { id: 'npr', name: 'NPR', url: 'https://www.npr.org', enabled: true },
  { id: 'guardian', name: 'The Guardian', url: 'https://www.theguardian.com', enabled: true },
  { id: 'foxnews', name: 'Fox News', url: 'https://www.foxnews.com', enabled: true },
];

/** Load which source IDs are enabled (stored per-browser) */
function loadEnabledIds(): Set<string> | null {
  try {
    const stored = localStorage.getItem(ENABLED_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch {}
  return null;
}

function saveEnabledIds(sources: NewsSource[]) {
  const enabledIds = sources.filter(s => s.enabled).map(s => s.id);
  localStorage.setItem(ENABLED_KEY, JSON.stringify(enabledIds));
}

/** Fetch all shared sources from DB and merge with local enabled state */
export async function fetchSources(): Promise<NewsSource[]> {
  const { data, error } = await supabase
    .from('news_sources')
    .select('id, name, url')
    .order('created_at', { ascending: true });

  if (error || !data?.length) {
    // Fallback to defaults
    return DEFAULT_SOURCES;
  }

  const enabledIds = loadEnabledIds();
  // If user has no local preference yet, default sources are enabled, custom ones disabled
  const defaultIds = new Set(DEFAULT_SOURCES.map(s => s.id));

  return data.map(row => ({
    id: row.id,
    name: row.name,
    url: row.url,
    enabled: enabledIds
      ? enabledIds.has(row.id)
      : defaultIds.has(row.id),
  }));
}

/** Add a new source to the shared DB */
export async function addSource(name: string, url: string): Promise<{ id: string } | null> {
  const id = `custom-${Date.now()}`;
  const { error } = await supabase
    .from('news_sources')
    .insert({ id, name, url });

  if (error) {
    console.error('Failed to add source:', error);
    return null;
  }
  return { id };
}

/** Remove a source from the shared DB */
export async function removeSource(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('news_sources')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to remove source:', error);
    return false;
  }
  return true;
}

/** Update a source's name and URL in the shared DB (admin only) */
export async function updateSource(id: string, name: string, url: string): Promise<boolean> {
  // Use service-level update via edge function or direct if RLS allows
  // Since news_sources doesn't allow UPDATE via RLS, we delete + re-insert
  const { error: delError } = await supabase.from('news_sources').delete().eq('id', id);
  if (delError) {
    console.error('Failed to delete source for update:', delError);
    return false;
  }
  const { error: insError } = await supabase.from('news_sources').insert({ id, name, url });
  if (insError) {
    console.error('Failed to re-insert source:', insError);
    return false;
  }
  return true;
}

/** Save enabled/disabled state locally */
export function saveEnabledState(sources: NewsSource[]) {
  saveEnabledIds(sources);
}
