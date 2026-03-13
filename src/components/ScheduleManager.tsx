import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NewsSource, DailyNewsReport } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Clock, Download, Trash2, CalendarClock, ExternalLink } from 'lucide-react';
import { generateDailyNewsHtml, openReportInNewTab, downloadReportHtml } from '@/lib/generateReportHtml';
import { DailyNewsReport } from '@/lib/types';

interface Props {
  sources: NewsSource[];
}

interface Schedule {
  id: string;
  frequency: string;
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
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    const [schedRes, repRes] = await Promise.all([
      supabase.from('report_schedules').select('*').limit(1).single(),
      supabase.from('generated_reports').select('*').order('created_at', { ascending: false }).limit(20),
    ]);

    if (schedRes.data) setSchedule(schedRes.data as Schedule);
    if (repRes.data) setReports(repRes.data as unknown as GeneratedReport[]);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-update schedule source_ids when enabled sources change
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
      toast({ title: 'No sources selected', description: 'Enable at least one source first.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const sourceIds = enabledSources.map(s => s.id);

    if (schedule) {
      const { error } = await supabase
        .from('report_schedules')
        .update({ frequency, source_ids: sourceIds, enabled: true })
        .eq('id', schedule.id);
      if (error) {
        toast({ title: 'Error', description: 'Failed to update schedule', variant: 'destructive' });
      } else {
        toast({ title: 'Schedule updated' });
        loadData();
      }
    } else {
      const { error } = await supabase
        .from('report_schedules')
        .insert({ frequency, source_ids: sourceIds, articles_per_source: 8, enabled: true });
      if (error) {
        toast({ title: 'Error', description: 'Failed to create schedule', variant: 'destructive' });
      } else {
        toast({ title: 'Schedule created' });
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
    return generateDailyNewsHtml(report.report_data as unknown as DailyNewsReport);
  };

  const handleDownloadReport = (report: GeneratedReport) => {
    downloadReportHtml(getReportHtml(report), report.title || 'scheduled-report');
  };

  const handleViewReport = (report: GeneratedReport) => {
    openReportInNewTab(getReportHtml(report));
  };

  const frequencyLabel: Record<string, string> = {
    hourly: 'Hourly',
    daily: 'Daily',
    every_other_day: 'Every Other Day',
    weekly: 'Weekly',
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Scheduled Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="every_other_day">Every Other Day</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSaveSchedule} disabled={isLoading} size="sm">
              {schedule ? 'Update Schedule' : 'Create Schedule'}
            </Button>
            {schedule && (
              <div className="flex items-center gap-2">
                <Switch checked={schedule.enabled} onCheckedChange={handleToggleSchedule} />
                <span className="text-sm text-muted-foreground">
                  {schedule.enabled ? 'Active' : 'Paused'}
                </span>
              </div>
            )}
          </div>
          {schedule && (
            <p className="text-xs text-muted-foreground">
              <Clock className="inline h-3 w-3 mr-1" />
              {frequencyLabel[schedule.frequency]} • Using {schedule.source_ids.length} sources
              {schedule.last_run_at && ` • Last run: ${new Date(schedule.last_run_at).toLocaleString()}`}
            </p>
          )}
        </CardContent>
      </Card>

      {reports.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Past Reports</CardTitle>
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
                      {(report.report_data as any)?.themes?.length || 0} themes
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
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

      {/* Hidden render target for PDF generation */}
      {previewReport && (
        <div className="fixed left-[-9999px] top-0" id="schedule-report-preview">
          <DailyNewsReportView report={previewReport} />
        </div>
      )}
    </div>
  );
}
