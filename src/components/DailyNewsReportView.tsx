import { useRef, useState, useEffect } from 'react';
import { DailyNewsReport } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { generateDailyNewsHtml, openReportInNewTab, downloadReportHtml } from '@/lib/generateReportHtml';
import { getLogoDataUri } from '@/lib/logoDataUri';
import { Download, ExternalLink, Share2 } from 'lucide-react';
import { ShareButtons } from '@/components/ShareButtons';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { MondcivitanLikeButton } from '@/components/MondcivitanLikeButton';

interface Props {
  report: DailyNewsReport;
  reportId?: string;
}

interface EthicalPerspective {
  id: string;
  name: string;
  icon: string;
  color_bg: string;
  color_border: string;
  color_heading: string;
  color_text: string;
}

// Map old fixed field keys to perspective names for backward compatibility
const LEGACY_FIELD_MAP: Record<string, string> = {
  schweitzerEthical: 'Albert Schweitzer',
  ethicalJesus: 'Jesus of Nazareth',
  ethicalCovey: 'Stephen R. Covey',
  ethicalGandhi: 'Mahatma Gandhi',
  ethicalBuddha: 'Buddha',
  ethicalMohammed: 'Prophet Mohammed',
  ethicalTorah: 'Torah',
  ethicalOshi: 'Oshi',
  ethicalRajneesh: 'Bhagwan Shree Rajneesh',
  ethicalGita: 'Bhagavad Gita',
};

