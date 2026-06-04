import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, Clock, Mail, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ScheduleStatus {
  id: string;
  language: string;
  frequency: string;
  enabled: boolean;
  schedule_hour_utc: number | null;
  last_run_at: string | null;
  next_run_at: string;
  latest_reports: Record<string, { id: string; title: string; created_at: string; language: string }>;
  email_counts: { sent: number; failed: number; pending: number; dlq: number; suppressed: number; bounced: number; other: number };
  email_failures: { recipient: string; status: string; error: string | null; at: string }[];
  email_total: number;
}

interface StatusResponse {
  cron: { jobname: string; schedule: string; next_run_at: string; server_time: string };
  schedules: ScheduleStatus[];
}

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC';
};

const minutesAgo = (iso: string | null) => {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

export function SchedulerStatusPanel() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');
      const { data: res, error: err } = await supabase.functions.invoke('scheduler-status', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (err) throw err;
      setData(res as StatusResponse);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const triggerNow = async (scheduleId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');
      toast({ title: 'Triggering report…', description: 'This can take several minutes.' });
      const { error: err } = await supabase.functions.invoke('generate-scheduled-report', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { scheduleId, force: true },
      });
      if (err) throw err;
      toast({ title: 'Report generation triggered' });
      load();
    } catch (e: any) {
      toast({ title: 'Failed to trigger', description: e?.message, variant: 'destructive' });
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Failed to load status</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Scheduler status</h3>
          <p className="text-sm text-muted-foreground">
            Server time: {fmtDate(data.cron.server_time)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Cron job
          </CardTitle>
          <CardDescription>{data.cron.jobname} — schedule <code className="text-xs">{data.cron.schedule}</code></CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div>Next tick: <span className="font-medium">{fmtDate(data.cron.next_run_at)}</span></div>
        </CardContent>
      </Card>

      {data.schedules.map((s) => {
        const ranRecently = s.last_run_at && Date.now() - new Date(s.last_run_at).getTime() < 26 * 3600_000;
        const reports = Object.values(s.latest_reports);
        const reportFresh = reports.some(r => s.last_run_at && Math.abs(new Date(r.created_at).getTime() - new Date(s.last_run_at).getTime()) < 30 * 60_000);
        const { sent, failed, dlq, pending, bounced, suppressed } = s.email_counts;
        const emailIssue = failed + dlq + bounced > 0;
        return (
          <Card key={s.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Schedule {s.frequency}
                    <Badge variant={s.enabled ? 'default' : 'secondary'}>
                      {s.enabled ? 'enabled' : 'disabled'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Runs daily at {s.schedule_hour_utc ?? '—'}:00 UTC
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => triggerNow(s.id)}>
                  Run now
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded border p-3">
                  <div className="text-xs text-muted-foreground">Last run</div>
                  <div className="font-medium">{fmtDate(s.last_run_at)}</div>
                  <div className="text-xs text-muted-foreground">{minutesAgo(s.last_run_at) ?? 'never'}</div>
                </div>
                <div className="rounded border p-3">
                  <div className="text-xs text-muted-foreground">Next run</div>
                  <div className="font-medium">{fmtDate(s.next_run_at)}</div>
                </div>
              </div>

              <div className="rounded border p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-3.5 w-3.5" />
                  Report generation
                  {reportFresh ? (
                    <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>
                  ) : ranRecently ? (
                    <Badge variant="destructive">No fresh report</Badge>
                  ) : (
                    <Badge variant="secondary">Idle</Badge>
                  )}
                </div>
                {reports.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No reports found.</div>
                ) : (
                  <ul className="text-xs space-y-1">
                    {reports.map(r => (
                      <li key={r.id} className="flex items-center justify-between gap-2">
                        <span className="uppercase font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted">{r.language}</span>
                        <span className="flex-1 truncate">{r.title}</span>
                        <span className="text-muted-foreground">{fmtDate(r.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded border p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-3.5 w-3.5" />
                  Email notifications
                  {s.email_total === 0 ? (
                    <Badge variant="secondary">None since last run</Badge>
                  ) : emailIssue ? (
                    <Badge variant="destructive">Issues</Badge>
                  ) : pending > 0 ? (
                    <Badge variant="secondary">Sending…</Badge>
                  ) : (
                    <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Delivered</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <Badge variant="outline">total {s.email_total}</Badge>
                  <Badge variant="outline" className="text-green-700 dark:text-green-400">sent {sent}</Badge>
                  {pending > 0 && <Badge variant="outline">pending {pending}</Badge>}
                  {dlq > 0 && <Badge variant="destructive">dlq {dlq}</Badge>}
                  {failed > 0 && <Badge variant="destructive">failed {failed}</Badge>}
                  {bounced > 0 && <Badge variant="destructive">bounced {bounced}</Badge>}
                  {suppressed > 0 && <Badge variant="outline">suppressed {suppressed}</Badge>}
                </div>
                {s.email_failures.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-40 overflow-auto">
                    {s.email_failures.map((f, i) => (
                      <div key={i} className="text-xs border rounded px-2 py-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono truncate">{f.recipient}</span>
                          <Badge variant="destructive" className="text-[10px]">{f.status}</Badge>
                        </div>
                        {f.error && <div className="text-muted-foreground truncate">{f.error}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
