import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DailyNewsReport } from '@/lib/types';
import { DailyNewsReportView } from '@/components/DailyNewsReportView';
import { SpecialEditionView } from '@/components/SpecialEditionView';
import { SpecialEditionReport } from '@/lib/specialEditionTypes';
import { Newspaper, Loader2, Bell, ArrowRight, Star } from 'lucide-react';
import { ShareButtons } from '@/components/ShareButtons';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import logo from '@/assets/logo.jpg';
import { SEO } from '@/components/SEO';

interface ReportListItem {
  id: string;
  title: string;
  created_at: string;
}

interface SpecialEditionListItem {
  id: string;
  topic: string;
  approved_at: string | null;
}

const Home = () => {
  const [reportList, setReportList] = useState<ReportListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<DailyNewsReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [specialEditions, setSpecialEditions] = useState<SpecialEditionListItem[]>([]);
  const [selectedSpecialId, setSelectedSpecialId] = useState<string | null>(null);
  const [selectedSpecial, setSelectedSpecial] = useState<SpecialEditionReport | null>(null);
  const { t, language } = useLanguage();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Lightweight list fetch — no report_data
  const fetchList = useCallback(async (preserveSelection = true) => {
    try {
      const { data, error } = await supabase
        .from('generated_reports')
        .select('id, title, created_at, language')
        .eq('language', language)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error || !data) {
        setReportList([]);
        setSelectedId(null);
        setSelectedReport(null);
        return;
      }

      const list = data.map((r: any) => ({
        id: r.id,
        title: r.title,
        created_at: r.created_at,
      }));

      setReportList(list);
      if (list.length === 0) {
        setSelectedId(null);
        setSelectedReport(null);
        return;
      }

      setSelectedId(prev => {
        if (preserveSelection && prev && list.some((report) => report.id === prev)) {
          return prev;
        }

        return list[0].id;
      });
    } catch (err) {
      console.error('Error fetching report list:', err);
      setReportList([]);
      setSelectedId(null);
      setSelectedReport(null);
    } finally {
      setIsLoading(false);
    }
  }, [language]);

  // Fetch full report data for selected report only
  const fetchFullReport = useCallback(async (id: string) => {
    setIsLoadingReport(true);
    try {
      const { data, error } = await supabase
        .from('generated_reports')
        .select('report_data')
        .eq('id', id)
        .single();

      if (data && !error) {
        setSelectedReport(data.report_data as unknown as DailyNewsReport);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setIsLoadingReport(false);
    }
  }, []);

  // Auto-fetch list on mount
  useEffect(() => { fetchList(); }, [fetchList]);

  // Re-fetch list when language changes — reset selection so new language's report loads
  useEffect(() => {
    setSelectedReport(null);
    setIsLoading(true);
    fetchList(false);
  }, [language, fetchList]);

  // Fetch full report when selection changes
  useEffect(() => {
    if (selectedId) fetchFullReport(selectedId);
  }, [selectedId, fetchFullReport]);

  // Auto-refresh list every 2 minutes
  useEffect(() => {
    const interval = setInterval(fetchList, 120000);
    return () => clearInterval(interval);
  }, [fetchList]);

  // Fetch approved special editions for current language
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('special_editions')
        .select('id, topic, approved_at, language')
        .eq('status', 'approved')
        .eq('language', language)
        .order('approved_at', { ascending: false })
        .limit(20);
      if (cancelled) return;
      setSpecialEditions((data || []).map((r: any) => ({ id: r.id, topic: r.topic, approved_at: r.approved_at })));
    })();
    return () => { cancelled = true; };
  }, [language]);

  // Honour deep-link from email: /?se=<id> selects a specific special edition
  // and switches the UI language to match the edition.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const seId = params.get('se');
    if (!seId) return;
    setSelectedSpecialId(seId);
    // Scroll to the special editions panel on next paint
    setTimeout(() => {
      document.getElementById('special-editions')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  }, []);

  // Fetch selected special edition full data
  useEffect(() => {
    if (!selectedSpecialId) { setSelectedSpecial(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('special_editions')
        .select('report_data')
        .eq('id', selectedSpecialId)
        .maybeSingle();
      if (cancelled) return;
      setSelectedSpecial(data?.report_data ? (data.report_data as unknown as SpecialEditionReport) : null);
    })();
    return () => { cancelled = true; };
  }, [selectedSpecialId]);

  const handleSelectReport = (id: string) => {
    setSelectedId(id);
  };

  const seoTitle = language === 'de'
    ? 'NewsFriend — KI-gestützte Nachrichtenanalyse & Faktencheck'
    : 'NewsFriend — AI-powered news analysis & fact-checking';
  const seoDesc = language === 'de'
    ? 'Kostenlose tägliche Nachrichtenberichte, synthetisiert aus mehreren internationalen Quellen, mit Faktencheck und ethischer Reflexion. Vom Hugh & Helene Schonfield World Service Trust.'
    : 'Free daily news reports synthesised from multiple international sources, with fact-checking and ethical reflection. By the Hugh & Helene Schonfield World Service Trust.';

  return (
    <div className="flex flex-col items-center px-0 pt-2">
      <SEO
        title={seoTitle}
        description={seoDesc}
        path="/"
        lang={language as 'en' | 'de'}
        jsonLd={selectedReport ? {
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: selectedReport.title || (language === 'de' ? 'Tägliche Nachrichten' : 'Daily News'),
          datePublished: (selectedReport as any).generated_at || new Date().toISOString(),
          inLanguage: language,
          publisher: {
            '@type': 'Organization',
            name: 'NewsFriend',
            logo: { '@type': 'ImageObject', url: 'https://www.newsfriend.org/favicon.jpg' },
          },
          mainEntityOfPage: 'https://www.newsfriend.org/',
        } : undefined}
      />
      {isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t('homeLoadingReport')}</p>
        </motion.div>
      )}

      {!isLoading && reportList.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={logo} alt="NewsFriend" className="h-10 w-10 rounded" />
            <h1 className="text-4xl font-bold tracking-tight">NewsFriend</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">{t('homeTagline')}</p>
          <Newspaper className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">{t('homeNoReports')}</h2>
          <p className="text-muted-foreground">{t('homeNoReportsDesc')}</p>
          <Button variant="outline" onClick={() => fetchList(false)}>{t('homeTryAgain')}</Button>
        </motion.div>
      )}

      {!isLoading && reportList.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl mx-auto space-y-4"
        >
          {!isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/15 p-2.5 shrink-0">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg leading-tight">{t('homeSignupCtaTitle')}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{t('homeSignupCtaDesc')}</p>
                  </div>
                </div>
                <Button asChild size="lg" className="w-full sm:w-auto shrink-0 gap-2 font-semibold">
                  <Link to="/register">
                    {t('homeSignupCtaButton')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
            <Select value={selectedId || ''} onValueChange={handleSelectReport}>
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue placeholder={t('homePreviousEditions')} />
              </SelectTrigger>
              <SelectContent>
                {reportList.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {new Date(r.created_at).toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => fetchList(false)} className="gap-2" size="sm">
              <Newspaper className="h-4 w-4" />
              {t('homeRefresh')}
            </Button>
          </div>
          <div className="flex justify-center">
            <ShareButtons url="https://newsfriend.org" />
          </div>
          {specialEditions.length > 0 && (
            <div id="special-editions" className="rounded-xl border-2 border-amber-500/40 bg-amber-500/5 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Star className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold text-base sm:text-lg">{t('homeSpecialEditionsTitle')}</h3>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={selectedSpecialId || ''} onValueChange={(v) => setSelectedSpecialId(v)}>
                  <SelectTrigger className="w-full sm:w-96">
                    <SelectValue placeholder={t('homeSpecialEditionsTitle')} />
                  </SelectTrigger>
                  <SelectContent>
                    {specialEditions.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.topic}{s.approved_at ? ` — ${new Date(s.approved_at).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-GB')}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSpecialId && (
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedSpecialId(null); setSelectedSpecial(null); }}>
                    ✕
                  </Button>
                )}
              </div>
            </div>
          )}
          {selectedSpecial ? (
            <SpecialEditionView report={selectedSpecial} />
          ) : isLoadingReport ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedReport ? (
            <DailyNewsReportView report={selectedReport} reportId={selectedId ?? undefined} />
          ) : null}
        </motion.div>
      )}
    </div>
  );
};

export default Home;
