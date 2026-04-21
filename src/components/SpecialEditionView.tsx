import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShareButtons } from '@/components/ShareButtons';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { SpecialEditionReport } from '@/lib/specialEditionTypes';
import { Star, Lightbulb } from 'lucide-react';

interface Props {
  report: SpecialEditionReport;
}

export function SpecialEditionView({ report }: Props) {
  const { t, language } = useLanguage();

  return (
    <div className="bg-background text-foreground p-8 max-w-4xl mx-auto px-[20px] py-[20px]">
      <header className="text-center mb-8 pb-6 border-b-2 border-amber-500/60">
        <Badge className="mb-3 gap-1 bg-amber-500 hover:bg-amber-500 text-white">
          <Star className="h-3 w-3" /> {t('specialEditionBadge')}
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight mb-2">{report.headline}</h1>
        <p className="text-base text-muted-foreground italic mb-2">
          {t('specialEditionTopicLabel')}: {report.topic}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('homeGenerated')}{' '}
          {new Date(report.generatedAt).toLocaleString(language === 'de' ? 'de-DE' : 'en-GB', {
            timeZone: 'UTC',
            timeZoneName: 'short',
          })}{' '}
          • {t('dailySourcesLabel')}: {report.sourcesAnalyzed.join(', ')}
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-3">{t('specialEditionSummaryHeading')}</h2>
        <p className="text-base leading-relaxed whitespace-pre-line">{report.summary}</p>
      </section>

      <Separator className="my-8" />

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">{t('specialEditionDiscussionHeading')}</h2>
        <p className="text-base leading-relaxed whitespace-pre-line mb-6">{report.discussion}</p>

        <div className="bg-muted/30 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            {t('dailySourceComparison')}
          </h3>
          <div className="space-y-4">
            {report.sourceAnalysis.map((sa, i) => (
              <div key={i} className="border-l-2 border-amber-500/40 pl-4">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">{sa.sourceName}</h4>
                  {sa.articleUrl && (
                    <a
                      href={sa.articleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      {t('dailyReadArticle')}
                    </a>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{sa.stance}</p>
                {sa.keyQuotes?.length > 0 && (
                  <div className="mt-2">
                    {sa.keyQuotes.map((q, qi) => (
                      <blockquote key={qi} className="text-sm italic border-l-2 border-muted pl-2 my-1">
                        "{q}"
                      </blockquote>
                    ))}
                  </div>
                )}
                {sa.biasIndicators?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {sa.biasIndicators.map((b, bi) => (
                      <Badge key={bi} variant="outline" className="text-xs">
                        {b}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary/5 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-bold mb-3 text-primary uppercase tracking-wide">
          {t('dailyCriticalCommentary')}
        </h2>
        <p className="text-base leading-relaxed whitespace-pre-line">{report.criticalCommentary}</p>
      </section>

      {report.mondcivitanReflection && (
        <section className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-6 mb-8 border border-amber-200 dark:border-amber-800">
          <h2 className="text-lg font-bold mb-3 text-amber-700 dark:text-amber-400">
            ☮ {t('mondcivitanReflectionTitle')}
          </h2>
          <p className="text-base leading-relaxed text-amber-900 dark:text-amber-200 whitespace-pre-line">
            {report.mondcivitanReflection}
          </p>
        </section>
      )}

      {report.actionSteps?.length > 0 && (
        <section className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-6 mb-8 border border-emerald-200 dark:border-emerald-800">
          <h2 className="text-lg font-bold mb-3 text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <Lightbulb className="h-5 w-5" /> {t('specialEditionActionStepsHeading')}
          </h2>
          <ul className="space-y-2">
            {report.actionSteps.map((step, i) => (
              <li key={i} className="text-base leading-relaxed text-emerald-900 dark:text-emerald-200 flex gap-2">
                <span className="font-bold shrink-0">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Separator className="my-8" />
      <section className="bg-muted/50 rounded-lg p-6">
        <h2 className="text-lg font-bold mb-3">{t('dailyConclusion')}</h2>
        <p className="text-base leading-relaxed whitespace-pre-line">{report.conclusion}</p>
      </section>

      <footer className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground space-y-3">
        <p>{t('dailyFooter1')}</p>
        <p>{t('dailyFooter2')}</p>
        <div className="flex justify-center pt-2">
          <ShareButtons title={report.title} url="https://newsfriend.org" />
        </div>
      </footer>
    </div>
  );
}
