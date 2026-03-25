import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NewsSource } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Clock, Download, Trash2, CalendarClock, ExternalLink } from 'lucide-react';
import { generateDailyNewsHtml, openReportInNewTab, downloadReportHtml } from '@/lib/generateReportHtml';
import { DailyNewsReport } from '@/lib/types';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Props {
  sources: NewsSource[];
}

interface Schedule {
  id: string;
  frequency: string;
  language: 'en' | 'de';
  source_ids: string[];
  articles_per_source: number;
  enabled: boolean;
  last_run_at: string | null;
  created_at: string;
}

interface GeneratedReport {
  id: string;
  schedule_id: string;
  title: string;
  report_data: DailyNewsReport;
  created_at: string;
}

export function ScheduleManager({ sources }: Props) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [frequency, setFrequency] = useState('daily');
  const [outputLanguage, setOutputLanguage] = useState<'en' | 'de'>('en');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const loadData = useCallback(async () => {
    const [schedRes, repRes] = await Promise.all([
      supabase.from('report_schedules').select('*').limit(1).single(),
      supabase.from('generated_reports').select('*').order('created_at', { ascending: false }).limit(20),
    ]);

    if (schedRes.data) {
      const sched = schedRes.data as Schedule;
      setSchedule(sched);
      setFrequency(sched.frequency);
      setOutputLanguage(sched.language || language);
    } else {
      setOutputLanguage(language);
    }
    if (repRes.data) setReports(repRes.data as unknown as GeneratedReport[]);
  }, [language]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!schedule) return;
    const enabledIds = sources.filter(s => s.enabled).map(s => s.id);
    const same = enabledIds.length === schedule.source_ids.length && enabledIds.every(id => schedule.source_ids.includes(id));
    if (!same && enabledIds.length > 0) {
      supabase.from('report_schedules').update({ source_ids: enabledIds }).eq('id', schedule.id).then(() => loadData());
    }
  }, [sources, schedule, loadData]);

  const handleSaveSchedule = async () => {
    const enabledSources = sources.filter(s => s.enabled);
    if (enabledSources.length === 0) {
      toast({ title: t('scheduleNoSources'), description: t('scheduleNoSourcesDesc'), variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const sourceIds = enabledSources.map(s => s.id);

    if (schedule) {
      const { error } = await supabase
        .from('report_schedules')
        .update({ frequency, language: language, source_ids: sourceIds, enabled: true } as any)
        .eq('id', schedule.id);
      if (error) {
        toast({ title: t('sourceError'), description: t('scheduleUpdateFailed'), variant: 'destructive' });
      } else {
        toast({ title: t('scheduleUpdated') });
        loadData();
      }
    } else {
      const { error } = await supabase
        .from('report_schedules')
        .insert({ frequency, language: language, source_ids: sourceIds, articles_per_source: 8, enabled: true } as any);
      if (error) {
        toast({ title: t('sourceError'), description: t('scheduleCreateFailed'), variant: 'destructive' });
      } else {
        toast({ title: t('scheduleCreated') });
        loadData();
      }
    }
    setIsLoading(false);
  };

  const handleToggleSchedule = async () => {
    if (!schedule) return;
    const { error } = await supabase
      .from('report_schedules')
      .update({ enabled: !schedule.enabled })
      .eq('id', schedule.id);
    if (!error) loadData();
  };

  const handleDeleteReport = async (id: string) => {
    await supabase.from('generated_reports').delete().eq('id', id);
    setReports(prev => prev.filter(r => r.id !== id));
  };

  const getReportHtml = (report: GeneratedReport) => {
    const reportLanguage = (report.report_data as any)?.language === 'de' ? 'de' : outputLanguage;
    return generateDailyNewsHtml(report.report_data as unknown as DailyNewsReport, reportLanguage);
  };

  const handleDownloadReport = (report: GeneratedReport) => {
    downloadReportHtml(getReportHtml(report), report.title || 'scheduled-report');
  };

  const handleViewReport = (report: GeneratedReport) => {
    openReportInNewTab(getReportHtml(report));
  };

  const frequencyLabelKey: Record<string, string> = {
    immediate: 'scheduleImmediate',
    hourly: 'scheduleHourly',
    every_6_hours: 'scheduleEvery6h',
    every_12_hours: 'scheduleEvery12h',
    daily: 'scheduleDaily',
    every_other_day: 'scheduleEveryOtherDay',
    weekly: 'scheduleWeekly',
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            {t('scheduleTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">{t('scheduleImmediate')}</SelectItem>
                <SelectItem value="hourly">{t('scheduleHourly')}</SelectItem>
                <SelectItem value="every_6_hours">{t('scheduleEvery6h')}</SelectItem>
                <SelectItem value="every_12_hours">{t('scheduleEvery12h')}</SelectItem>
                <SelectItem value="daily">{t('scheduleDaily')}</SelectItem>
                <SelectItem value="every_other_day">{t('scheduleEveryOtherDay')}</SelectItem>
                <SelectItem value="weekly">{t('scheduleWeekly')}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSaveSchedule} disabled={isLoading} size="sm">
              {schedule ? t('scheduleUpdate') : t('scheduleCreate')}
            </Button>
            {schedule && (
              <div className="flex items-center gap-2">
                <Switch checked={schedule.enabled} onCheckedChange={handleToggleSchedule} />
                <span className="text-sm text-muted-foreground">
                  {schedule.enabled ? t('scheduleActive') : t('schedulePaused')}
                </span>
              </div>
            )}
          </div>
          {schedule && (
            <p className="text-xs text-muted-foreground">
              <Clock className="inline h-3 w-3 mr-1" />
              {t((frequencyLabelKey[schedule.frequency] || 'scheduleDaily') as any)} • {t('scheduleUsingSources')} {schedule.source_ids.length} {t('scheduleSources')}
              {schedule.last_run_at && ` • ${t('scheduleLastRun')} ${new Date(schedule.last_run_at).toLocaleString()}`}
            </p>
          )}
        </CardContent>
      </Card>

      {reports.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('schedulePastReports')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reports.map(report => (
                <div key={report.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{report.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(report.created_at).toLocaleString()}
                      {' • '}
                      {(report.report_data as any)?.themes?.length || 0} {t('scheduleThemes')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewReport(report)}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadReport(report)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteReport(report.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
