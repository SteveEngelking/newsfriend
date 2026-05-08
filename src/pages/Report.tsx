import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DailyNewsReport } from '@/lib/types';
import { DailyNewsReportView } from '@/components/DailyNewsReportView';
import { SEO } from '@/components/SEO';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShareButtons } from '@/components/ShareButtons';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const Report = () => {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<DailyNewsReport | null>(null);
  const [meta, setMeta] = useState<{ title: string; created_at: string; language: string } | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const { t, language: uiLang } = useLanguage();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setTranslating(false);
      setIsRegenerating(false);
      const { data, error } = await supabase
        .from('generated_reports')
        .select('title, created_at, language, report_data')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const srcLang = data.language || 'en';
      setSourceLanguage(srcLang);
      // Same language as UI → render as-is
      if (srcLang === uiLang) {
        setReport(data.report_data as unknown as DailyNewsReport);
        setMeta({ title: data.title, created_at: data.created_at, language: srcLang });
        setLoading(false);
        return;
      }

      // Different language → check cache, else translate
      const { data: cached } = await supabase
        .from('report_translations')
        .select('title, report_data')
        .eq('report_id', id)
        .eq('language', uiLang)
        .maybeSingle();
      if (cancelled) return;

      if (cached) {
        setReport(cached.report_data as unknown as DailyNewsReport);
        setMeta({ title: cached.title, created_at: data.created_at, language: uiLang });
        setLoading(false);
        return;
      }

      // Need to translate
      setLoading(false);
      setTranslating(true);
      const { data: tr, error: trErr } = await supabase.functions.invoke('translate-report', {
        body: { reportId: id, language: uiLang },
      });
      if (cancelled) return;
      if (trErr || !tr?.report_data) {
        // Fall back to source language
        setReport(data.report_data as unknown as DailyNewsReport);
        setMeta({ title: data.title, created_at: data.created_at, language: srcLang });
      } else {
        setReport(tr.report_data as DailyNewsReport);
        setMeta({ title: tr.title, created_at: data.created_at, language: uiLang });
      }
      setTranslating(false);
    })();
    return () => { cancelled = true; };
  }, [id, uiLang]);

  const handleRegenerate = async () => {
    if (!id || !meta) return;
    setIsRegenerating(true);
    try {
      const { data: tr, error: trErr } = await supabase.functions.invoke('translate-report', {
        body: { reportId: id, language: uiLang, force: true },
      });
      if (trErr || !tr?.report_data) {
        console.error('Regenerate translation failed', trErr);
      } else {
        setReport(tr.report_data as DailyNewsReport);
        setMeta({ title: tr.title, created_at: meta.created_at, language: uiLang });
      }
    } finally {
      setIsRegenerating(false);
    }
  };

  if (loading || translating || isRegenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {(translating || isRegenerating) && (
          <p className="text-sm text-muted-foreground">
            {uiLang === 'de' ? 'Übersetze Bericht…' : 'Translating report…'}
          </p>
        )}
      </div>
    );
  }

  if (notFound || !report || !meta) {
    return (
      <div className="text-center py-16 space-y-4">
        <h1 className="text-2xl font-semibold">Report not found</h1>
        <Button asChild variant="outline">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Back to home</Link>
        </Button>
      </div>
    );
  }

  const lang = (meta.language === 'de' ? 'de' : 'en') as 'en' | 'de';
  const canonicalPath = `/report/${id}`;

  return (
    <div className="flex flex-col items-center px-0 pt-2">
      <SEO
        title={meta.title}
        description={(report.introduction || '').slice(0, 200)}
        path={canonicalPath}
        type="article"
        lang={lang}
        image={report.bannerImageUrl}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: meta.title,
          datePublished: meta.created_at,
          dateModified: meta.created_at,
          inLanguage: lang,
          image: report.bannerImageUrl ? [report.bannerImageUrl] : undefined,
          publisher: {
            '@type': 'Organization',
            name: 'NewsFriend',
            logo: { '@type': 'ImageObject', url: 'https://www.newsfriend.org/favicon.jpg' },
          },
          mainEntityOfPage: `https://www.newsfriend.org${canonicalPath}`,
        }}
      />
      <div className="w-full max-w-4xl mx-auto space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />{t('homeRefresh') ? 'Home' : 'Home'}</Link>
          </Button>
          <ShareButtons url={`https://www.newsfriend.org/report/${id}`} />
        </div>
        <DailyNewsReportView report={report} reportId={id} />
      </div>
    </div>
  );
};

export default Report;
