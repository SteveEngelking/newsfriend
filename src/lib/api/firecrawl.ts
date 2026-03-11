import { supabase } from '@/integrations/supabase/client';

type FirecrawlResponse<T = any> = {
  success: boolean;
  error?: string;
  data?: T;
};

async function invokeWithRetry(
  fnName: string,
  body: Record<string, unknown>,
  retries = 2,
  delayMs = 1500
): Promise<FirecrawlResponse> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const { data, error } = await supabase.functions.invoke(fnName, { body });
    if (error) {
      if (attempt < retries) {
        console.warn(`${fnName} attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`);
        await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
      return { success: false, error: error.message };
    }
    // Also retry on 500-level errors returned in the body
    if (data && !data.success && attempt < retries) {
      console.warn(`${fnName} returned error, retrying...`, data.error);
      await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
      continue;
    }
    return data;
  }
  return { success: false, error: 'Max retries exceeded' };
}

export const firecrawlApi = {
  async search(query: string, options?: { limit?: number; tbs?: string; scrapeOptions?: { formats?: string[] } }): Promise<FirecrawlResponse> {
    return invokeWithRetry('firecrawl-search', { query, options });
  },
};
