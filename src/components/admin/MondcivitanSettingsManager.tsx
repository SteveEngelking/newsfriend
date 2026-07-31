import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function MondcivitanSettingsManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [promptInstruction, setPromptInstruction] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const [{ data }, { data: schedules }] = await Promise.all([
        (supabase as any).rpc('admin_get_mondcivitan_settings'),
        supabase.from('report_schedules').select('mondcivitan_enabled'),
      ]);
      if (data) {
        setTitle(data.title || '');
        setDescription(data.description || '');
        setPromptInstruction(data.prompt_instruction || '');
      }
      if (schedules?.length) {
        setEnabled(schedules.some((s: any) => s.mondcivitan_enabled));
      }
      setLoading(false);
    })();
  }, []);

  const handleToggle = async (checked: boolean) => {
    setEnabled(checked);
    const { error } = await supabase
      .from('report_schedules')
      .update({ mondcivitan_enabled: checked })
      .not('id', 'is', null);
    if (error) {
      setEnabled(!checked);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: checked ? 'Mondcivitan reflections enabled' : 'Mondcivitan reflections disabled' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('mondcivitan_settings')
        .update({
          title: title.trim(),
          description: description.trim(),
          prompt_instruction: promptInstruction.trim(),
        })
        .eq('id', 1);
      if (error) throw error;
      toast({ title: 'Mondcivitan settings saved' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-amber-600" />
          Mondcivitan Reflection
        </CardTitle>
        <CardDescription>
          Configure the displayed label and the AI prompt instruction used when generating Mondcivitan reflections. Interpretation of the news is based on the content below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="mc-title" className="text-xs">Title</Label>
              <Input id="mc-title" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mc-desc" className="text-xs">Short description</Label>
              <Input id="mc-desc" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mc-prompt" className="text-xs">AI prompt instruction</Label>
              <Textarea
                id="mc-prompt"
                value={promptInstruction}
                onChange={e => setPromptInstruction(e.target.value)}
                className="min-h-[260px] font-mono text-xs leading-relaxed"
              />
              <p className="text-xs text-muted-foreground">
                This text is injected into the report-generation prompt whenever Mondcivitan reflections are enabled (daily schedules and special editions). Reflections are based directly on this content.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
