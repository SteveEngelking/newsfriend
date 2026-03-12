import { useRef } from 'react';
import { DailyNewsReport } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { downloadAsHtml } from '@/lib/downloadHtml';
import { Download } from 'lucide-react';

interface Props {
  report: DailyNewsReport;
}

export function DailyNewsReportView({ report }: Props) {
  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    if (reportRef.current) {
      downloadAsHtml(reportRef.current, 'news-of-the-day');
    }
  };

  const getSignificanceBadge = (significance: string) => {
    const variants: Record<string, 'destructive' | 'default' | 'secondary'> = {
      high: 'destructive',
      medium: 'default',
      low: 'secondary',
    };
    return variants[significance] || 'secondary';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Button onClick={handleDownload} className="gap-2">
          <Download className="h-4 w-4" />
          Download as HTML
        </Button>
      </div>
      
      <div ref={reportRef} className="bg-background text-foreground p-8 max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8 pb-6 border-b-2 border-primary">
          <h1 className="text-3xl font-bold tracking-tight mb-2">{report.title}</h1>
          <p className="text-sm text-muted-foreground">
            Generated {new Date(report.generatedAt).toLocaleString()} • Sources: {report.sourcesAnalyzed.join(', ')}
          </p>
        </header>

        {/* Introduction */}
        <section className="mb-8">
          <p className="text-base leading-relaxed whitespace-pre-line">{report.introduction}</p>
        </section>

        <Separator className="my-8" />

        {/* Themes */}
        {report.themes.map((theme, index) => (
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

            {/* Source Analysis */}
            <div className="bg-muted/30 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Source Comparison
              </h3>
              <div className="space-y-4">
                {theme.sourceAnalysis.map((sa, saIndex) => (
                  <div key={saIndex} className="border-l-2 border-primary/30 pl-4">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{sa.sourceName}</h4>
                      {sa.articleUrl && (
                        <a
                          href={sa.articleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          [Read Article]
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{sa.stance}</p>
                    {sa.keyQuotes.length > 0 && (
                      <div className="mt-2">
                        {sa.keyQuotes.map((quote, qi) => (
                          <blockquote key={qi} className="text-sm italic border-l-2 border-muted pl-2 my-1">
                            "{quote}"
                          </blockquote>
                        ))}
                      </div>
                    )}
                    {sa.biasIndicators.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {sa.biasIndicators.map((bias, bi) => (
                          <Badge key={bi} variant="outline" className="text-xs">
                            {bias}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Critical Commentary */}
            <div className="bg-primary/5 rounded-lg p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary mb-2">
                Critical Commentary
              </h3>
              <p className="text-sm leading-relaxed">{theme.criticalCommentary}</p>
            </div>

            {index < report.themes.length - 1 && <Separator className="mt-8" />}
          </article>
        ))}

        {/* Conclusion */}
        <Separator className="my-8" />
        <section className="bg-muted/50 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-3">Conclusion</h2>
          <p className="text-base leading-relaxed whitespace-pre-line">{report.conclusion}</p>
        </section>

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
          <p>This report was generated by VerifyNews AI analysis.</p>
          <p>Always verify critical information from primary sources.</p>
        </footer>
      </div>
    </div>
  );
}
