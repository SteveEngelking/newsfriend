import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GlossaryEntry {
  id: string;
  source_term: string;
  translations: Record<string, string>;
  do_not_translate: boolean;
  notes: string;
}

interface DraftEntry {
  id?: string;
  source_term: string;
  translations_json: string;
  do_not_translate: boolean;
  notes: string;
}

const empty = (): DraftEntry => ({
  source_term: '',
  translations_json: '{"de":""}',
  do_not_translate: false,
  notes: '',
});

export function GlossaryManager() {
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftEntry>>({});
  const [newDraft, setNewDraft] = useState<DraftEntry>(empty());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('translation_glossary')
      .select('*')
      .order('source_term', { ascending: true });
    if (error) {
      toast({ title: 'Failed to load glossary', description: error.message, variant: 'destructive' });
    } else {
      const rows = (data || []) as GlossaryEntry[];
      setEntries(rows);
      const d: Record<string, DraftEntry> = {};
      rows.forEach((r) => {
        d[r.id] = {
          id: r.id,
          source_term: r.source_term,
          translations_json: JSON.stringify(r.translations ?? {}, null, 0),
          do_not_translate: r.do_not_translate,
          notes: r.notes || '',
        };
      });
      setDrafts(d);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const parseTranslations = (s: string): Record<string, string> | null => {
    try {
      const v = JSON.parse(s || '{}');
      if (v && typeof v === 'object' && !Array.isArray(v)) return v;
      return null;
    } catch { return null; }
  };

  const saveEntry = async (draft: DraftEntry) => {
    if (!draft.source_term.trim()) {
      toast({ title: 'Source term required', variant: 'destructive' });
      return;
    }
    const tr = parseTranslations(draft.translations_json);
    if (!tr) {
      toast({ title: 'Translations must be valid JSON', description: 'Example: {"de":"Wort"}', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      source_term: draft.source_term.trim(),
      translations: tr,
      do_not_translate: draft.do_not_translate,
      notes: draft.notes,
    };
    const { error } = draft.id
      ? await supabase.from('translation_glossary').update(payload).eq('id', draft.id)
      : await supabase.from('translation_glossary').insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Saved' });
    if (!draft.id) setNewDraft(empty());
    void load();
  };

  const deleteEntry = async (id: string) => {
    if (!confirm('Delete this glossary entry?')) return;
    const { error } = await supabase.from('translation_glossary').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    void load();
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const renderRow = (draft: DraftEntry, isNew = false) => (
    <div className="grid gap-3 md:grid-cols-[1fr_1.4fr_auto_auto] items-start border rounded-md p-3">
      <div className="space-y-1">
        <Input
          placeholder="Source term (English)"
          value={draft.source_term}
          onChange={(e) => isNew
            ? setNewDraft({ ...draft, source_term: e.target.value })
            : setDrafts({ ...drafts, [draft.id!]: { ...draft, source_term: e.target.value } })}
        />
        <Textarea
          placeholder="Notes (optional)"
          value={draft.notes}
          rows={2}
          onChange={(e) => isNew
            ? setNewDraft({ ...draft, notes: e.target.value })
            : setDrafts({ ...drafts, [draft.id!]: { ...draft, notes: e.target.value } })}
        />
      </div>
      <Textarea
        placeholder='Translations JSON, e.g. {"de":"Wort","fr":"Mot"}'
        value={draft.translations_json}
        rows={3}
        className="font-mono text-xs"
        onChange={(e) => isNew
          ? setNewDraft({ ...draft, translations_json: e.target.value })
          : setDrafts({ ...drafts, [draft.id!]: { ...draft, translations_json: e.target.value } })}
        disabled={draft.do_not_translate}
      />
      <label className="flex items-center gap-2 text-sm whitespace-nowrap">
        <Checkbox
          checked={draft.do_not_translate}
          onCheckedChange={(v) => {
            const upd = { ...draft, do_not_translate: !!v };
            isNew ? setNewDraft(upd) : setDrafts({ ...drafts, [draft.id!]: upd });
          }}
        />
        Do not translate
      </label>
      <div className="flex flex-col gap-2">
        <Button size="sm" onClick={() => saveEntry(draft)} disabled={saving}>
          {isNew ? <><Plus className="h-3.5 w-3.5 mr-1" />Add</> : <><Save className="h-3.5 w-3.5 mr-1" />Save</>}
        </Button>
        {!isNew && (
          <Button size="sm" variant="ghost" onClick={() => deleteEntry(draft.id!)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Translation glossary</CardTitle>
        <CardDescription>
          Force specific translations or mark terms as untranslatable. Applied to every report translation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {renderRow(newDraft, true)}
        <div className="space-y-2">
          {entries.length === 0 && <p className="text-sm text-muted-foreground">No glossary entries yet.</p>}
          {entries.map((e) => drafts[e.id] && renderRow(drafts[e.id]))}
        </div>
      </CardContent>
    </Card>
  );
}
