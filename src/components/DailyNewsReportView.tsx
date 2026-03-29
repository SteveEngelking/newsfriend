import { useRef } from 'react';
import { DailyNewsReport } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { downloadAsHtml } from '@/lib/downloadHtml';
import { generateDailyNewsHtml, openReportInNewTab } from '@/lib/generateReportHtml';
import { Download, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Props {
  report: DailyNewsReport;
}

export function DailyNewsReportView({ report }: Props) {
  const reportRef = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();

  const handleDownload = () => {
    if (reportRef.current) {
      downloadAsHtml(reportRef.current, 'news-of-the-day');
    }
  };

  const getSignificanceBadge = (significance: string) => {
    const variants: Record<string, 'destructive' | 'default' | 'secondary'> = {
      high: 'destructive',
      medium: 'default',
      low: 'secondary'
    };
    return variants[significance] || 'secondary';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-2">
        <Button onClick={() => openReportInNewTab(generateDailyNewsHtml(report, language))} variant="outline" className="gap-2">
          <ExternalLink className="h-4 w-4" />
          {t('dailyOpenNewTab')}
        </Button>
        <Button onClick={handleDownload} className="gap-2">
          <Download className="h-4 w-4" />
          {t('dailyDownloadHtml')}
        </Button>
      </div>
      
      <div ref={reportRef} className="bg-background text-foreground p-8 max-w-4xl mx-auto px-[20px] py-[20px]">
        <header className="text-center mb-8 pb-6 border-b-2 border-primary">
          <h1 className="text-3xl font-bold tracking-tight mb-2">{report.title}</h1>
          <p className="text-sm text-muted-foreground">
            {t('homeGenerated')} {new Date(report.generatedAt).toLocaleString('en-GB', { timeZone: 'UTC', timeZoneName: 'short' })} • {t('dailySourcesLabel')}: {report.sourcesAnalyzed.join(', ')}
          </p>
        </header>

        <section className="mb-8">
          <p className="text-base leading-relaxed whitespace-pre-line pr-0 mx-0">{report.introduction}</p>
        </section>

        <Separator className="my-8" />

        {report.themes.map((theme, index) =>
        <article key={theme.id} className="mb-10">
            <header className="mb-4">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-bold leading-tight">
                  <span className="text-primary mr-2">{index + 1}.</span>
                  {theme.headline}
                </h2>
                <Badge variant={getSignificanceBadge(theme.significance)} className="shrink-0">
                  {theme.significance}
                </Badge>
              </div>
              <p className="mt-2 text-muted-foreground leading-relaxed">{theme.summary}</p>
            </header>

            <div className="bg-muted/30 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                {t('dailySourceComparison')}
              </h3>
              <div className="space-y-4">
                {theme.sourceAnalysis.map((sa, saIndex) =>
              <div key={saIndex} className="border-l-2 border-primary/30 pl-4">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{sa.sourceName}</h4>
                      {sa.articleUrl &&
                  <a
                    href={sa.articleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline">
                    
                          {t('dailyReadArticle')}
                        </a>
                  }
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{sa.stance}</p>
                    {sa.keyQuotes.length > 0 &&
                <div className="mt-2">
                        {sa.keyQuotes.map((quote, qi) =>
                  <blockquote key={qi} className="text-sm italic border-l-2 border-muted pl-2 my-1">
                            "{quote}"
                          </blockquote>
                  )}
                      </div>
                }
                    {sa.biasIndicators.length > 0 &&
                <div className="mt-2 flex flex-wrap gap-1">
                        {sa.biasIndicators.map((bias, bi) =>
                  <Badge key={bi} variant="outline" className="text-xs">
                            {bias}
                          </Badge>
                  )}
                      </div>
                }
                  </div>
              )}
              </div>
            </div>

            <div className="bg-primary/5 rounded-lg p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary mb-2">
                {t('dailyCriticalCommentary')}
              </h3>
              <p className="text-sm leading-relaxed">{theme.criticalCommentary}</p>
            </div>

            {theme.mondcivitanReflection && (
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 mt-4 border border-amber-200 dark:border-amber-800">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-2">
                  ☮ {t('mondcivitanReflectionTitle')}
                </h3>
                <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-200">{theme.mondcivitanReflection}</p>
              </div>
            )}

            {index < report.themes.length - 1 && <Separator className="mt-8" />}
          </article>
        )}

        <Separator className="my-8" />
        <section className="bg-muted/50 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-3">{t('dailyConclusion')}</h2>
          <p className="text-base leading-relaxed whitespace-pre-line">{report.conclusion}</p>
        </section>

        {report.schweitzerEthical && (
          <section className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-6 mt-4 border border-emerald-200 dark:border-emerald-800">
            <h2 className="text-lg font-bold mb-3 text-emerald-700 dark:text-emerald-400">
              🌿 {t('schweitzerEthicalTitle')}
            </h2>
            <p className="text-base leading-relaxed whitespace-pre-line text-emerald-900 dark:text-emerald-200">{report.schweitzerEthical}</p>
          </section>
        )}

        <footer className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
          <p>{t('dailyFooter1')}</p>
          <p>{t('dailyFooter2')}</p>
        </footer>
      </div>
    </div>);

}