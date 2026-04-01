import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DailyNewsReport } from '@/lib/types';
import { DailyNewsReportView } from '@/components/DailyNewsReportView';
import { Newspaper, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import logo from '@/assets/logo.jpg';

interface GeneratedReport {
  id: string;
  title: string;
  report_data: DailyNewsReport;
  created_at: string;
}

const Home = () => {
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const { t, language } = useLanguage();

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('generated_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data && !error && data.length > 0) {
        const typed = data as unknown as GeneratedReport[];
        // Filter to only show reports matching current UI language
        const filtered = typed.filter(r => r.report_data?.language === language);
        setReports(filtered.length > 0 ? filtered : typed);
        if (filtered.length > 0) {
          setSelectedId(filtered[0].id);
        } else {
          setSelectedId(typed[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setIsLoading(false);
      setHasChecked(true);
    }
  }, [language]);

  useEffect(() => {
    if (hasChecked) fetchReports();
  }, [language, hasChecked, fetchReports]);

  const selectedReport = reports.find(r => r.id === selectedId) || null;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-0">
      {!hasChecked && !selectedReport && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={logo} alt="NewsFriend" className="h-10 w-10 rounded" />
            <h1 className="text-4xl font-bold tracking-tight">NewsFriend</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            {t('homeTagline')}
          </p>
          <Button
            size="lg"
            onClick={fetchReports}
            disabled={isLoading}
            className="gap-2 text-base px-8 py-6"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Newspaper className="h-5 w-5" />}
            {t('homeLatestNews')}
          </Button>
        </motion.div>
      )}

      {isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t('homeLoadingReport')}</p>
        </motion.div>
      )}

      {hasChecked && !isLoading && reports.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
          <Newspaper className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">{t('homeNoReports')}</h2>
          <p className="text-muted-foreground">{t('homeNoReportsDesc')}</p>
          <Button variant="outline" onClick={fetchReports}>{t('homeTryAgain')}</Button>
        </motion.div>
      )}

      {selectedReport && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl mx-auto space-y-4"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
            <Select value={selectedId || ''} onValueChange={setSelectedId}>
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue placeholder={t('homePreviousEditions')} />
              </SelectTrigger>
              <SelectContent>
                {reports.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {new Date(r.created_at).toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchReports} className="gap-2" size="sm">
              <Newspaper className="h-4 w-4" />
              {t('homeRefresh')}
            </Button>
          </div>
          <DailyNewsReportView report={selectedReport.report_data} />
        </motion.div>
      )}
    </div>
  );
};

export default Home;
