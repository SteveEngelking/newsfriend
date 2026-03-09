import { useState, useCallback, useEffect } from 'react';
import { NewsSource, FactCheckReport, ScrapedArticle, DailyNewsReport } from '@/lib/types';
import { fetchSources, saveEnabledState } from '@/lib/sources';
import { SourceManager } from '@/components/SourceManager';
import { SearchBar } from '@/components/SearchBar';
import { ReportView } from '@/components/ReportView';
import { DailyNewsReportView } from '@/components/DailyNewsReportView';
import { LoadingState } from '@/components/LoadingState';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { firecrawlApi } from '@/lib/api/firecrawl';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

const Index = () => {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [report, setReport] = useState<FactCheckReport | null>(null);
  const [dailyReport, setDailyReport] = useState<DailyNewsReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'searching' | 'analyzing'>('searching');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const { toast } = useToast();

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

  const handleDailyNews = useCallback(async () => {
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
      const allArticles: ScrapedArticle[] = [];
      for (let i = 0; i < enabledSources.length; i++) {
        const source = enabledSources[i];
        setLoadingMessage(`Fetching latest from ${source.name}...`);
        setLoadingProgress(Math.round(((i) / enabledSources.length) * 50));

        try {
          let sourceUrl = source.url.trim();
          if (!sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://')) {
            sourceUrl = `https://${sourceUrl}`;
          }
          const hostname = new URL(sourceUrl).hostname;
          const result = await firecrawlApi.search(`latest news today site:${hostname}`, {
            limit: 5,
            tbs: 'qdr:d',
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
      setLoadingMessage('Generating PDF...');

      if (analysisData?.report) {
        setDailyReport(analysisData.report);
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
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="container max-w-4xl mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">VerifyNews</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2 mb-8"
        >
          <h2 className="text-3xl font-bold tracking-tight">
            AI-Powered News Fact Checker
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Search across multiple news sources, cross-reference claims, and get an AI-powered fact-check report.
          </p>
        </motion.div>

        <SearchBar onSearch={handleSearch} onDailyNews={handleDailyNews} isLoading={isLoading} />

        <SourceManager sources={sources} onChange={handleSourcesChange} />

        {isLoading && (
          <LoadingState stage={loadingStage} progress={loadingProgress} message={loadingMessage} />
        )}

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
            <DailyNewsReportView report={dailyReport} autoOpenPdf={true} />
            <div className="flex justify-center">
              <Button onClick={handleReset} variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                New Search
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
