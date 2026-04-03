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

        {report.ethicalJesus && (
          <section className="bg-sky-50 dark:bg-sky-950/30 rounded-lg p-6 mt-4 border border-sky-200 dark:border-sky-800">
            <h2 className="text-lg font-bold mb-3 text-sky-700 dark:text-sky-400">
              ✝ {t('ethicalJesusTitle')}
            </h2>
            <p className="text-base leading-relaxed whitespace-pre-line text-sky-900 dark:text-sky-200">{report.ethicalJesus}</p>
          </section>
        )}

        {report.ethicalCovey && (
          <section className="bg-indigo-50 dark:bg-indigo-950/30 rounded-lg p-6 mt-4 border border-indigo-200 dark:border-indigo-800">
            <h2 className="text-lg font-bold mb-3 text-indigo-700 dark:text-indigo-400">
              🧭 {t('ethicalCoveyTitle')}
            </h2>
            <p className="text-base leading-relaxed whitespace-pre-line text-indigo-900 dark:text-indigo-200">{report.ethicalCovey}</p>
          </section>
        )}

        {report.ethicalGandhi && (
          <section className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-6 mt-4 border border-orange-200 dark:border-orange-800">
            <h2 className="text-lg font-bold mb-3 text-orange-700 dark:text-orange-400">
              ☸ {t('ethicalGandhiTitle')}
            </h2>
            <p className="text-base leading-relaxed whitespace-pre-line text-orange-900 dark:text-orange-200">{report.ethicalGandhi}</p>
          </section>
        )}

        {report.ethicalBuddha && (
          <section className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-6 mt-4 border border-yellow-200 dark:border-yellow-800">
            <h2 className="text-lg font-bold mb-3 text-yellow-700 dark:text-yellow-400">
              🪷 {t('ethicalBuddhaTitle')}
            </h2>
            <p className="text-base leading-relaxed whitespace-pre-line text-yellow-900 dark:text-yellow-200">{report.ethicalBuddha}</p>
          </section>
        )}

        {report.ethicalMohammed && (
          <section className="bg-teal-50 dark:bg-teal-950/30 rounded-lg p-6 mt-4 border border-teal-200 dark:border-teal-800">
            <h2 className="text-lg font-bold mb-3 text-teal-700 dark:text-teal-400">
              ☪ {t('ethicalMohammedTitle')}
            </h2>
            <p className="text-base leading-relaxed whitespace-pre-line text-teal-900 dark:text-teal-200">{report.ethicalMohammed}</p>
          </section>
        )}

        {report.ethicalTorah && (
          <section className="bg-violet-50 dark:bg-violet-950/30 rounded-lg p-6 mt-4 border border-violet-200 dark:border-violet-800">
            <h2 className="text-lg font-bold mb-3 text-violet-700 dark:text-violet-400">
              ✡ {t('ethicalTorahTitle')}
            </h2>
            <p className="text-base leading-relaxed whitespace-pre-line text-violet-900 dark:text-violet-200">{report.ethicalTorah}</p>
          </section>
        )}

        {report.ethicalOshi && (
          <section className="bg-rose-50 dark:bg-rose-950/30 rounded-lg p-6 mt-4 border border-rose-200 dark:border-rose-800">
            <h2 className="text-lg font-bold mb-3 text-rose-700 dark:text-rose-400">
              ⛩ {t('ethicalOshiTitle')}
            </h2>
            <p className="text-base leading-relaxed whitespace-pre-line text-rose-900 dark:text-rose-200">{report.ethicalOshi}</p>
          </section>
        )}

        {report.ethicalRajneesh && (
          <section className="bg-fuchsia-50 dark:bg-fuchsia-950/30 rounded-lg p-6 mt-4 border border-fuchsia-200 dark:border-fuchsia-800">
            <h2 className="text-lg font-bold mb-3 text-fuchsia-700 dark:text-fuchsia-400">
              🪷 {t('ethicalRajneeshTitle')}
            </h2>
            <p className="text-base leading-relaxed whitespace-pre-line text-fuchsia-900 dark:text-fuchsia-200">{report.ethicalRajneesh}</p>
          </section>
        )}

        {report.ethicalGita && (
          <section className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-6 mt-4 border border-amber-200 dark:border-amber-800">
            <h2 className="text-lg font-bold mb-3 text-amber-700 dark:text-amber-400">
              🙏 {t('ethicalGitaTitle')}
            </h2>
            <p className="text-base leading-relaxed whitespace-pre-line text-amber-900 dark:text-amber-200">{report.ethicalGita}</p>
          </section>
        )}

        <footer className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
          <p>{t('dailyFooter1')}</p>
          <p>{t('dailyFooter2')}</p>
        </footer>
      </div>
    </div>);

}