const LEGACY_STYLES: Record<string, { icon: string; bg: string; border: string; heading: string; text: string }> = {
  schweitzerEthical: { icon: '🌿', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', heading: 'text-emerald-700 dark:text-emerald-400', text: 'text-emerald-900 dark:text-emerald-200' },
  ethicalJesus: { icon: '✝', bg: 'bg-sky-50 dark:bg-sky-950/30', border: 'border-sky-200 dark:border-sky-800', heading: 'text-sky-700 dark:text-sky-400', text: 'text-sky-900 dark:text-sky-200' },
  ethicalCovey: { icon: '🧭', bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-200 dark:border-indigo-800', heading: 'text-indigo-700 dark:text-indigo-400', text: 'text-indigo-900 dark:text-indigo-200' },
  ethicalGandhi: { icon: '☸', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800', heading: 'text-orange-700 dark:text-orange-400', text: 'text-orange-900 dark:text-orange-200' },
  ethicalBuddha: { icon: '🪷', bg: 'bg-yellow-50 dark:bg-yellow-950/30', border: 'border-yellow-200 dark:border-yellow-800', heading: 'text-yellow-700 dark:text-yellow-400', text: 'text-yellow-900 dark:text-yellow-200' },
  ethicalMohammed: { icon: '☪', bg: 'bg-teal-50 dark:bg-teal-950/30', border: 'border-teal-200 dark:border-teal-800', heading: 'text-teal-700 dark:text-teal-400', text: 'text-teal-900 dark:text-teal-200' },
  ethicalTorah: { icon: '✡', bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200 dark:border-violet-800', heading: 'text-violet-700 dark:text-violet-400', text: 'text-violet-900 dark:text-violet-200' },
  ethicalOshi: { icon: '⛩', bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-800', heading: 'text-rose-700 dark:text-rose-400', text: 'text-rose-900 dark:text-rose-200' },
  ethicalRajneesh: { icon: '🪷', bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/30', border: 'border-fuchsia-200 dark:border-fuchsia-800', heading: 'text-fuchsia-700 dark:text-fuchsia-400', text: 'text-fuchsia-900 dark:text-fuchsia-200' },
  ethicalGita: { icon: '🙏', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', heading: 'text-amber-700 dark:text-amber-400', text: 'text-amber-900 dark:text-amber-200' },
};

export function DailyNewsReportView({ report, reportId }: Props) {
  const reportRef = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();
  const [perspectives, setPerspectives] = useState<EthicalPerspective[]>([]);

  useEffect(() => {
    supabase.from('ethical_perspectives').select('id, name, icon, color_bg, color_border, color_heading, color_text')
      .order('sort_order').then(({ data }) => { if (data) setPerspectives(data as unknown as EthicalPerspective[]); });
  }, []);

  const handleDownload = async () => {
    const logo = await getLogoDataUri();
    downloadReportHtml(generateDailyNewsHtml(report, language, logo), 'news-of-the-day');
  };

  const handleOpenInNewTab = async () => {
    const logo = await getLogoDataUri();
    openReportInNewTab(generateDailyNewsHtml(report, language, logo));
  };

  const getSignificanceBadge = (significance: string) => {
    const variants: Record<string, 'destructive' | 'default' | 'secondary'> = { high: 'destructive', medium: 'default', low: 'secondary' };
    return variants[significance] || 'secondary';
  };

  // Build ethical considerations from new format or legacy fields
  const ethicalItems: { name: string; icon: string; content: string; bgClass: string; borderClass: string; headingClass: string; textClass: string; customBg?: string; customBorder?: string; customHeading?: string; customText?: string }[] = [];

  // New dynamic format
  if (Array.isArray(report.ethicalConsiderations) && report.ethicalConsiderations.length > 0) {
    for (const ec of report.ethicalConsiderations) {
      const p = perspectives.find(pp => pp.id === ec.id || pp.name === ec.name);
      ethicalItems.push({
        name: ec.name,
        icon: p?.icon || '🌿',
        content: ec.content,
        bgClass: p ? '' : 'bg-muted/30',
        borderClass: p ? '' : 'border-border',
        headingClass: p ? '' : 'text-foreground',
        textClass: p ? '' : 'text-foreground',
        customBg: p?.color_bg,
        customBorder: p?.color_border,
        customHeading: p?.color_heading,
        customText: p?.color_text,
      });
    }
  } else {
    // Legacy fixed fields
    for (const [key, name] of Object.entries(LEGACY_FIELD_MAP)) {
      const content = (report as any)[key];
      if (content) {
        const style = LEGACY_STYLES[key];
        ethicalItems.push({
          name,
          icon: style?.icon || '🌿',
          content,
          bgClass: style?.bg || 'bg-muted/30',
          borderClass: style?.border || 'border-border',
          headingClass: style?.heading || 'text-foreground',
          textClass: style?.text || 'text-foreground',
        });
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-2">
        <Button onClick={handleOpenInNewTab} variant="outline" className="gap-2">
          <ExternalLink className="h-4 w-4" /> {t('dailyOpenNewTab')}
        </Button>
        <Button onClick={handleDownload} className="gap-2">
          <Download className="h-4 w-4" /> {t('dailyDownloadHtml')}
        </Button>
      </div>
      
      <div ref={reportRef} className="bg-background text-foreground p-8 max-w-4xl mx-auto px-[20px] py-[20px]">
        <header className="text-center mb-6 pb-6 border-b-2 border-primary">
          <h1 className="text-3xl font-bold tracking-tight mb-2">{report.title}</h1>
          <p className="text-sm text-muted-foreground">
            {t('homeGenerated')} {new Date(report.generatedAt).toLocaleString(language === 'de' ? 'de-DE' : 'en-GB', { timeZone: 'UTC', timeZoneName: 'short' })} • {t('dailySourcesLabel')}: {report.sourcesAnalyzed.join(', ')}
          </p>
        </header>

        {report.bannerImageUrl && (
          <div className="mb-8 -mx-[20px] sm:mx-0 overflow-hidden sm:rounded-lg">
            <img
              src={report.bannerImageUrl}
              alt=""
              className="w-full aspect-[16/9] object-cover"
              loading="lazy"
            />
          </div>
        )}

        <section className="mb-8">
          <p className="text-base leading-relaxed whitespace-pre-line">{report.introduction}</p>
        </section>

        <Separator className="my-8" />

        {report.themes.map((theme, index) => (
          <article key={theme.id} className="mb-10">
            <header className="mb-4">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-bold leading-tight">
                  <span className="text-primary mr-2">{index + 1}.</span>
                  {theme.headline}
                </h2>
                <Badge variant={getSignificanceBadge(theme.significance)} className="shrink-0">{theme.significance}</Badge>
              </div>
              <p className="mt-2 text-muted-foreground leading-relaxed">{theme.summary}</p>
            </header>

            <div className="bg-muted/30 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t('dailySourceComparison')}</h3>
              <div className="space-y-4">
                {theme.sourceAnalysis.map((sa, saIndex) => (
                  <div key={saIndex} className="border-l-2 border-primary/30 pl-4">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{sa.sourceName}</h4>
                      {sa.articleUrl && <a href={sa.articleUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">{t('dailyReadArticle')}</a>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{sa.stance}</p>
                    {sa.keyQuotes.length > 0 && <div className="mt-2">{sa.keyQuotes.map((quote, qi) => <blockquote key={qi} className="text-sm italic border-l-2 border-muted pl-2 my-1">"{quote}"</blockquote>)}</div>}
                    {sa.biasIndicators.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{sa.biasIndicators.map((bias, bi) => <Badge key={bi} variant="outline" className="text-xs">{bias}</Badge>)}</div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-primary/5 rounded-lg p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary mb-2">{t('dailyCriticalCommentary')}</h3>
              <p className="text-sm leading-relaxed">{theme.criticalCommentary}</p>
            </div>

            {theme.mondcivitanReflection && (
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 mt-4 border border-amber-200 dark:border-amber-800">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-2">☮ {t('mondcivitanReflectionTitle')}</h3>
                <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-200">{theme.mondcivitanReflection}</p>
                {reportId && <MondcivitanLikeButton reportId={reportId} themeId={theme.id} />}
              </div>
            )}

            {index < report.themes.length - 1 && <Separator className="mt-8" />}
          </article>
        ))}

        <Separator className="my-8" />
        <section className="bg-muted/50 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-3">{t('dailyConclusion')}</h2>
          <p className="text-base leading-relaxed whitespace-pre-line">{report.conclusion}</p>
        </section>

        {ethicalItems.length > 0 && (
          <>
            <h2 className="text-xl font-bold mt-8 mb-2">{t('ethicalConsiderationsHeading')}</h2>
            {ethicalItems.map((item, idx) => (
              <section key={idx} className={`${item.customBg ? '' : item.bgClass} rounded-lg p-6 mt-4 border ${item.customBorder ? '' : item.borderClass}`}
                style={item.customBg ? { backgroundColor: item.customBg, borderColor: item.customBorder } : undefined}>
                <h3 className={`text-lg font-bold mb-3 ${item.customHeading ? '' : item.headingClass}`}
                  style={item.customHeading ? { color: item.customHeading } : undefined}>
                  {item.icon} {item.name}
                </h3>
                <p className={`text-base leading-relaxed whitespace-pre-line ${item.customText ? '' : item.textClass}`}
                  style={item.customText ? { color: item.customText } : undefined}>
                  {item.content}
                </p>
              </section>
            ))}
          </>
        )}

        <footer className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground space-y-3">
          <p>{t('dailyFooter1')}</p>
          <p>{t('dailyFooter2')}</p>
          <div className="flex justify-center pt-2">
            <ShareButtons title={report.title} url="https://newsfriend.org" />
          </div>
        </footer>
      </div>
    </div>
  );
}
