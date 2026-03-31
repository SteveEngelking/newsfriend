import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DailyNewsReport } from '@/lib/types';
import { DailyNewsReportView } from '@/components/DailyNewsReportView';
import { Shield, Newspaper, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface GeneratedReport {
  id: string;
  title: string;
  report_data: DailyNewsReport;
  created_at: string;
}

const Home = () => {
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [allReports, setAllReports] = useState<GeneratedReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const { t, language } = useLanguage();

  const fetchLatest = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('generated_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data && !error && data.length > 0) {
        const filtered = (data as unknown as GeneratedReport[]).filter(
          (row) => row?.report_data?.language === language
        );
        const reportList = filtered.length > 0 ? filtered : (data as unknown as GeneratedReport[]);
        setAllReports(reportList);
        setReport(reportList[0]);
      }
    } catch (err) {
      console.error('Error fetching latest report:', err);
    } finally {
      setIsLoading(false);
      setHasChecked(true);
    }
  }, [language]);

  useEffect(() => {
    if (hasChecked) fetchLatest();
  }, [language, hasChecked, fetchLatest]);

  const handleEditionChange = (reportId: string) => {
    const selected = allReports.find((r) => r.id === reportId);
    if (selected) setReport(selected);
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-0">
      {!hasChecked && !report && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">NewsFriend</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            {t('homeTagline')}
          </p>
          <Button
            size="lg"
            onClick={fetchLatest}
            disabled={isLoading}
            className="gap-2 text-base px-8 py-6"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Newspaper className="h-5 w-5" />
            )}
            {t('homeLatestNews')}
          </Button>
        </motion.div>
      )}

      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t('homeLoadingReport')}</p>
        </motion.div>
      )}

      {hasChecked && !isLoading && !report && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-4"
        >
          <Newspaper className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">{t('homeNoReports')}</h2>
          <p className="text-muted-foreground">{t('homeNoReportsDesc')}</p>
          <Button variant="outline" onClick={fetchLatest}>
            {t('homeTryAgain')}
          </Button>
        </motion.div>
      )}

      {report && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl mx-auto space-y-4"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
            <p className="text-xs text-muted-foreground">
              {t('homeGenerated')} {new Date(report.created_at).toLocaleString()}
            </p>
            {allReports.length > 1 && (
              <Select value={report.id} onValueChange={handleEditionChange}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder={t('homeSelectEdition')} />
                </SelectTrigger>
                <SelectContent>
                  {allReports.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {new Date(r.created_at).toLocaleDateString(
                        language === 'de' ? 'de-DE' : 'en-GB',
                        { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DailyNewsReportView report={report.report_data} />
          <div className="flex justify-center">
            <Button variant="outline" onClick={fetchLatest} className="gap-2">
              <Newspaper className="h-4 w-4" />
              {t('homeRefresh')}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Home;
