import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DailyNewsReport } from '@/lib/types';
import { DailyNewsReportView } from '@/components/DailyNewsReportView';
import { Shield, Newspaper, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface GeneratedReport {
  id: string;
  title: string;
  report_data: DailyNewsReport;
  created_at: string;
}

const Home = () => {
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const { t } = useLanguage();

  const fetchLatest = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('generated_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        setReport(data as unknown as GeneratedReport);
      }
    } catch (err) {
      console.error('Error fetching latest report:', err);
    } finally {
      setIsLoading(false);
      setHasChecked(true);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
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
          <div className="text-center mb-4">
            <p className="text-xs text-muted-foreground">
              {t('homeGenerated')} {new Date(report.created_at).toLocaleString()}
            </p>
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
