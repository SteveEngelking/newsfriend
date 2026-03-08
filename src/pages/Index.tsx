import { useState, useCallback } from 'react';
import { NewsSource, FactCheckReport, ScrapedArticle } from '@/lib/types';
import { loadSources, saveSources } from '@/lib/sources';
import { SourceManager } from '@/components/SourceManager';
import { SearchBar } from '@/components/SearchBar';
import { ReportView } from '@/components/ReportView';
import { LoadingState } from '@/components/LoadingState';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { firecrawlApi } from '@/lib/api/firecrawl';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

const Index = () => {
  const [sources, setSources] = useState<NewsSource[]>(loadSources);
  const [report, setReport] = useState<FactCheckReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'searching' | 'analyzing'>('searching');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const { toast } = useToast();

  const handleSourcesChange = useCallback((newSources: NewsSource[]) => {
    setSources(newSources);
    saveSources(newSources);
  }, []);

  const handleSearch = useCallback(async (topic: string) => {
    const enabledSources = sources.filter(s => s.enabled);
    if (enabledSources.length === 0) {
      toast({ title: 'No sources selected', description: 'Enable at least one news source.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setReport(null);
    setLoadingStage('searching');
    setLoadingProgress(0);

    try {
      // Step 1: Search each source via Firecrawl
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
          const query = `${topic} site:${hostname}`;
          const result = await firecrawlApi.search(query, {
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

      if (allArticles.length === 0) {
        toast({ title: 'No articles found', description: 'Try a different topic or enable more sources.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // Step 2: Send to AI for analysis
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
  }, [sources, toast]);

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

        <SearchBar onSearch={handleSearch} isLoading={isLoading} />

        <SourceManager sources={sources} onChange={handleSourcesChange} />

        {isLoading && (
          <LoadingState stage={loadingStage} progress={loadingProgress} message={loadingMessage} />
        )}

        {report && !isLoading && (
          <>
            <ReportView report={report} />
            <div className="flex justify-center">
              <Button
                onClick={() => setReport(null)}
                variant="outline"
                className="gap-2"
              >
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
