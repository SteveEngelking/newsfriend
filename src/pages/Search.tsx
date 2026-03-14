import { useState, useCallback, useEffect, useRef } from 'react';
import { NewsSource, FactCheckReport, ScrapedArticle, DailyNewsReport } from '@/lib/types';
import { fetchSources, saveEnabledState } from '@/lib/sources';
import { SourceManager } from '@/components/SourceManager';
import { SearchBar } from '@/components/SearchBar';
import { ReportView } from '@/components/ReportView';
import { DailyNewsReportView } from '@/components/DailyNewsReportView';
import { LoadingState } from '@/components/LoadingState';
import { Button } from '@/components/ui/button';
import { firecrawlApi } from '@/lib/api/firecrawl';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

const Search = () => {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [report, setReport] = useState<FactCheckReport | null>(() => {
    try {
      const stored = localStorage.getItem('verifynews-report');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [dailyReport, setDailyReport] = useState<DailyNewsReport | null>(() => {
    try {
      const stored = localStorage.getItem('verifynews-daily-report');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'searching' | 'analyzing'>('searching');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSources().then(setSources);
  }, []);

  const handleSourcesChange = useCallback((newSources: NewsSource[]) => {
    setSources(newSources);
    saveEnabledState(newSources);
  }, []);

  const searchSources = useCallback(async (enabledSources: NewsSource[], query: string) => {
    const allArticles: ScrapedArticle[] = [];
    for (let i = 0; i < enabledSources.length; i++) {
      const source = enabledSources[i];
      setLoadingMessage(`Searching ${source.name}...`);
      setLoadingProgress(Math.round(((i) / enabledSources.length) * 50));
      try {
        let sourceUrl = source.url.trim();
        if (!sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://')) {
          sourceUrl = `https://${sourceUrl}`;
        }
        const hostname = new URL(sourceUrl).hostname;
        const searchQuery = `${query} site:${hostname}`;
        const result = await firecrawlApi.search(searchQuery, {
          limit: 3,
          scrapeOptions: { formats: ['markdown'] },
        });
        if (result.success && result.data) {
          const articles = (Array.isArray(result.data) ? result.data : []).map((item: any) => ({
            sourceId: source.id,
            sourceName: source.name,
            title: item.title || 'Untitled',
            url: item.url || '',
            snippet: item.description || '',
            content: item.markdown || item.description || '',
          }));
          allArticles.push(...articles);
        }
      } catch (err) {
        console.error(`Error searching ${source.name}:`, err);
      }
    }
    return allArticles;
  }, []);

  const handleSearch = useCallback(async (topic: string) => {
    const enabledSources = sources.filter(s => s.enabled);
    if (enabledSources.length === 0) {
      toast({ title: 'No sources selected', description: 'Enable at least one news source.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setReport(null);
    setDailyReport(null);
    setLoadingStage('searching');
    setLoadingProgress(0);
    try {
      const allArticles = await searchSources(enabledSources, topic);
      if (allArticles.length === 0) {
        toast({ title: 'No articles found', description: 'Try a different topic or enable more sources.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      setLoadingStage('analyzing');
      setLoadingProgress(60);
      setLoadingMessage(`Analyzing ${allArticles.length} articles with AI...`);
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('fact-check', {
        body: {
          topic,
          allSourceNames: enabledSources.map(s => s.name),
          articles: allArticles.map(a => ({
            sourceName: a.sourceName,
            title: a.title,
            url: a.url,
            content: a.content.slice(0, 3000),
          })),
        },
      });
      if (analysisError) throw new Error(analysisError.message);
      setLoadingProgress(100);
      setLoadingMessage('Done!');
      if (analysisData?.report) {
        setReport(analysisData.report);
        localStorage.setItem('verifynews-report', JSON.stringify(analysisData.report));
        localStorage.removeItem('verifynews-daily-report');
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      } else {
        throw new Error('Invalid response from analysis');
      }
    } catch (err: any) {
      console.error('Search error:', err);
      toast({ title: 'Error', description: err.message || 'Something went wrong', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [sources, toast, searchSources]);

  const handleDailyNews = useCallback(async (articlesPerSource: number) => {
    const enabledSources = sources.filter(s => s.enabled);
    if (enabledSources.length === 0) {
      toast({ title: 'No sources selected', description: 'Enable at least one news source.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setReport(null);
    setDailyReport(null);
    setLoadingStage('searching');
    setLoadingProgress(0);
    try {
      const shuffled = [...enabledSources].sort(() => Math.random() - 0.5);
      const allArticles: ScrapedArticle[] = [];
      for (let i = 0; i < shuffled.length; i++) {
        const source = shuffled[i];
        setLoadingMessage(`Fetching latest from ${source.name}...`);
        setLoadingProgress(Math.round(((i) / enabledSources.length) * 50));
        try {
          let sourceUrl = source.url.trim();
          if (!sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://')) {
            sourceUrl = `https://${sourceUrl}`;
          }
          const hostname = new URL(sourceUrl).hostname;
          const queries = [
            `latest news today site:${hostname}`,
            `technology science site:${hostname}`,
            `economy business finance site:${hostname}`,
            `health environment climate site:${hostname}`,
            `sports culture entertainment site:${hostname}`,
          ];
          const perQuery = Math.max(1, Math.ceil(articlesPerSource / queries.length));
          const seenUrls = new Set<string>();
          for (const query of queries) {
            try {
              const result = await firecrawlApi.search(query, {
                limit: perQuery,
                tbs: 'qdr:d',
                scrapeOptions: { formats: ['markdown'] },
              });
              if (result.success && result.data) {
                const articles = (Array.isArray(result.data) ? result.data : [])
                  .filter((item: any) => item.url && !seenUrls.has(item.url))
                  .map((item: any) => {
                    seenUrls.add(item.url);
                    return {
                      sourceId: source.id,
                      sourceName: source.name,
                      title: item.title || 'Untitled',
                      url: item.url || '',
                      snippet: item.description || '',
                      content: item.markdown || item.description || '',
                    };
                  });
                allArticles.push(...articles);
              }
            } catch (queryErr) {
              console.error(`Error with query "${query}":`, queryErr);
            }
          }
        } catch (err) {
          console.error(`Error fetching from ${source.name}:`, err);
        }
      }
      if (allArticles.length === 0) {
        toast({ title: 'No articles found', description: 'Could not find recent articles. Try again later.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      setLoadingStage('analyzing');
      setLoadingProgress(60);
      setLoadingMessage(`Analyzing ${allArticles.length} articles for daily themes...`);
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('daily-news', {
        body: {
          allSourceNames: enabledSources.map(s => s.name),
          totalArticlesRequested: articlesPerSource * enabledSources.length,
          articles: allArticles.map(a => ({
            sourceName: a.sourceName,
            title: a.title,
            url: a.url,
            content: a.content.slice(0, 3000),
          })),
        },
      });
      if (analysisError) throw new Error(analysisError.message);
      setLoadingProgress(100);
      setLoadingMessage('Done!');
      if (analysisData?.report) {
        setDailyReport(analysisData.report);
        localStorage.setItem('verifynews-daily-report', JSON.stringify(analysisData.report));
        localStorage.removeItem('verifynews-report');
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      } else {
        throw new Error('Invalid response from analysis');
      }
    } catch (err: any) {
      console.error('Daily news error:', err);
      toast({ title: 'Error', description: err.message || 'Something went wrong', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [sources, toast]);

  const handleReset = useCallback(() => {
    setReport(null);
    setDailyReport(null);
    localStorage.removeItem('verifynews-report');
    localStorage.removeItem('verifynews-daily-report');
  }, []);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h2 className="text-2xl font-bold tracking-tight">Fact Checker</h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Search across multiple news sources, cross-reference claims, and get an AI-powered fact-check report.
        </p>
      </motion.div>

      <SearchBar onSearch={handleSearch} onDailyNews={handleDailyNews} isLoading={isLoading} />
      <SourceManager sources={sources} onChange={handleSourcesChange} />

      {isLoading && (
        <LoadingState stage={loadingStage} progress={loadingProgress} message={loadingMessage} />
      )}

      <div ref={resultsRef} />

      {report && !isLoading && (
        <>
          <ReportView report={report} />
          <div className="flex justify-center">
            <Button onClick={handleReset} variant="outline" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              New Search
            </Button>
          </div>
        </>
      )}

      {dailyReport && !isLoading && (
        <>
          <DailyNewsReportView report={dailyReport} />
          <div className="flex justify-center">
            <Button onClick={handleReset} variant="outline" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              New Search
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default Search;
