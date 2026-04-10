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

interface ReportListItem {
  id: string;
  title: string;
  created_at: string;
}

const Home = () => {
  const [reportList, setReportList] = useState<ReportListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<DailyNewsReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const { t, language } = useLanguage();

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

  const handleSelectReport = (id: string) => {
    setSelectedId(id);
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-0">
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
          <Button variant="outline" onClick={fetchList}>{t('homeTryAgain')}</Button>
        </motion.div>
      )}

      {!isLoading && reportList.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl mx-auto space-y-4"
        >
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
            <Button variant="outline" onClick={fetchList} className="gap-2" size="sm">
              <Newspaper className="h-4 w-4" />
              {t('homeRefresh')}
            </Button>
          </div>
          {isLoadingReport ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedReport ? (
            <DailyNewsReportView report={selectedReport} />
          ) : null}
        </motion.div>
      )}
    </div>
  );
};

export default Home;
