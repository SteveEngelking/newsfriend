import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Star, Loader2, Sparkles, Send, Trash2, CheckCircle2, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { SpecialEditionRecord, SpecialEditionReport } from '@/lib/specialEditionTypes';
import { SpecialEditionView } from '@/components/SpecialEditionView';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

export function SpecialEditionsManager() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [editions, setEditions] = useState<SpecialEditionRecord[]>([]);
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState<'en' | 'de'>('en');
  const [mondcivitan, setMondcivitan] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [editingReport, setEditingReport] = useState<SpecialEditionReport | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewReport, setPreviewReport] = useState<SpecialEditionReport | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from('special_editions')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setEditions(data as unknown as SpecialEditionRecord[]);
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async () => {
    if (!topic.trim() || topic.trim().length < 3) {
      toast({ title: t('adminError'), description: t('specialEditionTopicTooShort'), variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const { data, error } = await supabase.functions.invoke('generate-special-edition', {
        body: { topic: topic.trim(), language, mondcivitanEnabled: mondcivitan },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: t('specialEditionGenerated'), description: t('specialEditionGeneratedDesc') });
      setTopic('');
      load();
      setTimeout(() => load(), 2500);
    } catch (err: any) {
      toast({ title: t('adminError'), description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('specialEditionDeleteConfirm'))) return;
    setActionId(id);
    const { error } = await supabase.from('special_editions').delete().eq('id', id);
    setActionId(null);
    if (error) toast({ title: t('adminError'), description: error.message, variant: 'destructive' });
    else load();
  };

  const handleApproveAndNotify = async (edition: SpecialEditionRecord) => {
    if (edition.status !== 'draft') return;
    if (!confirm(t('specialEditionApproveConfirm'))) return;
    setActionId(edition.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error: updErr } = await supabase
        .from('special_editions')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', edition.id);
      if (updErr) throw updErr;

      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: { type: 'special_edition', specialEditionId: edition.id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;

      await supabase
        .from('special_editions')
        .update({ notified_at: new Date().toISOString(), notified_count: data?.sent ?? 0 })
        .eq('id', edition.id);

      toast({
        title: t('specialEditionApprovedAndNotified'),
        description: `${data?.sent ?? 0} ${t('announcementRecipients')}`,
      });
      load();
    } catch (err: any) {
      toast({ title: t('adminError'), description: err.message, variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };

  const startEdit = (edition: SpecialEditionRecord) => {
    if (edition.status !== 'draft') return;
    setEditingId(edition.id);
    setEditingReport({ ...edition.report_data });
  };

  const saveEdit = async () => {
    if (!editingId || !editingReport) return;
    const { error } = await supabase
      .from('special_editions')
      .update({ report_data: editingReport as any })
      .eq('id', editingId);
    if (error) {
      toast({ title: t('adminError'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('specialEditionSaved') });
    setEditingId(null);
    setEditingReport(null);
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" /> {t('specialEditionsTitle')}
        </CardTitle>
        <CardDescription>{t('specialEditionsDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
          <div className="space-y-1.5">
            <Label htmlFor="se-topic">{t('specialEditionTopicField')}</Label>
            <Input
              id="se-topic"
              placeholder={t('specialEditionTopicPlaceholder')}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={300}
              disabled={generating}
            />
            <p className="text-xs text-muted-foreground">{t('specialEditionTopicHelp')}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="space-y-1.5 flex-1">
              <Label>{t('specialEditionLanguage')}</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as 'en' | 'de')} disabled={generating}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 sm:pt-7">
              <Switch id="mc" checked={mondcivitan} onCheckedChange={setMondcivitan} disabled={generating} />
              <Label htmlFor="mc" className="cursor-pointer">{t('specialEditionMondcivitan')}</Label>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={generating || !topic.trim()} className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? t('specialEditionGenerating') : t('specialEditionGenerateBtn')}
          </Button>
        </div>

        {editions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">{t('specialEditionsNone')}</p>
        )}

        {editions.map((ed) => {
          const isProcessing = ed.status === 'processing';
          const isDraft = ed.status === 'draft';
          const isApproved = ed.status === 'approved';
          const isFailed = ed.status === 'failed';
          const headline = isFailed ? (ed.report_data?.error || ed.topic) : (ed.report_data?.headline || ed.topic);

          return (
            <div key={ed.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-3 rounded-lg border bg-card">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-medium text-sm truncate">{headline}</p>
                  {isProcessing && (
                    <Badge variant="secondary" className="text-xs shrink-0 gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> {t('specialEditionStatusProcessing')}
                    </Badge>
                  )}
                  {isDraft && (
                    <Badge variant="outline" className="text-xs shrink-0">{t('specialEditionStatusDraft')}</Badge>
                  )}
                  {isApproved && (
                    <Badge variant="default" className="text-xs shrink-0">{t('specialEditionStatusApproved')}</Badge>
                  )}
                  {isFailed && (
                    <Badge variant="destructive" className="text-xs shrink-0">Failed</Badge>
                  )}
                  <Badge variant="secondary" className="text-xs shrink-0 uppercase">{ed.language}</Badge>
                </div>
                <p className="text-xs text-muted-foreground italic truncate">{ed.topic}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(ed.created_at).toLocaleString()}
                  {ed.notified_at && ` • ${t('specialEditionNotifiedTo')} ${ed.notified_count}`}
                </p>
                {isFailed && ed.report_data?.error && (
                  <p className="text-xs text-destructive mt-2">{ed.report_data.error}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 shrink-0">
                {isDraft && (
                  <Button size="sm" variant="ghost" onClick={() => setPreviewReport(ed.report_data)} className="gap-1">
                    <Eye className="h-3 w-3" /> {t('specialEditionPreview')}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => startEdit(ed)} className="gap-1" disabled={!isDraft}>
                  {t('specialEditionEdit')}
                </Button>
                {isDraft && (
                  <Button
                    size="sm"
                    onClick={() => handleApproveAndNotify(ed)}
                    disabled={actionId === ed.id}
                    className="gap-1"
                  >
                    {actionId === ed.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    {t('specialEditionApproveBtn')}
                  </Button>
                )}
                {isApproved && !ed.notified_at && (
                  <Button
                    size="sm"
                    onClick={() => handleApproveAndNotify(ed)}
                    disabled={actionId === ed.id}
                    className="gap-1"
                  >
                    {actionId === ed.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    {t('specialEditionResendBtn')}
                  </Button>
                )}
                {isApproved && ed.notified_at && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                    {t('specialEditionNotified')}
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(ed.id)}
                  disabled={actionId === ed.id}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>

      {/* Preview dialog */}
      <Dialog open={!!previewReport} onOpenChange={(o) => !o && setPreviewReport(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('specialEditionPreview')}</DialogTitle>
          </DialogHeader>
          {previewReport && <SpecialEditionView report={previewReport} />}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingId} onOpenChange={(o) => { if (!o) { setEditingId(null); setEditingReport(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('specialEditionEditTitle')}</DialogTitle>
          </DialogHeader>
          {editingReport && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t('specialEditionFieldHeadline')}</Label>
                <Input
                  value={editingReport.headline}
                  onChange={(e) => setEditingReport({ ...editingReport, headline: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('specialEditionFieldSummary')}</Label>
                <Textarea
                  rows={5}
                  value={editingReport.summary}
                  onChange={(e) => setEditingReport({ ...editingReport, summary: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('specialEditionFieldDiscussion')}</Label>
                <Textarea
                  rows={6}
                  value={editingReport.discussion}
                  onChange={(e) => setEditingReport({ ...editingReport, discussion: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('specialEditionFieldCommentary')}</Label>
                <Textarea
                  rows={4}
                  value={editingReport.criticalCommentary}
                  onChange={(e) => setEditingReport({ ...editingReport, criticalCommentary: e.target.value })}
                />
              </div>
              {editingReport.mondcivitanReflection !== null && (
                <div className="space-y-1.5">
                  <Label>{t('mondcivitanReflectionTitle')}</Label>
                  <Textarea
                    rows={4}
                    value={editingReport.mondcivitanReflection || ''}
                    onChange={(e) => setEditingReport({ ...editingReport, mondcivitanReflection: e.target.value })}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>{t('specialEditionActionStepsHeading')} ({t('specialEditionOnePerLine')})</Label>
                <Textarea
                  rows={5}
                  value={(editingReport.actionSteps || []).join('\n')}
                  onChange={(e) =>
                    setEditingReport({
                      ...editingReport,
                      actionSteps: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('dailyConclusion')}</Label>
                <Textarea
                  rows={4}
                  value={editingReport.conclusion}
                  onChange={(e) => setEditingReport({ ...editingReport, conclusion: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setEditingId(null); setEditingReport(null); }}>
                  {t('adminCancelEdit')}
                </Button>
                <Button onClick={saveEdit}>{t('specialEditionSaveBtn')}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
