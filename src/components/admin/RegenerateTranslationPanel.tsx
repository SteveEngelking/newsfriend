import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReportRow {
  id: string;
  title: string;
  created_at: string;
  language: string | null;
}

const TARGET_LANGUAGES: { code: string; label: string }[] = [
  { code: 'de', label: 'German (de)' },
  { code: 'fr', label: 'French (fr)' },
  { code: 'es', label: 'Spanish (es)' },
  { code: 'it', label: 'Italian (it)' },
  { code: 'pt', label: 'Portuguese (pt)' },
  { code: 'nl', label: 'Dutch (nl)' },
];

export function RegenerateTranslationPanel() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [reportId, setReportId] = useState<string>('');
  const [language, setLanguage] = useState<string>('de');
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('generated_reports')
        .select('id, title, created_at, language')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        toast({ title: 'Failed to load reports', description: error.message, variant: 'destructive' });
      } else {
        setReports((data || []) as ReportRow[]);
      }
      setLoading(false);
    })();
  }, [toast]);

  // Fake thermometer: ramps to 95% over ~60s while we wait for the AI.
  useEffect(() => {
    if (!regenerating) {
      setProgress(0);
      return;
    }
    setProgress(5);
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      // Asymptote at 95% — reaches ~80% at 60s, ~90% at 120s
      const pct = Math.min(95, 95 * (1 - Math.exp(-elapsed / 40)));
      setProgress(pct);
    }, 400);
    return () => clearInterval(id);
  }, [regenerating]);

  const handleRegenerate = async () => {
    if (!reportId) {
      toast({ title: 'Select a report first', variant: 'destructive' });
      return;
    }
    setRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-report', {
        body: { reportId, language, force: true },
      });
      if (error || !data?.report_data) {
        const msg = (data as { error?: string } | null)?.error || error?.message || 'Translation failed';
        toast({ title: 'Regenerate failed', description: msg, variant: 'destructive' });
      } else {
        setProgress(100);
        toast({ title: 'Translation regenerated', description: `Cached fresh ${language.toUpperCase()} translation.` });
      }
    } catch (err) {
      toast({ title: 'Regenerate failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setTimeout(() => setRegenerating(false), 400);
    }
  };

  const selectedReport = reports.find((r) => r.id === reportId);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Regenerate report translation</CardTitle>
          <CardDescription>
            Force a fresh translation of a report into the chosen language. Use after updating the glossary or translation rules. This overwrites the cached translation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto] items-end">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Report</label>
                <Select value={reportId} onValueChange={setReportId}>
                  <SelectTrigger><SelectValue placeholder="Select a report" /></SelectTrigger>
                  <SelectContent>
                    {reports.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        [{(r.language || 'en').toUpperCase()}] {new Date(r.created_at).toLocaleString()} — {r.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Target language</label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TARGET_LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code} disabled={selectedReport?.language === l.code}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleRegenerate} disabled={!reportId || regenerating} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={regenerating}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Translating report…
          </DialogTitle>
          <DialogDescription>
            Generating a fresh {language.toUpperCase()} translation. This usually takes 30–90 seconds depending on report length. Please don't close this window.
          </DialogDescription>
          <div className="space-y-2 pt-2">
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground text-right">{Math.round(progress)}%</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
